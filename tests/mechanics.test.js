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

// Audit B1 (2026-07-08): positional power-up geometry follows the VISUAL grid, not
// model indices — D8 swaps reorder visual slots while model indices stay identities.
import { visualBombZone, visualCross } from '../www/js/systems/mechanics.js';

describe('visualBombZone', () => {
  const identity = [0,1,2,3,4,5,6,7,8,9,10,11]; // 4 cols × 3 rows, unswapped

  it('matches classic index geometry on an unswapped board', () => {
    expect(visualBombZone(identity, 4, 5).sort((a,b)=>a-b)).toEqual([5,6,9,10]);
  });

  it('clamps at edges', () => {
    expect(visualBombZone(identity, 4, 11).sort((a,b)=>a-b)).toEqual([6,7,10,11]);
    expect(visualBombZone(identity, 4, 0).sort((a,b)=>a-b)).toEqual([0,1,4,5]);
  });

  it('follows a swapped tile to its visual slot', () => {
    // D8 swap: model 0 now sits at visual slot 5, model 5 at slot 0.
    const swapped = [5,1,2,3,4,0,6,7,8,9,10,11];
    // Bombing model-0 (visually at slot 5, row1 col1) must hit visual slots 5,6,9,10
    // → model indices 0,6,9,10 — NOT the stale index zone 0,1,4,5.
    expect(visualBombZone(swapped, 4, 0).sort((a,b)=>a-b)).toEqual([0,6,9,10]);
  });

  it('dedupes on a single-row board (anchor + neighbor, no phantom second row)', () => {
    expect(visualBombZone([0,1,2], 3, 1).sort((a,b)=>a-b)).toEqual([1,2]);
  });
});

describe('visualCross', () => {
  it('row + column through the anchor, disjoint', () => {
    const identity = [0,1,2,3,4,5,6,7,8,9,10,11];
    const { row, col } = visualCross(identity, 4, 5);
    expect(row.sort((a,b)=>a-b)).toEqual([4,5,6,7]);
    expect(col.sort((a,b)=>a-b)).toEqual([1,9]);
  });

  it('follows swaps to visual slots', () => {
    const swapped = [5,1,2,3,4,0,6,7,8,9,10,11]; // model 0 at slot 5
    const { row, col } = visualCross(swapped, 4, 0);
    expect(row.sort((a,b)=>a-b)).toEqual([0,4,6,7]);  // visual row 1 = slots 4..7
    expect(col.sort((a,b)=>a-b)).toEqual([1,9]);      // visual col 1 minus anchor row
  });
});

import { MECHANIC_UNLOCKS, unlockedMechanics } from '../www/js/data/mechanics.js';

describe('unlockedMechanics', () => {
  it('none unlocked before stage 3', () => {
    expect(unlockedMechanics(1)).toEqual([]);
    expect(unlockedMechanics(2)).toEqual([]);
  });
  it('streakBanner unlocks at stage 3', () => {
    expect(unlockedMechanics(3).map((m) => m.id)).toEqual(['streakBanner']);
  });
  it('twinSpark joins at stage 5', () => {
    expect(unlockedMechanics(5).map((m) => m.id)).toEqual(['streakBanner', 'twinSpark']);
  });
  it('all three unlocked by stage 8', () => {
    expect(unlockedMechanics(8).map((m) => m.id)).toEqual(['streakBanner', 'twinSpark', 'vaultPulse']);
  });
  it('MECHANIC_UNLOCKS carries the exact spec stages', () => {
    expect(MECHANIC_UNLOCKS.streakBanner.unlockStage).toBe(3);
    expect(MECHANIC_UNLOCKS.twinSpark.unlockStage).toBe(5);
    expect(MECHANIC_UNLOCKS.vaultPulse.unlockStage).toBe(8);
  });
});
