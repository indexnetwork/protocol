import { describe, expect, test } from "bun:test";
import { createNetworkTools } from "../network.tools.js";
import type { ToolDeps, ResolvedToolContext } from "../../shared/agent/tool.helpers.js";

function makeContext(userId = "user-1"): ResolvedToolContext {
  return {
    userId,
    user: { id: userId, name: "Alice", email: "a@test" } as never,
    userProfile: null,
    userNetworks: [],
    isMcp: true,
  } as unknown as ResolvedToolContext;
}

function captureTool(name: string, deps: Partial<ToolDeps>) {
  let captured: { handler: (i: { context: ResolvedToolContext; query: unknown }) => Promise<string> } | undefined;
  const defineTool = (def: { name: string; handler: (...args: unknown[]) => unknown }) => {
    if (def.name === name) captured = def as typeof captured;
    return def;
  };
  createNetworkTools(defineTool as never, deps as ToolDeps);
  return captured!;
}

describe("read_networks — field naming", () => {
  test("memberOf entries expose prompt not description", async () => {
    const deps = {
      graphs: {
        index: {
          invoke: async () => ({
            readResult: {
              memberOf: [{ networkId: "net-1", title: "AI Founders", prompt: "AI/ML co-founders in Berlin", autoAssign: false, isPersonal: false, joinedAt: new Date() }],
              owns: [],
              stats: { memberOfCount: 1, ownsCount: 0 },
            },
          }),
        },
      },
    };

    const tool = captureTool("read_networks", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-1"), query: {} })
    );

    expect(result.success).toBe(true);
    const network = result.data.memberOf[0];
    expect(network.prompt).toBe("AI/ML co-founders in Berlin");
    expect(network.description).toBeUndefined();
  });

  test("owns entries expose prompt not description", async () => {
    const deps = {
      graphs: {
        index: {
          invoke: async () => ({
            readResult: {
              memberOf: [],
              owns: [{ networkId: "net-2", title: "My Index", prompt: "For my contacts", memberCount: 3, intentCount: 5, joinPolicy: "invite_only" }],
              stats: { memberOfCount: 0, ownsCount: 1 },
            },
          }),
        },
      },
    };

    const tool = captureTool("read_networks", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-1"), query: {} })
    );

    expect(result.success).toBe(true);
    const network = result.data.owns[0];
    expect(network.prompt).toBe("For my contacts");
    expect(network.description).toBeUndefined();
  });

  test("publicNetworks entries expose prompt not description", async () => {
    const deps = {
      graphs: {
        index: {
          invoke: async () => ({
            readResult: {
              memberOf: [],
              owns: [],
              publicNetworks: [{ networkId: "net-3", title: "Public Hub", prompt: "Open community", memberCount: 10, owner: null }],
              stats: { memberOfCount: 0, ownsCount: 0, publicNetworksCount: 1 },
            },
          }),
        },
      },
    };

    const tool = captureTool("read_networks", deps);
    const result = JSON.parse(
      await tool.handler({ context: makeContext("user-1"), query: {} })
    );

    expect(result.success).toBe(true);
    const network = result.data.publicNetworks[0];
    expect(network.prompt).toBe("Open community");
    expect(network.description).toBeUndefined();
  });
});
