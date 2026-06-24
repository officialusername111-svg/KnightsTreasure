// Tavern consumables (GDD §Tavern + Plan 6). Buy a drink → spend coins, restore
// stamina; Knight's Brew also sets a "next level starts 2★" floor flag.
import { ITEMS } from '../data/items.js';
import { spend, canAfford } from './economy.js';
import { restore, current, MAX_STAMINA } from './stamina.js';

// Returns { ok, reason?, restored? }. Mutates save (caller persists + emits).
export function buyDrink(save, itemId, now = Date.now()) {
  const item = ITEMS[itemId];
  if (!item || item.category !== 'consumable') return { ok: false, reason: 'unknown' };
  if (current(save, now) >= MAX_STAMINA) return { ok: false, reason: 'full' };
  if (!canAfford(save, item.cost)) return { ok: false, reason: 'broke' };
  spend(save, item.cost);
  const before = save.stamina;
  restore(save, item.restore, now);
  if (item.brewBonus) save.brewBonusNext = true;
  return { ok: true, restored: save.stamina - before };
}
