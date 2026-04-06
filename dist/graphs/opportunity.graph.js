/**
 * Opportunity Graph: Linear Multi-Step Workflow for Opportunity Discovery
 *
 * Architecture: Follows intent graph pattern with Annotation-based state.
 * Flow: Prep → Scope → Discovery → Evaluation → Ranking → Persist → END
 *
 * Key Constraints:
 * - Opportunities only between intents sharing the same index
 * - Both intents must have hyde documents for semantic matching
 * - Non-indexed intents cannot participate in discovery
 *
 * Constructor injects Database, Embedder, and compiled HyDE graph.
 */
import { StateGraph, START, END } from '@langchain/langgraph';
import { OpportunityGraphState, } from '../states/opportunity.state.js';
import { OpportunityEvaluator, } from '../agents/opportunity.evaluator.js';
import { IntentIndexer } from '../agents/intent.indexer.js';
import { getModelName } from '../agents/model.config.js';
import { validateOpportunityActors } from '../support/opportunity.utils.js';
import { persistOpportunities } from '../support/opportunity.persist.js';
import { negotiateCandidates } from "./negotiation.graph.js";
import { protocolLogger, withCallLogging } from '../support/protocol.logger.js';
import { timed } from '../support/performance.js';
import { requestContext } from "../support/request-context.js";
const logger = protocolLogger('OpportunityGraph');
/**
 * Builds a compact text summary of the discoverer's profile and active intents
 * for use as profileContext in HyDE generation.
 * @param profile - The discoverer's profile data (identity, attributes)
 * @param intents - The discoverer's indexed intents (capped at 5)
 * @returns A context string, or undefined if no meaningful data is available
 */
export function buildDiscovererContext(profile, intents) {
    const lines = [];
    if (profile) {
        const identity = profile.identity;
        const attrs = profile.attributes;
        if (identity?.name || identity?.bio) {
            lines.push(`Profile: ${[identity.name, identity.bio].filter(Boolean).join(', ')}`);
        }
        if (identity?.location) {
            lines.push(`Location: ${identity.location}`);
        }
        if (attrs?.skills?.length) {
            lines.push(`Skills: ${attrs.skills.join(', ')}`);
        }
        if (attrs?.interests?.length) {
            lines.push(`Interests: ${attrs.interests.join(', ')}`);
        }
    }
    if (intents?.length) {
        // indexedIntents preserves DB order from getActiveIntents (newest first),
        // so slice(0, 5) is deterministic without an explicit sort.
        const capped = intents.slice(0, 5);
        lines.push('');
        lines.push('Active intents:');
        for (const intent of capped) {
            lines.push(`- ${intent.payload}`);
        }
    }
    return lines.length > 0 ? lines.join('\n') : undefined;
}
/**
 * Factory class to build and compile the Opportunity Graph.
 * Uses dependency injection for testability.
 */
