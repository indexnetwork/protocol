// ─── Public API (recommended for external consumers) ──────────────────────────

export { createChatTools } from "./tools";
export { configureProtocol } from "./agents/model.config";
export type { ChatTools } from "./tools";
export type { ModelConfig, ModelSettings } from "./agents/model.config";
export type {
  ToolContext,
  ResolvedToolContext,
  ToolDeps,
  ProtocolDeps,
  DefineTool,
  RawToolDefinition,
  ToolRegistry,
} from "./tools/tool.helpers";
export { ChatContextAccessError, resolveChatContext } from "./tools/tool.helpers";

// ─── Interfaces (implement these to wire up your infrastructure) ───────────────

export type * from "./interfaces/auth.interface";
export type * from "./interfaces/cache.interface";
export type * from "./interfaces/chat-session.interface";
export type * from "./interfaces/contact.interface";
export type * from "./interfaces/database.interface";
export type * from "./interfaces/embedder.interface";
export type * from "./interfaces/enrichment.interface";
export type * from "./interfaces/integration.interface";
export type * from "./interfaces/queue.interface";
export type * from "./interfaces/scraper.interface";
export type * from "./interfaces/storage.interface";

// ─── Graph factories (used by the protocol app; advanced use for external consumers) ──

export { ChatGraphFactory } from "./graphs/chat.graph";
export { HomeGraphFactory } from "./graphs/home.graph";
export { HydeGraphFactory } from "./graphs/hyde.graph";
export { IndexGraphFactory } from "./graphs/index.graph";
export { IndexMembershipGraphFactory } from "./graphs/index_membership.graph";
export { IntentGraphFactory } from "./graphs/intent.graph";
export { IntentIndexGraphFactory } from "./graphs/intent_index.graph";
export { MaintenanceGraphFactory } from "./graphs/maintenance.graph";
export type {
  MaintenanceGraphDatabase,
  MaintenanceGraphCache,
  MaintenanceGraphQueue,
} from "./graphs/maintenance.graph";
export { NegotiationGraphFactory, createDefaultNegotiationGraph } from "./graphs/negotiation.graph";
export { OpportunityGraphFactory } from "./graphs/opportunity.graph";
export { ProfileGraphFactory } from "./graphs/profile.graph";

// ─── Agents (used by the protocol app; advanced use for external consumers) ───

export { ChatTitleGenerator } from "./agents/chat.title.generator";
export { HydeGenerator } from "./agents/hyde.generator";
export { IntentIndexer } from "./agents/intent.indexer";
export { LensInferrer } from "./agents/lens.inferrer";
export { NegotiationInsightsGenerator } from "./agents/negotiation.insights.generator";
export type { NegotiationDigest } from "./agents/negotiation.insights.generator";
export { NegotiationProposer } from "./agents/negotiation.proposer";
export { NegotiationResponder } from "./agents/negotiation.responder";
export { OpportunityPresenter, gatherPresenterContext } from "./agents/opportunity.presenter";
export type { PresenterDatabase } from "./agents/opportunity.presenter";

// ─── Support utilities (used by the protocol app) ─────────────────────────────

export {
  canUserSeeOpportunity,
  isActionableForViewer,
  validateOpportunityActors,
} from "./support/opportunity.utils";
export { getPrimaryActionLabel } from "./support/opportunity.constants";
export { persistOpportunities } from "./support/opportunity.persist";
export { presentOpportunity } from "./support/opportunity.presentation";
export type { UserInfo } from "./support/opportunity.presentation";
export { stripUuids, stripIntroducerMentions } from "./support/opportunity.sanitize";

// ─── Tools (used by the protocol app) ────────────────────────────────────────

export { createToolRegistry } from "./tools/tool.registry";

// ─── MCP ──────────────────────────────────────────────────────────────────────

export { createMcpServer } from "./mcp/mcp.server";
export type { ScopedDepsFactory } from "./mcp/mcp.server";

// ─── States (for advanced graph consumers) ────────────────────────────────────

export type { UserNegotiationContext } from "./states/negotiation.state";

// ─── Streamers ────────────────────────────────────────────────────────────────

export { ChatStreamer } from "./streamers/chat.streamer";
export { ResponseStreamer } from "./streamers/response.streamer";
