// Pure tile-mechanic logic (D6–D9). The game scene applies these; match.js stays generic.
// Centralizes what was inlined in levels.js plus the moving/locked helpers Plan 4 adds.

// Per-stage mechanic assignment. Mechanics layer onto the difficulty curve; the harder
// blocks within a stage carry the stage's mechanic (GDD stage table + D6–D9).
export function mechanicsFor(stage, block) {
  const hard = block === 'pressure' || block === 'gauntlet' || block === 'boss';
  const late = block === 'gauntlet' || block === 'boss';
  const m = {};
  if (stage >= 4) m.hiddenFactor = 0.6;                                  // S4: faster flip-back (D7)
  if (stage >= 5 && late) m.decoyCount = 2;                              // S5: decoy tiles (D6)
  if (stage >= 6 && late) { m.moveIntervalMs = 8000; m.moveCount = 1; }  // S6: moving (D8)
  if (stage >= 7 && hard) { m.lockedCount = 2; m.unlockAfterMatches = 2; } // S7: locked (D9)
  return m;
}

// D8 moving tiles — choose swap pairs among *movable* tiles: face-down, unmatched, not
// locked, not pinned (permanent reveals pin their tiles, D12). Pure; rng injectable.
export function chooseSwaps(tiles, { moveCount = 1, pinned = new Set(), rng = Math.random } = {}) {
  const pool = tiles
    .filter((t) => !t.matched && !t.faceUp && !t.locked && !pinned.has(t.index))
    .map((t) => t.index);
  const swaps = [];
  for (let k = 0; k < moveCount && pool.length >= 2; k++) {
    const i = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const j = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    swaps.push([i, j]);
  }
  return swaps;
}

// D9 locked tiles — pick which indices start locked (a random subset). Pure; rng injectable.
export function chooseLocked(tiles, lockedCount = 0, rng = Math.random) {
  if (!lockedCount) return [];
  const ids = tiles.map((t) => t.index);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(lockedCount, ids.length));
}
