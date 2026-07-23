import { describe, it, expect } from 'vitest';
import { swap } from '../../src/logic/actions/swap';
import { descend } from '../../src/logic/actions/descend';
import { makeState, makeTile } from './helpers';

describe('hoard match effects (via swap)', () => {
  it('banks gold equal to the sum of matched tile values and raises greed alongside', () => {
    const board = [
      [null, null, makeTile('hoard', 'coin', 5)],
      [makeTile('hoard', 'coin', 5), makeTile('hoard', 'coin', 5), makeTile('weapon', 'sword')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.gold).toBe(15);
    expect(result.meters.greed).toBe(15);
  });
});

describe('greed persistence across descend', () => {
  it('does not reset greed (or gold) when descending to the next floor', () => {
    const state = makeState({ meters: { rations: 5, greed: 42, valor: 0, exhausted: false }, gold: 100 });
    const result = descend(state);
    expect(result.meters.greed).toBe(42);
    expect(result.gold).toBe(100);
    expect(result.floor).toBe(state.floor + 1);
    expect(result.stratum).toBe(0);
  });
});
