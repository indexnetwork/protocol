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
import { MCP_INSTRUCTIONS, sanitizeMcpResult } from "../mcp.server.js";

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

describe("sanitizeMcpResult", () => {
  test("strips underscore-prefixed keys from data", () => {
    const input = JSON.stringify({
      success: true,
      data: { intents: [], _graphTimings: [{ name: "intent", durationMs: 42 }] },
    });
    const { text, isError } = sanitizeMcpResult(input);
    const parsed = JSON.parse(text);
    expect(parsed.data._graphTimings).toBeUndefined();
    expect(parsed.data.intents).toEqual([]);
    expect(isError).toBe(false);
  });

  test("strips multiple underscore-prefixed keys from data", () => {
    const input = JSON.stringify({
      success: true,
      data: { count: 1, _graphTimings: [], _debug: "x", visible: "kept" },
    });
    const { text } = sanitizeMcpResult(input);
    const parsed = JSON.parse(text);
    expect(parsed.data._graphTimings).toBeUndefined();
    expect(parsed.data._debug).toBeUndefined();
    expect(parsed.data.visible).toBe("kept");
    expect(parsed.data.count).toBe(1);
  });

  test("sets isError true when success is false", () => {
    const input = JSON.stringify({ success: false, error: "Not found" });
    const { isError } = sanitizeMcpResult(input);
    expect(isError).toBe(true);
  });

  test("sets isError false when success is true", () => {
    const input = JSON.stringify({ success: true, data: {} });
    const { isError } = sanitizeMcpResult(input);
    expect(isError).toBe(false);
  });

  test("passes through unchanged when JSON is invalid", () => {
    const input = "not valid json";
    const { text, isError } = sanitizeMcpResult(input);
    expect(text).toBe(input);
    expect(isError).toBe(false);
  });

  test("does not strip underscore-prefixed top-level keys", () => {
    const input = JSON.stringify({ success: true, _topLevel: "kept", data: { _inner: "stripped" } });
    const { text } = sanitizeMcpResult(input);
    const parsed = JSON.parse(text);
    expect(parsed._topLevel).toBe("kept");
    expect(parsed.data._inner).toBeUndefined();
  });

  test("handles missing data key gracefully", () => {
    const input = JSON.stringify({ success: true });
    const { text, isError } = sanitizeMcpResult(input);
    expect(JSON.parse(text).success).toBe(true);
    expect(isError).toBe(false);
  });

  test("handles data as non-object array without throwing", () => {
    const input = JSON.stringify({ success: true, data: [1, 2, 3] });
    const { text, isError } = sanitizeMcpResult(input);
    expect(JSON.parse(text).data).toEqual([1, 2, 3]);
    expect(isError).toBe(false);
  });
});
