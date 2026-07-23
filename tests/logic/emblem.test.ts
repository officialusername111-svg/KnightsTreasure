import { describe, it, expect } from 'vitest';
import { swap } from '../../src/logic/actions/swap';
import { makeState, makeTile } from './helpers';

describe('emblem match effects (via swap)', () => {
  it('charges bannerCharge and valor only, leaving guardian and gold untouched', () => {
    const board = [
      [null, null, makeTile('emblem', 'owl')],
      [makeTile('emblem', 'owl'), makeTile('emblem', 'owl'), makeTile('weapon', 'sword')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });

    expect(result.bannerCharge).toBe(3);
    expect(result.meters.valor).toBe(3);
    expect(result.guardian.hp).toBe(state.guardian.hp);
    expect(result.gold).toBe(state.gold);
    // Rations still drain by the universal per-turn cost even on a non-food match.
    expect(result.meters.rations).toBe(state.meters.rations - 1);
  });
});