export class OpportunityGraphFactory {
    constructor(database, embedder, hydeGenerator, optionalEvaluator, queueNotification, negotiationGraph) {
        this.database = database;
        this.embedder = embedder;
        this.hydeGenerator = hydeGenerator;
        this.optionalEvaluator = optionalEvaluator;
        this.queueNotification = queueNotification;
        this.negotiationGraph = negotiationGraph;
    }
    createGraph() {
        const evaluatorAgent = this.optionalEvaluator ?? new OpportunityEvaluator();
        // ═══════════════════════════════════════════════════════════════
        // NODE DEFINITIONS
        // ═══════════════════════════════════════════════════════════════
        /**
         * Wraps a graph node function to emit agent_start/agent_end trace events
         * at its boundaries so the frontend TRACE panel shows real-time progress.
         * @param traceName - Kebab-case agent name (e.g. "opportunity-prep")
         * @param nodeFn - The original node function
         * @param summaryFn - Optional function to derive a summary string from the node result
         */
        function withNodeTrace(traceName, nodeFn, summaryFn) {
            return async (state) => {
                const traceEmitter = requestContext.getStore()?.traceEmitter;
                const nodeStart = Date.now();
                traceEmitter?.({ type: "agent_start", name: traceName });
                try {
                    const result = await nodeFn(state);
                    const durationMs = Date.now() - nodeStart;
                    const summary = summaryFn?.(result) ?? undefined;
                    traceEmitter?.({ type: "agent_end", name: traceName, durationMs, summary });
                    return result;
                }
                catch (err) {
                    const durationMs = Date.now() - nodeStart;
                    const errMsg = err instanceof Error ? err.message : String(err);
                    traceEmitter?.({ type: "agent_end", name: traceName, durationMs, summary: `error: ${errMsg}` });
                    throw err;
                }
            };
        }
        /**
         * Node 0: Prep
         * Fetches user's index memberships and validates requirements.
         * Returns empty if user has no index memberships (requirement).
         */
        const prepNode = withNodeTrace("opportunity-prep", async (state) => timed("OpportunityGraph.prep", async () => withCallLogging(logger, '[Graph:Prep] prepNode', {
            userId: state.userId,
            hasSearchQuery: !!state.searchQuery,
            requestedIndexId: state.networkId ?? undefined,
        }, async () => {
            // Use getNetworkMemberships (all memberships) for search scope — NOT getUserIndexIds
            // (which filters by autoAssign=true and is intended only for intent assignment).
            const memberships = await this.database.getNetworkMemberships(state.userId);
            const userNetworkIds = memberships.map(m => m.networkId);
            if (userNetworkIds.length === 0) {
                logger.verbose('[Graph:Prep] User has no network memberships - cannot find opportunities');
                return {
                    userNetworks: [],
                    sourceProfile: null,
                    error: 'You need to join at least one network to find opportunities.',
                };
            }
            const discoveryUserId = state.onBehalfOfUserId ?? state.userId;
            const [intents, profile] = await Promise.all([
                this.database.getActiveIntents(discoveryUserId),
                this.database.getProfile(discoveryUserId),
            ]);
            const indexedIntents = intents.map((intent) => ({
                intentId: intent.id,
                payload: intent.payload,
                summary: intent.summary ?? undefined,
                indexes: [],
            }));
            const sourceProfile = profile
                ? {
                    embedding: profile.embedding ?? null,
                    identity: profile.identity ?? undefined,
                    narrative: profile.narrative ?? undefined,
                    attributes: profile.attributes ?? undefined,
                }
                : null;
            return {
                userNetworks: userNetworkIds,
                indexedIntents,
                sourceProfile,
                trace: [{
                        node: "prep",
                        detail: `${userNetworkIds.length} network(s), ${intents.length} intent(s), ${profile ? 'profile loaded' : 'no profile'}`,
                    }],
            };
        }, { context: { userId: state.userId }, logOutput: true }).catch((error) => {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger.error('[Graph:Prep] Failed', { error });
            return {
                error: 'Failed to prepare opportunity search. Please try again.',
                trace: [{
                        node: "prep_fatal",
                        detail: `Prep failed: ${errMsg}`,
                        data: { error: errMsg },
                    }],
            };
        })), (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            const indexes = r?.userNetworks;
            const intents = r?.indexedIntents;
            return indexes && intents ? `${indexes.length} index(es), ${intents.length} intent(s)` : undefined;
        });
        /**
         * Node 1: Scope
         * Determines which indexes to search within.
         * If networkId provided: searches only that index.
         * Otherwise: searches all user's indexes.
         */
        const scopeNode = withNodeTrace("opportunity-scope", async (state) => {
            return timed("OpportunityGraph.scope", async () => {
                logger.verbose('[Graph:Scope] Determining search scope', {
                    requestedIndexId: state.networkId,
                    userNetworksCount: state.userNetworks.length,
                });
                try {
                    let targetIndexIds;
                    if (state.networkId) {
                        // Validate user is member or owner of requested network
                        const isInScope = state.userNetworks.includes(state.networkId);
                        const isOwner = !isInScope && await this.database.isIndexOwner(state.networkId, state.userId);
                        if (!isInScope && !isOwner) {
                            logger.warn('[Graph:Scope] User not member of requested network', {
                                networkId: state.networkId,
                            });
                            return {
                                targetIndexes: [],
                                error: 'You are not a member of that network.',
                            };
                        }
                        targetIndexIds = [state.networkId];
                    }
                    else {
                        // Search all user's indexes
                        targetIndexIds = state.userNetworks;
                    }
                    // Fetch index details
                    const targetIndexes = await Promise.all(targetIndexIds.map(async (networkId) => {
                        const index = await this.database.getNetwork(networkId);
                        const memberCount = await this.database.getIndexMemberCount(networkId);
                        return {
                            networkId,
                            title: index?.title ?? 'Unknown',
                            memberCount,
                        };
                    }));
                    logger.verbose('[Graph:Scope] Scope determined', {
                        targetIndexesCount: targetIndexes.length,
                        indexes: targetIndexes.map(i => i.title),
                    });
                    // ── Populate index relevancy scores for dedup tie-breaking ──
                    let indexRelevancyScores = {};
                    if (state.triggerIntentId) {
                        // Background path: look up persisted scores from intent_indexes
                        try {
                            const scores = await this.database.getIntentIndexScores(state.triggerIntentId);
                            for (const { networkId, relevancyScore } of scores) {
                                if (relevancyScore != null) {
                                    indexRelevancyScores[networkId] = relevancyScore;
                                }
                            }
                        }
                        catch (err) {
                            logger.warn('[Graph:Scope] Failed to load intent index scores', { triggerIntentId: state.triggerIntentId, error: err });
                        }
                    }
                    else if (state.searchQuery?.trim()) {
                        // Chat path: score query against target indexes in parallel
                        try {
                            const indexer = new IntentIndexer();
                            const scopeAgentTimings = [];
                            const scorableIndexes = targetIndexes.filter(ti => ti.title !== 'Unknown');
                            const scoringPromises = scorableIndexes.map(async (ti) => {
                                const ctx = await this.database.getIndexMemberContext(ti.networkId, state.userId);
                                if (!ctx?.indexPrompt?.trim() && !ctx?.memberPrompt?.trim()) {
                                    return { networkId: ti.networkId, score: 1.0 };
                                }
                                const _indexerStart = Date.now();
                                const traceEmitter = requestContext.getStore()?.traceEmitter;
                                traceEmitter?.({ type: "agent_start", name: "intent-indexer" });
                                let result = null;
                                try {
                                    result = await indexer.invoke(state.searchQuery, ctx?.indexPrompt ?? null, ctx?.memberPrompt ?? null);
                                }
                                catch {
                                    return { networkId: ti.networkId, score: 1.0 };
                                }
                                finally {
                                    const _indexerDuration = Date.now() - _indexerStart;
                                    traceEmitter?.({ type: "agent_end", name: "intent-indexer", durationMs: _indexerDuration, summary: `Scored index ${ti.networkId}` });
                                    scopeAgentTimings.push({ name: 'intent.indexer', durationMs: _indexerDuration });
                                }
                                if (!result)
                                    return { networkId: ti.networkId, score: 1.0 };
                                const score = ctx?.indexPrompt && ctx?.memberPrompt
                                    ? result.indexScore * 0.6 + result.memberScore * 0.4
                                    : ctx?.indexPrompt ? result.indexScore : result.memberScore;
                                return { networkId: ti.networkId, score };
                            });
                            const results = await Promise.all(scoringPromises);
                            for (const { networkId, score } of results) {
                                indexRelevancyScores[networkId] = score;
                            }
                            // Accumulate indexer timings into graph state
                            if (scopeAgentTimings.length > 0) {
                                return {
                                    targetIndexes,
                                    indexRelevancyScores,
                                    agentTimings: scopeAgentTimings,
                                    trace: [{
                                            node: "scope",
                                            detail: `Searching ${targetIndexes.length} index(es): ${targetIndexes.map(i => `${i.title} (${i.memberCount})`).join(', ')}`,
                                            data: { totalMembers: targetIndexes.reduce((sum, i) => sum + i.memberCount, 0) },
                                        }],
                                };
                            }
                        }
                        catch (err) {
                            logger.warn('[Graph:Scope] Failed to score query against indexes', { error: err });
                        }
                    }
                    const totalMembers = targetIndexes.reduce((sum, i) => sum + i.memberCount, 0);
                    return {
                        targetIndexes,
                        indexRelevancyScores,
                        trace: [{
                                node: "scope",
                                detail: `Searching ${targetIndexes.length} index(es): ${targetIndexes.map(i => `${i.title} (${i.memberCount})`).join(', ')}`,
                                data: { totalMembers },
                            }],
                    };
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    logger.error('[Graph:Scope] Failed', { error });
                    return {
                        targetIndexes: [],
                        error: 'Failed to determine search scope.',
                        trace: [{
                                node: "scope_fatal",
                                detail: `Scope failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        }, (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            const indexes = r?.targetIndexes;
            return indexes ? `${indexes.length} index(es) in scope` : undefined;
        });
        /**
         * Node 2: Resolve
         * Resolves trigger intent from triggerIntentId or searchQuery vs indexedIntents;
         * sets discoverySource, resolvedTriggerIntentId, resolvedIntentInIndex for routing (path A/B/C).
         */
        const resolveNode = withNodeTrace("opportunity-resolve", async (state) => {
            return timed("OpportunityGraph.resolve", async () => {
                logger.verbose('[Graph:Resolve] Resolving intent and index membership', {
                    triggerIntentId: state.triggerIntentId,
                    hasSearchQuery: !!state.searchQuery,
                    indexedIntentsCount: state.indexedIntents.length,
                });
                const targetIndexIds = state.targetIndexes.map((t) => t.networkId);
                try {
                    let resolvedIntentId;
                    if (state.triggerIntentId) {
                        const inIndex = await this.database.getNetworkIdsForIntent(state.triggerIntentId);
                        const inTarget = inIndex.some((id) => targetIndexIds.includes(id));
                        resolvedIntentId = state.triggerIntentId;
                        const resolvedIntentInIndex = inTarget;
                        const discoverySource = resolvedIntentInIndex ? 'intent' : 'profile';
                        return {
                            resolvedTriggerIntentId: resolvedIntentId,
                            resolvedIntentInIndex,
                            discoverySource,
                        };
                    }
                    if (state.searchQuery?.trim() && state.indexedIntents.length > 0) {
                        const q = state.searchQuery.trim().toLowerCase();
                        const matched = state.indexedIntents.find((i) => i.payload?.toLowerCase().includes(q));
                        if (matched) {
                            resolvedIntentId = matched.intentId;
                            const inIndex = await this.database.getNetworkIdsForIntent(matched.intentId);
                            const resolvedIntentInIndex = inIndex.some((id) => targetIndexIds.includes(id));
                            const discoverySource = resolvedIntentInIndex ? 'intent' : 'profile';
                            return {
                                resolvedTriggerIntentId: resolvedIntentId,
                                resolvedIntentInIndex,
                                discoverySource,
                            };
                        }
                        logger.warn('[Graph:Resolve] No intent matched search query; leaving resolvedIntentId unset', {
                            searchQuery: state.searchQuery,
                            indexedIntentsCount: state.indexedIntents.length,
                        });
                    }
                    return {
                        resolvedTriggerIntentId: undefined,
                        resolvedIntentInIndex: false,
                        discoverySource: 'profile',
                    };
                }
                catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    logger.error('[Graph:Resolve] Failed', {
                        triggerIntentId: state.triggerIntentId,
                        searchQuery: state.searchQuery,
                        error: err,
                    });
                    return {
                        resolvedTriggerIntentId: undefined,
                        resolvedIntentInIndex: false,
                        discoverySource: 'profile',
                        error: errMsg || 'Resolve failed',
                        trace: [{
                                node: "resolve_fatal",
                                detail: `Resolve failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        }, (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            return r?.discoverySource ? `source: ${r.discoverySource}` : undefined;
        });
        /**
         * Node 3: Discovery
         * Generates HyDE embeddings and performs semantic search (path A), or profile-as-source search (path B/C).
         */
        const discoveryNode = withNodeTrace("opportunity-discovery", async (state) => {
            const self = this;
            return timed("OpportunityGraph.discovery", async () => {
                const startTime = Date.now();
                const discoveryUserId = state.onBehalfOfUserId ?? state.userId;
                /** Filter candidates to targetUserId when set (direct-connection mode). */
                const filterByTarget = (candidates) => {
                    if (!state.targetUserId)
                        return candidates;
                    const filtered = candidates.filter(c => c.candidateUserId === state.targetUserId);
                    logger.verbose('[Graph:Discovery] targetUserId filter applied', {
                        targetUserId: state.targetUserId,
                        before: candidates.length,
                        after: filtered.length,
                    });
                    return filtered;
                };
                // Shared variable to capture lens input data from runQueryHydeDiscovery or intent path
                let discoveryLensInput;
                // Shared variable to capture HyDE output (lenses + documents) for trace entries
                let discoveryHydeOutput;
                logger.verbose('[Graph:Discovery] Starting semantic search', {
                    targetIndexesCount: state.targetIndexes.length,
                    discoverySource: state.discoverySource,
                    searchQueryPreview: state.searchQuery?.trim().slice(0, 60) ?? '(none)',
                });
                try {
                    if (state.targetIndexes.length === 0) {
                        logger.warn('[Graph:Discovery] No target indexes for search');
                        return { candidates: [] };
                    }
                    // ── Direct-connection fast path ──
                    // When targetUserId is set (user @-mentioned someone), bypass vector search
                    // and construct candidates directly from shared indexes.
                    if (state.targetUserId) {
                        if (state.targetUserId === discoveryUserId) {
                            logger.warn('[Graph:Discovery] Direct-connection target matches discoverer; skipping self-match', {
                                targetUserId: state.targetUserId,
                            });
                            return {
                                candidates: [],
                                trace: [{
                                        node: "discovery",
                                        detail: "Direct connection skipped: target user is discoverer",
                                        data: { targetUserId: state.targetUserId },
                                    }],
                            };
                        }
                        logger.verbose('[Graph:Discovery] Direct-connection mode — bypassing vector search', {
                            targetUserId: state.targetUserId,
                        });
                        const targetMemberships = await this.database.getNetworkMemberships(state.targetUserId);
                        const targetUserIndexIds = targetMemberships.map(m => m.networkId);
                        const sharedIndexIds = state.targetIndexes
                            .filter(ti => targetUserIndexIds.includes(ti.networkId))
                            .map(ti => ti.networkId);
                        if (sharedIndexIds.length === 0) {
                            logger.warn('[Graph:Discovery] Target user shares no indexes with discoverer', {
                                targetUserId: state.targetUserId,
                                discovererIndexes: state.targetIndexes.map(ti => ti.networkId),
                            });
                            return {
                                candidates: [],
                                trace: [{
                                        node: "discovery",
                                        detail: `Direct connection: target user shares no indexes`,
                                        data: { targetUserId: state.targetUserId },
                                    }],
                            };
                        }
                        // Fetch target user's active intents to build intent-level candidates
                        const targetIntents = await this.database.getActiveIntents(state.targetUserId);
                        const directCandidates = [];
                        if (targetIntents.length > 0) {
                            // Build one candidate per intent per shared index it belongs to
                            for (const intent of targetIntents) {
                                const intentIndexIds = await this.database.getNetworkIdsForIntent(intent.id);
                                const overlapping = sharedIndexIds.filter(id => intentIndexIds.includes(id));
                                for (const networkId of overlapping) {
                                    directCandidates.push({
                                        candidateUserId: state.targetUserId,
                                        candidateIntentId: intent.id,
                                        networkId,
                                        similarity: 1.0,
                                        lens: 'explicit_mention',
                                        candidatePayload: intent.payload,
                                        candidateSummary: intent.summary ?? undefined,
                                        discoverySource: 'query',
                                    });
                                }
                            }
                        }
                        // Always add a profile-level candidate (so evaluation runs even without intents)
                        if (directCandidates.length === 0) {
                            directCandidates.push({
                                candidateUserId: state.targetUserId,
                                candidateIntentId: undefined,
                                networkId: sharedIndexIds[0],
                                similarity: 1.0,
                                lens: 'explicit_mention',
                                candidatePayload: '',
                                candidateSummary: undefined,
                                discoverySource: 'query',
                            });
                        }
                        logger.verbose('[Graph:Discovery] Direct candidates constructed', {
                            count: directCandidates.length,
                            sharedIndexes: sharedIndexIds.length,
                            targetIntents: targetIntents.length,
                        });
                        return {
                            candidates: directCandidates,
                            trace: [{
                                    node: "discovery",
                                    detail: `Direct connection → ${directCandidates.length} candidate(s) from ${sharedIndexIds.length} shared index(es)`,
                                    data: {
                                        targetUserId: state.targetUserId,
                                        candidateCount: directCandidates.length,
                                        sharedIndexes: sharedIndexIds.length,
                                        durationMs: Date.now() - startTime,
                                    },
                                }],
                        };
                    }
                    // Search limits - fixed values for candidate retrieval
                    // (The options.limit controls final output, not search pool)
                    const limitPerStrategy = 30;
                    const perIndexLimit = 80;
                    // Similarity threshold for recall (0.30 = 30% similarity)
                    const minScore = 0.3;
                    if (state.discoverySource === 'profile') {
                        const embedding = state.sourceProfile?.embedding ?? null;
                        const vector = Array.isArray(embedding) && embedding.length > 0 && typeof embedding[0] === 'number'
                            ? embedding
                            : Array.isArray(embedding) && Array.isArray(embedding[0])
                                ? embedding[0]
                                : null;
                        // ALWAYS run query-based HyDE when we have a search query (e.g., "looking for investors")
                        // This ensures we use the right strategies (investor, mentor, etc.) not just mirror
                        if (state.searchQuery?.trim()) {
                            logger.verbose('[Graph:Discovery] Profile source with searchQuery → running query HyDE path for broader search', {
                                searchQuery: state.searchQuery.trim().substring(0, 80),
                                hasProfileVector: !!vector,
                            });
                            const queryCandidates = await runQueryHydeDiscovery();
                            logger.verbose('[Graph:Discovery] Query HyDE path complete', { candidatesFound: queryCandidates.length });
                            // Build trace entries for this path
                            const traceEntries = [];
                            // Lens input trace (captured from runQueryHydeDiscovery)
                            if (discoveryLensInput) {
                                traceEntries.push({
                                    node: "lens_input",
                                    detail: "Profile context for lens inference",
                                    data: discoveryLensInput,
                                });
                            }
                            // Lens output and HyDE document traces (captured from runQueryHydeDiscovery)
                            if (discoveryHydeOutput) {
                                if (discoveryHydeOutput.lenses.length > 0) {
                                    traceEntries.push({
                                        node: "lens_output",
                                        detail: `Inferred ${discoveryHydeOutput.lenses.length} lens(es): ${discoveryHydeOutput.lenses.map(l => l.label).join(', ')}`,
                                        data: { lenses: discoveryHydeOutput.lenses, model: getModelName("lensInferrer") },
                                    });
                                }
                                for (const [lens, doc] of Object.entries(discoveryHydeOutput.hydeDocuments)) {
                                    if (doc?.hydeText) {
                                        traceEntries.push({
                                            node: "hyde_query",
                                            detail: `[${lens}] "${doc.hydeText.slice(0, 120)}${doc.hydeText.length > 120 ? '...' : ''}"`,
                                            data: { lens, hydeTextPreview: doc.hydeText.slice(0, 300) + (doc.hydeText.length > 300 ? '...' : '') },
                                        });
                                    }
                                }
                            }
                            // Compute per-lens stats from deduped candidates
                            const lensStats = {};
                            for (const c of queryCandidates) {
                                const s = c.lens || 'unknown';
                                if (!lensStats[s])
                                    lensStats[s] = { count: 0, avgSimilarity: 0 };
                                lensStats[s].count++;
                                lensStats[s].avgSimilarity += c.similarity;
                            }
                            for (const s of Object.values(lensStats)) {
                                s.avgSimilarity = s.count > 0 ? Math.round((s.avgSimilarity / s.count) * 1000) / 1000 : 0;
                            }
                            traceEntries.push({
                                node: "discovery",
                                detail: `HyDE search → ${queryCandidates.length} candidate(s) from query path`,
                                data: {
                                    candidateCount: queryCandidates.length,
                                    byLens: lensStats,
                                    searchQuery: state.searchQuery?.trim().slice(0, 80),
                                    durationMs: Date.now() - startTime,
                                    model: getModelName("hydeGenerator"),
                                },
                            });
                            // If we also have a profile vector, merge with profile-based results
                            if (vector && vector.length > 0) {
                                const profileCandidates = [];
                                for (const targetIndex of state.targetIndexes) {
                                    const results = await this.embedder.searchWithProfileEmbedding(vector, {
                                        indexScope: [targetIndex.networkId],
                                        excludeUserId: discoveryUserId,
                                        limitPerStrategy: Math.floor(limitPerStrategy / 2),
                                        limit: Math.floor(perIndexLimit / 2),
                                        minScore,
                                    });
                                    for (const result of results) {
                                        profileCandidates.push({
                                            candidateUserId: result.userId,
                                            candidateIntentId: result.type === 'intent' ? result.id : undefined,
                                            networkId: targetIndex.networkId,
                                            similarity: result.score,
                                            lens: result.matchedVia,
                                            candidatePayload: '',
                                            candidateSummary: undefined,
                                            discoverySource: 'profile-similarity',
                                        });
                                    }
                                }
                                // Merge and dedupe - keep both intent and profile candidates per user
                                const byKey = new Map();
                                for (const c of [...queryCandidates, ...profileCandidates]) {
                                    const key = `${c.candidateUserId}:${c.networkId}:${c.candidateIntentId ?? 'profile'}:${c.discoverySource ?? 'unknown'}`;
                                    if (!byKey.has(key) || c.similarity > (byKey.get(key)?.similarity ?? 0)) {
                                        byKey.set(key, c);
                                    }
                                }
                                const merged = Array.from(byKey.values());
                                logger.verbose('[Graph:Discovery] Merged HyDE + profile candidates', {
                                    hydeCandidates: queryCandidates.length,
                                    profileCandidates: profileCandidates.length,
                                    merged: merged.length
                                });
                                traceEntries.push({
                                    node: "discovery",
                                    detail: `+ Profile search → ${profileCandidates.length} additional, merged to ${merged.length}`,
                                    data: {
                                        profileCandidates: profileCandidates.length,
                                        merged: merged.length,
                                    },
                                });
                                return { candidates: filterByTarget(merged), trace: traceEntries };
                            }
                            return { candidates: filterByTarget(queryCandidates), trace: traceEntries };
                        }
                        // No search query - use profile embedding directly (mirror-only)
                        if (!vector || vector.length === 0) {
                            return { candidates: [] };
                        }
                        const allCandidates = [];
                        for (const targetIndex of state.targetIndexes) {
                            const results = await this.embedder.searchWithProfileEmbedding(vector, {
                                indexScope: [targetIndex.networkId],
                                excludeUserId: discoveryUserId,
                                limitPerStrategy,
                                limit: perIndexLimit,
                                minScore,
                            });
                            for (const result of results) {
                                if (result.type === 'intent') {
                                    allCandidates.push({
                                        candidateUserId: result.userId,
                                        candidateIntentId: result.id,
                                        networkId: targetIndex.networkId,
                                        similarity: result.score,
                                        lens: result.matchedVia,
                                        candidatePayload: '',
                                        candidateSummary: undefined,
                                        discoverySource: 'profile-similarity',
                                    });
                                }
                                else {
                                    allCandidates.push({
                                        candidateUserId: result.userId,
                                        networkId: targetIndex.networkId,
                                        similarity: result.score,
                                        lens: result.matchedVia,
                                        candidatePayload: '',
                                        candidateSummary: undefined,
                                        discoverySource: 'profile-similarity',
                                    });
                                }
                            }
                        }
                        const byUserAndIndex = new Map();
                        for (const c of allCandidates) {
                            const key = `${c.candidateUserId}:${c.networkId}:${c.candidateIntentId ?? 'profile'}`;
                            if (!byUserAndIndex.has(key) || c.similarity > (byUserAndIndex.get(key)?.similarity ?? 0)) {
                                byUserAndIndex.set(key, c);
                            }
                        }
                        const candidates = Array.from(byUserAndIndex.values());
                        logger.verbose('[Graph:Discovery] Profile-as-source discovery complete', { candidatesFound: candidates.length });
                        // Build trace with individual candidate similarity scores
                        const traceEntries = [];
                        // Show what the profile search is based on
                        const profileBio = state.sourceProfile?.identity?.bio;
                        const profileContext = state.sourceProfile?.narrative?.context;
                        const profileSummary = profileBio || profileContext || '(profile embedding)';
                        // Compute per-lens stats from deduped candidates
                        const lensStats = {};
                        for (const c of candidates) {
                            const s = c.lens || 'unknown';
                            if (!lensStats[s])
                                lensStats[s] = { count: 0, avgSimilarity: 0 };
                            lensStats[s].count++;
                            lensStats[s].avgSimilarity += c.similarity;
                        }
                        for (const s of Object.values(lensStats)) {
                            s.avgSimilarity = s.count > 0 ? Math.round((s.avgSimilarity / s.count) * 1000) / 1000 : 0;
                        }
                        traceEntries.push({
                            node: "discovery",
                            detail: `Profile-based search → ${candidates.length} candidate(s)`,
                            data: {
                                source: "profile",
                                candidateCount: candidates.length,
                                byLens: lensStats,
                                durationMs: Date.now() - startTime,
                            },
                        });
                        traceEntries.push({
                            node: "search_query",
                            detail: `Searching for matches to: "${profileSummary.slice(0, 150)}${profileSummary.length > 150 ? '...' : ''}"`,
                            data: {
                                type: "profile_embedding",
                                bio: profileBio,
                                context: profileContext,
                            },
                        });
                        // Add top candidates with similarity scores
                        const sortedCandidates = [...candidates].sort((a, b) => b.similarity - a.similarity).slice(0, 10);
                        for (const c of sortedCandidates) {
                            traceEntries.push({
                                node: "match",
                                detail: `Similarity ${Math.round(c.similarity * 100)}% via ${c.lens}`,
                                data: {
                                    userId: c.candidateUserId,
                                    similarity: Math.round(c.similarity * 100),
                                    lens: c.lens,
                                    hasIntent: !!c.candidateIntentId,
                                },
                            });
                        }
                        return {
                            candidates: filterByTarget(candidates),
                            trace: traceEntries,
                        };
                    }
                    async function runQueryHydeDiscovery() {
                        const searchText = state.searchQuery?.trim() ?? '';
                        if (!searchText)
                            return [];
                        logger.verbose('[Graph:Discovery] runQueryHydeDiscovery start', { searchText: searchText.slice(0, 80) });
                        const discovererContext = buildDiscovererContext(state.sourceProfile, state.indexedIntents);
                        discoveryLensInput = {
                            profileContext: discovererContext,
                            model: getModelName("lensInferrer"),
                        };
                        const hydeResult = await self.hydeGenerator.invoke({
                            sourceType: 'query',
                            sourceText: searchText,
                            forceRegenerate: false,
                            profileContext: discovererContext,
                        });
                        const hydeEmbeddings = hydeResult.hydeEmbeddings;
                        const lenses = hydeResult.lenses ?? [];
                        discoveryHydeOutput = {
                            lenses: lenses,
                            hydeDocuments: (hydeResult.hydeDocuments ?? {}),
                        };
                        const embeddingKeys = hydeEmbeddings ? Object.keys(hydeEmbeddings) : [];
                        logger.verbose('[Graph:Discovery] HyDE generator result', {
                            lensCount: embeddingKeys.length,
                            lenses: embeddingKeys,
                        });
                        if (!hydeEmbeddings || Object.keys(hydeEmbeddings).length === 0)
                            return [];
                        const lensMap = new Map(lenses.map(l => [l.label, l]));
                        const lensEmbeddings = [];
                        for (const [label, emb] of Object.entries(hydeEmbeddings)) {
                            if (emb?.length) {
                                const lens = lensMap.get(label);
                                lensEmbeddings.push({ lens: label, corpus: lens?.corpus ?? 'profiles', embedding: emb });
                            }
                        }
                        const all = [];
                        await Promise.all(state.targetIndexes.map(async (targetIndex) => {
                            const results = await self.embedder.searchWithHydeEmbeddings(lensEmbeddings, {
                                indexScope: [targetIndex.networkId],
                                excludeUserId: discoveryUserId,
                                limitPerStrategy,
                                limit: perIndexLimit,
                                minScore,
                            });
                            for (const r of results.filter((x) => x.type === 'intent')) {
                                all.push({
                                    candidateUserId: r.userId,
                                    candidateIntentId: r.id,
                                    networkId: targetIndex.networkId,
                                    similarity: r.score,
                                    lens: r.matchedVia,
                                    candidatePayload: '',
                                    candidateSummary: undefined,
                                    discoverySource: 'query',
                                });
                            }
                            for (const r of results.filter((x) => x.type === 'profile')) {
                                all.push({
                                    candidateUserId: r.userId,
                                    networkId: targetIndex.networkId,
                                    similarity: r.score,
                                    lens: r.matchedVia,
                                    candidatePayload: '',
                                    candidateSummary: undefined,
                                    discoverySource: 'query',
                                });
                            }
                        }));
                        const profileCount = all.filter((c) => !c.candidateIntentId).length;
                        const intentCount = all.filter((c) => c.candidateIntentId).length;
                        logger.verbose('[Graph:Discovery] searchWithHydeEmbeddings raw results', {
                            total: all.length,
                            fromProfile: profileCount,
                            fromIntent: intentCount,
                        });
                        const byKey = new Map();
                        for (const c of all) {
                            // Dedup by candidateUserId + intent (or profile), NOT by indexId.
                            // Including indexId caused the same user to appear once per index they belong to.
                            const key = `${c.candidateUserId}:${c.candidateIntentId ?? 'profile'}`;
                            if (!byKey.has(key) || c.similarity > (byKey.get(key)?.similarity ?? 0)) {
                                byKey.set(key, c);
                            }
                        }
                        return Array.from(byKey.values());
                    }
                    const resolvedIntent = state.resolvedTriggerIntentId
                        ? state.indexedIntents.find((i) => i.intentId === state.resolvedTriggerIntentId)
                        : state.indexedIntents[0];
                    const searchText = state.searchQuery ?? resolvedIntent?.payload ?? '';
                    if (!searchText) {
                        logger.warn('[Graph:Discovery] No search text available for intent path');
                        return { candidates: [] };
                    }
                    const discovererContext = buildDiscovererContext(state.sourceProfile, state.indexedIntents);
                    discoveryLensInput = {
                        profileContext: discovererContext,
                        model: getModelName("lensInferrer"),
                    };
                    const hydeResult = await this.hydeGenerator.invoke({
                        sourceType: 'query',
                        sourceText: searchText,
                        forceRegenerate: false,
                        profileContext: discovererContext,
                    });
                    const hydeEmbeddings = hydeResult.hydeEmbeddings;
                    const lenses = hydeResult.lenses ?? [];
                    if (!hydeEmbeddings || Object.keys(hydeEmbeddings).length === 0) {
                        return { hydeEmbeddings: {}, candidates: [] };
                    }
                    const lensMap = new Map(lenses.map(l => [l.label, l]));
                    const lensEmbeddings = [];
                    for (const [label, emb] of Object.entries(hydeEmbeddings)) {
                        if (emb?.length) {
                            const lens = lensMap.get(label);
                            lensEmbeddings.push({ lens: label, corpus: lens?.corpus ?? 'profiles', embedding: emb });
                        }
                    }
                    const allCandidates = [];
                    await Promise.all(state.targetIndexes.map(async (targetIndex) => {
                        const results = await this.embedder.searchWithHydeEmbeddings(lensEmbeddings, {
                            indexScope: [targetIndex.networkId],
                            excludeUserId: discoveryUserId,
                            limitPerStrategy,
                            limit: perIndexLimit,
                            minScore,
                        });
                        for (const result of results.filter((r) => r.type === 'intent')) {
                            allCandidates.push({
                                candidateUserId: result.userId,
                                candidateIntentId: result.id,
                                networkId: targetIndex.networkId,
                                similarity: result.score,
                                lens: result.matchedVia,
                                candidatePayload: '',
                                candidateSummary: undefined,
                                discoverySource: 'query',
                            });
                        }
                        for (const result of results.filter((r) => r.type === 'profile')) {
                            allCandidates.push({
                                candidateUserId: result.userId,
                                networkId: targetIndex.networkId,
                                similarity: result.score,
                                lens: result.matchedVia,
                                candidatePayload: '',
                                candidateSummary: undefined,
                                discoverySource: 'query',
                            });
                        }
                    }));
                    const byUserAndIndex = new Map();
                    for (const c of allCandidates) {
                        const key = `${c.candidateUserId}:${c.networkId}:${c.candidateIntentId ?? 'profile'}`;
                        if (!byUserAndIndex.has(key) || c.similarity > (byUserAndIndex.get(key)?.similarity ?? 0)) {
                            byUserAndIndex.set(key, c);
                        }
                    }
                    const candidates = Array.from(byUserAndIndex.values());
                    logger.verbose('[Graph:Discovery] Intent-path discovery complete', { candidatesFound: candidates.length });
                    const usedLenses = Object.keys(hydeEmbeddings);
                    // Build trace with individual candidate similarity scores
                    const traceEntries = [];
                    // Lens input trace
                    if (discoveryLensInput) {
                        traceEntries.push({
                            node: "lens_input",
                            detail: "Profile context for lens inference",
                            data: discoveryLensInput,
                        });
                    }
                    // Lens output trace
                    if (lenses.length > 0) {
                        traceEntries.push({
                            node: "lens_output",
                            detail: `Inferred ${lenses.length} lens(es): ${lenses.map(l => l.label).join(', ')}`,
                            data: { lenses, model: getModelName("lensInferrer") },
                        });
                    }
                    // Compute per-lens stats from deduped candidates
                    const lensStats = {};
                    for (const c of candidates) {
                        const s = c.lens || 'unknown';
                        if (!lensStats[s])
                            lensStats[s] = { count: 0, avgSimilarity: 0 };
                        lensStats[s].count++;
                        lensStats[s].avgSimilarity += c.similarity;
                    }
                    for (const s of Object.values(lensStats)) {
                        s.avgSimilarity = s.count > 0 ? Math.round((s.avgSimilarity / s.count) * 1000) / 1000 : 0;
                    }
                    traceEntries.push({
                        node: "discovery",
                        detail: `Query: "${searchText.slice(0, 50)}${searchText.length > 50 ? '...' : ''}" → ${candidates.length} candidate(s)`,
                        data: {
                            query: searchText.slice(0, 100),
                            lenses: usedLenses,
                            candidateCount: candidates.length,
                            byLens: lensStats,
                            durationMs: Date.now() - startTime,
                            model: getModelName("hydeGenerator"),
                        },
                    });
                    // Show the HyDE-generated hypothetical documents used for search
                    const hydeDocuments = hydeResult.hydeDocuments;
                    if (hydeDocuments) {
                        for (const [lens, doc] of Object.entries(hydeDocuments)) {
                            if (doc?.hydeText) {
                                traceEntries.push({
                                    node: "hyde_query",
                                    detail: `[${lens}] "${doc.hydeText.slice(0, 120)}${doc.hydeText.length > 120 ? '...' : ''}"`,
                                    data: {
                                        lens,
                                        hydeTextPreview: doc.hydeText.slice(0, 160) + (doc.hydeText.length > 160 ? '...' : ''),
                                    },
                                });
                            }
                        }
                    }
                    // Add top candidates with similarity scores
                    const sortedCandidates = [...candidates].sort((a, b) => b.similarity - a.similarity).slice(0, 10);
                    for (const c of sortedCandidates) {
                        traceEntries.push({
                            node: "match",
                            detail: `Similarity ${Math.round(c.similarity * 100)}% via ${c.lens}`,
                            data: {
                                userId: c.candidateUserId,
                                similarity: Math.round(c.similarity * 100),
                                lens: c.lens,
                                hasIntent: !!c.candidateIntentId,
                            },
                        });
                    }
                    return {
                        hydeEmbeddings: hydeEmbeddings,
                        candidates: filterByTarget(candidates),
                        trace: traceEntries,
                    };
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    logger.error('[Graph:Discovery] Failed', { error });
                    return {
                        candidates: [],
                        error: 'Failed to search for candidates.',
                        trace: [{
                                node: "discovery_fatal",
                                detail: `Discovery failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        }, (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            const candidates = r?.candidates;
            return candidates ? `Found ${candidates.length} candidate(s)` : undefined;
        });
        /**
         * Node 3: Evaluation (Entity bundle)
         * Builds entity bundle from source + candidates, invokes entity-bundle evaluator, maps to EvaluatedOpportunity with networkId from entities.
         */
        const evaluationNode = async (state) => {
            return timed("OpportunityGraph.evaluation", async () => {
                const startTime = Date.now();
                logger.verbose('[Graph:Evaluation] Starting evaluation', {
                    candidatesCount: state.candidates.length,
                });
                if (state.candidates.length === 0) {
                    logger.verbose('[Graph:Evaluation] No candidates to evaluate');
                    return { evaluatedOpportunities: [], agentTimings: [] };
                }
                // Batch candidates to avoid timeout - evaluate top 25 per batch, store remaining
                const EVAL_BATCH_SIZE = 25;
                const sortedCandidates = [...state.candidates]
                    .sort((a, b) => b.similarity - a.similarity);
                // Dedup by userId — when same similarity, prefer index with highest relevancyScore
                const bestByUser = new Map();
                for (const c of sortedCandidates) {
                    const existing = bestByUser.get(c.candidateUserId);
                    if (!existing) {
                        bestByUser.set(c.candidateUserId, c);
                    }
                    else if (c.similarity > existing.similarity) {
                        bestByUser.set(c.candidateUserId, c);
                    }
                    else if (c.similarity === existing.similarity) {
                        // Tie-break: prefer index with higher relevancy score
                        const cScore = state.indexRelevancyScores[c.networkId] ?? 0;
                        const existingScore = state.indexRelevancyScores[existing.networkId] ?? 0;
                        if (cScore > existingScore) {
                            bestByUser.set(c.candidateUserId, c);
                        }
                    }
                }
                const dedupedCandidates = Array.from(bestByUser.values());
                // Re-sort by similarity descending (Map iteration order doesn't guarantee sort)
                dedupedCandidates.sort((a, b) => b.similarity - a.similarity);
                if (dedupedCandidates.length < sortedCandidates.length) {
                    logger.info("[Graph:Evaluation] Deduped candidates by userId", {
                        before: sortedCandidates.length,
                        after: dedupedCandidates.length,
                        removed: sortedCandidates.length - dedupedCandidates.length,
                    });
                }
                const batchToEvaluate = dedupedCandidates.slice(0, EVAL_BATCH_SIZE);
                const remaining = dedupedCandidates.slice(EVAL_BATCH_SIZE);
                // Early termination: if search was query-driven and no query-sourced candidates remain,
                // clear remaining to prevent pointless pagination through profile-similarity leftovers
                const isQueryDriven = !!state.searchQuery?.trim();
                const queryRemaining = remaining.filter((c) => c.discoverySource === 'query' || c.discoverySource == null);
                const effectiveRemaining = isQueryDriven && queryRemaining.length === 0 ? [] : remaining;
                if (isQueryDriven && remaining.length > 0 && queryRemaining.length === 0) {
                    logger.info("[Graph:Evaluation] Early termination: no query-sourced candidates remain", {
                        droppedProfileCandidates: remaining.length,
                    });
                }
                if (effectiveRemaining.length > 0) {
                    logger.verbose('[Graph:Evaluation] Batched candidates for evaluation', {
                        evaluating: batchToEvaluate.length,
                        remaining: effectiveRemaining.length,
                        total: sortedCandidates.length,
                    });
                }
                const agentTimingsAccum = [];
                try {
                    const discoveryUserId = state.onBehalfOfUserId ?? state.userId;
                    const sourceProfile = await this.database.getProfile(discoveryUserId);
                    const sourceEntity = {
                        userId: discoveryUserId,
                        profile: {
                            name: sourceProfile?.identity?.name,
                            bio: sourceProfile?.identity?.bio,
                            location: sourceProfile?.identity?.location,
                            interests: sourceProfile?.attributes?.interests,
                            skills: sourceProfile?.attributes?.skills,
                            context: sourceProfile?.narrative?.context,
                        },
                        intents: state.indexedIntents.slice(0, 5).map((i) => ({
                            intentId: i.intentId,
                            payload: i.payload,
                            summary: i.summary,
                        })),
                        networkId: '', // Placeholder — overwritten per-pairing below
                        ragScore: undefined,
                        matchedVia: undefined,
                    };
                    const candidateEntities = await Promise.all(batchToEvaluate.map(async (c) => {
                        const profile = await this.database.getProfile(c.candidateUserId);
                        let intentPayload = c.candidatePayload;
                        let intentSummary = c.candidateSummary;
                        if (c.candidateIntentId != null && (!intentPayload || intentPayload === '')) {
                            const intent = await this.database.getIntent(c.candidateIntentId);
                            if (intent) {
                                intentPayload = intent.payload;
                                intentSummary = intent.summary ?? undefined;
                            }
                        }
                        return {
                            userId: c.candidateUserId,
                            profile: {
                                name: profile?.identity?.name,
                                bio: profile?.identity?.bio,
                                location: profile?.identity?.location,
                                interests: profile?.attributes?.interests,
                                skills: profile?.attributes?.skills,
                                context: profile?.narrative?.context,
                            },
                            intents: c.candidateIntentId != null
                                ? [{ intentId: c.candidateIntentId, payload: intentPayload ?? '', summary: intentSummary }]
                                : undefined,
                            networkId: c.networkId,
                            ragScore: c.similarity * 100,
                            matchedVia: c.lens,
                        };
                    }));
                    const userIdToIndexId = new Map();
                    for (const e of candidateEntities) {
                        if (!userIdToIndexId.has(e.userId))
                            userIdToIndexId.set(e.userId, e.networkId);
                    }
                    // Lower default threshold to 50 for better recall
                    const minScore = state.options.minScore ?? 50;
                    const evaluator = typeof evaluatorAgent.invokeEntityBundle === 'function'
                        ? evaluatorAgent
                        : new OpportunityEvaluator();
                    const runParallel = process.env.RUN_OPPORTUNITY_EVAL_IN_PARALLEL === 'true';
                    // Declare trace entries early so both parallel and serial paths can push error entries
                    const traceEntries = [];
                    const parallelErrors = [];
                    let pairwiseOpportunities;
                    if (runParallel) {
                        // Experimental: one LLM call per candidate, all fired in parallel
                        logger.verbose('[Graph:Evaluation] Running parallel evaluation', { candidates: candidateEntities.length });
                        const parallelResults = await Promise.all(candidateEntities.map((candidateEntity) => {
                            const input = {
                                discovererId: discoveryUserId,
                                entities: [sourceEntity, candidateEntity],
                                existingOpportunities: state.options.existingOpportunities,
                                ...(state.searchQuery?.trim() ? { discoveryQuery: state.searchQuery.trim() } : {}),
                            };
                            const _evalStart = Date.now();
                            const _traceEmitter = requestContext.getStore()?.traceEmitter;
                            _traceEmitter?.({ type: "agent_start", name: "opportunity-evaluator" });
                            const _candidateName = candidateEntity.profile?.name ?? "Unknown";
                            return evaluator.invokeEntityBundle(input, { minScore, returnAll: true })
                                .then((res) => {
                                const _evalDuration = Date.now() - _evalStart;
                                agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _evalDuration });
                                const _topScore = res.length > 0 ? Math.max(...res.map(r => r.score)) : -1;
                                const _summary = _topScore < 0 ? `${_candidateName}: no match` : `${_candidateName}: ${_topScore}`;
                                _traceEmitter?.({ type: "agent_end", name: "opportunity-evaluator", durationMs: _evalDuration, summary: _summary });
                                return res;
                            })
                                .catch((err) => {
                                const _evalDuration = Date.now() - _evalStart;
                                const _errMsg = err instanceof Error ? err.message : String(err);
                                agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _evalDuration });
                                _traceEmitter?.({ type: "agent_end", name: "opportunity-evaluator", durationMs: _evalDuration, summary: `${_candidateName}: error — ${_errMsg}` });
                                logger.warn('[Graph:Evaluation] Parallel eval failed for candidate', {
                                    candidateUserId: candidateEntity.userId,
                                    error: err,
                                });
                                parallelErrors.push({
                                    candidateUserId: candidateEntity.userId,
                                    candidateName: _candidateName,
                                    error: _errMsg,
                                    durationMs: _evalDuration,
                                });
                                return [];
                            });
                        }));
                        // Each call is already pairwise (source + 1 candidate) — flatten directly
                        pairwiseOpportunities = parallelResults.flat();
                        // Record trace entries for candidates that failed during parallel evaluation
                        if (parallelErrors.length > 0) {
                            traceEntries.push({
                                node: "evaluation_errors",
                                detail: `${parallelErrors.length}/${candidateEntities.length} candidate evaluation(s) failed`,
                                data: {
                                    failedCount: parallelErrors.length,
                                    totalCandidates: candidateEntities.length,
                                    errors: parallelErrors.map(e => ({
                                        candidateUserId: e.candidateUserId,
                                        candidateName: e.candidateName,
                                        error: e.error,
                                        durationMs: e.durationMs,
                                    })),
                                },
                            });
                        }
                    }
                    else {
                        // Default: single bundled LLM call with all candidates
                        const entities = [sourceEntity, ...candidateEntities];
                        const input = {
                            discovererId: discoveryUserId,
                            entities,
                            existingOpportunities: state.options.existingOpportunities,
                            ...(state.searchQuery?.trim() ? { discoveryQuery: state.searchQuery.trim() } : {}),
                        };
                        // Get ALL scored results for tracing (returnAll: true), filter for persistence later
                        const _evalStart = Date.now();
                        const _traceEmitterSerial = requestContext.getStore()?.traceEmitter;
                        _traceEmitterSerial?.({ type: "agent_start", name: "opportunity-evaluator" });
                        let opportunitiesWithActors;
                        try {
                            opportunitiesWithActors = await evaluator.invokeEntityBundle(input, { minScore, returnAll: true });
                            const _evalDuration = Date.now() - _evalStart;
                            agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _evalDuration });
                            _traceEmitterSerial?.({ type: "agent_end", name: "opportunity-evaluator", durationMs: _evalDuration, summary: `Evaluated ${candidateEntities.length} candidate(s)` });
                        }
                        catch (serialErr) {
                            const _evalDuration = Date.now() - _evalStart;
                            const _errMsg = serialErr instanceof Error ? serialErr.message : String(serialErr);
                            agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _evalDuration });
                            _traceEmitterSerial?.({ type: "agent_end", name: "opportunity-evaluator", durationMs: _evalDuration, summary: `error — ${_errMsg}` });
                            throw serialErr; // Re-throw for the outer catch to handle
                        }
                        // Split multi-actor evaluator results into pairwise (viewer + candidate).
                        // Each persisted discovery opportunity should have exactly 2 actors.
                        // When splitting, build per-candidate reasoning from entity data because
                        // the shared reasoning typically describes only one candidate.
                        pairwiseOpportunities = [];
                        for (const op of opportunitiesWithActors) {
                            const pairwiseSourceId = state.onBehalfOfUserId ?? state.userId;
                            const nonViewerActors = op.actors.filter(a => a.userId !== pairwiseSourceId);
                            if (nonViewerActors.length <= 1) {
                                pairwiseOpportunities.push(op);
                            }
                            else {
                                logger.warn('[Graph:Evaluation] Splitting multi-actor opportunity; LLM returned bundled actors instead of one-per-candidate', {
                                    actorCount: nonViewerActors.length,
                                    userIds: nonViewerActors.map(a => a.userId),
                                });
                                const viewerActor = op.actors.find(a => a.userId === pairwiseSourceId);
                                for (const candidate of nonViewerActors) {
                                    const entity = candidateEntities.find(e => e.userId === candidate.userId);
                                    const candidateName = entity?.profile?.name ?? '';
                                    const reasoningLower = op.reasoning.toLowerCase();
                                    const mentionsCandidate = candidateName !== '' &&
                                        reasoningLower.includes(candidateName.toLowerCase());
                                    const mentionsOtherCandidate = nonViewerActors
                                        .filter((actor) => actor.userId !== candidate.userId)
                                        .map((actor) => candidateEntities.find((e) => e.userId === actor.userId)?.profile?.name?.toLowerCase())
                                        .some((name) => name != null && reasoningLower.includes(name));
                                    let reasoning;
                                    if (mentionsCandidate && !mentionsOtherCandidate) {
                                        reasoning = op.reasoning;
                                    }
                                    else if (entity?.profile) {
                                        const p = entity.profile;
                                        const parts = [p.name, p.bio].filter(Boolean);
                                        if (p.skills?.length)
                                            parts.push(`Skills: ${p.skills.join(', ')}`);
                                        if (p.interests?.length)
                                            parts.push(`Interests: ${p.interests.join(', ')}`);
                                        reasoning = parts.join('. ') || op.reasoning;
                                    }
                                    else {
                                        reasoning = op.reasoning;
                                    }
                                    pairwiseOpportunities.push({
                                        reasoning,
                                        score: op.score,
                                        actors: [
                                            viewerActor ?? { userId: pairwiseSourceId, role: 'patient', intentId: null },
                                            candidate,
                                        ],
                                    });
                                }
                            }
                        }
                    }
                    const evaluatedOpportunities = pairwiseOpportunities.map((op) => ({
                        reasoning: op.reasoning,
                        score: op.score,
                        actors: op.actors.map((a) => {
                            const isSource = a.userId === discoveryUserId;
                            if (isSource) {
                                // Source actor inherits the counterpart's networkId (shared match context)
                                const counterpart = op.actors.find((other) => other.userId !== a.userId);
                                const counterpartIndexId = counterpart
                                    ? userIdToIndexId.get(counterpart.userId) ?? candidateEntities.find((e) => e.userId === counterpart.userId)?.networkId
                                    : undefined;
                                return {
                                    userId: a.userId,
                                    role: a.role,
                                    intentId: a.intentId,
                                    networkId: counterpartIndexId ?? userIdToIndexId.get(a.userId) ?? '',
                                };
                            }
                            return {
                                userId: a.userId,
                                role: a.role,
                                intentId: a.intentId,
                                networkId: userIdToIndexId.get(a.userId) ?? candidateEntities.find((e) => e.userId === a.userId)?.networkId,
                            };
                        }),
                    }));
                    const passed = evaluatedOpportunities.filter((o) => o.score >= minScore);
                    logger.verbose('[Graph:Evaluation] Evaluation complete', {
                        evaluatedCount: evaluatedOpportunities.length,
                        passed: passed.length,
                    });
                    // Build detailed trace entries for each evaluated candidate
                    // Threshold filter trace: how many candidates in this batch were above/below similarity threshold
                    const aboveThreshold = batchToEvaluate.filter(c => c.similarity >= 0.40).length;
                    const belowThreshold = batchToEvaluate.length - aboveThreshold;
                    traceEntries.push({
                        node: "threshold_filter",
                        detail: `${aboveThreshold} above 0.40, ${belowThreshold} below (batch of ${batchToEvaluate.length})`,
                        data: {
                            aboveThreshold,
                            belowThreshold,
                            minScore: 0.40,
                            batchSize: batchToEvaluate.length,
                        },
                    });
                    // Create a map of evaluated candidates by userId for quick lookup.
                    // Use discoveryUserId (which accounts for onBehalfOfUserId in introducer flow)
                    // rather than state.userId (which is the introducer, not present in pairwise actors).
                    const evaluatedByUserId = new Map();
                    for (const opp of evaluatedOpportunities) {
                        const candidateActor = opp.actors.find(a => a.userId !== discoveryUserId);
                        if (candidateActor) {
                            evaluatedByUserId.set(candidateActor.userId, { score: opp.score, reasoning: opp.reasoning });
                        }
                    }
                    // Summary entry
                    traceEntries.push({
                        node: "evaluation",
                        detail: `Evaluated ${candidateEntities.length} candidate(s) → ${passed.length} passed (min score ${minScore})`,
                        data: {
                            inputCandidates: batchToEvaluate.length,
                            returnedFromEvaluator: evaluatedOpportunities.length,
                            passedCount: passed.length,
                            minScore,
                            remaining: effectiveRemaining.length,
                            batchNumber: 1,
                            durationMs: Date.now() - startTime,
                            model: getModelName("opportunityEvaluator"),
                        },
                    });
                    // Individual candidate entries - show ALL candidates that went to evaluator
                    for (const entity of candidateEntities) {
                        const candidateName = entity.profile?.name || entity.userId.slice(0, 8);
                        const candidateBio = entity.profile?.bio;
                        const evaluated = evaluatedByUserId.get(entity.userId);
                        const score = evaluated?.score;
                        const reasoning = evaluated?.reasoning;
                        const didPass = score !== undefined && score >= minScore;
                        const status = score !== undefined
                            ? (didPass ? '✓ passed' : `✗ score ${score}`)
                            : '✗ not scored';
                        traceEntries.push({
                            node: "candidate",
                            detail: `${candidateName}: ${status}`,
                            data: {
                                userId: entity.userId,
                                name: candidateName,
                                bio: candidateBio,
                                score: score,
                                passed: didPass,
                                reasoning: reasoning || 'No evaluation returned for this candidate',
                                matchedVia: entity.matchedVia,
                                ragScore: entity.ragScore,
                                model: getModelName("opportunityEvaluator"),
                                intents: entity.intents?.map((i) => ({
                                    intentId: i.intentId,
                                    summary: (i.summary || i.payload || '').slice(0, 100),
                                })),
                                profile: entity.profile ? {
                                    name: entity.profile.name,
                                    location: entity.profile.location,
                                } : undefined,
                            },
                        });
                    }
                    // Only pass opportunities that passed the threshold to downstream nodes
                    const passedOpportunities = evaluatedOpportunities.filter((o) => o.score >= minScore);
                    return {
                        evaluatedOpportunities: passedOpportunities,
                        remainingCandidates: effectiveRemaining,
                        trace: traceEntries,
                        agentTimings: agentTimingsAccum,
                    };
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    logger.error('[Graph:Evaluation] Failed', { error });
                    return {
                        evaluatedOpportunities: [],
                        error: 'Failed to evaluate candidates.',
                        trace: [{
                                node: "evaluation_fatal",
                                detail: `Evaluation failed: ${errMsg}`,
                                data: {
                                    error: errMsg,
                                    candidateCount: state.candidates?.length ?? 0,
                                    durationMs: Date.now() - startTime,
                                },
                            }],
                        agentTimings: agentTimingsAccum,
                    };
                }
            });
        };
        /**
         * Node 3b: Negotiate
         * Runs bilateral negotiation between source user and each evaluated candidate.
         * Filters out candidates that fail to produce an opportunity; updates scores for those that pass.
         */
        const negotiateNode = async (state) => {
            if (!this.negotiationGraph)
                return {};
            const traceEmitter = requestContext.getStore()?.traceEmitter;
            const graphStart = Date.now();
            traceEmitter?.({ type: "graph_start", name: "Negotiation graph" });
            try {
                // Use the same discoveryUserId pattern as evaluationNode
                const discoveryUserId = (state.onBehalfOfUserId ?? state.userId);
                const sourceAccount = await this.database.getUser(discoveryUserId).catch(() => null);
                const sourceUser = {
                    id: discoveryUserId,
                    intents: state.indexedIntents?.slice(0, 5).map(i => ({
                        id: i.intentId,
                        title: i.summary ?? '',
                        description: i.payload ?? '',
                        confidence: 1,
                    })) ?? [],
                    profile: {
                        name: state.sourceProfile?.identity?.name ?? sourceAccount?.name,
                        bio: state.sourceProfile?.identity?.bio ?? sourceAccount?.intro ?? undefined,
                        location: state.sourceProfile?.identity?.location ?? sourceAccount?.location ?? undefined,
                        skills: state.sourceProfile?.attributes?.skills,
                        interests: state.sourceProfile?.attributes?.interests,
                    },
                };
                // Build candidates with enriched context from database.
                // Each actor carries its own networkId — use it for per-candidate index context.
                const candidateEntries = state.evaluatedOpportunities
                    .map(opp => {
                    const candidateActor = opp.actors.find(a => a.userId !== discoveryUserId);
                    if (!candidateActor)
                        return null;
                    return { opp, candidateActor };
                })
                    .filter((e) => e !== null);
                const candidates = await Promise.all(candidateEntries.map(async ({ opp, candidateActor }) => {
                    const userId = candidateActor.userId;
                    const [profile, user, activeIntents, intent] = await Promise.all([
                        this.database.getProfile(userId).catch(() => null),
                        this.database.getUser(userId).catch(() => null),
                        this.database.getActiveIntents(userId).catch(() => []),
                        candidateActor.intentId
                            ? this.database.getIntent(candidateActor.intentId).catch(() => null)
                            : null,
                    ]);
                    // Prefer active intents (capped at 5, trigger intent first); fall back to single intent.
                    // If the trigger intent was archived but we fetched it by ID, prepend it so negotiation
                    // always includes the intent that produced the opportunity match.
                    const toNegIntent = (ai) => ({
                        id: (ai.id ?? candidateActor.intentId),
                        title: ai.summary ?? '',
                        description: ai.payload ?? '',
                        confidence: 1,
                    });
                    const triggerInActive = activeIntents.some(ai => ai.id === candidateActor.intentId);
                    const triggerFallback = !triggerInActive && intent ? [toNegIntent(intent)] : [];
                    const candidateIntents = [
                        ...triggerFallback,
                        ...activeIntents.filter(ai => ai.id === candidateActor.intentId).map(toNegIntent),
                        ...activeIntents.filter(ai => ai.id !== candidateActor.intentId).map(toNegIntent),
                    ].slice(0, 5);
                    return {
                        userId,
                        score: opp.score,
                        reasoning: opp.reasoning,
                        valencyRole: candidateActor.role ?? 'peer',
                        networkId: candidateActor.networkId,
                        candidateUser: {
                            id: userId,
                            intents: candidateIntents,
                            profile: {
                                name: profile?.identity?.name ?? user?.name,
                                bio: profile?.identity?.bio ?? user?.intro ?? undefined,
                                location: profile?.identity?.location ?? user?.location ?? undefined,
                                skills: profile?.attributes?.skills,
                                interests: profile?.attributes?.interests,
                            },
                        },
                    };
                }));
                const isChatPath = !!state.options?.conversationId;
                const maxTurns = isChatPath ? 4 : 6;
                // Fetch per-candidate index context (group by networkId to avoid duplicate lookups)
                const uniqueIndexIds = [...new Set(candidates.map(c => c.networkId).filter((id) => !!id))];
                const indexContextMap = new Map();
                await Promise.all(uniqueIndexIds.map(async (networkId) => {
                    const ctx = await this.database.getIndexMemberContext(networkId, discoveryUserId).catch(() => null);
                    const prompt = [ctx?.indexPrompt, ctx?.memberPrompt]
                        .filter((v) => !!v?.trim())
                        .join('\n\n');
                    if (prompt)
                        indexContextMap.set(networkId, prompt);
                }));
                // Run negotiations per candidate with their actual index context
                const acceptedResults = await negotiateCandidates(this.negotiationGraph, sourceUser, candidates, { networkId: '', prompt: '' }, // base context, overridden per-candidate below
                { maxTurns, traceEmitter: traceEmitter ?? undefined,
                    indexContextOverrides: indexContextMap });
                // Filter opportunities to only those with an opportunity outcome, update scores
                const acceptedMap = new Map(acceptedResults.map(r => [r.userId, r]));
                const updatedOpportunities = state.evaluatedOpportunities
                    .filter(opp => {
                    const candidateActor = opp.actors.find(a => a.userId !== discoveryUserId);
                    return candidateActor && acceptedMap.has(candidateActor.userId);
                })
                    .map(opp => {
                    const candidateActor = opp.actors.find(a => a.userId !== discoveryUserId);
                    const negResult = candidateActor && acceptedMap.get(candidateActor.userId);
                    return negResult ? { ...opp, score: negResult.negotiationScore } : opp;
                });
                traceEmitter?.({ type: "graph_end", name: "Negotiation graph", durationMs: Date.now() - graphStart });
                return { evaluatedOpportunities: updatedOpportunities };
            }
            catch (err) {
                logger.error("[Graph:Negotiate] Negotiation stage failed", { error: err });
                traceEmitter?.({ type: "graph_end", name: "Negotiation graph", durationMs: Date.now() - graphStart });
                return { evaluatedOpportunities: [] };
            }
        };
        /**
         * Node 4: Ranking
         * Sorts evaluated opportunities by score, applies limit, dedupes by actor-set hash.
         */
        const rankingNode = withNodeTrace("opportunity-ranking", async (state) => {
            return timed("OpportunityGraph.ranking", async () => {
                logger.verbose('[Graph:Ranking] Starting ranking', {
                    evaluatedCount: state.evaluatedOpportunities.length,
                });
                try {
                    const sorted = [...state.evaluatedOpportunities].sort((a, b) => b.score - a.score);
                    const limit = state.options.limit ?? 20;
                    const ranked = sorted.slice(0, limit);
                    const actorSetKey = (opp) => opp.actors
                        .map((a) => `${a.userId}:${a.networkId}`)
                        .sort()
                        .join('|');
                    const seen = new Set();
                    const deduplicated = ranked.filter((opp) => {
                        const key = actorSetKey(opp);
                        if (seen.has(key))
                            return false;
                        seen.add(key);
                        return true;
                    });
                    logger.verbose('[Graph:Ranking] Ranking complete', {
                        sorted: sorted.length,
                        afterLimit: ranked.length,
                        afterDedup: deduplicated.length,
                    });
                    return { evaluatedOpportunities: deduplicated };
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    logger.error('[Graph:Ranking] Failed', { error });
                    return {
                        evaluatedOpportunities: [],
                        error: 'Failed to rank opportunities.',
                        trace: [{
                                node: "ranking_fatal",
                                detail: `Ranking failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        }, (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            const opps = r?.evaluatedOpportunities;
            return opps ? `Ranked ${opps.length} opportunity(ies)` : undefined;
        });
        /**
         * Node: intro_validation (create_introduction path)
         * Validates index scope, membership for introducer and all party users, and no existing opportunity.
         */
        const introValidationNode = async (state) => {
            return timed("OpportunityGraph.introValidation", async () => {
                logger.verbose('[Graph:IntroValidation] Starting', {
                    userId: state.userId,
                    networkId: state.networkId,
                    entitiesCount: state.introductionEntities?.length ?? 0,
                });
                try {
                    const entities = state.introductionEntities ?? [];
                    const primaryNetworkId = (state.networkId ?? entities[0]?.networkId);
                    const partyUserIds = [...new Set(entities.map((e) => e.userId).filter((id) => id !== state.userId))];
                    if (!primaryNetworkId || partyUserIds.length < 1) {
                        return {
                            error: 'Introduction requires networkId and at least two entities (introducer + one counterpart).',
                        };
                    }
                    if (state.requiredNetworkId && primaryNetworkId !== state.requiredNetworkId) {
                        return {
                            error: 'This chat is scoped to a different community. You can only introduce members of the current community.',
                        };
                    }
                    const [introducerIsMember, introducerIsOwner] = await Promise.all([
                        this.database.isNetworkMember(primaryNetworkId, state.userId),
                        this.database.isIndexOwner(primaryNetworkId, state.userId),
                    ]);
                    if (!introducerIsMember && !introducerIsOwner) {
                        return {
                            error: 'One or more users are not members of the specified community. You can only introduce members who share a network.',
                        };
                    }
                    const partyInScope = await Promise.all(partyUserIds.map(async (userId) => {
                        const [isMember, isOwner] = await Promise.all([
                            this.database.isNetworkMember(primaryNetworkId, userId),
                            this.database.isIndexOwner(primaryNetworkId, userId),
                        ]);
                        return isMember || isOwner;
                    }));
                    const allPartyMembers = partyInScope.every(Boolean);
                    if (!allPartyMembers) {
                        return {
                            error: 'One or more users are not members of the specified community. You can only introduce members who share a network.',
                        };
                    }
                    const exists = await this.database.opportunityExistsBetweenActors(partyUserIds, primaryNetworkId);
                    if (exists) {
                        return { error: 'An opportunity already exists between these people.' };
                    }
                    logger.verbose('[Graph:IntroValidation] Validation passed');
                    return {};
                }
                catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    logger.error('[Graph:IntroValidation] Failed', {
                        userId: state.userId,
                        networkId: state.networkId,
                        error: err,
                    });
                    return {
                        error: 'Introduction validation failed.',
                        trace: [{
                                node: "intro_validation_fatal",
                                detail: `IntroValidation failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        };
        /**
         * Build fallback reasoning and actors when evaluator returns empty or throws.
         */
        function buildIntroFallback(entities, state, primaryNetworkId, introducerName) {
            const reasoning = `${introducerName ?? 'A member'} believes these people should connect.` +
                (state.introductionHint ? ` Context: ${state.introductionHint}` : '');
            const score = 70;
            const partyUserIds = entities.map((e) => e.userId).filter((id) => id !== state.userId);
            const actors = partyUserIds.map((uid) => ({
                userId: uid,
                role: 'peer',
                networkId: primaryNetworkId,
            }));
            return { reasoning, score, actors };
        }
        /**
         * Node: intro_evaluation (create_introduction path)
         * Runs entity-bundle evaluator and sets evaluatedOpportunities (one) + introductionContext.
         */
        const introEvaluationNode = async (state) => {
            return timed("OpportunityGraph.introEvaluation", async () => {
                logger.verbose('[Graph:IntroEvaluation] Starting', { userId: state.userId });
                if (state.error) {
                    return { evaluatedOpportunities: [], agentTimings: [] };
                }
                const entities = state.introductionEntities ?? [];
                const primaryNetworkId = (state.networkId ?? entities[0]?.networkId);
                if (!primaryNetworkId || entities.length < 2) {
                    return { evaluatedOpportunities: [], error: 'Missing entities or network for introduction.', agentTimings: [] };
                }
                const agentTimingsAccum = [];
                let introducerName;
                let reasoning;
                let score;
                let actors = [];
                const _traceEmitterIntro = requestContext.getStore()?.traceEmitter;
                let _introEvalStarted = false;
                let _evalStart = Date.now();
                try {
                    const introducerUser = await this.database.getUser(state.userId);
                    introducerName = introducerUser?.name ?? undefined;
                    const input = {
                        discovererId: state.userId,
                        entities,
                        introductionMode: true,
                        introducerName,
                        introductionHint: state.introductionHint ?? undefined,
                    };
                    _evalStart = Date.now();
                    _traceEmitterIntro?.({ type: "agent_start", name: "intro-evaluator" });
                    _introEvalStarted = true;
                    const evaluated = await evaluatorAgent.invokeEntityBundle(input, { minScore: 0 });
                    const _introDuration = Date.now() - _evalStart;
                    agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _introDuration });
                    _traceEmitterIntro?.({ type: "agent_end", name: "intro-evaluator", durationMs: _introDuration, summary: "Evaluated introduction" });
                    if (evaluated.length > 0) {
                        const best = evaluated[0];
                        reasoning = best.reasoning;
                        score = best.score;
                        actors = best.actors.map((a) => ({
                            userId: a.userId,
                            role: a.role,
                            intentId: a.intentId ?? undefined,
                            networkId: primaryNetworkId,
                        }));
                    }
                    else {
                        const fallback = buildIntroFallback(entities, state, primaryNetworkId, introducerName);
                        reasoning = fallback.reasoning;
                        score = fallback.score;
                        actors = fallback.actors;
                    }
                }
                catch (evalErr) {
                    const errMsg = evalErr instanceof Error ? evalErr.message : String(evalErr);
                    // Close the intro-evaluator span if it was started before the error
                    if (_introEvalStarted) {
                        const _introErrDuration = Date.now() - _evalStart;
                        _traceEmitterIntro?.({ type: "agent_end", name: "intro-evaluator", durationMs: _introErrDuration, summary: `error — ${errMsg}` });
                        agentTimingsAccum.push({ name: 'opportunity.evaluator', durationMs: _introErrDuration });
                    }
                    logger.warn('[Graph:IntroEvaluation] Evaluator or getUser failed, using fallback', { error: evalErr });
                    const fallback = buildIntroFallback(entities, state, primaryNetworkId, introducerName);
                    reasoning = fallback.reasoning;
                    score = fallback.score;
                    actors = fallback.actors;
                    return {
                        evaluatedOpportunities: [{ actors, score, reasoning }],
                        introductionContext: { createdByName: introducerName },
                        options: { ...state.options, initialStatus: state.options.initialStatus ?? 'latent' },
                        agentTimings: agentTimingsAccum,
                        trace: [{
                                node: "intro_evaluation_fatal",
                                detail: `IntroEvaluation failed (using fallback): ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
                const evaluatedOpportunity = {
                    actors,
                    score,
                    reasoning,
                };
                return {
                    evaluatedOpportunities: [evaluatedOpportunity],
                    introductionContext: { createdByName: introducerName },
                    options: { ...state.options, initialStatus: state.options.initialStatus ?? 'latent' },
                    agentTimings: agentTimingsAccum,
                };
            });
        };
        /**
         * Node 5: Persist
         * Creates opportunities from evaluator-proposed actors (networkId, userId, role, optional intent).
         */
        const persistNode = withNodeTrace("opportunity-persist", async (state) => {
            return timed("OpportunityGraph.persist", async () => {
                const startTime = Date.now();
                logger.verbose('[Graph:Persist] Starting persistence (dedup-v2)', {
                    opportunitiesToCreate: state.evaluatedOpportunities.length,
                    initialStatus: state.options.initialStatus ?? 'pending',
                });
                if (state.evaluatedOpportunities.length === 0) {
                    logger.verbose('[Graph:Persist] No opportunities to persist');
                    return { opportunities: [] };
                }
                try {
                    const itemsToPersist = [];
                    const reactivatedOpportunities = [];
                    const existingBetweenActors = [];
                    const now = new Date().toISOString();
                    const initialStatus = state.options.initialStatus ?? 'pending';
                    // Only skip 'draft' (chat-only) opportunities during dedup.
                    // 'latent' must NOT be skipped — background discovery creates latent opportunities,
                    // and excluding them causes the same user pair to get duplicate opportunities
                    // when multiple intents trigger separate discovery jobs (IND-166).
                    const DEDUP_SKIP_STATUSES = ['draft'];
                    const introducerUserForOnBehalf = state.onBehalfOfUserId
                        ? await this.database.getUser(state.userId)
                        : null;
                    for (const evaluated of state.evaluatedOpportunities) {
                        const indexIdForActors = state.networkId ?? evaluated.actors[0]?.networkId;
                        let actors;
                        let data;
                        logger.verbose('[Graph:Persist:PathSelect]', {
                            isIntroduction: !!state.introductionContext,
                            stateUserId: state.userId,
                            stateIndexId: state.networkId,
                            evaluatedActorUserIds: evaluated.actors.map(a => a.userId),
                        });
                        if (state.introductionContext) {
                            if (indexIdForActors === undefined) {
                                logger.warn('[Graph:Persist] Introduction path missing networkId; skipping opportunity', {
                                    userId: state.userId,
                                    actorsCount: evaluated.actors.length,
                                });
                                continue;
                            }
                            // Introduction path: manual detection, introducer actor, curator_judgment signal.
                            const evaluatorActors = evaluated.actors.map((a) => ({
                                networkId: a.networkId ?? indexIdForActors,
                                userId: a.userId,
                                role: a.role,
                                ...(a.intentId ? { intent: a.intentId } : {}),
                            }));
                            const viewerAlreadyInActors = evaluatorActors.some(a => a.userId === state.userId);
                            actors = viewerAlreadyInActors
                                ? evaluatorActors
                                : [
                                    ...evaluatorActors,
                                    { networkId: indexIdForActors, userId: state.userId, role: 'introducer' },
                                ];
                            data = {
                                detection: {
                                    source: 'manual',
                                    createdBy: state.userId,
                                    createdByName: state.introductionContext.createdByName,
                                    timestamp: now,
                                },
                                actors,
                                interpretation: {
                                    category: 'collaboration',
                                    reasoning: evaluated.reasoning,
                                    confidence: evaluated.score / 100,
                                    signals: [
                                        {
                                            type: 'curator_judgment',
                                            weight: 1,
                                            detail: `Introduction by ${state.introductionContext.createdByName ?? 'a member'} via chat`,
                                        },
                                    ],
                                },
                                context: {
                                    networkId: state.networkId ?? indexIdForActors,
                                    ...(state.options.conversationId ? { conversationId: state.options.conversationId } : {}),
                                },
                                confidence: String(evaluated.score / 100),
                                status: initialStatus,
                            };
                        }
                        else if (state.onBehalfOfUserId) {
                            if (indexIdForActors === undefined) {
                                logger.warn('[Graph:Persist] Introducer discovery path missing networkId; skipping opportunity', {
                                    userId: state.userId,
                                    actorsCount: evaluated.actors.length,
                                });
                                continue;
                            }
                            // Introducer discovery path: manual detection, introducer is state.userId, target is onBehalfOfUserId.
                            const evaluatorActors = evaluated.actors.map((a) => ({
                                networkId: a.networkId ?? indexIdForActors,
                                userId: a.userId,
                                role: a.role,
                                ...(a.intentId ? { intent: a.intentId } : {}),
                            }));
                            const viewerAlreadyInActors = evaluatorActors.some(a => a.userId === state.userId);
                            actors = viewerAlreadyInActors
                                ? evaluatorActors
                                : [
                                    ...evaluatorActors,
                                    { networkId: indexIdForActors, userId: state.userId, role: 'introducer' },
                                ];
                            const candidateUserId = evaluated.actors.find((a) => a.userId !== state.onBehalfOfUserId)?.userId;
                            const overlapping = candidateUserId
                                ? await this.database.findOverlappingOpportunities([state.onBehalfOfUserId, candidateUserId], { excludeStatuses: DEDUP_SKIP_STATUSES })
                                : [];
                            if (overlapping.length > 0) {
                                const existing = overlapping[0];
                                const sameIntroducer = existing.actors?.some((actor) => actor.role === 'introducer' && actor.userId === state.userId);
                                if (existing.status === 'expired' && sameIntroducer) {
                                    const reactivated = await this.database.updateOpportunityStatus(existing.id, 'draft');
                                    if (reactivated)
                                        reactivatedOpportunities.push(reactivated);
                                    continue;
                                }
                                if (existing.status === 'latent') {
                                    // Upgrade latent to draft for introduction path
                                    const upgraded = await this.database.updateOpportunityStatus(existing.id, 'draft');
                                    if (upgraded) {
                                        logger.verbose('[Graph:Persist] Upgraded latent opportunity to draft (introduction path)', {
                                            opportunityId: existing.id,
                                            candidateUserId,
                                        });
                                        reactivatedOpportunities.push(upgraded);
                                    }
                                    continue;
                                }
                                if (existing.status !== 'expired' && candidateUserId) {
                                    existingBetweenActors.push({
                                        candidateUserId: candidateUserId,
                                        networkId: (state.networkId ?? indexIdForActors ?? ''),
                                        existingOpportunityId: existing.id,
                                        existingStatus: existing.status,
                                    });
                                    continue;
                                }
                            }
                            data = {
                                detection: {
                                    source: 'manual',
                                    createdBy: state.userId,
                                    createdByName: introducerUserForOnBehalf?.name ?? undefined,
                                    timestamp: now,
                                },
                                actors,
                                interpretation: {
                                    category: 'collaboration',
                                    reasoning: evaluated.reasoning,
                                    confidence: evaluated.score / 100,
                                    signals: [{
                                            type: 'curator_judgment',
                                            weight: 1,
                                            detail: `Discovery on behalf of another user by ${introducerUserForOnBehalf?.name ?? 'a member'} via chat`,
                                        }],
                                },
                                context: {
                                    networkId: state.networkId ?? indexIdForActors,
                                    ...(state.options.conversationId ? { conversationId: state.options.conversationId } : {}),
                                },
                                confidence: String(evaluated.score / 100),
                                status: initialStatus,
                            };
                        }
                        else {
                            // Discovery path: opportunity_graph source, no introducer, lifecycle guard for agent/patient.
                            const evaluatorActors = evaluated.actors.map((a) => ({
                                networkId: a.networkId ?? indexIdForActors,
                                userId: a.userId,
                                role: a.role,
                                ...(a.intentId ? { intent: a.intentId } : {}),
                            }));
                            actors = evaluatorActors;
                            const hasIntroducerActor = actors.some(a => a.role === 'introducer');
                            if (!hasIntroducerActor) {
                                const discovererIdx = actors.findIndex(a => a.userId === state.userId);
                                if (discovererIdx >= 0 && actors[discovererIdx].role === 'agent') {
                                    const counterpartIdx = actors.findIndex((a, i) => i !== discovererIdx && a.role === 'patient');
                                    actors[discovererIdx] = { ...actors[discovererIdx], role: 'patient' };
                                    if (counterpartIdx >= 0) {
                                        actors[counterpartIdx] = { ...actors[counterpartIdx], role: 'agent' };
                                    }
                                    logger.verbose('[Graph:Persist] Swapped discoverer from agent to patient for lifecycle visibility', {
                                        discovererId: state.userId,
                                    });
                                }
                            }
                            // Index-agnostic dedup: find ANY existing opportunity between these users,
                            // regardless of which index it was created in or whether context.networkId is set.
                            const candidateUserId = evaluated.actors.find((a) => a.userId !== state.userId)?.userId;
                            logger.verbose('[Graph:Persist:Dedup] Checking overlapping opportunities', {
                                stateUserId: state.userId,
                                candidateUserId: candidateUserId ?? 'NONE',
                                evaluatedActors: evaluated.actors.map(a => ({ userId: a.userId, role: a.role })),
                            });
                            const overlapping = candidateUserId
                                ? await this.database.findOverlappingOpportunities([state.userId, candidateUserId], { excludeStatuses: DEDUP_SKIP_STATUSES })
                                : [];
                            logger.verbose('[Graph:Persist:Dedup] findOverlappingOpportunities result', {
                                count: overlapping.length,
                                results: overlapping.map(o => ({ id: o.id, status: o.status, actors: o.actors?.map((a) => ({ userId: a.userId, role: a.role })) })),
                            });
                            if (overlapping.length > 0) {
                                const existing = overlapping[0];
                                const existingIndexId = (existing.context?.networkId ?? state.networkId ?? state.userNetworks?.[0] ?? '');
                                if (existing.status === 'expired') {
                                    const reactivated = await this.database.updateOpportunityStatus(existing.id, initialStatus);
                                    if (reactivated) {
                                        logger.verbose('[Graph:Persist] Reactivated expired opportunity', {
                                            opportunityId: existing.id,
                                            candidateUserId,
                                            newStatus: initialStatus,
                                        });
                                        reactivatedOpportunities.push(reactivated);
                                    }
                                }
                                else if (existing.status === 'latent' && initialStatus !== 'latent') {
                                    // Upgrade latent (background-discovered) to the higher-priority status (e.g. pending)
                                    const upgraded = await this.database.updateOpportunityStatus(existing.id, initialStatus);
                                    if (upgraded) {
                                        logger.verbose('[Graph:Persist] Upgraded latent opportunity to higher-priority status', {
                                            opportunityId: existing.id,
                                            candidateUserId,
                                            previousStatus: 'latent',
                                            newStatus: initialStatus,
                                        });
                                        reactivatedOpportunities.push(upgraded);
                                    }
                                }
                                else if (candidateUserId) {
                                    existingBetweenActors.push({
                                        candidateUserId: candidateUserId,
                                        networkId: existingIndexId,
                                        existingOpportunityId: existing.id,
                                        existingStatus: existing.status,
                                    });
                                    logger.verbose('[Graph:Persist] Skipping duplicate; opportunity already exists between actors', {
                                        candidateUserId,
                                        existingStatus: existing.status,
                                        existingOpportunityId: existing.id,
                                    });
                                }
                                continue;
                            }
                            data = {
                                detection: {
                                    source: 'opportunity_graph',
                                    createdBy: 'agent-opportunity-finder',
                                    ...(state.discoverySource === 'intent' && state.resolvedTriggerIntentId
                                        ? { triggeredBy: state.resolvedTriggerIntentId }
                                        : {}),
                                    timestamp: now,
                                },
                                actors,
                                interpretation: {
                                    category: 'collaboration',
                                    reasoning: evaluated.reasoning,
                                    confidence: evaluated.score / 100,
                                    signals: [
                                        {
                                            type: evaluated.actors.some((a) => a.intentId) ? 'intent_match' : 'profile_match',
                                            weight: evaluated.score / 100,
                                            detail: 'Entity-bundle evaluator',
                                        },
                                    ],
                                },
                                context: {
                                    ...(state.networkId ? { networkId: state.networkId } : {}),
                                    ...(state.options.conversationId ? { conversationId: state.options.conversationId } : {}),
                                },
                                confidence: String(evaluated.score / 100),
                                status: initialStatus,
                            };
                        }
                        try {
                            validateOpportunityActors(data.actors);
                        }
                        catch (err) {
                            logger.warn('[Graph:Persist] Skipping opportunity with invalid actors', {
                                error: err instanceof Error ? err.message : String(err),
                                opportunityReasoning: evaluated.reasoning?.slice(0, 80),
                            });
                            continue;
                        }
                        itemsToPersist.push(data);
                    }
                    const { created: createdList } = await persistOpportunities({
                        database: this.database,
                        embedder: this.embedder,
                        items: itemsToPersist,
                    });
                    const allOpportunities = [...reactivatedOpportunities, ...createdList];
                    logger.verbose('[Graph:Persist] Persistence complete', {
                        created: createdList.length,
                        reactivated: reactivatedOpportunities.length,
                        existingBetweenActorsCount: existingBetweenActors.length,
                        status: initialStatus,
                    });
                    return {
                        opportunities: allOpportunities,
                        existingBetweenActors,
                        trace: [{
                                node: "persist",
                                detail: `Created ${createdList.length}, reactivated ${reactivatedOpportunities.length}, ${existingBetweenActors.length} existing skipped`,
                                data: {
                                    created: createdList.length,
                                    reactivated: reactivatedOpportunities.length,
                                    existingSkipped: existingBetweenActors.length,
                                    totalOutput: allOpportunities.length,
                                    durationMs: Date.now() - startTime,
                                },
                            }],
                    };
                }
                catch (error) {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    logger.error('[Graph:Persist] Failed', { error });
                    return {
                        opportunities: [],
                        existingBetweenActors: [],
                        error: 'Failed to persist opportunities.',
                        trace: [{
                                node: "persist_fatal",
                                detail: `Persist failed: ${errMsg}`,
                                data: { error: errMsg },
                            }],
                    };
                }
            });
        }, (result) => {
            const r = result;
            if (r?.error)
                return `error: ${r.error}`;
            const opps = r?.opportunities;
            return opps ? `Persisted ${opps.length} opportunity(ies)` : undefined;
        });
        // ═══════════════════════════════════════════════════════════════
        // CRUD NODES (read, update, delete, send)
        // ═══════════════════════════════════════════════════════════════
        /**
         * Read Node: List opportunities for the user, optionally filtered by networkId.
         * Fast path — no LLM calls.
         */
        const readNode = async (state) => {
            return timed("OpportunityGraph.read", async () => {
                logger.verbose('[Graph:Read] Listing opportunities', {
                    userId: state.userId,
                    networkId: state.networkId,
                });
                try {
                    let indexIdFilter;
                    if (state.networkId) {
                        const [isMember, isOwner] = await Promise.all([
                            this.database.isNetworkMember(state.networkId, state.userId),
                            this.database.isIndexOwner(state.networkId, state.userId),
                        ]);
                        if (!isMember && !isOwner) {
                            return {
                                readResult: { count: 0, opportunities: [], message: 'Network not found or you are not a member.' },
                            };
                        }
                        indexIdFilter = state.networkId;
                    }
                    const rawList = await this.database.getOpportunitiesForUser(state.userId, {
                        limit: 30,
                        ...(indexIdFilter ? { networkId: indexIdFilter } : {}),
                    });
                    const list = rawList.filter((opp) => opp.status !== 'expired');
                    if (list.length === 0) {
                        return {
                            readResult: {
                                count: 0,
                                message: 'You have no opportunities yet. Use create_opportunities to search for connections.',
                                opportunities: [],
                            },
                        };
                    }
                    // Dedupe by counterpart set (same people = one row) so chat does not show "You and X" per index
                    const counterpartKey = (opp) => opp.actors
                        .filter((a) => a.userId !== state.userId && a.role !== 'introducer')
                        .map((a) => a.userId)
                        .sort()
                        .join(',');
                    const byKey = new Map();
                    for (const opp of list) {
                        const key = counterpartKey(opp);
                        const existing = byKey.get(key);
                        const conf = Number(opp.interpretation?.confidence ?? opp.confidence ?? 0);
                        const existingConf = existing ? Number(existing.interpretation?.confidence ?? existing.confidence ?? 0) : 0;
                        const oppTime = opp.updatedAt instanceof Date ? opp.updatedAt.getTime() : new Date(opp.updatedAt).getTime();
                        const existingTime = existing
                            ? (existing.updatedAt instanceof Date ? existing.updatedAt.getTime() : new Date(existing.updatedAt).getTime())
                            : 0;
                        if (!existing || conf > existingConf || (conf === existingConf && oppTime > existingTime)) {
                            byKey.set(key, opp);
                        }
                    }
                    const dedupedList = [...byKey.values()];
                    const sourceLabel = {
                        chat: 'Suggested in chat',
                        opportunity_graph: 'System match',
                        manual: 'Manual',
                        cron: 'Scheduled',
                        member_added: 'Member added',
                    };
                    const enriched = await Promise.all(dedupedList.map(async (opp) => {
                        // "Other parties" = all actors who are not the current user (exclude introducer for suggestedBy).
                        // Opportunity graph persists roles as 'agent'|'patient'|'peer'; manual/createManual use 'party'.
                        const otherParties = opp.actors.filter((a) => a.userId !== state.userId && a.role !== 'introducer');
                        const introducer = opp.actors.find((a) => a.role === 'introducer');
                        const partyIds = otherParties.map((a) => a.userId);
                        const idsToResolve = introducer ? [...partyIds, introducer.userId] : partyIds;
                        // Use the counterpart's (non-viewer) networkId — it reflects where the match was found.
                        // actors[0] is typically the viewer with an arbitrary first-target-index value.
                        const counterpartActor = opp.actors.find((a) => a.userId !== state.userId);
                        const actorIndexId = counterpartActor?.networkId ?? opp.actors[0]?.networkId;
                        const [indexRecord, ...profileAndUserPairs] = await Promise.all([
                            actorIndexId ? this.database.getNetwork(actorIndexId) : Promise.resolve(null),
                            ...idsToResolve.map(async (uid) => {
                                const [profile, user] = await Promise.all([
                                    this.database.getProfile(uid),
                                    this.database.getUser(uid),
                                ]);
                                return (profile?.identity?.name ?? user?.name ?? 'Unknown');
                            }),
                        ]);
                        const connectedWith = profileAndUserPairs.slice(0, partyIds.length);
                        const suggestedBy = introducer ? profileAndUserPairs[partyIds.length] ?? null : null;
                        const category = opp.interpretation?.category ?? 'connection';
                        const confidence = opp.interpretation?.confidence ?? (opp.confidence ? Number(opp.confidence) : null);
                        const source = opp.detection?.source ? (sourceLabel[opp.detection.source] ?? opp.detection.source) : null;
                        return {
                            id: opp.id,
                            indexName: indexRecord?.title ?? (actorIndexId ?? ''),
                            connectedWith,
                            suggestedBy,
                            reasoning: opp.interpretation?.reasoning ?? 'Connection opportunity',
                            status: opp.status,
                            category,
                            confidence: confidence != null ? confidence : null,
                            source,
                        };
                    }));
                    return {
                        readResult: {
                            count: enriched.length,
                            message: `You have ${enriched.length} opportunity(ies).`,
                            opportunities: enriched,
                        },
                    };
                }
                catch (err) {
                    logger.error('[Graph:Read] Failed', { error: err });
                    return {
                        readResult: { count: 0, opportunities: [], message: 'Failed to list opportunities.' },
                    };
                }
            });
        };
        /**
         * Update Node: Change opportunity status (accept, reject, etc.).
         */
        const updateNode = async (state) => {
            return timed("OpportunityGraph.update", async () => {
                logger.verbose('[Graph:Update] Updating opportunity status', {
                    userId: state.userId,
                    opportunityId: state.opportunityId,
                    newStatus: state.newStatus,
                });
                try {
                    if (!state.opportunityId) {
                        return { mutationResult: { success: false, error: 'opportunityId is required.' } };
                    }
                    if (!state.newStatus || !['accepted', 'rejected', 'expired'].includes(state.newStatus)) {
                        return { mutationResult: { success: false, error: 'newStatus must be one of: accepted, rejected, expired.' } };
                    }
                    const opp = await this.database.getOpportunity(state.opportunityId);
                    if (!opp) {
                        return { mutationResult: { success: false, error: 'Opportunity not found.' } };
                    }
                    const isActor = opp.actors.some((a) => a.userId === state.userId);
                    if (!isActor) {
                        return { mutationResult: { success: false, error: 'You are not part of this opportunity.' } };
                    }
                    await this.database.updateOpportunityStatus(state.opportunityId, state.newStatus);
                    return {
                        mutationResult: {
                            success: true,
                            opportunityId: state.opportunityId,
                            message: `Opportunity status updated to ${state.newStatus}.`,
                        },
                    };
                }
                catch (err) {
                    logger.error('[Graph:Update] Failed', { error: err });
                    return { mutationResult: { success: false, error: 'Failed to update opportunity.' } };
                }
            });
        };
        /**
         * Delete Node: Expire/archive an opportunity.
         */
        const deleteNode = async (state) => {
            return timed("OpportunityGraph.delete", async () => {
                logger.verbose('[Graph:Delete] Expiring opportunity', {
                    userId: state.userId,
                    opportunityId: state.opportunityId,
                });
                try {
                    if (!state.opportunityId) {
                        return { mutationResult: { success: false, error: 'opportunityId is required.' } };
                    }
                    const opp = await this.database.getOpportunity(state.opportunityId);
                    if (!opp) {
                        return { mutationResult: { success: false, error: 'Opportunity not found.' } };
                    }
                    const isActor = opp.actors.some((a) => a.userId === state.userId);
                    if (!isActor) {
                        return { mutationResult: { success: false, error: 'You are not part of this opportunity.' } };
                    }
                    await this.database.updateOpportunityStatus(state.opportunityId, 'expired');
                    return {
                        mutationResult: {
                            success: true,
                            opportunityId: state.opportunityId,
                            message: 'Opportunity archived (expired).',
                        },
                    };
                }
                catch (err) {
                    logger.error('[Graph:Delete] Failed', { error: err });
                    return { mutationResult: { success: false, error: 'Failed to delete opportunity.' } };
                }
            });
        };
        /**
         * Send Node: Promote latent or draft opportunity to pending + queue notification.
         */
        const sendNode = async (state) => {
            return timed("OpportunityGraph.send", async () => {
                logger.verbose('[Graph:Send] Sending opportunity', {
                    userId: state.userId,
                    opportunityId: state.opportunityId,
                });
                try {
                    if (!state.opportunityId) {
                        return { mutationResult: { success: false, error: 'opportunityId is required.' } };
                    }
                    const opp = await this.database.getOpportunity(state.opportunityId);
                    if (!opp) {
                        return { mutationResult: { success: false, error: 'Opportunity not found.' } };
                    }
                    const canSendStatus = opp.status === 'latent' || opp.status === 'draft';
                    if (!canSendStatus) {
                        return {
                            mutationResult: {
                                success: false,
                                error: `Opportunity is already ${opp.status}; only latent or draft opportunities can be sent.`,
                            },
                        };
                    }
                    const senderActor = opp.actors.find((a) => a.userId === state.userId);
                    const hasIntroducer = opp.actors.some((a) => a.role === 'introducer');
                    const canSend = senderActor?.role === 'introducer' ||
                        senderActor?.role === 'peer' ||
                        (senderActor?.role === 'patient' && !hasIntroducer) ||
                        (senderActor?.role === 'party' && !hasIntroducer);
                    if (!senderActor) {
                        return { mutationResult: { success: false, error: 'You are not part of this opportunity.' } };
                    }
                    if (!canSend) {
                        return { mutationResult: { success: false, error: 'You cannot send this opportunity.' } };
                    }
                    await this.database.updateOpportunityStatus(state.opportunityId, 'pending');
                    // Notify only the role that becomes visible at the next tier
                    let recipients;
                    if (senderActor.role === 'introducer') {
                        recipients = opp.actors.filter((a) => a.role === 'patient' || a.role === 'party');
                    }
                    else if (senderActor.role === 'peer') {
                        recipients = opp.actors.filter((a) => a.role === 'peer' && a.userId !== state.userId);
                    }
                    else {
                        recipients = opp.actors.filter((a) => a.role === 'agent');
                    }
                    // queueNotification is injected via constructor; if not provided, notifications are skipped.
                    const notifier = this.queueNotification;
                    if (notifier) {
                        for (const recipient of recipients) {
                            await notifier(opp.id, recipient.userId, 'high');
                        }
                    }
                    const recipientIds = recipients.map((a) => a.userId);
                    return {
                        mutationResult: {
                            success: true,
                            opportunityId: opp.id,
                            notified: recipientIds,
                            message: 'Opportunity sent. The other person has been notified.',
                        },
                    };
                }
                catch (err) {
                    logger.error('[Graph:Send] Failed', { error: err });
                    return { mutationResult: { success: false, error: 'Failed to send opportunity.' } };
                }
            });
        };
        // ═══════════════════════════════════════════════════════════════
        // CONDITIONAL ROUTING FUNCTIONS
        // ═══════════════════════════════════════════════════════════════
        /**
         * Router: Decides which path based on operationMode.
         */
        const routeByMode = (state) => {
            const mode = state.operationMode ?? 'create';
            if (mode === 'read')
                return 'read';
            if (mode === 'update')
                return 'update';
            if (mode === 'delete')
                return 'delete_opp';
            if (mode === 'send')
                return 'send';
            if (mode === 'create_introduction')
                return 'intro_validation';
            // 'create' is the default discovery pipeline
            return 'prep';
        };
        /**
         * After prep: check if user has indexed intents.
         * Early exit if none (cannot find opportunities).
         */
        const shouldContinueAfterPrep = (state) => {
            if (state.error) {
                logger.verbose('[Graph:Routing] Error in prep - ending early');
                return END;
            }
            // Continuation mode: skip scope/resolve/discovery, go straight to evaluation
            if (state.operationMode === 'continue_discovery') {
                logger.verbose('[Graph:Routing] Continue discovery → skipping to evaluation', {
                    candidatesLoaded: state.candidates.length,
                });
                return 'evaluation';
            }
            logger.verbose('[Graph:Routing] Continuing to scope');
            return 'scope';
        };
        /**
         * After scope: check if we have target indexes.
         */
        const shouldContinueAfterScope = (state) => {
            if (state.error || state.targetIndexes.length === 0) {
                logger.verbose('[Graph:Routing] No target indexes - ending early');
                return END;
            }
            logger.verbose('[Graph:Routing] Continuing to resolve');
            return 'resolve';
        };
        /**
         * After discovery: if create-intent signal was set, end so tool can return it; else continue to evaluation.
         */
        const shouldContinueAfterDiscovery = (state) => {
            if (state.createIntentSuggested) {
                logger.verbose('[Graph:Routing] Create-intent suggested - ending for tool signal');
                return END;
            }
            return 'evaluation';
        };
        /**
         * After intro_validation: if validation set state.error, end early; else continue to intro_evaluation.
         */
        const routeAfterIntroValidation = (state) => {
            if (state.error) {
                logger.verbose('[Graph:Routing] Intro validation error - ending early');
                return END;
            }
            return 'intro_evaluation';
        };
        // ═══════════════════════════════════════════════════════════════
        // GRAPH ASSEMBLY
        // ═══════════════════════════════════════════════════════════════
        const workflow = new StateGraph(OpportunityGraphState)
            // Add all nodes
            .addNode('prep', prepNode)
            .addNode('scope', scopeNode)
            .addNode('resolve', resolveNode)
            .addNode('discovery', discoveryNode)
            .addNode('evaluation', evaluationNode)
            .addNode('ranking', rankingNode)
            .addNode('intro_validation', introValidationNode)
            .addNode('intro_evaluation', introEvaluationNode)
            .addNode('persist', persistNode)
            // CRUD nodes
            .addNode('read', readNode)
            .addNode('update', updateNode)
            .addNode('delete_opp', deleteNode)
            .addNode('send', sendNode)
            // Route by operation mode from START
            .addConditionalEdges(START, routeByMode, {
            prep: 'prep',
            intro_validation: 'intro_validation',
            read: 'read',
            update: 'update',
            delete_opp: 'delete_opp',
            send: 'send',
        })
            // Introduction path: validation -> evaluation -> persist (or END on validation error)
            .addConditionalEdges('intro_validation', routeAfterIntroValidation, {
            intro_evaluation: 'intro_evaluation',
            [END]: END,
        })
            .addEdge('intro_evaluation', 'persist')
            // CRUD fast paths -> END
            .addEdge('read', END)
            .addEdge('update', END)
            .addEdge('delete_opp', END)
            .addEdge('send', END)
            // Conditional routing: early exit if no indexed intents
            .addConditionalEdges('prep', shouldContinueAfterPrep, {
            scope: 'scope',
            evaluation: 'evaluation',
            [END]: END,
        })
            // Conditional routing: early exit if no target indexes
            .addConditionalEdges('scope', shouldContinueAfterScope, {
            resolve: 'resolve',
            [END]: END,
        })
            .addEdge('resolve', 'discovery')
            .addConditionalEdges('discovery', shouldContinueAfterDiscovery, {
            evaluation: 'evaluation',
            [END]: END,
        })
            // Negotiation step (optional, skipped for continue_discovery or when no negotiation graph)
            .addNode('negotiate', negotiateNode)
            .addConditionalEdges('evaluation', (state) => {
            if (state.operationMode === 'continue_discovery')
                return 'ranking';
            return 'negotiate';
        }, {
            negotiate: 'negotiate',
            ranking: 'ranking',
        })
            .addEdge('negotiate', 'ranking')
            .addEdge('ranking', 'persist')
            .addEdge('persist', END);
        return workflow.compile();
    }
}
//# sourceMappingURL=opportunity.graph.js.map