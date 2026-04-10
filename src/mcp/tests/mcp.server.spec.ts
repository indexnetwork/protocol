/**
 * Tests for the MCP_INSTRUCTIONS constant.
 *
 * MCP_INSTRUCTIONS is the canonical home for Index Network behavioral
 * guidance. Every MCP client receives it on connect, so it must be
 * dense (under budget) and complete (covers voice, vocabulary, entity
 * model, discovery-first rule, output rules, auth).
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

  test("declares the discovery-first rule", () => {
    expect(MCP_INSTRUCTIONS.toLowerCase()).toContain("discovery");
    expect(MCP_INSTRUCTIONS).toContain("create_opportunities");
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
