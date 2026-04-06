export type HydeTargetCorpus = 'profiles' | 'intents';
/** A single inferred lens — a search perspective the LLM decided is relevant. */
export interface Lens {
    /** Free-text description (e.g. "crypto infrastructure VC"). */
    label: string;
    /** Which vector index to search: user profiles or user intents. */
    corpus: HydeTargetCorpus;
    /** Why this perspective is relevant (for logging/trace). */
    reasoning: string;
}
export interface LensInferenceInput {
    /** Intent payload or search query. */
    sourceText: string;
    /** User's profile summary for domain context (optional). */
    profileContext?: string;
    /** Maximum number of lenses to infer (default 3). */
    maxLenses?: number;
}
export interface LensInferenceOutput {
    lenses: Lens[];
}
/**
 * Infers search lenses from source text and optional profile context.
 * Each lens represents a search perspective tagged with a target corpus
 * (profiles or intents) for downstream HyDE document generation.
 */
export declare class LensInferrer {
    private model;
    /**
     * Infer search lenses from source text and optional profile context.
     *
     * @param input - Source text, optional profile context, optional max lenses
     * @returns Array of inferred lenses with corpus tags; empty array on failure
     */
    infer(input: LensInferenceInput): Promise<LensInferenceOutput>;
}
//# sourceMappingURL=lens.inferrer.d.ts.map