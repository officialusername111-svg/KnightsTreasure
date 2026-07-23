import { describe, it, expect } from 'vitest';
import { generateBoard, wouldCreateMatch } from '../../src/logic/board-gen';
import { findMatches, isBoardEmpty, initialTorchlight, revealFogNeighbors, bandForRow } from '../../src/logic/board';
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

  it('sets faceDown by band: surface tiles lit, relic/vault tiles fogged', () => {
    const rng = createRng(7);
    const rows = 10;
    const board = generateBoard(4, rows, 1, rng);
    for (let r = 0; r < rows; r++) {
      const expectFogged = bandForRow(r, rows) !== 'surface';
      for (const cell of board[r]) {
        expect(cell?.faceDown).toBe(expectFogged);
      }
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

  it('treats a face-down tile as a gap, breaking an otherwise-valid run', () => {
    const board = makeEmptyBoard(1, 3);
    board[0][0] = makeTile('weapon', 'sword');
    board[0][1] = { ...makeTile('weapon', 'sword'), faceDown: true };
    board[0][2] = makeTile('weapon', 'sword');
    expect(findMatches(board)).toEqual([]);
  });

  it('matches normally once every tile in the run is face-up', () => {
    const board = makeEmptyBoard(1, 3);
    board[0][0] = { ...makeTile('weapon', 'sword'), faceDown: false };
    board[0][1] = { ...makeTile('weapon', 'sword'), faceDown: false };
    board[0][2] = { ...makeTile('weapon', 'sword'), faceDown: false };
    expect(findMatches(board)).toHaveLength(1);
  });
});

describe('initialTorchlight', () => {
  it('lights only the surface band, leaving relic/vault fogged', () => {
    const torchlight = initialTorchlight(10, 4);
    expect(torchlight.length).toBe(10);
    expect(torchlight[0].every(Boolean)).toBe(true); // surface = top 40% of 10 rows = rows 0-3
    expect(torchlight[3].every(Boolean)).toBe(true);
    expect(torchlight[4].some(Boolean)).toBe(false); // relic starts here, fogged
    expect(torchlight[9].some(Boolean)).toBe(false); // vault, fogged
  });
});

describe('revealFogNeighbors', () => {
  it('flips orthogonal fog neighbors of matched cells to lit', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][1] = makeTile('weapon', 'sword'); // the "matched" cell
    board[1][1] = { ...makeTile('food', 'bread'), faceDown: true }; // orthogonal neighbor
    const torchlight = [
      [true, true, true],
      [false, false, false],
      [false, false, false],
    ];

    revealFogNeighbors(board, torchlight, [{ row: 0, col: 1 }], false);

    expect(board[1][1]?.faceDown).toBe(false);
    expect(torchlight[1][1]).toBe(true);
  });

  it('does not reveal diagonal neighbors when widen is false', () => {
    const board = makeEmptyBoard(3, 3);
    board[0][1] = makeTile('weapon', 'sword');
    board[1][0] = { ...makeTile('food', 'bread'), faceDown: true }; // diagonal to (0,1)
    const torchlight = [
      [true, true, true],
      [false, false, false],
      [false, false, false],
    ];

    revealFogNeighbors(board, torchlight, [{ row: 0, col: 1 }], false);

    expect(board[1][0]?.faceDown).toBe(true);
    expect(torchlight[1][0]).toBe(false);
  });

  it('reveals diagonal neighbors too when widen is true (candle ring)', () => {
    const board = makeEmptyBoard(3, 3);
    board[1][1] = makeTile('light', 'candle');
    board[0][0] = { ...makeTile('food', 'bread'), faceDown: true }; // diagonal to (1,1)
    const torchlight = [
      [false, false, false],
      [false, true, false],
      [false, false, false],
    ];

    revealFogNeighbors(board, torchlight, [{ row: 1, col: 1 }], true);

    expect(board[0][0]?.faceDown).toBe(false);
    expect(torchlight[0][0]).toBe(true);
  });

  it('safely skips out-of-bounds and null neighbors', () => {
    const board = makeEmptyBoard(2, 2);
    board[0][0] = makeTile('weapon', 'sword');
    const torchlight = [
      [true, false],
      [false, false],
    ];

    expect(() => revealFogNeighbors(board, torchlight, [{ row: 0, col: 0 }], true)).not.toThrow();
  });

  it('leaves already-lit neighbors untouched', () => {
    const board = makeEmptyBoard(2, 2);
    board[0][0] = makeTile('weapon', 'sword');
    const litNeighbor = makeTile('food', 'bread');
    board[0][1] = litNeighbor;
    const torchlight = [
      [true, true],
      [false, false],
    ];

    revealFogNeighbors(board, torchlight, [{ row: 0, col: 0 }], false);

    expect(board[0][1]).toBe(litNeighbor);
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
