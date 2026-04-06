import type { HydeTargetCorpus } from './lens.inferrer';
export interface HydeGeneratorOutput {
    text: string;
}
export interface HydeGenerateInput {
    /** Original intent or query text. */
    sourceText: string;
    /** Free-text lens label from LensInferrer (e.g. "crypto infra VC"). */
    lens: string;
    /** Which corpus voice to generate in. */
    corpus: HydeTargetCorpus;
}
/**
 * Generates hypothetical documents in a target corpus voice for semantic search.
 * Uses free-text lens labels (from LensInferrer) instead of enum strategies.
 */
export declare class HydeGenerator {
    private model;
    /**
     * Generate a hypothetical document for the given source text and lens.
     *
     * @param input - Source text, lens label, and target corpus
     * @returns Generated hypothetical document text
     */
    generate(input: HydeGenerateInput): Promise<HydeGeneratorOutput>;
}
//# sourceMappingURL=hyde.generator.d.ts.map