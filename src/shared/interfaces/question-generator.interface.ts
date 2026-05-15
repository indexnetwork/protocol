/**
 * Protocol-level read contract for decision-question generation. Implementations
 * live in the backend (see `QuestionGeneratorService`) and are injected into the
 * protocol via `ProtocolDeps`/`ToolContext`. The protocol module never constructs
 * its own LLM-bound `QuestionGenerator` — callers inject one (or `undefined` to
 * opt out).
 */
import type { DiscoveryQuestionInput } from "../../opportunity/question.prompt.js";
import type { QuestionGenerationResult } from "../schemas/question.schema.js";

export interface QuestionGeneratorReader {
  /**
   * Run the question generator over a single discovery turn.
   * @returns The structured result, or `null` when generation failed,
   *   guardrails dropped all candidates, or the underlying LLM threw.
   */
  generate(input: DiscoveryQuestionInput): Promise<QuestionGenerationResult | null>;
}
