import type { GameState, WeaponKind } from '../types';
import { findMatches, cloneBoard, computeStratum, revealFogNeighbors } from '../board';
import { applyWeaponMatch } from './weaponEffects';
import { FOOD_BALANCE, refillForMatchSize, EMBLEM_BALANCE, GREED_BALANCE } from '../data/balance';
import { HOARD_VALUES } from '../data/tileTaxonomy';
import { createRng, advanceSeed } from '../rng';

export function resolveMatches(state: GameState): GameState {
  const groups = findMatches(state.board);
  if (groups.length === 0) return state;

  const board = cloneBoard(state.board);
  const torchlight = state.torchlight.map((row) => row.slice());
  const rng = createRng(state.rngSeed);
  let next = state;

  for (const group of groups) {
    switch (group.role) {
      case 'weapon':
        next = applyWeaponMatch(next, group.kind as WeaponKind, group.cells, board, rng);
        break;
      case 'food': {
        const rations = Math.min(
          FOOD_BALANCE.maxRations,
          next.meters.rations + refillForMatchSize(group.cells.length),
        );
        next = { ...next, meters: { ...next.meters, rations } };
        break;
      }
      case 'hoard': {
        const value = (HOARD_VALUES[group.kind] ?? 0) * group.cells.length;
        next = {
          ...next,
          gold: next.gold + value,
          meters: { ...next.meters, greed: next.meters.greed + value * GREED_BALANCE.greedPerGold },
        };
        break;
      }
      case 'emblem': {
        const charge = EMBLEM_BALANCE.chargePerTile * group.cells.length;
        next = {
          ...next,
          bannerCharge: next.bannerCharge + charge,
          meters: { ...next.meters, valor: next.meters.valor + charge },
        };
        break;
      }
      case 'light':
      case 'hazard':
        break;
    }

    revealFogNeighbors(board, torchlight, group.cells, group.role === 'light');
    for (const cell of group.cells) board[cell.row][cell.col] = null;
  }

  const rations = Math.max(0, next.meters.rations - FOOD_BALANCE.drainPerTurn);
  const exhausted = rations <= 0;
  const stratum = computeStratum(board);
  const rngSeed = advanceSeed(rng);

  return {
    ...next,
    board,
    torchlight,
    stratum,
    meters: { ...next.meters, rations, exhausted },
    rngSeed,
  };
}
