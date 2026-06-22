import { paramsForLevel } from './difficulty.js';

export function generateStage(stageId) {
  const levels = [];
  for (let n = 1; n <= 25; n++) {
    levels.push({
      id: `${stageId}-${n}`,
      stage: stageId,
      levelInStage: n,
      ...paramsForLevel(n),
    });
  }
  return levels;
}

export function getLevel(stageId, levelInStage) {
  if (levelInStage < 1 || levelInStage > 25) return null;
  return generateStage(stageId)[levelInStage - 1];
}
