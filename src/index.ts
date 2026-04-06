// ─── Public API (recommended for external consumers) ──────────────────────────

export { createChatTools } from "./tools/index.js";
export { configureProtocol } from "./agents/model.config.js";
export type { ChatTools } from "./tools/index.js";
export type { ModelConfig, ModelSettings } from "./agents/model.config.js";
export type {
  ToolContext,
  ResolvedToolContext,
  ToolDeps,
  ProtocolDeps,
  DefineTool,
  RawToolDefinition,
  ToolRegistry,
} from "./tools/tool.helpers.js";
export { ChatContextAccessError, resolveChatContext } from "./tools/tool.helpers.js";

// ─── Interfaces (implement these to wire up your infrastructure) ───────────────

export type * from "./interfaces/auth.interface.js";
export type * from "./interfaces/cache.interface.js";
export type * from "./interfaces/chat-session.interface.js";
export type * from "./interfaces/contact.interface.js";
export type * from "./interfaces/database.interface.js";
export type * from "./interfaces/embedder.interface.js";
export type * from "./interfaces/enrichment.interface.js";
export type * from "./interfaces/integration.interface.js";
export type * from "./interfaces/queue.interface.js";
export type * from "./interfaces/scraper.interface.js";
export type * from "./interfaces/storage.interface.js";

// ─── Graph factories (used by the protocol app; advanced use for external consumers) ──

export { ChatGraphFactory } from "./graphs/chat.graph.js";
export { HomeGraphFactory } from "./graphs/home.graph.js";
export { HydeGraphFactory } from "./graphs/hyde.graph.js";
export { IndexGraphFactory } from "./graphs/index.graph.js";
export { IndexMembershipGraphFactory } from "./graphs/index_membership.graph.js";
export { IntentGraphFactory } from "./graphs/intent.graph.js";
export { IntentIndexGraphFactory } from "./graphs/intent_index.graph.js";
export { MaintenanceGraphFactory } from "./graphs/maintenance.graph.js";
export type {
  MaintenanceGraphDatabase,
  MaintenanceGraphCache,
  MaintenanceGraphQueue,
} from "./graphs/maintenance.graph.js";
export { NegotiationGraphFactory, createDefaultNegotiationGraph, negotiateCandidates } from "./graphs/negotiation.graph.js";
export { OpportunityGraphFactory } from "./graphs/opportunity.graph.js";
export { ProfileGraphFactory } from "./graphs/profile.graph.js";

// ─── Agents (used by the protocol app; advanced use for external consumers) ───

export { ChatTitleGenerator } from "./agents/chat.title.generator.js";
export { HydeGenerator } from "./agents/hyde.generator.js";
export { SuggestionGenerator } from "./agents/suggestion.generator.js";
export type { SuggestionGeneratorInput } from "./agents/suggestion.generator.js";
export { generateInviteMessage } from "./agents/invite.generator.js";
export type { InviteInput, InviteOutput } from "./agents/invite.generator.js";
export { IntentIndexer } from "./agents/intent.indexer.js";
export { LensInferrer } from "./agents/lens.inferrer.js";
export { NegotiationInsightsGenerator } from "./agents/negotiation.insights.generator.js";
export type { NegotiationDigest } from "./agents/negotiation.insights.generator.js";
export { NegotiationProposer } from "./agents/negotiation.proposer.js";
export { NegotiationResponder } from "./agents/negotiation.responder.js";
export { OpportunityEvaluator } from "./agents/opportunity.evaluator.js";
export type {
  EvaluatorInput,
  OpportunityEvaluatorOptionsConstructor,
} from "./agents/opportunity.evaluator.js";
export { OpportunityPresenter, gatherPresenterContext } from "./agents/opportunity.presenter.js";
export type { PresenterDatabase } from "./agents/opportunity.presenter.js";

// ─── Support utilities (used by the protocol app) ─────────────────────────────

export {
  canUserSeeOpportunity,
  isActionableForViewer,
  validateOpportunityActors,
  classifyOpportunity,
  selectByComposition,
  FEED_SOFT_TARGETS,
} from "./support/opportunity.utils.js";
export { getPrimaryActionLabel } from "./support/opportunity.constants.js";
export { computeFeedHealth } from "./support/feed.health.js";
export type { FeedHealthInput, FeedHealthResult } from "./support/feed.health.js";
export {
  selectContactsForDiscovery,
  shouldRunIntroducerDiscovery,
  runIntroducerDiscovery,
  MAX_CONTACTS_PER_CYCLE,
  MAX_CANDIDATES_PER_CONTACT,
  INTRODUCER_DISCOVERY_SOURCE,
} from "./support/introducer.discovery.js";
export type {
  IntroducerDiscoveryDatabase,
  IntroducerDiscoveryQueue,
  ContactWithIntents,
} from "./support/introducer.discovery.js";
export { persistOpportunities } from "./support/opportunity.persist.js";
export { presentOpportunity } from "./support/opportunity.presentation.js";
export type { UserInfo } from "./support/opportunity.presentation.js";
export { stripUuids, stripIntroducerMentions } from "./support/opportunity.sanitize.js";

// ─── Tools (used by the protocol app) ────────────────────────────────────────

export { createToolRegistry } from "./tools/tool.registry.js";

// ─── MCP ──────────────────────────────────────────────────────────────────────

export { createMcpServer } from "./mcp/mcp.server.js";
export type { ScopedDepsFactory } from "./mcp/mcp.server.js";

// ─── States (for advanced graph consumers) ────────────────────────────────────

export type {
  UserNegotiationContext,
  NegotiationTurn,
  SeedAssessment,
  NegotiationGraphLike,
} from "./states/negotiation.state.js";

// ─── Streamers ────────────────────────────────────────────────────────────────

export { ChatStreamer } from "./streamers/chat.streamer.js";
export { ResponseStreamer } from "./streamers/response.streamer.js";
