import type { Tile, Coord, Role } from './types';
import { roleForKind } from './data/tileTaxonomy';
import { STRATUM_ROW_FRACTIONS, type StratumBand } from './data/strata';

export interface MatchGroup {
  role: Role;
  kind: string;
  cells: Coord[];
}

export function cloneBoard(board: (Tile | null)[][]): (Tile | null)[][] {
  return board.map((row) => row.slice());
}

export function inBounds(board: (Tile | null)[][], coord: Coord): boolean {
  return (
    coord.row >= 0 &&
    coord.row < board.length &&
    coord.col >= 0 &&
    coord.col < (board[0]?.length ?? 0)
  );
}

export function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function isBoardEmpty(board: (Tile | null)[][]): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}

export function findMatches(board: (Tile | null)[][]): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    collectRuns(
      cols,
      (c) => board[r][c],
      (start, end, kind) => {
        const cells: Coord[] = [];
        for (let c = start; c < end; c++) cells.push({ row: r, col: c });
        groups.push({ role: roleForKind(kind), kind, cells });
      },
    );
  }

  for (let c = 0; c < cols; c++) {
    collectRuns(
      rows,
      (r) => board[r][c],
      (start, end, kind) => {
        const cells: Coord[] = [];
        for (let r = start; r < end; r++) cells.push({ row: r, col: c });
        groups.push({ role: roleForKind(kind), kind, cells });
      },
    );
  }

  return groups;
}

function collectRuns(
  length: number,
  at: (i: number) => Tile | null,
  onRun: (start: number, end: number, kind: string) => void,
): void {
  let runStart = 0;
  for (let i = 1; i <= length; i++) {
    const prev = at(i - 1);
    const cur = i < length ? at(i) : null;
    // A face-down tile is a gap for matching purposes, same as null — D22.
    const sameKind = !!prev && !!cur && prev.kind === cur.kind && !prev.faceDown && !cur.faceDown;
    if (!sameKind) {
      const runLength = i - runStart;
      if (runLength >= 3) {
        const kind = at(runStart)!.kind;
        onRun(runStart, i, kind);
      }
      runStart = i;
    }
  }
}

function bandRowRanges(totalRows: number): Record<StratumBand, [number, number]> {
  const surfaceEnd = Math.round(totalRows * STRATUM_ROW_FRACTIONS.surface);
  const relicEnd = surfaceEnd + Math.round(totalRows * STRATUM_ROW_FRACTIONS.relic);
  return {
    surface: [0, surfaceEnd],
    relic: [surfaceEnd, relicEnd],
    vault: [relicEnd, totalRows],
  };
}

export function bandForRow(row: number, totalRows: number): StratumBand {
  const ranges = bandRowRanges(totalRows);
  if (row < ranges.surface[1]) return 'surface';
  if (row < ranges.relic[1]) return 'relic';
  return 'vault';
}

/** Surface band starts lit, Relic/Vault start fogged — the same row boundary
 * bandForRow() already defines. See pivot decisions doc D21. */
export function initialTorchlight(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, (_, r) => new Array<boolean>(cols).fill(bandForRow(r, rows) === 'surface'));
}

const ORTHOGONAL_DIRS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const DIAGONAL_DIRS: Coord[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

/** Flips face-down neighbors of a resolved match's cells to lit, in place. `widen`
 * (candle/Light matches) also includes diagonals — a ring instead of a cross.
 * See pivot decisions doc D23. */
export function revealFogNeighbors(
  board: (Tile | null)[][],
  torchlight: boolean[][],
  matchedCells: Coord[],
  widen: boolean,
): void {
  const dirs = widen ? [...ORTHOGONAL_DIRS, ...DIAGONAL_DIRS] : ORTHOGONAL_DIRS;
  for (const cell of matchedCells) {
    for (const dir of dirs) {
      const row = cell.row + dir.row;
      const col = cell.col + dir.col;
      if (!inBounds(board, { row, col })) continue;
      const tile = board[row][col];
      if (!tile || !tile.faceDown) continue;
      board[row][col] = { ...tile, faceDown: false };
      torchlight[row][col] = true;
    }
  }
}

/** How many full bands (surface, then relic) are completely cleared. Does not itself
 * determine "floor cleared" — use isBoardEmpty for that, since row-band rounding can
 * rarely leave a sliver unaccounted for on unusual row counts. See pivot decisions doc D4. */
export function computeStratum(board: (Tile | null)[][]): number {
  const totalRows = board.length;
  if (totalRows === 0) return 3;
  const ranges = bandRowRanges(totalRows);
  const bandOrder: StratumBand[] = ['surface', 'relic', 'vault'];
  let cleared = 0;
  for (const band of bandOrder) {
    const [start, end] = ranges[band];
    if (start >= end || allRowsClear(board, start, end)) {
      cleared++;
    } else {
      break;
    }
  }
  return cleared;
}

function allRowsClear(board: (Tile | null)[][], start: number, end: number): boolean {
  for (let r = start; r < end; r++) {
    if (!board[r].every((cell) => cell === null)) return false;
  }
  return true;
}
