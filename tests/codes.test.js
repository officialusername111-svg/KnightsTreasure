import { describe, it, expect } from 'vitest';
import { redeemCode } from '../www/js/systems/codes.js';
import { POWERUPS } from '../www/js/data/items.js';

describe('redeemCode', () => {
  it('VIP1515 stocks every power-up', () => {
    const save = { inventory: {} };
    const res = redeemCode(save, 'VIP1515');
    expect(res.ok).toBe(true);
    POWERUPS.forEach((p) => expect(save.inventory[p.id]).toBeGreaterThanOrEqual(99));
  });

  it('is case-insensitive and trims whitespace', () => {
    const save = { inventory: {} };
    expect(redeemCode(save, '  vip1515 ').ok).toBe(true);
    expect(save.inventory[POWERUPS[0].id]).toBeGreaterThanOrEqual(99);
  });

  it('never lowers an existing higher count', () => {
    const save = { inventory: { raven: 250 } };
    redeemCode(save, 'VIP1515');
    expect(save.inventory.raven).toBe(250);
  });

  it('rejects unknown codes without touching the save', () => {
    const save = { inventory: {} };
    const res = redeemCode(save, 'NOPE');
    expect(res.ok).toBe(false);
    expect(save.inventory).toEqual({});
  });

  it('rejects an empty code', () => {
    expect(redeemCode({ inventory: {} }, '   ').ok).toBe(false);
  });

  it('creates the inventory object if missing', () => {
    const save = {};
    redeemCode(save, 'VIP1515');
    expect(Object.keys(save.inventory).length).toBe(POWERUPS.length);
  });
});
