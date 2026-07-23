import { describe, it, expect } from 'vitest';
import { swap } from '../../src/logic/actions/swap';
import { makeState, makeTile } from './helpers';

describe('swap', () => {
  it('rejects a non-adjacent swap (state unchanged)', () => {
    const state = makeState();
    const result = swap(state, { row: 0, col: 0 }, { row: 2, col: 2 });
    expect(result).toBe(state);
  });

  it('reverts a swap that produces no match (no turn cost)', () => {
    const board = [
      [makeTile('weapon', 'sword'), makeTile('weapon', 'bow')],
      [makeTile('weapon', 'dagger'), makeTile('weapon', 'axe')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(result).toBe(state);
  });

  it('a sword 3-match deals 20 damage and advances the guardian turn by 2', () => {
    const board = [
      [makeTile('weapon', 'sword'), makeTile('weapon', 'sword'), makeTile('weapon', 'bow')],
      [makeTile('weapon', 'dagger'), makeTile('weapon', 'axe'), makeTile('weapon', 'sword')],
      [makeTile('food', 'bread'), makeTile('food', 'cheese'), makeTile('food', 'grapes')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.guardian.hp).toBe(280);
    expect(result.guardian.turnCounter).toBe(2);
  });

  it('a dagger 3-match hits twice for 8 each (16 total) and advances the turn by 1', () => {
    const board = [
      [null, null, makeTile('weapon', 'dagger')],
      [makeTile('weapon', 'dagger'), makeTile('weapon', 'dagger'), makeTile('weapon', 'sword')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.guardian.hp).toBe(284);
    expect(result.guardian.turnCounter).toBe(1);
  });

  it('an axe 3-match deals 18 damage and shatters exactly one adjacent tile', () => {
    const board = [
      [null, null, makeTile('weapon', 'axe')],
      [makeTile('weapon', 'axe'), makeTile('weapon', 'axe'), makeTile('food', 'bread')],
    ];
    const state = makeState({ board });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.guardian.hp).toBe(282);
    expect(result.guardian.turnCounter).toBe(2);
    expect(result.board[0][2]).toBeNull();
  });

  it('a bow match ignores guardian armor', () => {
    const board = [
      [null, null, makeTile('weapon', 'bow')],
      [makeTile('weapon', 'bow'), makeTile('weapon', 'bow'), makeTile('weapon', 'dagger')],
    ];
    const state = makeState({ board, guardian: { hp: 300, maxHp: 300, armor: 50, rage: 0, turnCounter: 0 } });
    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });
    expect(result.guardian.hp).toBe(280);
  });
});
