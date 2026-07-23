import type { GameState } from '../types';
import { generateBoard } from '../board-gen';
import { createRng, advanceSeed } from '../rng';
import { BOARD_BALANCE, GUARDIAN_BALANCE } from '../data/balance';

export function descend(state: GameState): GameState {
  const floor = state.floor + 1;
  const cols = BOARD_BALANCE.baseCols;
  const rows = Math.min(
    BOARD_BALANCE.baseRows + (floor - 1),
    BOARD_BALANCE.baseRows + BOARD_BALANCE.maxExtraRows,
  );

  const rng = createRng(state.rngSeed);
  const board = generateBoard(cols, rows, floor, rng);
  const rngSeed = advanceSeed(rng);

  const hp = Math.round(GUARDIAN_BALANCE.dummyHpBase * (1 + GUARDIAN_BALANCE.hpGrowthPerFloor * (floor - 1)));

  return {
    ...state,
    floor,
    stratum: 0,
    board,
    torchlight: board.map((row) => row.map(() => true)),
    guardian: { hp, maxHp: hp, armor: GUARDIAN_BALANCE.armor, rage: 0, turnCounter: 0 },
    rngSeed,
  };
}
