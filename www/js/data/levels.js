import { paramsForLevel } from './difficulty.js';

// Per-stage mechanic introduction (GDD stage table + D4/D6–D9). Mechanics layer on top
// of the difficulty curve; harder blocks within a stage carry the mechanic. Hidden is a
// flip-memory multiplier; decoy/locked/moving are counts/intervals the game scene reads.
function mechanicsFor(stage, block) {
  const hard = block === 'pressure' || block === 'gauntlet' || block === 'boss';
  const late = block === 'gauntlet' || block === 'boss';
  const m = {};
  if (stage >= 4) m.hiddenFactor = 0.6;          // S4: tiles flip back faster
  if (stage >= 5 && late) m.decoyCount = 2;       // S5: decoy tiles with no match
  if (stage >= 6 && late) m.moveIntervalMs = 8000; // S6: telegraphed swaps (data; render pending)
  if (stage >= 7 && hard) m.lockedCount = 2;      // S7: chained tiles (data; render pending)
  return m;
}

export function generateStage(stageId) {
  const levels = [];
  for (let n = 1; n <= 25; n++) {
    const base = paramsForLevel(n);
    const mech = mechanicsFor(stageId, base.block);
    const flipMemoryMs = mech.hiddenFactor
      ? Math.round(base.flipMemoryMs * mech.hiddenFactor)
      : base.flipMemoryMs;
    levels.push({
      id: `${stageId}-${n}`,
      stage: stageId,
      levelInStage: n,
      ...base,
      flipMemoryMs,
      isBoss: n === 25,
      decoyCount: mech.decoyCount || 0,
      lockedCount: mech.lockedCount || 0,
      moveIntervalMs: mech.moveIntervalMs || 0,
    });
  }
  return levels;
}

export function getLevel(stageId, levelInStage) {
  if (levelInStage < 1 || levelInStage > 25) return null;
  return generateStage(stageId)[levelInStage - 1];
}
