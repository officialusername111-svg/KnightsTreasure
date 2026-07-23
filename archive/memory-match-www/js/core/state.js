import { getLevel } from '../data/levels.js';

const TOTAL_STAGES = 10;

// Build the runtime state. Defaults to the save's continue pointer, but an explicit
// (stage, level) lets the map replay any reached stage without moving the pointer.
export function createGameState(save, stage = save.currentStage, level = save.currentLevel) {
  return {
    save,
    current: getLevel(stage, level),
  };
}

// Linear index for "furthest" comparisons (1-based stage & level).
function idx(stage, level) {
  return (stage - 1) * 25 + level;
}

// The level that comes after (stage, level), rolling Stage N L25 → Stage N+1 L1.
// Returns null past the very end (Stage 10 L25).
export function nextPosition(stage, level) {
  if (level < 25) return { stage, level: level + 1 };
  if (stage < TOTAL_STAGES) return { stage: stage + 1, level: 1 };
  return null;
}

// Level the Quest Map launches for a tapped stage: the current stage resumes at
// the continue pointer; a completed stage replays from level 1 (GDD map rule).
export function mapPlayLevel(save, stage) {
  return stage === save.currentStage ? save.currentLevel : 1;
}

export function recordLevelResult(gs, { stars }) {
  const cur = gs.current;
  const id = cur.id;
  const completedLevels = gs.save.completedLevels.includes(id)
    ? [...gs.save.completedLevels]
    : [...gs.save.completedLevels, id];
  const newStars = { ...gs.save.stars, [id]: Math.max(stars, gs.save.stars[id] || 0) };

  // Advance the continue pointer forward-only (replaying an old level never regresses it).
  const after = nextPosition(cur.stage, cur.levelInStage) || { stage: cur.stage, level: cur.levelInStage };
  const ahead = idx(after.stage, after.level) > idx(gs.save.currentStage, gs.save.currentLevel);
  const currentStage = ahead ? after.stage : gs.save.currentStage;
  const currentLevel = ahead ? after.level : gs.save.currentLevel;

  const save = { ...gs.save, currentStage, currentLevel, completedLevels, stars: newStars };
  return createGameState(save, cur.stage, cur.levelInStage);
}
