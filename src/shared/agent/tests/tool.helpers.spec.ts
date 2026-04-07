/** Config */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, expect, test } from "bun:test";
import type { ChatGraphCompositeDatabase } from "../../interfaces/database.interface.js";
import { ChatContextAccessError, resolveChatContext } from "../tool.helpers.js";

const userId = "00000000-0000-4000-8000-000000000111";
const networkId = "00000000-0000-4000-8000-000000000222";

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
    getNetworkMemberships: async () => ([
      {
        networkId,
        networkTitle: "AI Builders",
        indexPrompt: "People building practical AI tools",
        permissions: ["member"],
        memberPrompt: null,
        autoAssign: true,
        isPersonal: false,
        joinedAt: new Date("2026-01-01"),
      },
    ]),
    getNetwork: async (id: string) => ({ id, title: "AI Builders" }),
    getNetworkMembership: async (idxId: string, uid: string) =>
      idxId === networkId && uid === userId
        ? {
            networkId,
            networkTitle: "AI Builders",
            indexPrompt: "People building practical AI tools",
            permissions: ["member"],
            memberPrompt: null,
            autoAssign: true,
            isPersonal: false,
            joinedAt: new Date("2026-01-01"),
          }
        : null,
    isNetworkMember: async () => true,
    isIndexOwner: async () => false,
  };

  return { ...base, ...overrides } as Pick<
    ChatGraphCompositeDatabase,
    "getUser" | "getProfile" | "getNetworkMemberships" | "getNetworkMembership" | "getNetwork" | "isNetworkMember" | "isIndexOwner"
  >;
}

describe("resolveChatContext", () => {
  test("preloads user, full profile, and named memberships", async () => {
    const db = createContextDatabase();
    const ctx = await resolveChatContext({ database: db, userId });

    expect(ctx.user.id).toBe(userId);
    expect(ctx.userProfile).not.toBeNull();
    expect(ctx.userNetworks.length).toBe(1);
    expect(ctx.userNetworks[0].networkTitle).toBe("AI Builders");
    expect(ctx.userName).toBe("Test User");
    expect(ctx.userEmail).toBe("test@example.com");
  });

  test("maps scoped membership role to member", async () => {
    const db = createContextDatabase({
      isIndexOwner: async () => false,
      isNetworkMember: async () => true,
    });

    const ctx = await resolveChatContext({ database: db, userId, networkId });
    expect(ctx.scopedMembershipRole).toBe("member");
    expect(ctx.isOwner).toBe(false);
    expect(ctx.scopedIndex?.title).toBe("AI Builders");
  });

  test("maps scoped membership role to owner", async () => {
    const db = createContextDatabase({
      isIndexOwner: async () => true,
      isNetworkMember: async () => true,
    });

    const ctx = await resolveChatContext({ database: db, userId, networkId });
    expect(ctx.scopedMembershipRole).toBe("owner");
    expect(ctx.isOwner).toBe(true);
  });

  test("throws when scoped index is provided for non-member", async () => {
    const db = createContextDatabase({
      isNetworkMember: async () => false,
    });

    const err = await resolveChatContext({ database: db, userId, networkId }).catch((e: unknown) => e);
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

  test("throws ChatContextAccessError with 404 INDEX_NOT_FOUND when networkId provided and getNetwork returns null", async () => {
    const db = createContextDatabase({
      getNetwork: async () => null,
    });

    const err = await resolveChatContext({ database: db, userId, networkId }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatContextAccessError);
    expect((err as ChatContextAccessError).statusCode).toBe(404);
    expect((err as ChatContextAccessError).code).toBe("INDEX_NOT_FOUND");
  });

  test("uses getNetworkMembership when membership missing from userNetworks (prompt not lost)", async () => {
    const customPrompt = "Custom index purpose for fallback test";
    const db = createContextDatabase({
      getNetworkMemberships: async () => [], // list empty but user is still member
      getNetworkMembership: async (idxId: string, uid: string) =>
        idxId === networkId && uid === userId
          ? {
              networkId,
              networkTitle: "AI Builders",
              indexPrompt: customPrompt,
              permissions: ["member"],
              memberPrompt: null,
              autoAssign: true,
              isPersonal: false,
              joinedAt: new Date("2026-01-01"),
            }
          : null,
    });

    const ctx = await resolveChatContext({ database: db, userId, networkId });
    expect(ctx.scopedIndex).not.toBeUndefined();
    expect(ctx.scopedIndex?.prompt).toBe(customPrompt);
  });
});
