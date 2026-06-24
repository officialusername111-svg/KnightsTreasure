export const SAVE_KEY = 'kt_save';
export const SAVE_VERSION = 4;

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
  ui: 'assets/images/ui/',
  badges: 'assets/images/badges/',
  bgCover: 'assets/images/backgrounds/bg_cover.png',
  bgInn: 'assets/images/backgrounds/bg_tavern.png',
  bgBards: 'assets/images/backgrounds/bg_bards_corner.png',
  bgGamblers: 'assets/images/backgrounds/bg_gamblers_den.png',
  bgBlacksmith: 'assets/images/backgrounds/bg_blacksmith.png',
  bgDaily: 'assets/images/backgrounds/bg_daily_duty.png',
  bgMap: 'assets/images/backgrounds/bg_map.png',
  characters: 'assets/images/characters/',
};

// Per-stage backdrop + name (GDD). The home shows the current stage's art full-screen.
export const STAGE_BG = {
  1: 'assets/images/backgrounds/bg_stage1_forest.png',
  2: 'assets/images/backgrounds/bg_stage2_village.png',
  3: 'assets/images/backgrounds/bg_stage3_river.png',
  4: 'assets/images/backgrounds/bg_stage4_cave.png',
  5: 'assets/images/backgrounds/bg_stage5_camp.png',
  6: 'assets/images/backgrounds/bg_stage6_gates.png',
  7: 'assets/images/backgrounds/bg_stage7_dungeon.png',
  8: 'assets/images/backgrounds/bg_stage8_throne.png',
  9: 'assets/images/backgrounds/bg_stage9_lair.png',
  10: 'assets/images/backgrounds/bg_stage10_vault.png',
};
export const STAGE_NAMES = {
  1: 'The Forest Path', 2: 'The Village', 3: 'The River Crossing', 4: 'The Dark Cave',
  5: 'The Bandit Camp', 6: 'The Castle Gates', 7: 'The Dungeon', 8: 'The Throne Room',
  9: "The Dragon's Lair", 10: 'The Final Treasure',
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
