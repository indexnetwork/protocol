import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { HydeGraphDatabase } from "../interfaces/database.interface";
import { IntentGraphFactory } from "../graphs/intent.graph";
import { ProfileGraphFactory } from "../graphs/profile.graph";
import { OpportunityGraphFactory } from "../graphs/opportunity.graph";
import { HydeGraphFactory } from "../graphs/hyde.graph";
import { HydeGenerator } from "../agents/hyde.generator";
import { LensInferrer } from "../agents/lens.inferrer";
import { IndexGraphFactory } from "../graphs/index.graph";
import { IndexMembershipGraphFactory } from "../graphs/index_membership.graph";
import { IntentIndexGraphFactory } from "../graphs/intent_index.graph";
import { NegotiationGraphFactory } from "../graphs/negotiation.graph";
import { NegotiationProposer } from "../agents/negotiation.proposer";
import { NegotiationResponder } from "../agents/negotiation.responder";
import { protocolLogger } from "../support/protocol.logger";

import {
  type ToolContext,
  type ResolvedToolContext,
  type ToolDeps,
  resolveChatContext,
} from "./tool.helpers";
import { error } from "./tool.helpers";
import { createProfileTools } from "./profile.tools";
import { createIntentTools } from "./intent.tools";
import { createIndexTools } from "./index.tools";
import { createOpportunityTools } from "./opportunity.tools";
import { createUtilityTools } from "./utility.tools";
import { createIntegrationTools } from "./integration.tools";
import { createContactTools } from "./contact.tools";

// Re-export types for consumers
export type { ToolContext, ResolvedToolContext, ProtocolDeps } from "./tool.helpers";
export type { ToolDeps } from "./tool.helpers";

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
export async function createChatTools(
  deps: ToolContext,
  preResolvedContext?: ResolvedToolContext
) {
  const { database, embedder, scraper } = deps;

  // ─── Resolve context from DB ───────────────────────────────────────────────
  const resolvedContext =
    preResolvedContext ??
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
  function defineTool<T extends z.ZodType>(opts: {
    name: string;
    description: string;
    querySchema: T;
    handler: (input: { context: ResolvedToolContext; query: z.infer<T> }) => Promise<string>;
  }) {
    return tool(
      async (query: z.infer<T>) => {
        logger.verbose(`Tool: ${opts.name}`, {
          context: { userId: resolvedContext.userId, indexId: resolvedContext.indexId },
          query,
        });
        try {
          return await opts.handler({ context: resolvedContext, query });
        } catch (err) {
          logger.error(`${opts.name} failed`, {
            error: err instanceof Error ? err.message : String(err),
          });
          const reason = err instanceof Error ? err.message : String(err);
          return error(`Failed to execute ${opts.name}: ${reason}`);
        }
      },
      { name: opts.name, description: opts.description, schema: opts.querySchema }
    );
  }

  // ─── Compile subgraphs ─────────────────────────────────────────────────────
  const intentGraph = new IntentGraphFactory(database, embedder, deps.intentQueue).createGraph();
  const profileGraph = new ProfileGraphFactory(database, embedder, scraper, deps.enricher).createGraph();
  const hydeCache = deps.hydeCache;
  const lensInferrer = new LensInferrer();
  const hydeGenerator = new HydeGenerator();
  const compiledHydeGraph = new HydeGraphFactory(
    database as unknown as HydeGraphDatabase,
    embedder,
    hydeCache,
    lensInferrer,
    hydeGenerator
  ).createGraph();
  const negotiationGraph = new NegotiationGraphFactory(
    deps.negotiationDatabase,
    new NegotiationProposer(),
    new NegotiationResponder(),
  ).createGraph();
  const opportunityGraph = new OpportunityGraphFactory(
    database,
    embedder,
    compiledHydeGraph,
    undefined, // evaluator (default)
    undefined, // queueNotification
    negotiationGraph,
  ).createGraph();
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
  const toolDeps: ToolDeps = {
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
  const opportunityToolsForChat = opportunityTools.filter(
    (t) => (t as { name: string }).name !== "list_opportunities"
  );

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

/**
 * Type for the tools array returned by createChatTools.
 */
export type ChatTools = Awaited<ReturnType<typeof createChatTools>>;
