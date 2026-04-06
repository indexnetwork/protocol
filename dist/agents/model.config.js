import { ChatOpenAI } from "@langchain/openai";
/** Module-level config set by configureProtocol(). Merged with per-call overrides. */
let _activeConfig = {};
/**
 * Configure the protocol package with runtime credentials and settings.
 * Call once at application startup before any agents are used.
 * Falls back to environment variables for any field not provided.
 *
 * @param config - Runtime configuration overrides
 */
export function configureProtocol(config) {
    _activeConfig = config;
}
function getModelConfig(config) {
    const merged = { ..._activeConfig, ...config };
    return {
        intentInferrer: { model: "google/gemini-2.5-flash" },
        intentIndexer: { model: "google/gemini-2.5-flash" },
        intentVerifier: { model: "google/gemini-2.5-flash" },
        intentReconciler: { model: "google/gemini-2.5-flash" },
        intentClarifier: { model: "google/gemini-2.5-flash" },
        profileGenerator: { model: "google/gemini-2.5-flash" },
        profileHydeGenerator: { model: "google/gemini-2.5-flash" },
        hydeGenerator: { model: "google/gemini-2.5-flash" },
        lensInferrer: { model: "google/gemini-2.5-flash" },
        opportunityEvaluator: { model: "google/gemini-2.5-flash" },
        opportunityPresenter: { model: "google/gemini-2.5-flash" },
        negotiationProposer: { model: "google/gemini-2.5-flash" },
        negotiationResponder: { model: "google/gemini-2.5-flash" },
        homeCategorizer: { model: "google/gemini-2.5-flash" },
        suggestionGenerator: { model: "google/gemini-2.5-flash", temperature: 0.4, maxTokens: 512 },
        chatTitleGenerator: { model: "google/gemini-2.5-flash", temperature: 0.3, maxTokens: 32 },
        negotiationInsights: { model: "google/gemini-2.5-flash", temperature: 0.4, maxTokens: 512 },
        inviteGenerator: { model: "google/gemini-2.5-flash", temperature: 0.3, maxTokens: 512 },
        chat: {
            model: merged.chatModel ?? process.env.CHAT_MODEL ?? "google/gemini-3-pro-preview",
            maxTokens: 8192,
            reasoning: {
                effort: (merged.chatReasoningEffort ?? process.env.CHAT_REASONING_EFFORT ?? "low"),
                exclude: true,
            },
        },
    };
}
/**
 * Returns the model name string for the given agent key.
 * @param agent - Key from MODEL_CONFIG identifying which agent's settings to use.
 * @param config - Optional runtime config overrides (merged with module-level config).
 */
export function getModelName(agent, config) {
    return getModelConfig(config)[agent].model;
}
/**
 * Creates a ChatOpenAI instance configured for OpenRouter.
 * @param agent - Key identifying which agent's model settings to use.
 * @param config - Optional runtime config overrides (merged with module-level config).
 */
export function createModel(agent, config) {
    const merged = { ..._activeConfig, ...config };
    const apiKey = merged.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey?.trim()) {
        throw new Error(`createModel(${agent}): OPENROUTER_API_KEY is required. Pass via configureProtocol({ apiKey }) or set the OPENROUTER_API_KEY environment variable.`);
    }
    const cfg = getModelConfig(merged)[agent];
    return new ChatOpenAI({
        model: cfg.model,
        configuration: {
            baseURL: merged.baseURL ?? process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
            apiKey,
        },
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        ...(cfg.reasoning && { modelKwargs: { reasoning: cfg.reasoning } }),
    });
}
//# sourceMappingURL=model.config.js.map