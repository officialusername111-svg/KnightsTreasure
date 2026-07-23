import { HOARD_SURFACE, HOARD_RELIC, HOARD_VAULT } from './tileTaxonomy';

export type StratumBand = 'surface' | 'relic' | 'vault';

export const STRATUM_ROW_FRACTIONS: Record<StratumBand, number> = {
  surface: 0.4,
  relic: 0.35,
  vault: 0.25,
};

export interface BandPool {
  weaponWeight: number;
  foodWeight: number;
  hoardWeight: number;
  emblemWeight: number;
  lightWeight: number;
  hoardKinds: readonly string[];
}

export const BAND_POOLS: Record<StratumBand, BandPool> = {
  surface: {
    weaponWeight: 4,
    foodWeight: 4,
    hoardWeight: 2,
    emblemWeight: 1,
    lightWeight: 1,
    hoardKinds: HOARD_SURFACE,
  },
  relic: {
    weaponWeight: 4,
    foodWeight: 4,
    hoardWeight: 3,
    emblemWeight: 1,
    lightWeight: 1,
    hoardKinds: HOARD_RELIC,
  },
  vault: {
    // Deliberately zero food — the richest loot arrives exactly when rations can't be
    // refilled, making the exhausted-flag stub felt even before Phase 3 penalizes it.
    weaponWeight: 2,
    foodWeight: 0,
    hoardWeight: 5,
    emblemWeight: 1,
    lightWeight: 1,
    hoardKinds: HOARD_VAULT,
  },
};
