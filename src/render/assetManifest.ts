import {
  WEAPON_KINDS,
  FOOD_KINDS,
  EMBLEM_KINDS,
  LIGHT_KINDS,
  HOARD_VALUES,
  assetForKind,
} from '../logic/data/tileTaxonomy';

const ALL_KINDS: readonly string[] = [
  ...WEAPON_KINDS,
  ...FOOD_KINDS,
  ...Object.keys(HOARD_VALUES),
  ...EMBLEM_KINDS,
  ...LIGHT_KINDS,
];

export const TILE_ASSET_MANIFEST: Record<string, string> = Object.fromEntries(
  ALL_KINDS.map((kind) => [kind, assetForKind(kind)]),
);
