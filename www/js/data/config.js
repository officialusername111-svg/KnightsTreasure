export const SAVE_KEY = 'kt_save';
export const SAVE_VERSION = 1;

export const STAGE1 = { id: 1, name: 'The Forest Path', theme: 'forest' };

// Tile-icon asset base-names (framed icon PNGs in assets/images/tiles/). The match
// engine matches on these strings; the game scene renders <img> from ASSETS.tiles.
export const ICON_POOL = [
  'tile_sword', 'tile_shield', 'tile_bow', 'tile_crown', 'tile_gem', 'tile_key',
  'tile_potion', 'tile_scroll', 'tile_helmet', 'tile_coin', 'tile_ring', 'tile_candle',
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
