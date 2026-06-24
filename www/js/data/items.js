// Unified inventory-item registry (D1/D10). One model for power-ups (used in a level)
// and consumables (used from menus). Costs/unlock stages are authoritative here.
// icon -> assets/images/ui/{icon}.png
export const ITEMS = {
  // ---- power-ups (category 'powerup') ----
  raven:       { id: 'raven',       name: 'Raven',          icon: 'ui_power_raven',        category: 'powerup', cost: 20,  unlockStage: 1,  timer: false, effect: 'Flash a real pair for a moment.' },
  hourglass:   { id: 'hourglass',   name: 'Hourglass',      icon: 'ui_power_hourglass',    category: 'powerup', cost: 30,  unlockStage: 2,  timer: true,  effect: 'Add 15 seconds to the timer.' },
  arrow:       { id: 'arrow',       name: 'Arrow',          icon: 'ui_power_arrow',        category: 'powerup', cost: 35,  unlockStage: 3,  timer: false, effect: 'Permanently reveal one tile. (−25 score)' },
  torch:       { id: 'torch',       name: 'Torch',          icon: 'ui_power_torch',        category: 'powerup', cost: 50,  unlockStage: 4,  timer: false, effect: 'Reveal every tile for 2 seconds.' },
  eagleEye:    { id: 'eagleEye',    name: 'Eagle Eye',      icon: 'ui_power_eagle_eye',    category: 'powerup', cost: 55,  unlockStage: 5,  timer: false, effect: 'Glow all real pairs for 5 seconds.' },
  shield:      { id: 'shield',      name: 'Shield',         icon: 'ui_power_shield',       category: 'powerup', cost: 45,  unlockStage: 6,  timer: true,  effect: 'Freeze the timer for 10 seconds.' },
  spear:       { id: 'spear',       name: 'Spear',          icon: 'ui_power_spear',        category: 'powerup', cost: 40,  unlockStage: 7,  timer: false, effect: 'Reveal a row or column for 3 seconds.' },
  holyWater:   { id: 'holyWater',   name: 'Holy Water',     icon: 'ui_power_holy_water',   category: 'powerup', cost: 40,  unlockStage: 7,  timer: false, effect: 'Remove the chains from all locked tiles.' },
  sword:       { id: 'sword',       name: 'Sword',          icon: 'ui_power_sword',        category: 'powerup', cost: 65,  unlockStage: 8,  timer: false, effect: 'Permanently reveal a matching pair. (−25 score)' },
  bomb:        { id: 'bomb',        name: 'Bomb',           icon: 'ui_power_bomb',         category: 'powerup', cost: 80,  unlockStage: 9,  timer: false, effect: 'Reveal a 2×2 area permanently. (−25 score)' },
  warHorn:     { id: 'warHorn',     name: 'War Horn',       icon: 'ui_power_war_horn',     category: 'powerup', cost: 60,  unlockStage: 10, timer: false, effect: 'Double your score for 10 seconds.' },
  kingsDecree: { id: 'kingsDecree', name: "King's Decree",  icon: 'ui_power_kings_decree', category: 'powerup', cost: 200, unlockStage: 99, timer: false, effect: 'Reveal the whole board once. (Not on bosses.)' },
  // ---- consumables (category 'consumable', Tavern) ----
  ale:         { id: 'ale',         name: 'Ale',            icon: 'ui_item_ale',           category: 'consumable', cost: 15, restore: 1,   effect: '+1 stamina' },
  wine:        { id: 'wine',        name: 'Wine',           icon: 'ui_item_wine',          category: 'consumable', cost: 25, restore: 2,   effect: '+2 stamina' },
  mead:        { id: 'mead',        name: 'Mead',           icon: 'ui_item_mead',          category: 'consumable', cost: 35, restore: 3,   effect: '+3 stamina' },
  feast:       { id: 'feast',       name: 'Feast',          icon: 'ui_item_feast',         category: 'consumable', cost: 60, restore: 'full', effect: 'Full restore' },
  knightsBrew: { id: 'knightsBrew', name: "Knight's Brew",  icon: 'ui_item_knights_brew',  category: 'consumable', cost: 90, restore: 'full', brewBonus: true, effect: 'Full restore · next level starts 2★' },
};

export const POWERUPS = Object.values(ITEMS).filter((i) => i.category === 'powerup');
export const CONSUMABLES = Object.values(ITEMS).filter((i) => i.category === 'consumable');

// Power-ups the player may purchase/use given how far they've reached (unlockStage).
export function unlockedPowerups(maxStageReached, allComplete) {
  return POWERUPS.filter((p) => (p.unlockStage === 99 ? allComplete : maxStageReached >= p.unlockStage));
}
