/**
 * Unit tests for resolveInitialStatus — the trigger-aware status resolver
 * introduced by Plan B. Exercises the pure branching used inside the persist
 * node without needing the full graph test harness (which requires OpenRouter
 * keys and LLM mocks).
 */

import { describe, it, expect } from 'bun:test';
import { resolveInitialStatus } from '../opportunity.state.js';

describe('resolveInitialStatus', () => {
  it("returns 'pending' for ambient trigger when no override is given", () => {
    expect(resolveInitialStatus('ambient', undefined)).toBe('pending');
  });

  it("returns 'negotiating' for orchestrator trigger when no override is given", () => {
    expect(resolveInitialStatus('orchestrator', undefined)).toBe('negotiating');
  });

  it('respects an explicit override regardless of trigger', () => {
    expect(resolveInitialStatus('orchestrator', 'draft')).toBe('draft');
    expect(resolveInitialStatus('ambient', 'latent')).toBe('latent');
    expect(resolveInitialStatus('orchestrator', 'latent')).toBe('latent');
  });
});
