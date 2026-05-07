import { describe, expect, test } from 'bun:test';

import { computeAgentIndexScope } from '../mcp.server';

describe('computeAgentIndexScope', () => {
  const memberships = [
    { networkId: 'personal-1', isPersonal: true },
    { networkId: 'community-A', isPersonal: false },
    { networkId: 'community-B', isPersonal: false },
    { networkId: 'community-C', isPersonal: false },
  ];

  test('returns all networks when scope is null', () => {
    const scope = computeAgentIndexScope(memberships, null);
    expect(scope).toEqual(['personal-1', 'community-A', 'community-B', 'community-C']);
  });

  test('returns all networks when scope is undefined', () => {
    const scope = computeAgentIndexScope(memberships, undefined);
    expect(scope).toEqual(['personal-1', 'community-A', 'community-B', 'community-C']);
  });

  test('clamps to scope + personal index when scope is set', () => {
    const scope = computeAgentIndexScope(memberships, 'community-B');
    expect(scope.sort()).toEqual(['community-B', 'personal-1'].sort());
  });

  test('returns only the personal index when scope is set but not in memberships', () => {
    const scope = computeAgentIndexScope(memberships, 'community-XYZ');
    expect(scope).toEqual(['personal-1']);
  });

  test('returns empty array when scope is set, no match, and no personal index', () => {
    const scope = computeAgentIndexScope(
      [{ networkId: 'community-A', isPersonal: false }],
      'community-XYZ',
    );
    expect(scope).toEqual([]);
  });

  test('handles isPersonal as null (treats as non-personal)', () => {
    const scope = computeAgentIndexScope(
      [{ networkId: 'community-A', isPersonal: null }],
      null,
    );
    expect(scope).toEqual(['community-A']);
  });
});
