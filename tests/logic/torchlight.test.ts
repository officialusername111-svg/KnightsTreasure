import { describe, it, expect } from 'vitest';
import { swap } from '../../src/logic/actions/swap';
import { makeState, makeTile } from './helpers';

function fogTile(role: Parameters<typeof makeTile>[0], kind: string): ReturnType<typeof makeTile> {
  return { ...makeTile(role, kind), faceDown: true };
}

describe('fog reveal (via swap)', () => {
  it('flips the fog tile orthogonally below a resolved match to lit', () => {
    const board = [
      [null, null, makeTile('weapon', 'sword')],
      [makeTile('weapon', 'sword'), makeTile('weapon', 'sword'), makeTile('food', 'bread')],
      [fogTile('food', 'bread'), fogTile('food', 'bread'), fogTile('food', 'bread')],
    ];
    const torchlight = [
      [true, true, true],
      [true, true, true],
      [false, false, false],
    ];
    const state = makeState({ board, torchlight });

    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });

    expect(result.board[2].every((cell) => cell?.faceDown === false)).toBe(true);
    expect(result.torchlight[2]).toEqual([true, true, true]);
  });

  it('does not mutate the input state torchlight grid', () => {
    const board = [
      [null, null, makeTile('weapon', 'sword')],
      [makeTile('weapon', 'sword'), makeTile('weapon', 'sword'), makeTile('food', 'bread')],
      [fogTile('food', 'bread'), fogTile('food', 'bread'), fogTile('food', 'bread')],
    ];
    const torchlight = [
      [true, true, true],
      [true, true, true],
      [false, false, false],
    ];
    const state = makeState({ board, torchlight });

    swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });

    expect(state.torchlight[2]).toEqual([false, false, false]);
  });

  it('widens the reveal to diagonal neighbors on a candle (Light) match', () => {
    const board = [
      [null, null, makeTile('light', 'candle')],
      [makeTile('light', 'candle'), makeTile('light', 'candle'), makeTile('food', 'bread')],
      [fogTile('food', 'bread'), makeTile('food', 'cheese'), fogTile('food', 'bread')],
    ];
    const torchlight = [
      [true, true, true],
      [true, true, true],
      [false, true, false],
    ];
    const state = makeState({ board, torchlight });

    const result = swap(state, { row: 0, col: 2 }, { row: 1, col: 2 });

    // (2,0) and (2,2) are diagonal to matched cell (1,1); only widen=true reveals them.
    expect(result.board[2][0]?.faceDown).toBe(false);
    expect(result.board[2][2]?.faceDown).toBe(false);
  });
});
