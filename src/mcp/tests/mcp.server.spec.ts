/**
 * Tests for the MCP_INSTRUCTIONS constant.
 *
 * MCP_INSTRUCTIONS carries only global guidance: identity, voice, banned
 * vocabulary, entity model, output rules, and auth. Per-tool workflow
 * patterns (discovery-first, introduction mode, negotiation-turn mode,
 * etc.) live in each tool's `description` string, not here.
 */
import { config } from "dotenv";
config({ path: ".env.test" });

import { describe, test, expect } from "bun:test";
import { MCP_INSTRUCTIONS } from "../mcp.server.js";

describe("MCP_INSTRUCTIONS", () => {
  test("fits within the 2500 character context budget", () => {
    expect(MCP_INSTRUCTIONS.length).toBeLessThan(2500);
  });

  test("is at least 800 characters (guards against accidental truncation)", () => {
    expect(MCP_INSTRUCTIONS.length).toBeGreaterThan(800);
  });

  test("explains the x-api-key header format", () => {
    expect(MCP_INSTRUCTIONS).toContain("x-api-key");
  });

  test('bans the word "search"', () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toMatch(/never.*search|banned.*search|do not.*search/);
  });

  test("frames Index Network as a discovery protocol", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toContain("discovery");
  });

  test("delegates per-tool guidance to tool descriptions", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toContain("tool's description");
  });

  test("describes the entity model", () => {
    for (const term of ["Profile", "Intent", "Opportunity"]) {
      expect(MCP_INSTRUCTIONS).toContain(term);
    }
  });

  test("forbids raw JSON output and ID leakage", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toMatch(/never.*json|no raw json/);
    expect(MCP_INSTRUCTIONS.toLowerCase()).toMatch(/never.*id|no.*uuid/);
  });

  test("translates internal vocabulary to user-facing terms", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toContain("signal");
    expect(MCP_INSTRUCTIONS.toLowerCase()).toContain("community");
  });

  test("does not carry Claude Code sub-skill dispatch idioms", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).not.toContain("sub-skill");
    expect(MCP_INSTRUCTIONS).not.toContain("index-network:");
  });
});
