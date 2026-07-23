import { describe, it, expect } from 'vitest';
import { useBanner } from '../../src/logic/actions/useBanner';
import { makeState } from './helpers';

describe('useBanner (Phase 5 stub)', () => {
  it('no-ops rather than throwing', () => {
    const state = makeState();
    expect(useBanner(state)).toBe(state);
  });
});
