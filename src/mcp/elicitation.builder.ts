import type { Question } from "../shared/schemas/question.schema.js";

type SingleChoiceSchema = {
  type: "string";
  enum: string[];
  description: string;
};

type MultiChoiceSchema = {
  type: "array";
  items: { type: "string"; enum: string[] };
  description: string;
};

type ChoiceSchema = SingleChoiceSchema | MultiChoiceSchema;

/**
 * Translates a Question into an MCP `elicitation/create` request payload.
 * The schema has one property named `choice` — a string-with-enum for
 * single-select, an array-of-enum-strings for multi-select.
 *
 * Per-option `description` text is packed into the property `description`
 * joined by ` | ` (MCP `requestedSchema` has no slot for per-option
 * descriptions; this is the spec's accepted lossy mapping).
 *
 * @param q - The question to translate.
 * @returns An MCP `elicitation/create` request payload.
 */
export function buildElicitationCreate(q: Question): {
  message: string;
  requestedSchema: {
    type: "object";
    properties: { choice: ChoiceSchema };
    required: ["choice"];
  };
} {
  const propertyDescription = q.options
    .map((opt) => `${opt.label}: ${opt.description}`)
    .join(" | ");

  const labels = q.options.map((o) => o.label);

  const choiceSchema: ChoiceSchema = q.multiSelect
    ? {
        type: "array",
        items: { type: "string", enum: labels },
        description: propertyDescription,
      }
    : {
        type: "string",
        enum: labels,
        description: propertyDescription,
      };

  return {
    message: `${q.title}: ${q.prompt}`,
    requestedSchema: {
      type: "object",
      properties: { choice: choiceSchema },
      required: ["choice"],
    },
  };
}

/**
 * Flattens an accepted elicitation `choice` value into the user-message
 * format Slice 4 produces. Returns `null` when the choice is missing,
 * undefined, or an empty array (treat as unanswered — do not post).
 *
 * @param q - The question the choice answers.
 * @param choice - The raw value from the elicitation response.
 * @returns A formatted string or `null` if the choice is absent/empty.
 */
export function flattenChoice(q: Question, choice: unknown): string | null {
  const prefix = `${q.title} (${q.prompt})`;

  if (Array.isArray(choice)) {
    if (choice.length === 0) return null;
    return `${prefix}: ${choice.join(", ")}`;
  }
  if (typeof choice === "string" && choice.length > 0) {
    return `${prefix}: ${choice}`;
  }
  return null;
}
