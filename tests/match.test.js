import { describe, it, expect } from 'vitest';
import { buildDeck, createMatchState, tapTile, resolveMismatch, removeAllLocks, matchPair, spawnWildcard, matchWildcard } from '../www/js/systems/match.js';

const identity = (a) => a; // deterministic "shuffle"

describe('buildDeck', () => {
  it('creates 2*pairs tiles with each icon twice', () => {
    const deck = buildDeck({ pairs: 3, iconPool: ['A', 'B', 'C', 'D'], shuffle: identity });
    expect(deck).toHaveLength(6);
    const counts = {};
    deck.forEach((t) => (counts[t.icon] = (counts[t.icon] || 0) + 1));
    expect(Object.values(counts).every((c) => c === 2)).toBe(true);
    expect(deck.every((t) => !t.faceUp && !t.matched)).toBe(true);
  });
});

describe('tapTile', () => {
  function setup() {
    // identity shuffle → deck order: [A,A,B,B] (icons sliced, paired, then doubled)
    return createMatchState({ pairs: 2, iconPool: ['A', 'B'], shuffle: identity });
  }

  it('first tap flips', () => {
    const { state, result } = tapTile(setup(), 0);
    expect(result).toBe('flip');
    expect(state.tiles[0].faceUp).toBe(true);
    expect(state.firstPick).toBe(0);
  });

  it('matching second tap → match, increments matchedPairs', () => {
    let s = setup();
    s = tapTile(s, 0).state;            // A
    const r = tapTile(s, 1);            // A (index 1 is the other A)
    expect(r.result).toBe('match');
    expect(r.state.tiles[0].matched).toBe(true);
    expect(r.state.tiles[1].matched).toBe(true);
    expect(r.state.matchedPairs).toBe(1);
    expect(r.state.firstPick).toBeNull();
  });

  it('non-matching second tap → mismatch, locks, counts mistake', () => {
    let s = setup();
    s = tapTile(s, 0).state;            // A
    const r = tapTile(s, 2);            // B
    expect(r.result).toBe('mismatch');
    expect(r.state.locked).toBe(true);
    expect(r.state.mistakes).toBe(1);
  });

  it('resolveMismatch flips the two back down and unlocks', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    s = tapTile(s, 2).state;           // mismatch, locked
    s = resolveMismatch(s);
    expect(s.tiles[0].faceUp).toBe(false);
    expect(s.tiles[2].faceUp).toBe(false);
    expect(s.locked).toBe(false);
    expect(s.firstPick).toBeNull();
  });

  it('ignores taps on matched/locked/same tile', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    expect(tapTile(s, 0).result).toBe('ignored');   // same tile
    s = tapTile(s, 2).state;                          // locked now
    expect(tapTile(s, 3).result).toBe('ignored');     // locked
  });

  it('matching the final pair → win', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    s = tapTile(s, 1).state;           // first pair matched
    s = tapTile(s, 2).state;
    const r = tapTile(s, 3);           // last pair
    expect(r.result).toBe('win');
    expect(r.state.matchedPairs).toBe(2);
  });
});

describe('locked tiles (D9)', () => {
  // identity shuffle → deck [A,A,B,B,C,C]; locked selection takes the front indices.
  const setup = (opts) => createMatchState({ pairs: 3, iconPool: ['A', 'B', 'C'], shuffle: identity, ...opts });

  it('a locked tile cannot be flipped', () => {
    const s = setup({ lockedCount: 1 });
    expect(s.tiles[0].locked).toBe(true);
    expect(tapTile(s, 0).result).toBe('ignored');
  });

  it('unlocks one tile every unlockAfterMatches matches', () => {
    let s = setup({ lockedCount: 1, unlockAfterMatches: 2 });
    s = tapTile(s, 2).state; s = tapTile(s, 3).state;  // 1 match (B)
    expect(s.tiles[0].locked).toBe(true);
    s = tapTile(s, 4).state; s = tapTile(s, 5).state;  // 2 matches (C) → unlock
    expect(s.tiles[0].locked).toBe(false);
    expect(s.locksRemaining).toBe(0);
    s = tapTile(s, 0).state;                            // formerly locked pair now playable
    expect(tapTile(s, 1).result).toBe('win');
  });

  it('removeAllLocks strips every chain (Holy Water)', () => {
    let s = setup({ lockedCount: 2 });
    expect(s.tiles.filter((t) => t.locked).length).toBe(2);
    s = removeAllLocks(s);
    expect(s.tiles.some((t) => t.locked)).toBe(false);
    expect(s.locksRemaining).toBe(0);
  });
});

