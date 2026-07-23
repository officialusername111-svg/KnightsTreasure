import { describe, it, expect } from 'vitest';
import { createGameState, recordLevelResult, mapPlayLevel } from '../../archive/memory-match-www/js/core/state.js';
import { defaultSave } from '../../archive/memory-match-www/js/core/save.js';

describe('GameState', () => {
  it('selects the current level from the save', () => {
    const gs = createGameState(defaultSave());
    expect(gs.current.id).toBe('1-1');
  });

  it('records result, stores stars, advances the save pointer', () => {
    let gs = createGameState(defaultSave());
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.completedLevels).toContain('1-1');
    expect(gs.save.stars['1-1']).toBe(3);
    // The continue pointer advances to the next level...
    expect(gs.save.currentStage).toBe(1);
    expect(gs.save.currentLevel).toBe(2);
    // ...while the returned state still describes the level just played (showWin reads
    // it; main.js recomputes the next level for navigation via nextPosition()).
    expect(gs.current.id).toBe('1-1');
  });

  it('keeps the best star score on replay', () => {
    let gs = createGameState({ ...defaultSave(), currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 1 });
    // replay 1-1 by resetting pointer
    gs = createGameState({ ...gs.save, currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.stars['1-1']).toBe(3);
    expect(gs.save.completedLevels.filter((x) => x === '1-1').length).toBe(1);
  });

  it('rolls a stage-ending level over into the next stage', () => {
    let gs = createGameState({ ...defaultSave(), currentStage: 1, currentLevel: 25 });
    gs = recordLevelResult(gs, { stars: 2 });
    expect(gs.save.currentStage).toBe(2);
    expect(gs.save.currentLevel).toBe(1);
  });

  it('does not advance past the very last level (Stage 10, L25)', () => {
    let gs = createGameState({ ...defaultSave(), currentStage: 10, currentLevel: 25 });
    gs = recordLevelResult(gs, { stars: 2 });
    expect(gs.save.currentStage).toBe(10);
    expect(gs.save.currentLevel).toBe(25);
  });

  // Regression (T1): map "Continue" must resume the pointer, not restart at L1.
  it('map play resumes the pointer on the current stage, replays L1 on others', () => {
    const save = { ...defaultSave(), currentStage: 2, currentLevel: 14 };
    expect(mapPlayLevel(save, 2)).toBe(14); // current stage → continue pointer
    expect(mapPlayLevel(save, 1)).toBe(1);  // completed stage → replay from L1
  });
});
