var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * HyDE Generator Agent: pure LLM agent for generating hypothetical documents
 * in the target corpus voice. Uses free-text lens labels instead of enum strategies.
 */
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { HYDE_CORPUS_PROMPTS } from './hyde.strategies.js';
import { Timed } from "../support/performance.js";
import { protocolLogger } from '../support/protocol.logger.js';
import { createModel } from "./model.config.js";
const logger = protocolLogger("HydeGenerator");
const SYSTEM_PROMPT = `You are a Hypothetical Document Generator for semantic search.

Your task: Given a source statement (e.g. an intent or goal), write a short hypothetical document in the voice of the TARGET side—the kind of person or statement that would be an ideal match for that source.

Rules:
- Write in first person as the target.
- Be concrete and specific so the text is good for vector similarity search.
- Output only the hypothetical document text, no meta-commentary.
- Keep length to a few sentences or one short paragraph.`;
const responseFormat = z.object({
    hypotheticalDocument: z
        .string()
        .describe('The hypothetical document text in the target voice, suitable for embedding and retrieval'),
});
const model = createModel("hydeGenerator");
/**
 * Generates hypothetical documents in a target corpus voice for semantic search.
 * Uses free-text lens labels (from LensInferrer) instead of enum strategies.
 */
export class HydeGenerator {
    constructor() {
        this.model = model.withStructuredOutput(responseFormat, {
            name: "hyde_generator",
        });
    }
    /**
     * Generate a hypothetical document for the given source text and lens.
     *
     * @param input - Source text, lens label, and target corpus
     * @returns Generated hypothetical document text
     */
    async generate(input) {
        const promptText = HYDE_CORPUS_PROMPTS[input.corpus](input.sourceText, input.lens);
        const messages = [
            new SystemMessage(SYSTEM_PROMPT),
            new HumanMessage(promptText),
        ];
        const result = await this.model.invoke(messages);
        const parsed = responseFormat.parse(result);
        const text = parsed.hypotheticalDocument ?? '';
        logger.verbose('Generated HyDE document', {
            lens: input.lens,
            corpus: input.corpus,
            textLength: text.length,
        });
        return { text };
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HydeGenerator.prototype, "generate", null);
//# sourceMappingURL=hyde.generator.js.map