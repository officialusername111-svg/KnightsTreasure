import type { GameState, Coord } from '../types';
import { isAdjacent, inBounds, cloneBoard } from '../board';
import { resolveMatches } from './resolveMatches';

export function swap(state: GameState, a: Coord, b: Coord): GameState {
  if (!isAdjacent(a, b)) return state;
  if (!inBounds(state.board, a) || !inBounds(state.board, b)) return state;

  const tileA = state.board[a.row][a.col];
  const tileB = state.board[b.row][b.col];
  if (!tileA || !tileB) return state;

  const board = cloneBoard(state.board);
  board[a.row][a.col] = tileB;
  board[b.row][b.col] = tileA;

  const swapped = { ...state, board };
  const resolved = resolveMatches(swapped);

  return resolved === swapped ? state : resolved;
}
