// Secret redeemable codes (testing / promo). Pure-ish: redeemCode mutates the save's
// inventory and returns a result; the caller persists + toasts. Codes are matched
// case-insensitively after trimming, so "vip1515" and " VIP1515 " both work.
import { POWERUPS } from '../data/items.js';

// How many of each power-up a "stock everything" code grants.
const STOCK = 99;

export const CODES = {
  // Testing: stock the whole arsenal so every power-up shows in the in-game tray.
  VIP1515: {
    apply(save) {
      if (!save.inventory) save.inventory = {};
      POWERUPS.forEach((p) => {
        save.inventory[p.id] = Math.max(save.inventory[p.id] || 0, STOCK);
      });
      return 'Arsenal unlocked — every power-up stocked';
    },
  },
};

// Returns { ok, message }. ok=false leaves the save untouched.
export function redeemCode(save, raw) {
  const key = String(raw || '').trim().toUpperCase();
  if (!key) return { ok: false, message: 'Speak a code, knight.' };
  const code = CODES[key];
  if (!code) return { ok: false, message: 'That rune means nothing here.' };
  return { ok: true, message: code.apply(save) };
}
