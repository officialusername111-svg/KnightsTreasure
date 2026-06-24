// Gambler's Den (GDD §Gambler's Den + Plan 6). 1 coin staked per roll, 45% win →
// +1 stamina, lose → −1 coin. 3 free rolls per rolling hour (ad extension deferred).
import { earn, spend, canAfford } from './economy.js';
import { restore } from './stamina.js';

export const FREE_ROLLS = 3;
export const WIN_CHANCE = 0.45;
const HOUR_MS = 60 * 60 * 1000;

function window_(save, now) {
  const g = save.gambler || (save.gambler = { windowStart: now, used: 0 });
  if (now - g.windowStart >= HOUR_MS) { g.windowStart = now; g.used = 0; }
  return g;
}

export function rollsLeft(save, now = Date.now()) {
  return Math.max(0, FREE_ROLLS - window_(save, now).used);
}

export function msUntilReset(save, now = Date.now()) {
  const g = window_(save, now);
  return g.used < FREE_ROLLS ? 0 : Math.max(0, HOUR_MS - (now - g.windowStart));
}

// Returns { ok, reason?, win?, a, b }. Mutates save (caller persists + emits).
export function roll(save, now = Date.now()) {
  const g = window_(save, now);
  if (g.used >= FREE_ROLLS) return { ok: false, reason: 'cooldown' };
  if (!canAfford(save, 1)) return { ok: false, reason: 'broke' };
  g.used += 1;
  const win = Math.random() < WIN_CHANCE;
  // Dice faces are made to read consistently with the outcome (win = 8+).
  let a, b;
  if (win) { do { a = d6(); b = d6(); } while (a + b < 8); restore(save, 1, now); }
  else { do { a = d6(); b = d6(); } while (a + b >= 8); spend(save, 1); }
  return { ok: true, win, a, b };
}

function d6() { return 1 + Math.floor(Math.random() * 6); }
