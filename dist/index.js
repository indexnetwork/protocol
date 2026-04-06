// ─── Public API (recommended for external consumers) ──────────────────────────
export { createChatTools } from "./tools/index.js";
export { configureProtocol } from "./agents/model.config.js";
export { ChatContextAccessError, resolveChatContext } from "./tools/tool.helpers.js";
// ─── Graph factories (used by the protocol app; advanced use for external consumers) ──
export { ChatGraphFactory } from "./graphs/chat.graph.js";
export { HomeGraphFactory } from "./graphs/home.graph.js";
export { HydeGraphFactory } from "./graphs/hyde.graph.js";
export { IndexGraphFactory } from "./graphs/index.graph.js";
export { IndexMembershipGraphFactory } from "./graphs/index_membership.graph.js";
export { IntentGraphFactory } from "./graphs/intent.graph.js";
export { IntentIndexGraphFactory } from "./graphs/intent_index.graph.js";
export { MaintenanceGraphFactory } from "./graphs/maintenance.graph.js";
export { NegotiationGraphFactory, createDefaultNegotiationGraph } from "./graphs/negotiation.graph.js";
export { OpportunityGraphFactory } from "./graphs/opportunity.graph.js";
export { ProfileGraphFactory } from "./graphs/profile.graph.js";
// ─── Agents (used by the protocol app; advanced use for external consumers) ───
export { ChatTitleGenerator } from "./agents/chat.title.generator.js";
export { HydeGenerator } from "./agents/hyde.generator.js";
export { IntentIndexer } from "./agents/intent.indexer.js";
export { LensInferrer } from "./agents/lens.inferrer.js";
export { NegotiationInsightsGenerator } from "./agents/negotiation.insights.generator.js";
export { NegotiationProposer } from "./agents/negotiation.proposer.js";
export { NegotiationResponder } from "./agents/negotiation.responder.js";
export { OpportunityPresenter, gatherPresenterContext } from "./agents/opportunity.presenter.js";
// ─── Support utilities (used by the protocol app) ─────────────────────────────
export { canUserSeeOpportunity, isActionableForViewer, validateOpportunityActors, } from "./support/opportunity.utils.js";
export { getPrimaryActionLabel } from "./support/opportunity.constants.js";
export { persistOpportunities } from "./support/opportunity.persist.js";
export { presentOpportunity } from "./support/opportunity.presentation.js";
export { stripUuids, stripIntroducerMentions } from "./support/opportunity.sanitize.js";
// ─── Tools (used by the protocol app) ────────────────────────────────────────
export { createToolRegistry } from "./tools/tool.registry.js";
// ─── MCP ──────────────────────────────────────────────────────────────────────
export { createMcpServer } from "./mcp/mcp.server.js";
// ─── Streamers ────────────────────────────────────────────────────────────────
export { ChatStreamer } from "./streamers/chat.streamer.js";
export { ResponseStreamer } from "./streamers/response.streamer.js";
//# sourceMappingURL=index.js.map