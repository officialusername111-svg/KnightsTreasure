// Stage-gated emergent-mechanic escalations (2026-07-09 design spec, §4). Combo Streak
// Wildcard and Chain Reveal Ripple are always on from Stage 1 and have no entry here —
// this table is only the later escalations layered on top of them.
export const MECHANIC_UNLOCKS = {
  streakBanner: { id: 'streakBanner', name: 'Streak Banner', unlockStage: 3 },
  twinSpark:    { id: 'twinSpark',    name: 'Twin Spark',    unlockStage: 5 },
  vaultPulse:   { id: 'vaultPulse',   name: 'Vault Pulse',   unlockStage: 8 },
};

// Escalations unlocked for the stage currently being played (matches the STAGE_TILES /
// mechanicsFor precedent of gating in-level mechanics by the level's own stage, not the
// furthest-reached-stage semantics unlockedPowerups uses for the shop).
export function unlockedMechanics(stage) {
  return Object.values(MECHANIC_UNLOCKS).filter((m) => stage >= m.unlockStage);
}
