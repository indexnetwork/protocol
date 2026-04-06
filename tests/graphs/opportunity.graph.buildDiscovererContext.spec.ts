/** Config */
import { config } from "dotenv";
config({ path: '.env.test' });

import { describe, expect, it } from "bun:test";

import type { SourceProfileData } from "../../src/states/opportunity.state.js";

import { buildDiscovererContext } from "../../src/graphs/opportunity.graph.js";

describe('buildDiscovererContext', () => {
  it('includes location when present in profile identity', () => {
    const profile: SourceProfileData = {
      embedding: null,
      identity: { name: 'Alice', bio: 'AI startup founder', location: 'San Francisco' },
      attributes: { skills: ['TypeScript'], interests: ['AI'] },
    };
    const result = buildDiscovererContext(profile, []);
    expect(result).toContain('Location: San Francisco');
  });

  it('omits location line when location is undefined', () => {
    const profile: SourceProfileData = {
      embedding: null,
      identity: { name: 'Alice', bio: 'AI startup founder' },
      attributes: { skills: ['TypeScript'], interests: ['AI'] },
    };
    const result = buildDiscovererContext(profile, []);
    expect(result).not.toContain('Location:');
  });

  it('omits location line when location is empty string', () => {
    const profile: SourceProfileData = {
      embedding: null,
      identity: { name: 'Alice', bio: 'AI startup founder', location: '' },
      attributes: { skills: ['TypeScript'], interests: ['AI'] },
    };
    const result = buildDiscovererContext(profile, []);
    expect(result).not.toContain('Location:');
  });
});
