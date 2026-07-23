import type { GameState } from '../types';

/** Stub for Phase 3 (rage-scaled counter-attack). Locks the function's shape and call
 * site in GameController so Phase 3 can fill it in without touching the wiring. */
export function guardianTurn(state: GameState): GameState {
  return state;
}
