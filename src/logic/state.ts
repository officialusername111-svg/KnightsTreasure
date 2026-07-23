import type { GameState } from './types';
import { generateBoard } from './board-gen';
import { initialTorchlight } from './board';
import { createRng, advanceSeed } from './rng';
import { BOARD_BALANCE, FOOD_BALANCE, GUARDIAN_BALANCE, KNIGHT_BALANCE } from './data/balance';

export function createInitialState(seed = 1): GameState {
  const rng = createRng(seed);
  const board = generateBoard(BOARD_BALANCE.baseCols, BOARD_BALANCE.baseRows, 1, rng);
  const rngSeed = advanceSeed(rng);
  const hp = GUARDIAN_BALANCE.dummyHpBase;
  const knightHp = KNIGHT_BALANCE.hpBase;

  return {
    board,
    torchlight: initialTorchlight(BOARD_BALANCE.baseRows, BOARD_BALANCE.baseCols),
    stratum: 0,
    floor: 1,
    banner: '',
    bannerCharge: 0,
    meters: { rations: FOOD_BALANCE.maxRations, greed: 0, valor: 0, exhausted: false },
    guardian: { hp, maxHp: hp, armor: 0, rage: 0, turnCounter: 0 },
    knight: { hp: knightHp, maxHp: knightHp },
    gold: 0,
    status: 'playing',
    rngSeed,
  };
}
