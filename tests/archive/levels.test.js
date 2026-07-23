import { describe, it, expect } from 'vitest';
import { generateStage, getLevel } from '../../archive/memory-match-www/js/data/levels.js';

describe('levels', () => {
  it('generates 25 levels for stage 1', () => {
    const levels = generateStage(1);
    expect(levels).toHaveLength(25);
    expect(levels[0].id).toBe('1-1');
    expect(levels[24].id).toBe('1-25');
  });

  it('each level carries difficulty params', () => {
    const lvl = getLevel(1, 18);
    expect(lvl.stage).toBe(1);
    expect(lvl.levelInStage).toBe(18);
    expect(lvl.pairs).toBe(8);
    expect(lvl.timeLimit).toBe(60);
    expect(lvl.block).toBe('pressure');
  });

  it('returns null for out-of-range level', () => {
    expect(getLevel(1, 26)).toBeNull();
    expect(getLevel(1, 0)).toBeNull();
  });
});
