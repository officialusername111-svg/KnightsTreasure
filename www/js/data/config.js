export const SAVE_KEY = 'kt_save';
export const SAVE_VERSION = 1;

export const STAGE1 = { id: 1, name: 'The Forest Path', theme: 'forest' };

// Tile-icon asset base-names (framed icon PNGs in assets/images/tiles/). The match
// engine matches on these strings; the game scene renders <img> from ASSETS.tiles.
export const ICON_POOL = [
  'tile_acorn', 'tile_amulet', 'tile_axe', 'tile_boar', 'tile_bow', 'tile_bread',
  'tile_candle', 'tile_chalice', 'tile_cheese', 'tile_chest', 'tile_coin', 'tile_crossbow',
  'tile_crown', 'tile_dagger', 'tile_dragon', 'tile_falcon', 'tile_flail', 'tile_gauntlet',
  'tile_gem', 'tile_grail', 'tile_grapes', 'tile_griffin', 'tile_helmet', 'tile_ingot',
  'tile_key', 'tile_mace', 'tile_mushroom', 'tile_orb', 'tile_owl', 'tile_potion',
  'tile_ring', 'tile_rune', 'tile_scepter', 'tile_scroll', 'tile_serpent', 'tile_shield',
  'tile_spear', 'tile_stag', 'tile_turkey', 'tile_warhammer', 'tile_warhorse', 'tile_wheat',
  'tile_wolf',
];

export const ASSETS = {
  tiles: 'assets/images/tiles/',
  tileBack: 'assets/images/tiles/tile_back.png',
  bgForest: 'assets/images/backgrounds/bg_stage1_forest.png',
};

export const TEXT = {
  appTitle: "Knight's Treasure",
  stageLabel: 'Stage',
  levelLabel: 'Level',
  timeLabel: 'Time',
  coinsLabel: 'Coins',
  score: 'Score',
  shop: 'Shop',
  win: 'Level Cleared!',
  lose: "Time's Up!",
  retry: 'Try Again',
  next: 'Next Level',
  noTimer: '∞',
};
