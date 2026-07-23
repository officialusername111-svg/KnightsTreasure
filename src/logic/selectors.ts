import type { GameState } from './types';
import { isBoardEmpty } from './board';

export function isGuardianDefeated(state: GameState): boolean {
  return state.guardian.hp <= 0;
}

export function isFloorFullyCleared(state: GameState): boolean {
  return isBoardEmpty(state.board);
}
