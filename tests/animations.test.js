import { describe, it, expect } from 'vitest';
import { comboTier } from '../www/js/ui/animations.js';

describe('comboTier', () => {
  it('is null below a 3-chain', () => {
    expect(comboTier(0)).toBeNull();
    expect(comboTier(1)).toBeNull();
    expect(comboTier(2)).toBeNull();
  });
  it('escalates by chain length', () => {
    expect(comboTier(3)).toBe('Well struck!');
    expect(comboTier(4)).toBe('Valiant!');
    expect(comboTier(5)).toBe('Heroic!');
  });
  it('caps at Legendary for 6+', () => {
    expect(comboTier(6)).toBe('Legendary!');
    expect(comboTier(9)).toBe('Legendary!');
  });
});
