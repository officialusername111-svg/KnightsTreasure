// GDD 25-level block pattern — single source of difficulty truth.
const BLOCKS = [
  { name: 'warmup',   max: 5,  grid: { cols: 4, rows: 3 }, pairs: 6,  timeLimit: null, flipMemoryMs: 1500 },
  { name: 'building', max: 10, grid: { cols: 4, rows: 3 }, pairs: 6,  timeLimit: 120,  flipMemoryMs: 1200 },
  { name: 'midpoint', max: 15, grid: { cols: 4, rows: 4 }, pairs: 8,  timeLimit: 90,   flipMemoryMs: 1000 },
  { name: 'pressure', max: 20, grid: { cols: 4, rows: 4 }, pairs: 8,  timeLimit: 60,   flipMemoryMs: 800  },
  { name: 'gauntlet', max: 24, grid: { cols: 6, rows: 4 }, pairs: 12, timeLimit: 45,   flipMemoryMs: 700  },
  { name: 'boss',     max: 25, grid: { cols: 6, rows: 4 }, pairs: 12, timeLimit: 90,   flipMemoryMs: 600  },
];

function blockDefForLevel(levelInStage) {
  return BLOCKS.find((b) => levelInStage <= b.max) ?? BLOCKS[BLOCKS.length - 1];
}

export function blockForLevel(levelInStage) {
  return blockDefForLevel(levelInStage).name;
}

export function paramsForLevel(levelInStage) {
  const b = blockDefForLevel(levelInStage);
  const parTime = b.timeLimit ? Math.round(b.timeLimit * 0.6) : b.pairs * 6;
  return {
    block: b.name,
    grid: { ...b.grid },
    pairs: b.pairs,
    timeLimit: b.timeLimit,
    flipMemoryMs: b.flipMemoryMs,
    parTime,
  };
}
