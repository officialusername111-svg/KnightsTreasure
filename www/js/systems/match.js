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

// Holy Water (D2/D9): strip every chain at once. Guarantees a locked level stays
// completable without spending coins. Returns a new state.
export function removeAllLocks(state) {
  const next = clone(state);
  next.tiles.forEach((t) => { t.locked = false; });
  next.locksRemaining = 0;
  return next;
}
