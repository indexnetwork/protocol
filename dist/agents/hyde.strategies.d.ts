/**
 * HyDE (Hypothetical Document Embeddings) type definitions.
 *
 * The system is now role-agnostic: instead of hardcoded strategy names
 * (mirror, reciprocal, mentor, investor, collaborator, hiree), an LLM
 * infers free-text "lenses" dynamically. This file re-exports the lens
 * types and provides constants for the HyDE pipeline.
 */
export type { Lens, HydeTargetCorpus, LensInferenceInput, LensInferenceOutput } from './lens.inferrer.js';
/** Default cache TTL for ephemeral HyDE documents (1 hour). */
export declare const HYDE_DEFAULT_CACHE_TTL = 3600;
/**
 * Prompt templates for HyDE document generation.
 * Keyed by target corpus — the lens label provides the semantic specificity.
 */
export declare const HYDE_CORPUS_PROMPTS: Record<'profiles' | 'intents', (sourceText: string, lens: string) => string>;
//# sourceMappingURL=hyde.strategies.d.ts.map