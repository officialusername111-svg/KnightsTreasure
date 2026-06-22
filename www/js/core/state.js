import { getLevel } from '../data/levels.js';

export function createGameState(save) {
  return {
    save,
    current: getLevel(save.currentStage, save.currentLevel),
  };
}

export function recordLevelResult(gs, { stars }) {
  const id = gs.current.id;
  const save = {
    ...gs.save,
    completedLevels: gs.save.completedLevels.includes(id)
      ? gs.save.completedLevels
      : [...gs.save.completedLevels, id],
    stars: { ...gs.save.stars, [id]: Math.max(stars, gs.save.stars[id] || 0) },
  };
  if (save.currentLevel < 25) save.currentLevel += 1;
  return createGameState(save);
}
