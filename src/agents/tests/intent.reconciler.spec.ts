/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it } from "bun:test";
import { IntentReconciler } from "../intent.reconciler.js";

describe('IntentReconciler', () => {
  const reconciler = new IntentReconciler();

  it('should create a new intent if no match found', async () => {
    const inferred = `- [GOAL] "Learn Rust" (Confidence: high, Score: 85) \n Reasoning: Explicit statement.`;
    const active = "No active intents.";

    const result = await reconciler.invoke(inferred, active);

    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe("create");
    expect((result.actions[0] as any).payload).toContain("Rust");
  }, 30000);

  it('should expire an intent if a tombstone matches', async () => {
    const inferred = `- [TOMBSTONE] "Finish React Course" \n Reasoning: User said 'I am done with the react course'.`;
    const active = `1. [ID: 123] "Complete the React Course" (Status: Active)`;

    const result = await reconciler.invoke(inferred, active);

    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe("expire");
    expect((result.actions[0] as any).id).toBe("123");
  }, 30000);

  it('should update an intent description if better', async () => {
    const inferred = `- [GOAL] "Build a Todo App in React with Redux" (Confidence: high, Score: 90)`;
    const active = `1. [ID: 456] "Build a React app" (Status: Active)`;

    const result = await reconciler.invoke(inferred, active);

    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe("update");
    expect((result.actions[0] as any).id).toBe("456");
    expect((result.actions[0] as any).payload).toContain("Redux");
  }, 30000);
});
