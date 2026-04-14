import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createContactTools } from "../contact.tools.js";
import type { ToolDeps, ResolvedToolContext } from "../../shared/agent/tool.helpers.js";

function makeContext(userId = "user-123"): ResolvedToolContext {
  return {
    userId,
    user: { id: userId, name: "Alice", email: "a@test" } as any,
    userProfile: null,
    userNetworks: [],
    isMcp: true,
  } as unknown as ResolvedToolContext;
}

interface CapturedTool {
  name: string;
  handler: (input: { context: ResolvedToolContext; query: unknown }) => Promise<string>;
}

function captureTools(deps: ToolDeps): CapturedTool[] {
  const toolDefs: CapturedTool[] = [];
  const defineTool = (def: {
    name: string;
    description: string;
    querySchema: z.ZodType;
    handler: (input: { context: ResolvedToolContext; query: unknown }) => Promise<string>;
  }) => {
    toolDefs.push({ name: def.name, handler: def.handler });
    return def;
  };
  createContactTools(defineTool as any, deps);
  return toolDefs;
}

describe("search_contacts", () => {
  test("forwards ownerId + q + limit and returns rows", async () => {
    let captured: { ownerId: string; q: string; limit: number } | null = null;
    const contactService = {
      searchContacts: async (ownerId: string, q: string, limit: number) => {
        captured = { ownerId, q, limit };
        return [
          {
            contactId: "cid-1",
            name: "Jane Smith",
            email: "jane@example.com",
            avatar: null,
            isGhost: false,
          },
        ];
      },
    };
    const tools = captureTools({ contactService } as unknown as ToolDeps);
    const tool = tools.find((t) => t.name === "search_contacts")!;
    const result = await tool.handler({
      context: makeContext("alice"),
      query: { q: "jane", limit: 10 },
    });
    const parsed = JSON.parse(result);
    expect(captured).toEqual({ ownerId: "alice", q: "jane", limit: 10 });
    expect(parsed.success).toBe(true);
    expect(parsed.data.count).toBe(1);
    expect(parsed.data.contacts[0].email).toBe("jane@example.com");
  });

  test("defaults limit to 25", async () => {
    let capturedLimit: number | null = null;
    const contactService = {
      searchContacts: async (_ownerId: string, _q: string, limit: number) => {
        capturedLimit = limit;
        return [];
      },
    };
    const tools = captureTools({ contactService } as unknown as ToolDeps);
    const tool = tools.find((t) => t.name === "search_contacts")!;
    await tool.handler({ context: makeContext(), query: { q: "anything" } });
    expect(capturedLimit).toBe(25);
  });
});
