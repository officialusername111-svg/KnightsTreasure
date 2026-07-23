import type { GameState } from '../types';

export function escape(state: GameState): GameState {
  return { ...state, status: 'escaped' };
}
