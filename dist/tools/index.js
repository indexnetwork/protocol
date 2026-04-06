import { tool } from "@langchain/core/tools";
import { IntentGraphFactory } from "../graphs/intent.graph.js";
import { ProfileGraphFactory } from "../graphs/profile.graph.js";
import { OpportunityGraphFactory } from "../graphs/opportunity.graph.js";
import { HydeGraphFactory } from "../graphs/hyde.graph.js";
import { HydeGenerator } from "../agents/hyde.generator.js";
import { LensInferrer } from "../agents/lens.inferrer.js";
import { IndexGraphFactory } from "../graphs/index.graph.js";
import { IndexMembershipGraphFactory } from "../graphs/index_membership.graph.js";
import { IntentIndexGraphFactory } from "../graphs/intent_index.graph.js";
import { NegotiationGraphFactory } from "../graphs/negotiation.graph.js";
import { NegotiationProposer } from "../agents/negotiation.proposer.js";
import { NegotiationResponder } from "../agents/negotiation.responder.js";
import { protocolLogger } from "../support/protocol.logger.js";
import { configureProtocol } from "../agents/model.config.js";
import { resolveChatContext, } from "./tool.helpers.js";
import { error } from "./tool.helpers.js";
import { createProfileTools } from "./profile.tools.js";
import { createIntentTools } from "./intent.tools.js";
import { createIndexTools } from "./index.tools.js";
import { createOpportunityTools } from "./opportunity.tools.js";
import { createUtilityTools } from "./utility.tools.js";
import { createIntegrationTools } from "./integration.tools.js";
import { createContactTools } from "./contact.tools.js";
const logger = protocolLogger("ChatTools");
// ═══════════════════════════════════════════════════════════════════════════════
// TOOL FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Creates all chat tools bound to a specific user context.
 * Resolves user/index identity from DB at init time.
 * Tools are created fresh for each user session to ensure proper isolation.
 *
 * All external dependencies (cache, integration, queue, etc.) are provided
 * via the `deps` parameter — the protocol lib never imports concrete adapters.
 */
export async function createChatTools(deps, preResolvedContext) {
    // Apply model config so all agents created in this session use the right credentials.
    if (deps.modelConfig) {
        configureProtocol(deps.modelConfig);
    }
    const { database, embedder, scraper } = deps;
    // ─── Resolve context from DB ───────────────────────────────────────────────
    const resolvedContext = preResolvedContext ??
        (await resolveChatContext({
            database,
            userId: deps.userId,
            indexId: deps.indexId,
            sessionId: deps.sessionId,
        }));
    // ─── Tool wrapper ──────────────────────────────────────────────────────────
    /**
     * Standardized tool factory. Auto-injects resolved context and
     * provides uniform logging / error handling for every tool.
     */
    function defineTool(opts) {
        return tool(async (query) => {
            logger.verbose(`Tool: ${opts.name}`, {
                context: { userId: resolvedContext.userId, indexId: resolvedContext.indexId },
                query,
            });
            try {
                return await opts.handler({ context: resolvedContext, query });
            }
            catch (err) {
                logger.error(`${opts.name} failed`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                const reason = err instanceof Error ? err.message : String(err);
                return error(`Failed to execute ${opts.name}: ${reason}`);
            }
        }, { name: opts.name, description: opts.description, schema: opts.querySchema });
    }
    // ─── Compile subgraphs ─────────────────────────────────────────────────────
    const intentGraph = new IntentGraphFactory(database, embedder, deps.intentQueue).createGraph();
    const profileGraph = new ProfileGraphFactory(database, embedder, scraper, deps.enricher).createGraph();
    const hydeCache = deps.hydeCache;
    const lensInferrer = new LensInferrer();
    const hydeGenerator = new HydeGenerator();
    const compiledHydeGraph = new HydeGraphFactory(database, embedder, hydeCache, lensInferrer, hydeGenerator).createGraph();
    const negotiationGraph = new NegotiationGraphFactory(deps.negotiationDatabase, new NegotiationProposer(), new NegotiationResponder()).createGraph();
    const opportunityGraph = new OpportunityGraphFactory(database, embedder, compiledHydeGraph, undefined, // evaluator (default)
    undefined, // queueNotification
    negotiationGraph).createGraph();
    const indexGraph = new IndexGraphFactory(database).createGraph();
    const indexMembershipGraph = new IndexMembershipGraphFactory(database).createGraph();
    const intentIndexGraph = new IntentIndexGraphFactory(database).createGraph();
    // ─── Create context-bound databases ────────────────────────────────────────
    // Get the user's index scope (all indexes they have access to)
    const indexScope = resolvedContext.userIndexes.map((m) => m.indexId);
    // Use injected instances when provided (e.g. tests). Otherwise create from the same
    // database used for graphs so that scope checks (e.g. ensureScopedMembership, opportunity
    // update) use the same adapter as the rest of the tool pipeline.
    const userDb = deps.userDb ?? deps.createUserDatabase(database, resolvedContext.userId);
    const systemDb = deps.systemDb ?? deps.createSystemDatabase(database, resolvedContext.userId, indexScope, embedder);
    // ─── Assemble dependencies ─────────────────────────────────────────────────
    const cache = deps.cache;
    const integration = deps.integration;
    const toolDeps = {
        database,
        userDb,
        systemDb,
        scraper,
        embedder,
        cache,
        integration,
        contactService: deps.contactService,
        integrationImporter: deps.integrationImporter,
        enricher: deps.enricher,
        graphs: {
            profile: profileGraph,
            intent: intentGraph,
            index: indexGraph,
            indexMembership: indexMembershipGraph,
            intentIndex: intentIndexGraph,
            opportunity: opportunityGraph,
        },
    };
    // ─── Create domain tools ──────────────────────────────────────────────────
    const profileTools = createProfileTools(defineTool, toolDeps);
    const intentTools = createIntentTools(defineTool, toolDeps);
    const indexTools = createIndexTools(defineTool, toolDeps);
    const opportunityTools = createOpportunityTools(defineTool, toolDeps);
    const utilityTools = createUtilityTools(defineTool, toolDeps);
    const contactTools = createContactTools(defineTool, toolDeps);
    const integrationTools = createIntegrationTools(defineTool, toolDeps);
    // Chat only proposes opportunities from the conversation (create_opportunities).
    // Other opportunities are shown on the home view; do not give the agent list_opportunities.
    const opportunityToolsForChat = opportunityTools.filter((t) => t.name !== "list_opportunities");
    return [
        ...profileTools,
        ...intentTools,
        ...indexTools,
        ...opportunityToolsForChat,
        ...utilityTools,
        ...integrationTools,
        ...contactTools,
    ];
}
//# sourceMappingURL=index.js.map