// Power-up auto-match (owner decision 2026-07-08): revealed pairs complete directly.
describe('matchPair', () => {
  const identity2 = (a) => a;
  const mk = (opts = {}) => createMatchState({ pairs: 2, iconPool: ['A', 'B', 'C'], shuffle: identity2, ...opts });

  it('completes a real pair with full bookkeeping', () => {
    const { state, result } = matchPair(mk(), 0, 1);   // [A,A,B,B]
    expect(result).toBe('match');
    expect(state.tiles[0].matched && state.tiles[1].matched).toBe(true);
    expect(state.matchedPairs).toBe(1);
  });

  it('reports win on the final pair', () => {
    let s = mk();
    s = matchPair(s, 0, 1).state;
    expect(matchPair(s, 2, 3).result).toBe('win');
  });

  it('ignores mismatched icons, decoys, locked, matched, and self-pairs', () => {
    const s = mk({ decoyCount: 1 });                   // [A,A,B,B,C(decoy)]
    expect(matchPair(s, 0, 2).result).toBe('ignored'); // A vs B
    expect(matchPair(s, 4, 4).result).toBe('ignored'); // decoy / self
    const done = matchPair(s, 0, 1).state;
    expect(matchPair(done, 0, 1).result).toBe('ignored'); // already matched
    const locked = mk(); locked.tiles[0].locked = true;
    expect(matchPair(locked, 0, 1).result).toBe('ignored');
  });

  it('clears firstPick when it belongs to the auto-matched pair', () => {
    let s = mk();
    s = tapTile(s, 0).state;                           // player mid-pick
    const { state } = matchPair(s, 0, 1);
    expect(state.firstPick).toBe(null);
  });

  it('advances the progressive unlock counter', () => {
    // identity shuffle → deck [A,A,B,B,C,C]; lockedCount takes index 0.
    let s = createMatchState({ pairs: 3, iconPool: ['A', 'B', 'C'], shuffle: identity2, lockedCount: 1, unlockAfterMatches: 1 });
    expect(s.tiles[0].locked).toBe(true);
    s = matchPair(s, 2, 3).state;          // auto-match the B pair
    expect(s.tiles[0].locked).toBe(false); // one match at unlockAfterMatches:1 → chain freed
    expect(s.locksRemaining).toBe(0);
  });
});

describe('spawnWildcard / matchWildcard', () => {
  function board() {
    // identity shuffle -> deck order [A,A,B,B,C,C] (indices 0-5)
    return createMatchState({ pairs: 3, iconPool: ['A', 'B', 'C'], shuffle: identity });
  }

  it('tags an eligible tile without touching its icon', () => {
    const s = spawnWildcard(board(), 0);
    expect(s.tiles[0].wildcard).toBe(true);
    expect(s.tiles[0].icon).toBe('A');
  });

  it('is a no-op on an ineligible tile (already matched)', () => {
    let s = board();
    s.tiles[0].matched = true;
    const next = spawnWildcard(s, 0);
    expect(next.tiles[0].wildcard).toBeUndefined();
  });

  it('resolving against its own true partner behaves like a normal match', () => {
    const s = spawnWildcard(board(), 0);            // tile 0 = wildcard (icon A), true partner tile 1
    const { state, result } = matchWildcard(s, 0, 1);
    expect(result).toBe('match');
    expect(state.tiles[0].matched).toBe(true);
    expect(state.tiles[1].matched).toBe(true);
    expect(state.matchedPairs).toBe(1);
    expect(state.totalPairs).toBe(3);                // unchanged: no orphans possible here
  });

  it('resolving against a different tile retires both true partners and shrinks totalPairs by one', () => {
    const s = spawnWildcard(board(), 0);             // wildcard = tile 0 (icon A), true partner tile 1
    const { state, result } = matchWildcard(s, 0, 2); // tile 2 = icon B, true partner tile 3
    expect(result).toBe('match');
    expect(state.tiles[0].matched).toBe(true);        // wildcard cleared
    expect(state.tiles[2].matched).toBe(true);        // chosen tile cleared
    expect(state.tiles[1].matched).toBe(true);         // wildcard's true partner silently retired
    expect(state.tiles[3].matched).toBe(true);         // chosen tile's true partner silently retired
    expect(state.matchedPairs).toBe(1);                // exactly one scored pairing
    expect(state.totalPairs).toBe(2);                  // 3 - 1: win target stays reachable
  });

  it('stays winnable after a mismatch: the remaining real pair alone reaches the new target', () => {
    let s = spawnWildcard(board(), 0);
    s = matchWildcard(s, 0, 2).state;                  // totalPairs now 2, matchedPairs 1
    const r1 = tapTile(s, 4);                          // tiles 4,5 = icon C, untouched
    const r2 = tapTile(r1.state, 5);
    expect(r2.result).toBe('win');
  });

  it('ignores resolution against an already-matched tile', () => {
    let s = spawnWildcard(board(), 0);
    s = matchWildcard(s, 0, 2).state;
    const { result } = matchWildcard(s, 0, 2);         // tile 0 already matched
    expect(result).toBe('ignored');
  });
});
