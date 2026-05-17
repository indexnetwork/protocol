import { describe, it, expect, mock } from "bun:test";
import { dispatchElicitations } from "../elicitation.dispatcher.js";
import type { Question } from "../../shared/schemas/question.schema.js";
import type { ChatMessageWriter } from "../../shared/interfaces/chat-message-writer.interface.js";

const q1: Question = {
  title: "Stage",
  prompt: "Are you pre- or post-revenue?",
  options: [
    { label: "Pre-revenue (Recommended)", description: "No paying customers yet." },
    { label: "Post-revenue", description: "At least one paying customer." },
  ],
  multiSelect: false,
};

const q2: Question = {
  title: "Timing",
  prompt: "When do you need a co-founder in place?",
  options: [
    { label: "In the next month", description: "Urgent." },
    { label: "In the next quarter", description: "Soon." },
  ],
  multiSelect: false,
};

function makeWriter(): ChatMessageWriter & {
  calls: Array<{ userId: string; content: string }>;
} {
  const calls: Array<{ userId: string; content: string }> = [];
  return {
    calls,
    async addUserMessage(userId, content) {
      calls.push({ userId, content });
      return { sessionId: "session-1" };
    },
  };
}

describe("dispatchElicitations", () => {
  it("dispatches one elicitInput per question sequentially and posts accepts", async () => {
    const elicitations: unknown[] = [];
    const elicitInput = mock(async (params: unknown) => {
      elicitations.push(params);
      return { action: "accept" as const, content: { choice: "Pre-revenue (Recommended)" } };
    });
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [q1, q2],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(elicitInput).toHaveBeenCalledTimes(2);
    expect((elicitations[0] as { message: string }).message).toBe(
      "Stage: Are you pre- or post-revenue?",
    );
    expect((elicitations[1] as { message: string }).message).toBe(
      "Timing: When do you need a co-founder in place?",
    );
    expect(writer.calls).toHaveLength(2);
    expect(writer.calls[0].content).toBe(
      "Stage (Are you pre- or post-revenue?): Pre-revenue (Recommended)",
    );
  });

  it("decline is a no-op but continues to next question", async () => {
    const elicitInput = mock(async (_params: unknown) => ({
      action: "decline" as const,
    }));
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [q1, q2],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(elicitInput).toHaveBeenCalledTimes(2);
    expect(writer.calls).toHaveLength(0);
  });

  it("cancel stops the loop", async () => {
    const elicitInput = mock(async (_params: unknown) => ({
      action: "cancel" as const,
    }));
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [q1, q2],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(writer.calls).toHaveLength(0);
  });

  it("a transport throw stops the loop", async () => {
    let callCount = 0;
    const elicitInput = mock(async (_params: unknown) => {
      callCount += 1;
      throw new Error("transport-fail");
    });
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [q1, q2],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(callCount).toBe(1);
    expect(writer.calls).toHaveLength(0);
  });

  it("accept with empty multi-select array is treated as unanswered (no post)", async () => {
    const multiQ: Question = { ...q1, multiSelect: true };
    const elicitInput = mock(async (_params: unknown) => ({
      action: "accept" as const,
      content: { choice: [] },
    }));
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [multiQ],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(writer.calls).toHaveLength(0);
  });

  it("no-op when questions is empty", async () => {
    const elicitInput = mock(async (_params: unknown) => ({ action: "accept" as const }));
    const writer = makeWriter();

    await dispatchElicitations({
      userId: "u-1",
      questions: [],
      elicitInput,
      chatMessageWriter: writer,
    });

    expect(elicitInput).not.toHaveBeenCalled();
    expect(writer.calls).toHaveLength(0);
  });

  it("no-op when chatMessageWriter is undefined (elicitations still dispatched)", async () => {
    const elicitInput = mock(async (_params: unknown) => ({
      action: "accept" as const,
      content: { choice: "Pre-revenue (Recommended)" },
    }));

    await dispatchElicitations({
      userId: "u-1",
      questions: [q1],
      elicitInput,
      chatMessageWriter: undefined,
    });

    expect(elicitInput).toHaveBeenCalledTimes(1);
  });
});
