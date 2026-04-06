var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { protocolLogger } from "../support/protocol.logger";
import { Timed } from "../support/performance";
import { createModel } from "./model.config";
const logger = protocolLogger("IntentReconciler");
/**
 * Config
 */
import { config } from "dotenv";
config({ path: '.env.development', override: true });
const model = createModel("intentReconciler");
const CreateActionTypeSchema = z.union([z.literal("create"), z.literal("CREATE")]);
const UpdateActionTypeSchema = z.union([z.literal("update"), z.literal("UPDATE")]);
const ExpireActionTypeSchema = z.union([z.literal("expire"), z.literal("EXPIRE")]);
// ──────────────────────────────────────────────────────────────
// 1. SYSTEM PROMPT
// ──────────────────────────────────────────────────────────────
const systemPrompt = `
You are an expert Intent Manager. Your goal is to reconcile NEWLY INFERRED intents with the user's ACTIVE intents.

You have access to:
1. Inferred Intents: Goals or Tombstones extracted from recent user activity.
2. Active Intents: What the user is currently working on.

YOUR TASK:
Compare the Inferred Intents against the Active Intents and decide on the necessary ACTIONS (Create, Update, Expire).

MATCHING LOGIC:
- You must determine if an Inferred Intent refers to the same underlying goal as an Active Intent.
- You must detect if an Inferred Intent CONTRADICTS an Active Intent (Change of Mind).

SEMANTIC GOVERNANCE RULES (Donnellan's Distinction):
- **REFERENTIAL Intents** (Anchor != NULL): These point to specific entities (e.g., "Google").
  - Matching logic: Match if the Anchor is the SAME.
  - If Anchor is different (e.g. "Join Google" vs "Join Meta"), they are DIFFERENT intents.
- **ATTRIBUTIVE Intents** (Anchor == NULL): These describe a class of things.
  - Matching logic: Match if the description is semantically similar content.
  - E.g. "Join a startup" and "Work for a small tech company" are the SAME.

ACTIONS:
- CREATE: If an Inferred Goal does NOT match any Active Intent, CREATE it.
- UPDATE: If an Inferred Goal matches an Active Intent but offers a better/different description, UPDATE it. When the match is an exact duplicate (same goal, no change needed), still output an UPDATE action with that Active Intent's id and the same payload—this allows the caller to link the intent to an index (e.g. add it to a community).
  CRITICAL UPDATE MERGE RULES:
  * When UPDATING an intent, you MUST PRESERVE all existing details from the Active Intent.
  * Only MODIFY or ADD the specific aspects mentioned in the Inferred Intent.
  * NEVER remove existing details unless explicitly contradicted.
  * Examples:
    - Active: "Create a text-based RPG game"
    - Inferred: "Create an RPG game with LLM-enhanced narration"
    - CORRECT UPDATE: "Create a text-based RPG game with LLM-enhanced narration" (preserved "text-based")
    - WRONG UPDATE: "Create an RPG game with LLM-enhanced narration" (lost "text-based")
  * Think of updates as REFINEMENTS or ADDITIONS, not REPLACEMENTS.
  * If the Inferred Intent is a complete restatement, it's fine to use it directly.
  * If the Inferred Intent adds/modifies specific aspects, merge it with existing details.
- EXPIRE: If an Inferred Tombstone matches an Active Intent (semantically), EXPIRE it.
- CONFLICT RESOLUTION: If a NEW Goal contradicts an Active Intent, EXPIRE the old and CREATE the new.
- DEDUPLICATION: Use Donnellan's Distinction above to merge duplicates. For duplicates, output UPDATE (not an empty list) so the intent can be linked to an index.

Output a list of specific actions to apply.
IMPORTANT: The type field MUST be exactly one of: "create", "update", "expire" (lowercase).
`;
// ──────────────────────────────────────────────────────────────
// 2. RESPONSE SCHEMA (Zod)
// ──────────────────────────────────────────────────────────────
const CreateIntentActionSchema = z.object({
    type: CreateActionTypeSchema,
    payload: z.string().describe("The new intent description"),
    score: z.number().nullable().describe("The felicity score (0-100)"),
    reasoning: z.string().nullable().describe("Reasoning for the creation (including felicity)"),
    // Semantic Governance Fields
    intentMode: z.enum(['REFERENTIAL', 'ATTRIBUTIVE']).nullable().describe("Donnellan's Distinction"),
    referentialAnchor: z.string().nullable().describe("Entity anchored to"),
    semanticEntropy: z.number().nullable().describe("Constraint Density Score (0-1)"),
});
const UpdateIntentActionSchema = z.object({
    type: UpdateActionTypeSchema,
    id: z.string().describe("The ID of the intent to update"),
    payload: z.string().describe("The updated intent description"),
    score: z.number().nullable().describe("The felicity score (0-100)"),
    reasoning: z.string().nullable().describe("Reasoning for the update"),
    intentMode: z.enum(['REFERENTIAL', 'ATTRIBUTIVE']).nullable(),
});
const ExpireIntentActionSchema = z.object({
    type: ExpireActionTypeSchema,
    id: z.string().describe("The ID of the intent to expire"),
    reason: z.string().describe("Why it is expired")
});
const responseFormat = z.object({
    actions: z.array(z.union([
        CreateIntentActionSchema,
        UpdateIntentActionSchema,
        ExpireIntentActionSchema
    ])).describe("List of actions to apply")
});
const normalizeActionType = (type) => {
    const normalized = type.toLowerCase();
    if (normalized === "create" || normalized === "update" || normalized === "expire") {
        return normalized;
    }
    logger.warn(`normalizeActionType: unexpected action type "${type}", defaulting to "create"`);
    return "create";
};
// ──────────────────────────────────────────────────────────────
// 4. CLASS DEFINITION
// ──────────────────────────────────────────────────────────────
export class IntentReconciler {
    constructor() {
        this.model = model.withStructuredOutput(responseFormat, {
            name: "intent_reconciler"
        });
    }
    /**
     * Reconciles inferred intents with active intents.
     * @param inferredIntentsFormatted - Formatted string of inferred intents.
     * @param activeIntentsContext - Formatted string of active intents.
     */
    async invoke(inferredIntentsFormatted, activeIntentsContext) {
        logger.verbose(`[IntentReconciler.invoke] Reconciling intents...`);
        const prompt = `
      # Active Intents
      ${activeIntentsContext}

      # Inferred Intents (Candidates)
      ${inferredIntentsFormatted}

      Based on the Inferred Intents, determine the actions to modify the Active Intents state.
      IMPORTANT:
      - If you CREATE or UPDATE an intent, you MUST popuate the 'score' and 'reasoning' fields.
      - Extract the 'score', 'semanticEntropy', 'referentialAnchor' from the Inferred Intent's data.
      - Include the verification details in the 'reasoning'.
    `;
        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(prompt)
        ];
        try {
            const output = await this.model.invoke(messages);
            const normalizedActions = output.actions.map((action) => ({
                ...action,
                type: normalizeActionType(action.type),
            }));
            logger.verbose(`[IntentReconciler.invoke] Decision: ${normalizedActions.length} actions.`);
            return { actions: normalizedActions };
        }
        catch (error) {
            logger.error("[IntentReconciler] Error during invocation", { error });
            return { actions: [] };
        }
    }
    /**
     * Factory method to expose the agent as a LangChain tool.
     */
    static asTool() {
        return tool(async (args) => {
            const agent = new IntentReconciler();
            return await agent.invoke(args.inferredIntents, args.activeIntents);
        }, {
            name: 'intent_reconciler',
            description: 'Reconciles inferred intents with active intents to determine state changes.',
            schema: z.object({
                inferredIntents: z.string().describe('Formatted string of inferred intents'),
                activeIntents: z.string().describe('Formatted string of active intents')
            })
        });
    }
}
__decorate([
    Timed(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IntentReconciler.prototype, "invoke", null);
//# sourceMappingURL=intent.reconciler.js.map