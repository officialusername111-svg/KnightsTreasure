import { describe, it, expect } from 'vitest';
import { mechanicsFor, chooseSwaps, chooseLocked } from '../www/js/systems/mechanics.js';

const tiles = (specs) => specs.map((s, index) => ({ index, matched: false, faceUp: false, locked: false, ...s }));

describe('mechanicsFor', () => {
  it('stage 1–3 normal blocks carry no mechanics', () => {
    expect(mechanicsFor(1, 'warmup')).toEqual({});
    expect(mechanicsFor(3, 'pressure')).toEqual({});
  });
  it('stage 4+ applies the hidden flip factor', () => {
    expect(mechanicsFor(4, 'warmup').hiddenFactor).toBe(0.6);
  });
  it('decoys only on stage 5+ late blocks', () => {
    expect(mechanicsFor(5, 'midpoint').decoyCount).toBeUndefined();
    expect(mechanicsFor(5, 'gauntlet').decoyCount).toBe(2);
  });
  it('moving on stage 6+ late blocks; locked on stage 7+ hard blocks', () => {
    expect(mechanicsFor(6, 'boss').moveIntervalMs).toBe(8000);
    expect(mechanicsFor(7, 'pressure').lockedCount).toBe(2);
    expect(mechanicsFor(7, 'pressure').unlockAfterMatches).toBe(2);
  });
});

describe('chooseSwaps', () => {
  const board = tiles([{}, {}, {}, { matched: true }, { faceUp: true }, { locked: true }]);
  it('only swaps face-down, unmatched, unlocked, unpinned tiles', () => {
    const swaps = chooseSwaps(board, { moveCount: 5, rng: () => 0 });
    const used = swaps.flat();
    // indices 0,1,2 are eligible; 3 matched, 4 faceUp, 5 locked are excluded
    used.forEach((i) => expect([0, 1, 2]).toContain(i));
  });
  it('respects the pinned set', () => {
    const swaps = chooseSwaps(board, { moveCount: 5, pinned: new Set([0]), rng: () => 0 });
    expect(swaps.flat()).not.toContain(0);
  });
  it('returns nothing when fewer than two are movable', () => {
    expect(chooseSwaps(tiles([{}, { locked: true }]), {})).toEqual([]);
  });
});

describe('chooseLocked', () => {
  it('picks exactly lockedCount distinct indices', () => {
    const ids = chooseLocked(tiles([{}, {}, {}, {}, {}, {}]), 2, () => 0);
    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });
  it('returns none when lockedCount is 0', () => {
    expect(chooseLocked(tiles([{}, {}]), 0)).toEqual([]);
  });
});
