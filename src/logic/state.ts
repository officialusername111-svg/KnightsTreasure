import type { GameState } from './types';
import { generateBoard } from './board-gen';
import { createRng, advanceSeed } from './rng';
import { BOARD_BALANCE, FOOD_BALANCE, GUARDIAN_BALANCE } from './data/balance';

export function createInitialState(seed = 1): GameState {
  const rng = createRng(seed);
  const board = generateBoard(BOARD_BALANCE.baseCols, BOARD_BALANCE.baseRows, 1, rng);
  const rngSeed = advanceSeed(rng);
  const hp = GUARDIAN_BALANCE.dummyHpBase;

  return {
    board,
    torchlight: board.map((row) => row.map(() => true)),
    stratum: 0,
    floor: 1,
    banner: '',
    bannerCharge: 0,
    meters: { rations: FOOD_BALANCE.maxRations, greed: 0, valor: 0, exhausted: false },
    guardian: { hp, maxHp: hp, armor: GUARDIAN_BALANCE.armor, rage: 0, turnCounter: 0 },
    gold: 0,
    status: 'playing',
    rngSeed,
  };
}
