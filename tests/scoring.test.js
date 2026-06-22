import { describe, it, expect } from 'vitest';
import { computeStars, computeScore } from '../www/js/systems/scoring.js';

describe('computeStars', () => {
  it('3 stars: no mistakes, under par', () => {
    expect(computeStars({ mistakes: 0, pairs: 8, timeUsed: 20, parTime: 36 })).toBe(3);
  });
  it('2 stars: some mistakes', () => {
    expect(computeStars({ mistakes: 4, pairs: 8, timeUsed: 20, parTime: 36 })).toBe(2);
  });
  it('1 star: many mistakes and slow', () => {
    expect(computeStars({ mistakes: 10, pairs: 8, timeUsed: 50, parTime: 36 })).toBe(1);
  });
  it('untimed (parTime>0, timeUsed under par) still rates on mistakes', () => {
    expect(computeStars({ mistakes: 0, pairs: 6, timeUsed: 10, parTime: 36 })).toBe(3);
  });
  it('never below 1', () => {
    expect(computeStars({ mistakes: 99, pairs: 6, timeUsed: 999, parTime: 36 })).toBe(1);
  });
});

describe('computeScore', () => {
  it('applies the GDD formula', () => {
    expect(computeScore({ matches: 8, timeRemaining: 30, comboBonus: 15, mistakes: 2 }))
      .toBe(8 * 100 + 30 * 10 + 15 - 2 * 50); // 1015
  });
  it('clamps at zero', () => {
    expect(computeScore({ matches: 0, timeRemaining: 0, comboBonus: 0, mistakes: 5 })).toBe(0);
  });
});
