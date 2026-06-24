import { paramsForLevel } from './difficulty.js';
import { mechanicsFor } from '../systems/mechanics.js';

export const LEVELS_PER_STAGE = 25;

// D4 boss template — level 25 of every stage. The boss carries all the stage's mechanics
// plus a per-stage gimmick, more time, and a score threshold for the 3rd star (in addition
// to the D3 star conditions). Gimmick ids drive game-scene behavior; param-based gimmicks
// (extra decoys/locks, faster moves, time drain) are folded into the level here.
const BOSS_GIMMICK = {
  1: 'none', 2: 'fast_timer', 3: 'preshow', 4: 'all_hidden', 5: 'extra_decoys',
  6: 'fast_moves', 7: 'more_locks', 8: 'rotate', 9: 'all_mechanics', 10: 'final',
};
function bossScoreThreshold(stage) { return 600 + (stage - 1) * 150; }

function applyBoss(level, stage) {
  const g = BOSS_GIMMICK[stage] || 'none';
  level.isBoss = true;
  level.bossGimmick = g;
  level.scoreThreshold = bossScoreThreshold(stage);
  level.timeLimit = 90;                                   // D4: bosses get more time
  if (g === 'fast_timer') level.timeDrainRate = 1.25;     // S2: clock ticks 1.25×
  if (g === 'preshow') level.preShowMs = 2000;            // S3: board shown 2s then hidden
  if (g === 'all_hidden') level.flipMemoryMs = Math.round(level.flipMemoryMs * 0.5); // S4
  if (g === 'extra_decoys') level.decoyCount = (level.decoyCount || 2) + 2; // S5
  if (g === 'fast_moves') { level.moveIntervalMs = 5000; level.moveCount = 1; } // S6
  if (g === 'more_locks') { level.lockedCount = (level.lockedCount || 2) + 1; } // S7
  if (g === 'rotate') { level.decoyCount = level.decoyCount || 2; level.moveIntervalMs = level.moveIntervalMs || 8000; } // S8
  if (g === 'all_mechanics' || g === 'final') {           // S9 / S10: every mechanic at once
    level.decoyCount = level.decoyCount || 2;
    level.moveIntervalMs = level.moveIntervalMs || 7000;
    level.moveCount = level.moveCount || 1;
    level.lockedCount = level.lockedCount || 2;
    level.unlockAfterMatches = level.unlockAfterMatches || 2;
  }
  if (g === 'final') { level.timeDrainRate = 1.0; level.shrinkTimer = true; } // S10: tightening clock
  return level;
}

export function generateStage(stageId) {
  const levels = [];
  for (let n = 1; n <= LEVELS_PER_STAGE; n++) {
    const base = paramsForLevel(n);
    const mech = mechanicsFor(stageId, base.block);
    const flipMemoryMs = mech.hiddenFactor
      ? Math.round(base.flipMemoryMs * mech.hiddenFactor)
      : base.flipMemoryMs;
    const level = {
      id: `${stageId}-${n}`,
      stage: stageId,
      levelInStage: n,
      ...base,
      flipMemoryMs,
      isBoss: false,
      decoyCount: mech.decoyCount || 0,
      lockedCount: mech.lockedCount || 0,
      unlockAfterMatches: mech.unlockAfterMatches || 2,
      moveIntervalMs: mech.moveIntervalMs || 0,
      moveCount: mech.moveCount || 0,
    };
    levels.push(n === LEVELS_PER_STAGE ? applyBoss(level, stageId) : level);
  }
  return levels;
}

// Memoize per-stage generation — getLevel is called frequently (HUD/map/replay) and the
// configs are deterministic, so building each stage once is enough.
const stageCache = {};
export function getLevel(stageId, levelInStage) {
  if (levelInStage < 1 || levelInStage > LEVELS_PER_STAGE) return null;
  if (!stageCache[stageId]) stageCache[stageId] = generateStage(stageId);
  return stageCache[stageId][levelInStage - 1];
}
