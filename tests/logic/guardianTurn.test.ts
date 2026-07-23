import { describe, it, expect } from 'vitest';
import { guardianTurn } from '../../src/logic/actions/guardianTurn';
import { makeState } from './helpers';

describe('guardianTurn (Phase 3 stub)', () => {
  it('passes the state through unchanged', () => {
    const state = makeState();
    expect(guardianTurn(state)).toBe(state);
  });
});
