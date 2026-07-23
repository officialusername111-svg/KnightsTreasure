import { describe, it, expect } from 'vitest';
import { refillForMatchSize } from '../../src/logic/data/balance';
import { swap } from '../../src/logic/actions/swap';
import { makeState, makeTile } from './helpers';

describe('refillForMatchSize', () => {
  it('follows the balance table for 3-5 and extrapolates beyond it', () => {
    expect(refillForMatchSize(3)).toBe(2);
    expect(refillForMatchSize(4)).toBe(3);
    expect(refillForMatchSize(5)).toBe(5);
    expect(refillForMatchSize(6)).toBe(7);
  });
});

const foodMatchBoard = () => [
  [null, null, makeTile('food', 'bread')],
  [makeTile('food', 'bread'), makeTile('food', 'bread'), makeTile('weapon', 'sword')],
];

const weaponOnlyMatchBoard = () => [
  [null, null, makeTile('weapon', 'sword')],
  [makeTile('weapon', 'sword'), makeTile('weapon', 'sword'), makeTile('food', 'bread')],
];

describe('food match effects (via swap)', () => {
  it('refills rations net of the per-turn drain, capped at maxRations', () => {
    const state = makeState({ board: foodMatchBoard(), meters: { rations: 5, greed: 0, valor: 0, exhausted: false } });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.meters.rations).toBe(6); // 5 + 2 refill - 1 drain

    const nearCap = makeState({ board: foodMatchBoard(), meters: { rations: 9, greed: 0, valor: 0, exhausted: false } });
    const capped = swap(nearCap, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(capped.meters.rations).toBe(9); // min(10, 9+2) - 1 drain
  });

  it('sets exhausted when rations hit 0 from the per-turn drain', () => {
    const state = makeState({
      board: weaponOnlyMatchBoard(),
      meters: { rations: 1, greed: 0, valor: 0, exhausted: false },
    });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.meters.rations).toBe(0);
    expect(result.meters.exhausted).toBe(true);
  });

  it('clears exhausted once a food match brings rations back above 0', () => {
    const state = makeState({
      board: foodMatchBoard(),
      meters: { rations: 0, greed: 0, valor: 0, exhausted: true },
    });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.meters.rations).toBeGreaterThan(0);
    expect(result.meters.exhausted).toBe(false);
  });
});
