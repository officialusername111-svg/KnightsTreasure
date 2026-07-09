export function buildDeck({ pairs, iconPool, shuffle, decoyCount = 0 }) {
  const real = [];
  iconPool.slice(0, pairs).forEach((icon) => real.push({ icon, isDecoy: false }, { icon, isDecoy: false }));
  // Decoys (D6): unique icons after the pair set, single copies — they never match.
  const decoys = iconPool.slice(pairs, pairs + decoyCount).map((icon) => ({ icon, isDecoy: true }));
  return shuffle([...real, ...decoys]).map((t, index) => ({
    index,
    icon: t.icon,
    isDecoy: t.isDecoy,
    faceUp: false,
    matched: false,
    locked: false,
  }));
}

export function createMatchState({ pairs, iconPool, shuffle, decoyCount = 0, lockedCount = 0, unlockAfterMatches = 2 }) {
  const tiles = buildDeck({ pairs, iconPool, shuffle, decoyCount });
  // D9 locked tiles: chain a random subset; they can't be flipped until unlocked.
  if (lockedCount > 0) {
    shuffle(tiles.map((t) => t.index)).slice(0, lockedCount).forEach((i) => { tiles[i].locked = true; });
  }
  return {
    tiles,
    firstPick: null,
    locked: false,
    matchedPairs: 0,
    totalPairs: pairs,
    mistakes: 0,
    matchesSinceUnlock: 0,
    unlockAfterMatches,
    locksRemaining: lockedCount,
  };
}

function clone(state) {
  return {
    ...state,
    tiles: state.tiles.map((t) => ({ ...t })),
  };
}

export function tapTile(state, index) {
  const tile = state.tiles[index];
  if (state.locked || !tile || tile.matched || tile.faceUp || tile.locked) {
    return { state, result: 'ignored' };
  }
  const next = clone(state);
  next.tiles[index].faceUp = true;

  if (next.firstPick === null) {
    next.firstPick = index;
    return { state: next, result: 'flip' };
  }

  const a = next.tiles[next.firstPick];
  const b = next.tiles[index];
  if (a.icon === b.icon) {
    a.matched = true;
    b.matched = true;
    next.matchedPairs += 1;
    next.firstPick = null;
    // D9 progressive unlock: free one chained tile every `unlockAfterMatches` matches.
    if (next.locksRemaining > 0) {
      next.matchesSinceUnlock += 1;
      if (next.matchesSinceUnlock >= next.unlockAfterMatches) {
        next.matchesSinceUnlock = 0;
        const lk = next.tiles.find((t) => t.locked);
        if (lk) { lk.locked = false; next.locksRemaining -= 1; }
      }
    }
    const result = next.matchedPairs === next.totalPairs ? 'win' : 'match';
    return { state: next, result };
  }

  next.mistakes += 1;
  next.locked = true;
  return { state: next, result: 'mismatch' };
}

export function resolveMismatch(state) {
  const next = clone(state);
  next.tiles.forEach((t) => {
    if (t.faceUp && !t.matched) t.faceUp = false;
  });
  next.firstPick = null;
  next.locked = false;
  return next;
}

// Power-up auto-match (owner decision 2026-07-08): complete a known pair directly,
// bypassing the firstPick/locked tap flow — used when a power-up holds both tiles of a
// real pair face-up. Preserves all match bookkeeping (count, progressive unlock, win).
export function matchPair(state, i, j) {
  const a = state.tiles[i], b = state.tiles[j];
  if (!a || !b || a.matched || b.matched || a.locked || b.locked ||
      a.isDecoy || b.isDecoy || i === j || a.icon !== b.icon) {
    return { state, result: 'ignored' };
  }
  const next = clone(state);
  next.tiles[i].matched = true; next.tiles[i].faceUp = true;
  next.tiles[j].matched = true; next.tiles[j].faceUp = true;
  if (next.firstPick === i || next.firstPick === j) next.firstPick = null;
  next.matchedPairs += 1;
  if (next.locksRemaining > 0) {
    next.matchesSinceUnlock += 1;
    if (next.matchesSinceUnlock >= next.unlockAfterMatches) {
      next.matchesSinceUnlock = 0;
      const lk = next.tiles.find((t) => t.locked);
      if (lk) { lk.locked = false; next.locksRemaining -= 1; }
    }
  }
  return { state: next, result: next.matchedPairs === next.totalPairs ? 'win' : 'match' };
}

// Holy Water (D2/D9): strip every chain at once. Guarantees a locked level stays
// completable without spending coins. Returns a new state.
export function removeAllLocks(state) {
  const next = clone(state);
  next.tiles.forEach((t) => { t.locked = false; });
  next.locksRemaining = 0;
  return next;
}

// Combo Streak Wildcard (2026-07-09 spec, §2): tag a tile as the Wildcard. Its real icon
// and real partner are untouched — only rendering and matching behavior change (see
// matchWildcard). No-op on an ineligible tile so callers don't need to pre-validate.
export function spawnWildcard(state, index) {
  const t = state.tiles[index];
  if (!t || t.matched || t.faceUp || t.locked || t.isDecoy) return state;
  const next = clone(state);
  next.tiles[index].wildcard = true;
  return next;
}

// Resolve a Wildcard against whatever tile the player flips alongside it. If it happens
// to be the Wildcard's own true partner this is a plain match. Otherwise both clear as a
// scored pair, and each side's now-partnerless true sibling is silently retired (matched,
// unscored) with totalPairs reduced by exactly one — so `matchedPairs === totalPairs`
// stays reachable through ordinary play instead of leaving an unmatchable orphan tile.
export function matchWildcard(state, wildcardIdx, otherIdx) {
  const a = state.tiles[wildcardIdx], b = state.tiles[otherIdx];
  if (!a || !b || !a.wildcard || a.matched || b.matched || a.locked || b.locked ||
      b.isDecoy || wildcardIdx === otherIdx) {
    return { state, result: 'ignored' };
  }
  const next = clone(state);
  next.tiles[wildcardIdx].matched = true; next.tiles[wildcardIdx].faceUp = true;
  next.tiles[otherIdx].matched = true; next.tiles[otherIdx].faceUp = true;
  if (next.firstPick === wildcardIdx || next.firstPick === otherIdx) next.firstPick = null;
  next.matchedPairs += 1;
  if (a.icon !== b.icon) {
    const orphanA = next.tiles.find((t) => t.index !== wildcardIdx && t.icon === a.icon && !t.matched);
    const orphanB = next.tiles.find((t) => t.index !== otherIdx && t.icon === b.icon && !t.matched);
    if (orphanA) orphanA.matched = true;
    if (orphanB) orphanB.matched = true;
    if (orphanA || orphanB) next.totalPairs -= 1;
  }
  if (next.locksRemaining > 0) {
    next.matchesSinceUnlock += 1;
    if (next.matchesSinceUnlock >= next.unlockAfterMatches) {
      next.matchesSinceUnlock = 0;
      const lk = next.tiles.find((t) => t.locked);
      if (lk) { lk.locked = false; next.locksRemaining -= 1; }
    }
  }
  return { state: next, result: next.matchedPairs === next.totalPairs ? 'win' : 'match' };
}
