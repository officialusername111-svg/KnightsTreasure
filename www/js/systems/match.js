export function buildDeck({ pairs, iconPool, shuffle }) {
  const icons = iconPool.slice(0, pairs);
  const doubled = [];
  icons.forEach((icon) => {
    doubled.push(icon, icon);
  });
  return shuffle(doubled).map((icon, index) => ({
    index,
    icon,
    faceUp: false,
    matched: false,
  }));
}

export function createMatchState({ pairs, iconPool, shuffle }) {
  return {
    tiles: buildDeck({ pairs, iconPool, shuffle }),
    firstPick: null,
    locked: false,
    matchedPairs: 0,
    totalPairs: pairs,
    mistakes: 0,
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
  if (state.locked || !tile || tile.matched || tile.faceUp) {
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
