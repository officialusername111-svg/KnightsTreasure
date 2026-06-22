import { describe, it, expect } from 'vitest';
import { createGameState, recordLevelResult } from '../www/js/core/state.js';
import { defaultSave } from '../www/js/core/save.js';

describe('GameState', () => {
  it('selects the current level from the save', () => {
    const gs = createGameState(defaultSave());
    expect(gs.current.id).toBe('1-1');
  });

  it('records result, stores stars, advances level', () => {
    let gs = createGameState(defaultSave());
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.completedLevels).toContain('1-1');
    expect(gs.save.stars['1-1']).toBe(3);
    expect(gs.save.currentLevel).toBe(2);
    expect(gs.current.id).toBe('1-2');
  });

  it('keeps the best star score on replay', () => {
    let gs = createGameState({ ...defaultSave(), currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 1 });
    // replay 1-1 by resetting pointer
    gs = createGameState({ ...gs.save, currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.stars['1-1']).toBe(3);
  });

  it('does not advance past level 25', () => {
    let gs = createGameState({ ...defaultSave(), currentLevel: 25 });
    gs = recordLevelResult(gs, { stars: 2 });
    expect(gs.save.currentLevel).toBe(25);
  });
});
