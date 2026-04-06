/** Config */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, expect, test } from "bun:test";
import type { ChatGraphCompositeDatabase } from "../../interfaces/database.interface.js";
import {
  ChatContextAccessError,
  resolveChatContext,
} from "../tool.helpers.js";

const userId = "00000000-0000-4000-8000-000000000111";
const indexId = "00000000-0000-4000-8000-000000000222";

function createContextDatabase(overrides?: Partial<ChatGraphCompositeDatabase>) {
  const base = {
    getUser: async () => ({
      id: userId,
      name: "Test User",
      email: "test@example.com",
      location: "Remote",
      socials: { github: "https://github.com/test" },
    }),
    getProfile: async () => ({
      userId,
      identity: { name: "Test User", bio: "Builder", location: "Remote" },
      narrative: { context: "Building useful systems." },
      attributes: { skills: ["TypeScript"], interests: ["AI"] },
      embedding: null,
    }),
    getIndexMemberships: async () => ([
      {
        indexId,
        indexTitle: "AI Builders",
        indexPrompt: "People building practical AI tools",
        permissions: ["member"],
        memberPrompt: null,
        autoAssign: true,
        isPersonal: false,
        joinedAt: new Date("2026-01-01"),
      },
    ]),
    getIndex: async (id: string) => ({ id, title: "AI Builders" }),
    getIndexMembership: async (idxId: string, uid: string) =>
      idxId === indexId && uid === userId
        ? {
            indexId,
            indexTitle: "AI Builders",
            indexPrompt: "People building practical AI tools",
            permissions: ["member"],
            memberPrompt: null,
            autoAssign: true,
            isPersonal: false,
            joinedAt: new Date("2026-01-01"),
          }
        : null,
    isIndexMember: async () => true,
    isIndexOwner: async () => false,
  };

  return { ...base, ...overrides } as Pick<
    ChatGraphCompositeDatabase,
    "getUser" | "getProfile" | "getIndexMemberships" | "getIndexMembership" | "getIndex" | "isIndexMember" | "isIndexOwner"
  >;
}

describe("resolveChatContext", () => {
  test("preloads user, full profile, and named memberships", async () => {
    const db = createContextDatabase();
    const ctx = await resolveChatContext({ database: db, userId });

    expect(ctx.user.id).toBe(userId);
    expect(ctx.userProfile).not.toBeNull();
    expect(ctx.userIndexes.length).toBe(1);
    expect(ctx.userIndexes[0].indexTitle).toBe("AI Builders");
    expect(ctx.userName).toBe("Test User");
    expect(ctx.userEmail).toBe("test@example.com");
  });

  test("maps scoped membership role to member", async () => {
    const db = createContextDatabase({
      isIndexOwner: async () => false,
      isIndexMember: async () => true,
    });

    const ctx = await resolveChatContext({ database: db, userId, indexId });
    expect(ctx.scopedMembershipRole).toBe("member");
    expect(ctx.isOwner).toBe(false);
    expect(ctx.scopedIndex?.title).toBe("AI Builders");
  });

  test("maps scoped membership role to owner", async () => {
    const db = createContextDatabase({
      isIndexOwner: async () => true,
      isIndexMember: async () => true,
    });

    const ctx = await resolveChatContext({ database: db, userId, indexId });
    expect(ctx.scopedMembershipRole).toBe("owner");
    expect(ctx.isOwner).toBe(true);
  });

  test("throws when scoped index is provided for non-member", async () => {
    const db = createContextDatabase({
      isIndexMember: async () => false,
    });

    const err = await resolveChatContext({ database: db, userId, indexId }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatContextAccessError);
    expect((err as ChatContextAccessError).statusCode).toBe(403);
    expect((err as ChatContextAccessError).code).toBe("INDEX_MEMBERSHIP_REQUIRED");
  });

  test("throws ChatContextAccessError with 404 USER_NOT_FOUND when getUser returns null", async () => {
    const db = createContextDatabase({
      getUser: async () => null,
    });

    const err = await resolveChatContext({ database: db, userId }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatContextAccessError);
    expect((err as ChatContextAccessError).statusCode).toBe(404);
    expect((err as ChatContextAccessError).code).toBe("USER_NOT_FOUND");
  });

  test("throws ChatContextAccessError with 404 INDEX_NOT_FOUND when indexId provided and getIndex returns null", async () => {
    const db = createContextDatabase({
      getIndex: async () => null,
    });

    const err = await resolveChatContext({ database: db, userId, indexId }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatContextAccessError);
    expect((err as ChatContextAccessError).statusCode).toBe(404);
    expect((err as ChatContextAccessError).code).toBe("INDEX_NOT_FOUND");
  });

  test("uses getIndexMembership when membership missing from userIndexes (prompt not lost)", async () => {
    const customPrompt = "Custom index purpose for fallback test";
    const db = createContextDatabase({
      getIndexMemberships: async () => [], // list empty but user is still member
      getIndexMembership: async (idxId: string, uid: string) =>
        idxId === indexId && uid === userId
          ? {
              indexId,
              indexTitle: "AI Builders",
              indexPrompt: customPrompt,
              permissions: ["member"],
              memberPrompt: null,
              autoAssign: true,
              isPersonal: false,
              joinedAt: new Date("2026-01-01"),
            }
          : null,
    });

    const ctx = await resolveChatContext({ database: db, userId, indexId });
    expect(ctx.scopedIndex).not.toBeUndefined();
    expect(ctx.scopedIndex?.prompt).toBe(customPrompt);
  });
});
