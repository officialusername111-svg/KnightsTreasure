import { describe, it, expect } from 'vitest';
import { blockForLevel, paramsForLevel } from '../www/js/data/difficulty.js';

describe('difficulty', () => {
  it('maps levels to blocks', () => {
    expect(blockForLevel(1)).toBe('warmup');
    expect(blockForLevel(5)).toBe('warmup');
    expect(blockForLevel(6)).toBe('building');
    expect(blockForLevel(11)).toBe('midpoint');
    expect(blockForLevel(16)).toBe('pressure');
    expect(blockForLevel(21)).toBe('gauntlet');
    expect(blockForLevel(24)).toBe('gauntlet');
    expect(blockForLevel(25)).toBe('boss');
  });

  it('warmup has no timer, 6 pairs, 4x3, 1500ms flip', () => {
    const p = paramsForLevel(3);
    expect(p.grid).toEqual({ cols: 4, rows: 3 });
    expect(p.pairs).toBe(6);
    expect(p.timeLimit).toBeNull();
    expect(p.flipMemoryMs).toBe(1500);
    expect(p.parTime).toBe(36); // 6 pairs * 6s
  });

  it('pressure block: 4x4, 8 pairs, 60s, 800ms, par 36', () => {
    const p = paramsForLevel(18);
    expect(p.grid).toEqual({ cols: 4, rows: 4 });
    expect(p.pairs).toBe(8);
    expect(p.timeLimit).toBe(60);
    expect(p.flipMemoryMs).toBe(800);
    expect(p.parTime).toBe(36); // 60 * 0.6
  });

  it('boss: 6x4, 12 pairs, 90s, 600ms', () => {
    const p = paramsForLevel(25);
    expect(p.grid).toEqual({ cols: 6, rows: 4 });
    expect(p.pairs).toBe(12);
    expect(p.timeLimit).toBe(90);
    expect(p.flipMemoryMs).toBe(600);
  });
});
