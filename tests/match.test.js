import { describe, it, expect } from 'vitest';
import { buildDeck, createMatchState, tapTile, resolveMismatch } from '../www/js/systems/match.js';

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
