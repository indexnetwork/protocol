/**
 * Tests for post-result helpers: extractDecisionQuestions and renderQuestionsEnvelope.
 */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, it, expect } from "bun:test";
import {
  extractDecisionQuestions,
  renderQuestionsEnvelope,
} from "../mcp.server.js";
import type { Question } from "../../shared/schemas/question.schema.js";

const sampleQ: Question = {
  title: "Stage",
  prompt: "Are you pre- or post-revenue?",
  options: [
    { label: "Pre-revenue (Recommended)", description: "No paying customers yet." },
    { label: "Post-revenue", description: "At least one paying customer." },
  ],
  multiSelect: false,
};

describe("mcp.server post-result helpers", () => {
  it("extractDecisionQuestions returns null when text is not JSON", () => {
    expect(extractDecisionQuestions("not-json")).toBeNull();
  });

  it("extractDecisionQuestions returns null when data.questions is missing or empty", () => {
    expect(
      extractDecisionQuestions(JSON.stringify({ data: { other: 1 } })),
    ).toBeNull();
    expect(
      extractDecisionQuestions(JSON.stringify({ data: { questions: [] } })),
    ).toBeNull();
  });

  it("extractDecisionQuestions returns the array when present", () => {
    const text = JSON.stringify({ data: { questions: [sampleQ] } });
    expect(extractDecisionQuestions(text)).toEqual([sampleQ]);
  });

  it("renderQuestionsEnvelope prefixes a sentinel string before JSON", () => {
    const out = renderQuestionsEnvelope([sampleQ]);
    expect(out.startsWith("Decision questions (structured): ")).toBe(true);
    const parsedTail = JSON.parse(out.slice("Decision questions (structured): ".length));
    expect(parsedTail).toEqual({ questions: [sampleQ] });
  });
});
