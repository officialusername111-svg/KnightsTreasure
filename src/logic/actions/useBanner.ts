import type { GameState } from '../types';

/** Stub for Phase 5 (knightly-order banner powers). No-ops rather than throwing, so a
 * stray banner input can't crash the input->logic->render loop before Phase 5 exists. */
export function useBanner(state: GameState): GameState {
  return state;
}
