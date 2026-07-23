import { ICON_POOL } from './config.js';

// Per-stage themed tile pools (D-decision 2026-06-25). Each stage draws its icons from a
// thematically-fitting subset of ICON_POOL so the board reads like its setting. Pools
// overlap (43 icons, 10 stages) and each holds ≥16 distinct icons — enough for the largest
// board (12 pairs) plus boss decoys (up to 4). Names must exist in ICON_POOL.
export const STAGE_TILES = {
  1: ['tile_acorn', 'tile_stag', 'tile_wolf', 'tile_owl', 'tile_mushroom', 'tile_boar', 'tile_falcon', 'tile_wheat',
      'tile_bow', 'tile_dagger', 'tile_bread', 'tile_cheese', 'tile_grapes', 'tile_candle', 'tile_axe', 'tile_serpent'],
  2: ['tile_bread', 'tile_cheese', 'tile_wheat', 'tile_turkey', 'tile_grapes', 'tile_candle', 'tile_coin', 'tile_chalice',
      'tile_key', 'tile_ring', 'tile_bow', 'tile_axe', 'tile_owl', 'tile_mushroom', 'tile_acorn', 'tile_helmet'],
  3: ['tile_falcon', 'tile_serpent', 'tile_stag', 'tile_boar', 'tile_wolf', 'tile_owl', 'tile_chest', 'tile_coin',
      'tile_key', 'tile_bow', 'tile_crossbow', 'tile_dagger', 'tile_axe', 'tile_grapes', 'tile_bread', 'tile_wheat'],
  4: ['tile_gem', 'tile_ingot', 'tile_coin', 'tile_chest', 'tile_candle', 'tile_rune', 'tile_orb', 'tile_mushroom',
      'tile_serpent', 'tile_dagger', 'tile_key', 'tile_mace', 'tile_warhammer', 'tile_potion', 'tile_owl', 'tile_bow'],
  5: ['tile_dagger', 'tile_axe', 'tile_bow', 'tile_crossbow', 'tile_mace', 'tile_flail', 'tile_spear', 'tile_helmet',
      'tile_shield', 'tile_gauntlet', 'tile_coin', 'tile_chest', 'tile_chalice', 'tile_ring', 'tile_gem', 'tile_warhammer'],
  6: ['tile_shield', 'tile_helmet', 'tile_gauntlet', 'tile_spear', 'tile_mace', 'tile_flail', 'tile_crossbow', 'tile_bow',
      'tile_warhammer', 'tile_axe', 'tile_dagger', 'tile_warhorse', 'tile_crown', 'tile_key', 'tile_chest', 'tile_falcon'],
  7: ['tile_key', 'tile_chest', 'tile_rune', 'tile_orb', 'tile_potion', 'tile_candle', 'tile_dagger', 'tile_serpent',
      'tile_gem', 'tile_coin', 'tile_scroll', 'tile_grail', 'tile_amulet', 'tile_ring', 'tile_crown', 'tile_mace'],
  8: ['tile_crown', 'tile_scepter', 'tile_chalice', 'tile_grail', 'tile_ring', 'tile_gem', 'tile_amulet', 'tile_orb',
      'tile_coin', 'tile_ingot', 'tile_chest', 'tile_candle', 'tile_shield', 'tile_helmet', 'tile_rune', 'tile_scroll'],
  9: ['tile_dragon', 'tile_griffin', 'tile_serpent', 'tile_wolf', 'tile_boar', 'tile_gem', 'tile_ingot', 'tile_coin',
      'tile_chest', 'tile_crown', 'tile_scepter', 'tile_orb', 'tile_helmet', 'tile_shield', 'tile_warhammer', 'tile_flail'],
  10: ['tile_crown', 'tile_scepter', 'tile_grail', 'tile_chalice', 'tile_gem', 'tile_ingot', 'tile_coin', 'tile_chest',
       'tile_orb', 'tile_amulet', 'tile_ring', 'tile_rune', 'tile_dragon', 'tile_griffin', 'tile_crossbow', 'tile_key'],
};

// The icon pool a stage's boards draw from. Falls back to the full pool if a stage is
// somehow missing (keeps the game playable rather than ever blocking on data).
export function tilePoolForStage(stage) {
  return STAGE_TILES[stage] || ICON_POOL;
}
