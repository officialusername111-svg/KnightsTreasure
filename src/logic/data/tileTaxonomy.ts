import type { Role } from '../types';

export const WEAPON_KINDS = ['dagger', 'sword', 'axe', 'bow'] as const;

export const FOOD_KINDS = ['bread', 'cheese', 'grapes', 'mushroom', 'turkey', 'wheat', 'acorn'] as const;

export const HOARD_SURFACE = ['coin', 'ring', 'gem', 'ingot'] as const;
export const HOARD_RELIC = ['amulet', 'rune', 'orb', 'chalice', 'scepter', 'potion'] as const;
export const HOARD_VAULT = ['crown', 'grail', 'chest', 'key', 'scroll'] as const;

export const HOARD_VALUES: Record<string, number> = {
  coin: 5,
  ring: 8,
  gem: 10,
  ingot: 12,
  amulet: 15,
  rune: 18,
  orb: 20,
  chalice: 22,
  scepter: 25,
  potion: 16,
  crown: 40,
  grail: 45,
  chest: 50,
  key: 30,
  scroll: 28,
};

export const EMBLEM_KINDS = [
  'boar',
  'dragon',
  'falcon',
  'griffin',
  'owl',
  'serpent',
  'stag',
  'wolf',
  'warhorse',
] as const;

export const LIGHT_KINDS = ['candle'] as const;

/** No hazard-flavored icon exists among the 45 committed tiles; Phase 6 needs new art
 * before this role can spawn tiles. See pivot decisions doc D3. */
export const HAZARD_KINDS: readonly string[] = [];

export function roleForKind(kind: string): Role {
  if ((WEAPON_KINDS as readonly string[]).includes(kind)) return 'weapon';
  if ((FOOD_KINDS as readonly string[]).includes(kind)) return 'food';
  if (kind in HOARD_VALUES) return 'hoard';
  if ((EMBLEM_KINDS as readonly string[]).includes(kind)) return 'emblem';
  if ((LIGHT_KINDS as readonly string[]).includes(kind)) return 'light';
  throw new Error(`Unknown tile kind: ${kind}`);
}

export function assetForKind(kind: string): string {
  return `/images/tiles/tile_${kind}.png`;
}
