import type { WeaponKind } from '../types';

export interface WeaponDef {
  hits: number;
  damagePerHit: number;
  bonusPerExtraTile: number;
  turnCost: number;
  ignoresArmor: boolean;
  shattersAdjacent?: number;
}

export const WEAPON_BALANCE: Record<WeaponKind, WeaponDef> = {
  dagger: { hits: 2, damagePerHit: 8, bonusPerExtraTile: 0, turnCost: 1, ignoresArmor: false },
  sword: { hits: 1, damagePerHit: 20, bonusPerExtraTile: 8, turnCost: 2, ignoresArmor: false },
  axe: {
    hits: 1,
    damagePerHit: 18,
    bonusPerExtraTile: 6,
    turnCost: 2,
    ignoresArmor: false,
    shattersAdjacent: 1,
  },
  bow: { hits: 1, damagePerHit: 20, bonusPerExtraTile: 8, turnCost: 2, ignoresArmor: true },
};

export const FOOD_BALANCE = {
  refillByMatchSize: { 3: 2, 4: 3, 5: 5 } as Record<number, number>,
  maxRations: 10,
  drainPerTurn: 1,
};

export function refillForMatchSize(size: number): number {
  const table = FOOD_BALANCE.refillByMatchSize;
  if (table[size] !== undefined) return table[size];
  if (size > 5) return table[5] + (size - 5) * 2;
  return 0;
}

export const GUARDIAN_BALANCE = {
  dummyHpBase: 300,
  hpGrowthPerFloor: 0.2,
  // rage/armor: D17 — both derived from meters.greed every guardianTurn() call.
  rageDivisor: 25,
  maxRage: 10,
  armorPerRage: 2,
  maxArmor: 20,
  // counter-attack cadence/damage: D18.
  attackInterval: 4,
  baseCounterDamage: 6,
  rageDamagePerLevel: 2,
  exhaustedDamageMultiplier: 1.5,
};

export const KNIGHT_BALANCE = {
  hpBase: 100,
};

export const BOARD_BALANCE = {
  baseCols: 8,
  baseRows: 8,
  maxExtraRows: 4,
  hoardValueMultiplierPerFloor: 0.15,
};

export const EMBLEM_BALANCE = {
  chargePerTile: 1,
};

export const GREED_BALANCE = {
  greedPerGold: 1,
  /** Display-only normalization for the HUD greed bar. Greed itself has no gameplay
   * ceiling yet (Phase 3 defines how it scales guardian rage); this just keeps the bar
   * legible in the meantime. */
  displayCap: 200,
};
