import { describe, it, expect } from 'vitest';
import { generateBoard, wouldCreateMatch } from '../../src/logic/board-gen';
import { findMatches, isBoardEmpty } from '../../src/logic/board';
import { createRng } from '../../src/logic/rng';
import { makeEmptyBoard, makeTile } from './helpers';

describe('generateBoard', () => {
  it('produces the requested dimensions with no null cells', () => {
    const rng = createRng(7);
    const board = generateBoard(8, 8, 1, rng);
    expect(board.length).toBe(8);
    for (const row of board) {
      expect(row.length).toBe(8);
      for (const cell of row) expect(cell).not.toBeNull();
    }
  });
});

describe('wouldCreateMatch', () => {
  it('is true when placing the kind would complete a horizontal run of 3', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][0] = makeTile('weapon', 'sword');
    board[0][1] = makeTile('weapon', 'sword');
    expect(wouldCreateMatch(board, 0, 2, 'sword')).toBe(true);
    expect(wouldCreateMatch(board, 0, 2, 'axe')).toBe(false);
  });

  it('is true when placing the kind would complete a vertical run of 3', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][0] = makeTile('food', 'bread');
    board[1][0] = makeTile('food', 'bread');
    expect(wouldCreateMatch(board, 2, 0, 'bread')).toBe(true);
    expect(wouldCreateMatch(board, 2, 0, 'cheese')).toBe(false);
  });
});

describe('findMatches', () => {
  it('detects a horizontal run of 3+', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][0] = makeTile('weapon', 'sword');
    board[0][1] = makeTile('weapon', 'sword');
    board[0][2] = makeTile('weapon', 'sword');
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('sword');
    expect(groups[0].role).toBe('weapon');
    expect(groups[0].cells).toHaveLength(3);
  });

  it('detects a vertical run of 3+', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][0] = makeTile('food', 'bread');
    board[1][0] = makeTile('food', 'bread');
    board[2][0] = makeTile('food', 'bread');
    const groups = findMatches(board);
    expect(groups).toHaveLength(1);
    expect(groups[0].role).toBe('food');
  });

  it('ignores runs shorter than 3', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][0] = makeTile('weapon', 'sword');
    board[0][1] = makeTile('weapon', 'sword');
    expect(findMatches(board)).toEqual([]);
  });
});

describe('isBoardEmpty', () => {
  it('is true only when every cell is null', () => {
    const board = makeEmptyBoard(2, 2);
    expect(isBoardEmpty(board)).toBe(true);
    board[0][0] = makeTile('weapon', 'axe');
    expect(isBoardEmpty(board)).toBe(false);
  });
});
