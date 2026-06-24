// Coin economy (GDD §Coin Economy + D13). Reward computation is pure; earn/spend
// mutate the save's coin balance (the caller persists + emits coins:* events).

// Coins for clearing a level, from the GDD earn table.
export function levelReward({ stars = 1, firstClear = false, noPowerup = false,
  noMistakes = false, speed = false, comboCoins = 0, decoyAvoided = false } = {}) {
  let c = 10;                                  // complete any level
  c += stars >= 3 ? 30 : stars === 2 ? 15 : 5; // star clear bonus
  if (firstClear) c += 20;
  if (noPowerup) c += 15;
  if (noMistakes) c += 20;
  if (speed) c += 10;
  if (decoyAvoided) c += 5;
  c += Math.max(0, Math.min(20, comboCoins));  // D13 cap
  return c;
}

// Combo coins (D13): at combo length >= 3, escalating coins capped at +20/level.
export function comboCoins(maxCombo) {
  let total = 0;
  for (let m = 3; m <= maxCombo; m++) total += Math.max(1, Math.min(5, m - 2));
  return Math.min(20, total);
}

// Stage-clear milestone, scaled 150 (S1) → 375 (S10).
export function stageMilestone(stage) {
  return 150 + (stage - 1) * 25;
}

// Login-streak bonus (GDD).
export function loginStreakBonus(streakDays) {
  if (streakDays >= 30) return 500;
  if (streakDays >= 7) return 150;
  if (streakDays >= 3) return 50;
  return 0;
}

// Earn sources list for the "how to earn coins" info panel.
export const COIN_SOURCES = [
  ['Complete a level', '+10'],
  ['3-star clear', '+30'],
  ['First-time clear', '+20'],
  ['No power-ups', '+15'],
  ['No mistakes', '+20'],
  ['Speed clear', '+10'],
  ['Combo chain', '+3–20'],
  ['Stage milestone', '+150–375'],
  ['Daily login', '+20'],
  ['Daily challenge', '+75'],
  ['Watch an ad', '+25'],
];

export function canAfford(save, cost) {
  return (save.coins || 0) >= cost;
}

export function earn(save, n) {
  save.coins = (save.coins || 0) + n;
  return save.coins;
}

export function spend(save, cost) {
  if (!canAfford(save, cost)) return false;
  save.coins -= cost;
  return true;
}
