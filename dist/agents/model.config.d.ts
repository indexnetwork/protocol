import { ChatOpenAI } from "@langchain/openai";
/** Settings that can be configured per agent. */
export interface ModelSettings {
    model: string;
    temperature?: number;
    maxTokens?: number;
    reasoning?: {
        effort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
        exclude?: boolean;
    };
}
/**
 * Runtime configuration for the protocol package.
 * Set once via configureProtocol() at application startup.
 * All fields fall back to environment variables if not provided.
 */
export interface ModelConfig {
    /** OpenRouter API key. Falls back to OPENROUTER_API_KEY env var. */
    apiKey?: string;
    /** OpenRouter base URL. Falls back to OPENROUTER_BASE_URL env var. */
    baseURL?: string;
    /** Override the chat agent model. Falls back to CHAT_MODEL env var. */
    chatModel?: string;
    /** Override the chat reasoning effort. Falls back to CHAT_REASONING_EFFORT env var. */
    chatReasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}
/**
 * Configure the protocol package with runtime credentials and settings.
 * Call once at application startup before any agents are used.
 * Falls back to environment variables for any field not provided.
 *
 * @param config - Runtime configuration overrides
 */
export declare function configureProtocol(config: ModelConfig): void;
declare function getModelConfig(config?: ModelConfig): {
    readonly intentInferrer: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly intentIndexer: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly intentVerifier: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly intentReconciler: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly intentClarifier: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly profileGenerator: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly profileHydeGenerator: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly hydeGenerator: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly lensInferrer: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly opportunityEvaluator: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly opportunityPresenter: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly negotiationProposer: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly negotiationResponder: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly homeCategorizer: {
        readonly model: "google/gemini-2.5-flash";
    };
    readonly suggestionGenerator: {
        readonly model: "google/gemini-2.5-flash";
        readonly temperature: 0.4;
        readonly maxTokens: 512;
    };
    readonly chatTitleGenerator: {
        readonly model: "google/gemini-2.5-flash";
        readonly temperature: 0.3;
        readonly maxTokens: 32;
    };
    readonly negotiationInsights: {
        readonly model: "google/gemini-2.5-flash";
        readonly temperature: 0.4;
        readonly maxTokens: 512;
    };
    readonly inviteGenerator: {
        readonly model: "google/gemini-2.5-flash";
        readonly temperature: 0.3;
        readonly maxTokens: 512;
    };
    readonly chat: {
        readonly model: string;
        readonly maxTokens: 8192;
        readonly reasoning: {
            readonly effort: NonNullable<ModelSettings["reasoning"]>["effort"];
            readonly exclude: true;
        };
    };
};
/**
 * Returns the model name string for the given agent key.
 * @param agent - Key from MODEL_CONFIG identifying which agent's settings to use.
 * @param config - Optional runtime config overrides (merged with module-level config).
 */
export declare function getModelName(agent: keyof ReturnType<typeof getModelConfig>, config?: ModelConfig): string;
/**
 * Creates a ChatOpenAI instance configured for OpenRouter.
 * @param agent - Key identifying which agent's model settings to use.
 * @param config - Optional runtime config overrides (merged with module-level config).
 */
export declare function createModel(agent: keyof ReturnType<typeof getModelConfig>, config?: ModelConfig): ChatOpenAI;
export {};
//# sourceMappingURL=model.config.d.ts.map