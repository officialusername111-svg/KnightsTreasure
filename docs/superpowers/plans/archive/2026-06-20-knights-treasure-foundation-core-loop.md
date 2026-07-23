> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Knight's Treasure — Foundation & Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the greenfield Capacitor project and a fully playable Stage 1 core loop — flip/match tiles across the 25-level difficulty curve, win/lose, star rating, with progress saved durably across an app kill.

**Architecture:** Vanilla JS ES modules in a `www/` tree. Pure-logic modules (`eventBus`, `difficulty`, `levels`, `scoring`, `match` board model, `save` with a swappable storage adapter, `state`) are framework-free and unit-tested in Node with Vitest. A thin DOM layer (`sceneManager`, `game` scene, `hud`) renders the board model. Persistence uses a storage adapter: an in-memory adapter in tests, a Capacitor Preferences adapter in the app.

**Tech Stack:** HTML5/CSS3, vanilla JS (ES modules, `"type":"module"`), Capacitor (Android), `@capacitor/preferences`, Vitest (dev, unit tests). No frontend framework. No runtime dependencies beyond Capacitor.

## Global Constraints

- Package name: `com.silentstroke.knightstreasure2` (exact).
- All UI text routed through string constants (no hardcoded English in DOM logic) so localization is later a data task — for this plan a single `config.js` `TEXT` map suffices.
- ES modules only; `package.json` has `"type": "module"`.
- Pure-logic modules must not import DOM, `window`, or Capacitor — they take dependencies (rng, storage adapter, clock) as parameters so they run in Node.
- Save schema carries `saveVersion` and loads through ordered migrations; never throw on an unknown/old save — migrate or default.
- Difficulty is derived from the GDD block pattern in `difficulty.js` — it is the single source of truth; no other module hardcodes grid/timer/flip values.
- GDD Stage 1 block pattern (per 25-level stage, level-in-stage 1..25):
  - Warm Up (1–5): grid 4×3, 6 pairs, no timer, flip 1500ms
  - Building (6–10): grid 4×3, 6 pairs, 120s, flip 1200ms
  - Midpoint (11–15): grid 4×4, 8 pairs, 90s, flip 1000ms
  - Pressure (16–20): grid 4×4, 8 pairs, 60s, flip 800ms
  - Gauntlet (21–24): grid 6×4, 12 pairs, 45s, flip 700ms
  - Boss (25): grid 6×4, 12 pairs, 90s, flip 600ms
- Tap targets ≥ 44px; board scrollable; portrait-first.

---

## File Structure

```
package.json · vitest.config.js · capacitor.config.json · .gitignore
www/
├── index.html                         shell: mounts #app, imports main.js
├── css/main.css                       base layout + tile/board/HUD styles
└── js/
    ├── core/
    │   ├── eventBus.js                pub/sub (pure)
    │   ├── state.js                   GameState factory + mutations (pure)
    │   └── save.js                    serialize/migrate/persist via adapter (pure)
    ├── data/
    │   ├── config.js                  constants, SAVE_KEY, ICON_POOL, TEXT
    │   ├── difficulty.js              block pattern → level params (pure)
    │   └── levels.js                  generate Stage 1 level list (pure)
    ├── systems/
    │   ├── scoring.js                 stars + leaderboard score (pure)
    │   └── match.js                   board model: buildDeck, tapTile, resolveMismatch (pure)
    ├── platform/
    │   └── preferencesAdapter.js      Capacitor Preferences storage adapter (browser/native)
    ├── ui/
    │   ├── sceneManager.js            scene router (DOM)
    │   ├── hud.js                     HUD render/update (DOM)
    │   └── game.js                    game scene: renders match model, timer, overlays (DOM)
    └── main.js                        bootstrap: load save → mount game scene
tests/
    ├── eventBus.test.js · difficulty.test.js · levels.test.js
    ├── scoring.test.js · match.test.js · save.test.js · state.test.js
    └── helpers/memoryAdapter.js       in-memory storage adapter for tests
```

---

### Task 0: Project scaffold & test harness

**Files:**
- Create: `package.json`, `vitest.config.js`, `.gitignore`
- Create: `tests/helpers/memoryAdapter.js`

**Interfaces:**
- Produces: `npm test` runs Vitest. `StorageAdapter` shape: `{ async get(key): string|null, async set(key, value): void }`. `createMemoryAdapter()` returns one backed by a `Map`.

- [ ] **Step 1: Initialize git and Node project**

Run:
```bash
cd /d/Workspace/KnightTreasure && git init && npm init -y
```
Expected: `package.json` created, empty git repo initialized.

- [ ] **Step 2: Set package.json fields**

Replace `package.json` with:
```json
{
  "name": "knights-treasure",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Install Vitest**

Run:
```bash
cd /d/Workspace/KnightTreasure && npm install
```
Expected: `node_modules/` populated, `vitest` available.

- [ ] **Step 4: Add vitest.config.js**

Create `vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 5: Add .gitignore**

Create `.gitignore`:
```
node_modules/
android/
.DS_Store
dist/
*.log
```

- [ ] **Step 6: Add in-memory storage adapter for tests**

Create `tests/helpers/memoryAdapter.js`:
```js
export function createMemoryAdapter(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}
```

- [ ] **Step 7: Verify harness runs**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx vitest run
```
Expected: Vitest runs and reports "No test files found" (exit 0) — harness works.

- [ ] **Step 8: Commit**

```bash
git add package.json vitest.config.js .gitignore tests/helpers/memoryAdapter.js
git commit -m "chore: scaffold Node project + Vitest harness"
```

---

### Task 1: Event bus

**Files:**
- Create: `www/js/core/eventBus.js`
- Test: `tests/eventBus.test.js`

**Interfaces:**
- Produces: `createEventBus()` → `{ on(type, fn): unsubscribe, emit(type, payload): void, off(type, fn): void }`. Multiple handlers per type; `emit` calls them in registration order; unsubscribe via returned function or `off`.

- [ ] **Step 1: Write the failing test**

Create `tests/eventBus.test.js`:
```js
import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../www/js/core/eventBus.js';

describe('eventBus', () => {
  it('calls subscribed handlers with payload', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.on('match', fn);
    bus.emit('match', { pair: 'A' });
    expect(fn).toHaveBeenCalledWith({ pair: 'A' });
  });

  it('unsubscribes via returned function', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const off = bus.on('x', fn);
    off();
    bus.emit('x', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('supports multiple handlers in order', () => {
    const bus = createEventBus();
    const calls = [];
    bus.on('e', () => calls.push(1));
    bus.on('e', () => calls.push(2));
    bus.emit('e');
    expect(calls).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eventBus.test.js`
Expected: FAIL — cannot resolve `../www/js/core/eventBus.js`.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/core/eventBus.js`:
```js
export function createEventBus() {
  const handlers = new Map(); // type -> Set<fn>

  function on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
  }

  function off(type, fn) {
    handlers.get(type)?.delete(fn);
  }

  function emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  return { on, off, emit };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/eventBus.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/core/eventBus.js tests/eventBus.test.js
git commit -m "feat: pub/sub event bus"
```

---

### Task 2: Difficulty engine (single source of truth)

**Files:**
- Create: `www/js/data/difficulty.js`
- Test: `tests/difficulty.test.js`

**Interfaces:**
- Produces:
  - `blockForLevel(levelInStage: 1..25): string` → one of `'warmup'|'building'|'midpoint'|'pressure'|'gauntlet'|'boss'`.
  - `paramsForLevel(levelInStage: 1..25): { block, grid: {cols, rows}, pairs, timeLimit: number|null, flipMemoryMs, parTime }`. `parTime` = `timeLimit ? Math.round(timeLimit * 0.6) : pairs * 6`.

- [ ] **Step 1: Write the failing test**

Create `tests/difficulty.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { blockForLevel, paramsForLevel } from '../www/js/data/difficulty.js';

describe('difficulty', () => {
  it('maps levels to blocks', () => {
    expect(blockForLevel(1)).toBe('warmup');
    expect(blockForLevel(5)).toBe('warmup');
    expect(blockForLevel(6)).toBe('building');
    expect(blockForLevel(11)).toBe('midpoint');
    expect(blockForLevel(16)).toBe('pressure');
    expect(blockForLevel(21)).toBe('gauntlet');
    expect(blockForLevel(24)).toBe('gauntlet');
    expect(blockForLevel(25)).toBe('boss');
  });

  it('warmup has no timer, 6 pairs, 4x3, 1500ms flip', () => {
    const p = paramsForLevel(3);
    expect(p.grid).toEqual({ cols: 4, rows: 3 });
    expect(p.pairs).toBe(6);
    expect(p.timeLimit).toBeNull();
    expect(p.flipMemoryMs).toBe(1500);
    expect(p.parTime).toBe(36); // 6 pairs * 6s
  });

  it('pressure block: 4x4, 8 pairs, 60s, 800ms, par 36', () => {
    const p = paramsForLevel(18);
    expect(p.grid).toEqual({ cols: 4, rows: 4 });
    expect(p.pairs).toBe(8);
    expect(p.timeLimit).toBe(60);
    expect(p.flipMemoryMs).toBe(800);
    expect(p.parTime).toBe(36); // 60 * 0.6
  });

  it('boss: 6x4, 12 pairs, 90s, 600ms', () => {
    const p = paramsForLevel(25);
    expect(p.grid).toEqual({ cols: 6, rows: 4 });
    expect(p.pairs).toBe(12);
    expect(p.timeLimit).toBe(90);
    expect(p.flipMemoryMs).toBe(600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/difficulty.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/data/difficulty.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/difficulty.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/data/difficulty.js tests/difficulty.test.js
git commit -m "feat: difficulty block engine"
```

---

### Task 3: Config constants + Stage 1 level generator

**Files:**
- Create: `www/js/data/config.js`
- Create: `www/js/data/levels.js`
- Test: `tests/levels.test.js`

**Interfaces:**
- `config.js` produces: `SAVE_KEY = 'kt_save'`, `SAVE_VERSION = 1`, `ICON_POOL` (array of ≥12 emoji strings), `STAGE1 = { id: 1, name: 'The Forest Path', theme: 'forest' }`, `TEXT` (object of UI strings).
- `levels.js` produces: `generateStage(stageId: number): Array<{ id: string, stage, levelInStage, ...paramsForLevel }>` where `id` is `"{stage}-{levelInStage}"`. `getLevel(stageId, levelInStage)` returns one config or `null`.

- [ ] **Step 1: Write the failing test**

Create `tests/levels.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { generateStage, getLevel } from '../www/js/data/levels.js';

describe('levels', () => {
  it('generates 25 levels for stage 1', () => {
    const levels = generateStage(1);
    expect(levels).toHaveLength(25);
    expect(levels[0].id).toBe('1-1');
    expect(levels[24].id).toBe('1-25');
  });

  it('each level carries difficulty params', () => {
    const lvl = getLevel(1, 18);
    expect(lvl.stage).toBe(1);
    expect(lvl.levelInStage).toBe(18);
    expect(lvl.pairs).toBe(8);
    expect(lvl.timeLimit).toBe(60);
    expect(lvl.block).toBe('pressure');
  });

  it('returns null for out-of-range level', () => {
    expect(getLevel(1, 26)).toBeNull();
    expect(getLevel(1, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/levels.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write config.js**

Create `www/js/data/config.js`:
```js
export const SAVE_KEY = 'kt_save';
export const SAVE_VERSION = 1;

export const STAGE1 = { id: 1, name: 'The Forest Path', theme: 'forest' };

// Unicode 6-9 emoji — guaranteed glyph coverage. ≥12 for the largest grid (12 pairs).
export const ICON_POOL = [
  '🐶','🐱','🦊','🐯','🦁','🐸','🐵','🐰','🐻','🐼',
  '🦄','🐲','🍎','🍊','🍋','🍇','🍓','🍔','🍩','🧁',
  '⚔️','🛡️','🏹','👑','💎','🔮','🗝️','🕯️','🎲','🎯',
];

export const TEXT = {
  appTitle: "Knight's Treasure",
  stageLabel: 'Stage',
  levelLabel: 'Level',
  timeLabel: 'Time',
  win: 'Level Cleared!',
  lose: "Time's Up!",
  retry: 'Try Again',
  next: 'Next Level',
  noTimer: '∞',
};
```

- [ ] **Step 4: Write levels.js**

Create `www/js/data/levels.js`:
```js
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/levels.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add www/js/data/config.js www/js/data/levels.js tests/levels.test.js
git commit -m "feat: config constants + stage 1 level generator"
```

---

### Task 4: Scoring (stars + leaderboard score)

**Files:**
- Create: `www/js/systems/scoring.js`
- Test: `tests/scoring.test.js`

**Interfaces:**
- Produces:
  - `computeStars({ mistakes, pairs, timeUsed, parTime }): 1|2|3`. Rules: start at 3; `mistakes/pairs > 0.34` → −1; `mistakes/pairs > 1.0` → −1; `parTime > 0 && timeUsed > parTime` → −1; clamp to [1,3].
  - `computeScore({ matches, timeRemaining, comboBonus, mistakes }): number` = `matches*100 + timeRemaining*10 + comboBonus - mistakes*50` (never below 0).

- [ ] **Step 1: Write the failing test**

Create `tests/scoring.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { computeStars, computeScore } from '../www/js/systems/scoring.js';

describe('computeStars', () => {
  it('3 stars: no mistakes, under par', () => {
    expect(computeStars({ mistakes: 0, pairs: 8, timeUsed: 20, parTime: 36 })).toBe(3);
  });
  it('2 stars: some mistakes', () => {
    expect(computeStars({ mistakes: 4, pairs: 8, timeUsed: 20, parTime: 36 })).toBe(2);
  });
  it('1 star: many mistakes and slow', () => {
    expect(computeStars({ mistakes: 10, pairs: 8, timeUsed: 50, parTime: 36 })).toBe(1);
  });
  it('untimed (parTime>0, timeUsed under par) still rates on mistakes', () => {
    expect(computeStars({ mistakes: 0, pairs: 6, timeUsed: 10, parTime: 36 })).toBe(3);
  });
  it('never below 1', () => {
    expect(computeStars({ mistakes: 99, pairs: 6, timeUsed: 999, parTime: 36 })).toBe(1);
  });
});

describe('computeScore', () => {
  it('applies the GDD formula', () => {
    expect(computeScore({ matches: 8, timeRemaining: 30, comboBonus: 15, mistakes: 2 }))
      .toBe(8 * 100 + 30 * 10 + 15 - 2 * 50); // 1015
  });
  it('clamps at zero', () => {
    expect(computeScore({ matches: 0, timeRemaining: 0, comboBonus: 0, mistakes: 5 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scoring.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/systems/scoring.js`:
```js
export function computeStars({ mistakes, pairs, timeUsed, parTime }) {
  let stars = 3;
  const rate = pairs > 0 ? mistakes / pairs : 0;
  if (rate > 0.34) stars -= 1;
  if (rate > 1.0) stars -= 1;
  if (parTime > 0 && timeUsed > parTime) stars -= 1;
  return Math.max(1, Math.min(3, stars));
}

export function computeScore({ matches, timeRemaining, comboBonus, mistakes }) {
  const raw = matches * 100 + timeRemaining * 10 + comboBonus - mistakes * 50;
  return Math.max(0, raw);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scoring.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/systems/scoring.js tests/scoring.test.js
git commit -m "feat: star rating + leaderboard score"
```

---

### Task 5: Match board model

**Files:**
- Create: `www/js/systems/match.js`
- Test: `tests/match.test.js`

**Interfaces:**
- Produces:
  - `buildDeck({ pairs, iconPool, shuffle }): Array<{ index, icon, faceUp, matched }>` — `2*pairs` tiles, each icon appearing twice, order produced by injected `shuffle(array): array`.
  - `createMatchState({ pairs, iconPool, shuffle }): { tiles, firstPick: number|null, locked: boolean, matchedPairs, totalPairs, mistakes }`.
  - `tapTile(state, index): { state, result }` where `result ∈ 'flip'|'match'|'mismatch'|'win'|'ignored'`. Pure: returns a new state object, does not mutate input.
  - `resolveMismatch(state): state` — flips the two non-matched face-up tiles back down, clears `firstPick`, unlocks.

- [ ] **Step 1: Write the failing test**

Create `tests/match.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { buildDeck, createMatchState, tapTile, resolveMismatch } from '../www/js/systems/match.js';

const identity = (a) => a; // deterministic "shuffle"

describe('buildDeck', () => {
  it('creates 2*pairs tiles with each icon twice', () => {
    const deck = buildDeck({ pairs: 3, iconPool: ['A', 'B', 'C', 'D'], shuffle: identity });
    expect(deck).toHaveLength(6);
    const counts = {};
    deck.forEach((t) => (counts[t.icon] = (counts[t.icon] || 0) + 1));
    expect(Object.values(counts).every((c) => c === 2)).toBe(true);
    expect(deck.every((t) => !t.faceUp && !t.matched)).toBe(true);
  });
});

describe('tapTile', () => {
  function setup() {
    // identity shuffle → deck order: [A,A,B,B] (icons sorted, paired, then doubled)
    return createMatchState({ pairs: 2, iconPool: ['A', 'B'], shuffle: identity });
  }

  it('first tap flips', () => {
    const { state, result } = tapTile(setup(), 0);
    expect(result).toBe('flip');
    expect(state.tiles[0].faceUp).toBe(true);
    expect(state.firstPick).toBe(0);
  });

  it('matching second tap → match, increments matchedPairs', () => {
    let s = setup();
    s = tapTile(s, 0).state;            // A
    const r = tapTile(s, 1);            // A (index 1 is the other A)
    expect(r.result).toBe('match');
    expect(r.state.tiles[0].matched).toBe(true);
    expect(r.state.tiles[1].matched).toBe(true);
    expect(r.state.matchedPairs).toBe(1);
    expect(r.state.firstPick).toBeNull();
  });

  it('non-matching second tap → mismatch, locks, counts mistake', () => {
    let s = setup();
    s = tapTile(s, 0).state;            // A
    const r = tapTile(s, 2);            // B
    expect(r.result).toBe('mismatch');
    expect(r.state.locked).toBe(true);
    expect(r.state.mistakes).toBe(1);
  });

  it('resolveMismatch flips the two back down and unlocks', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    s = tapTile(s, 2).state;           // mismatch, locked
    s = resolveMismatch(s);
    expect(s.tiles[0].faceUp).toBe(false);
    expect(s.tiles[2].faceUp).toBe(false);
    expect(s.locked).toBe(false);
    expect(s.firstPick).toBeNull();
  });

  it('ignores taps on matched/locked/same tile', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    expect(tapTile(s, 0).result).toBe('ignored');   // same tile
    s = tapTile(s, 2).state;                          // locked now
    expect(tapTile(s, 3).result).toBe('ignored');     // locked
  });

  it('matching the final pair → win', () => {
    let s = setup();
    s = tapTile(s, 0).state;
    s = tapTile(s, 1).state;           // first pair matched
    s = tapTile(s, 2).state;
    const r = tapTile(s, 3);           // last pair
    expect(r.result).toBe('win');
    expect(r.state.matchedPairs).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/match.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/systems/match.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/match.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/systems/match.js tests/match.test.js
git commit -m "feat: pure memory-match board model"
```

---

### Task 6: Save system with adapter + migration

**Files:**
- Create: `www/js/core/save.js`
- Test: `tests/save.test.js`

**Interfaces:**
- Consumes: a `StorageAdapter` `{ async get(key), async set(key, value) }` (memory adapter in tests, Preferences adapter in app), and `SAVE_KEY`/`SAVE_VERSION` from `config.js`.
- Produces:
  - `defaultSave(): object` → `{ saveVersion, currentStage: 1, currentLevel: 1, completedLevels: [], stars: {}, displayName: '' }`.
  - `async loadSave(adapter): object` — reads, parses, runs `migrate`, returns a save (never throws; returns `defaultSave()` on missing/corrupt).
  - `async persistSave(adapter, save): void` — stamps `saveVersion` and writes JSON.
  - `migrate(raw): object` — upgrades older shapes to current version.

- [ ] **Step 1: Write the failing test**

Create `tests/save.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createMemoryAdapter } from './helpers/memoryAdapter.js';
import { defaultSave, loadSave, persistSave, migrate } from '../www/js/core/save.js';
import { SAVE_KEY, SAVE_VERSION } from '../www/js/data/config.js';

describe('save', () => {
  it('returns default save when storage empty', async () => {
    const save = await loadSave(createMemoryAdapter());
    expect(save).toEqual(defaultSave());
    expect(save.saveVersion).toBe(SAVE_VERSION);
  });

  it('round-trips a save', async () => {
    const adapter = createMemoryAdapter();
    const save = defaultSave();
    save.currentLevel = 7;
    save.completedLevels = ['1-1', '1-2'];
    save.stars = { '1-1': 3 };
    await persistSave(adapter, save);
    const loaded = await loadSave(adapter);
    expect(loaded.currentLevel).toBe(7);
    expect(loaded.completedLevels).toEqual(['1-1', '1-2']);
    expect(loaded.stars['1-1']).toBe(3);
  });

  it('returns default on corrupt JSON', async () => {
    const adapter = createMemoryAdapter({ [SAVE_KEY]: 'not-json{' });
    const save = await loadSave(adapter);
    expect(save).toEqual(defaultSave());
  });

  it('migrate fills missing fields from an older save', () => {
    const migrated = migrate({ saveVersion: 0, currentLevel: 4 });
    expect(migrated.saveVersion).toBe(SAVE_VERSION);
    expect(migrated.currentLevel).toBe(4);
    expect(migrated.currentStage).toBe(1);
    expect(Array.isArray(migrated.completedLevels)).toBe(true);
    expect(migrated.stars).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/save.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/core/save.js`:
```js
import { SAVE_KEY, SAVE_VERSION } from '../data/config.js';

export function defaultSave() {
  return {
    saveVersion: SAVE_VERSION,
    currentStage: 1,
    currentLevel: 1,
    completedLevels: [],
    stars: {},
    displayName: '',
  };
}

// Upgrade any older/partial save to the current schema. Add ordered steps as
// the schema grows; each step only fills what its version introduced.
export function migrate(raw) {
  const base = defaultSave();
  const merged = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) };
  merged.saveVersion = SAVE_VERSION;
  // defensive coercions
  if (!Array.isArray(merged.completedLevels)) merged.completedLevels = [];
  if (!merged.stars || typeof merged.stars !== 'object') merged.stars = {};
  return merged;
}

export async function loadSave(adapter) {
  try {
    const raw = await adapter.get(SAVE_KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export async function persistSave(adapter, save) {
  const out = { ...save, saveVersion: SAVE_VERSION };
  await adapter.set(SAVE_KEY, JSON.stringify(out));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/save.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/core/save.js tests/save.test.js
git commit -m "feat: save system with storage adapter + migration"
```

---

### Task 7: GameState (runtime state + level transitions)

**Files:**
- Create: `www/js/core/state.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Consumes: `save` shape from Task 6, `getLevel` from `levels.js`.
- Produces:
  - `createGameState(save): { save, current: levelConfig|null }` — `current` set to `getLevel(save.currentStage, save.currentLevel)`.
  - `recordLevelResult(gs, { stars }): gs` — pure: marks `current.id` completed (dedup), stores max stars, advances `currentLevel` (capped at 25 for this plan), updates `current`. Returns a new state.

- [ ] **Step 1: Write the failing test**

Create `tests/state.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createGameState, recordLevelResult } from '../www/js/core/state.js';
import { defaultSave } from '../www/js/core/save.js';

describe('GameState', () => {
  it('selects the current level from the save', () => {
    const gs = createGameState(defaultSave());
    expect(gs.current.id).toBe('1-1');
  });

  it('records result, stores stars, advances level', () => {
    let gs = createGameState(defaultSave());
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.completedLevels).toContain('1-1');
    expect(gs.save.stars['1-1']).toBe(3);
    expect(gs.save.currentLevel).toBe(2);
    expect(gs.current.id).toBe('1-2');
  });

  it('keeps the best star score on replay', () => {
    let gs = createGameState({ ...defaultSave(), currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 1 });
    // replay 1-1 by resetting pointer
    gs = createGameState({ ...gs.save, currentLevel: 1 });
    gs = recordLevelResult(gs, { stars: 3 });
    expect(gs.save.stars['1-1']).toBe(3);
  });

  it('does not advance past level 25', () => {
    let gs = createGameState({ ...defaultSave(), currentLevel: 25 });
    gs = recordLevelResult(gs, { stars: 2 });
    expect(gs.save.currentLevel).toBe(25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/state.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/core/state.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/state.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS — all suites green (eventBus, difficulty, levels, scoring, match, save, state).

- [ ] **Step 6: Commit**

```bash
git add www/js/core/state.js tests/state.test.js
git commit -m "feat: runtime GameState + level progression"
```

---

### Task 8: Capacitor app shell + Preferences adapter + device build

**Files:**
- Create: `www/index.html`, `www/css/main.css`
- Create: `www/js/platform/preferencesAdapter.js`
- Create: `capacitor.config.json` (generated, then edited)
- Modify: `package.json` (add Capacitor deps/scripts)

**Interfaces:**
- Produces: `createPreferencesAdapter()` → a `StorageAdapter` backed by `@capacitor/preferences` (`Preferences.get/set`). Falls back to `window.localStorage` when Capacitor is absent (browser dev).
- A loadable app: `index.html` imports `js/main.js` as a module and renders into `#app`.

> This task has no unit test (it's the native/DOM shell); it is gated by an on-device launch in Step 8.

- [ ] **Step 1: Install Capacitor**

Run:
```bash
cd /d/Workspace/KnightTreasure && npm install @capacitor/core @capacitor/preferences && npm install -D @capacitor/cli @capacitor/android
```
Expected: packages installed.

- [ ] **Step 2: Initialize Capacitor**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx cap init "Knights Treasure" com.silentstroke.knightstreasure2 --web-dir=www
```
Expected: `capacitor.config.json` created with `webDir: "www"`.

- [ ] **Step 3: Create the Preferences adapter**

Create `www/js/platform/preferencesAdapter.js`:
```js
import { Preferences } from '@capacitor/preferences';

// Storage adapter matching { get, set } used by save.js.
// Uses native Preferences when available; falls back to localStorage in a plain browser.
export function createPreferencesAdapter() {
  const hasNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  if (!hasNative && typeof localStorage !== 'undefined') {
    return {
      async get(key) {
        return localStorage.getItem(key);
      },
      async set(key, value) {
        localStorage.setItem(key, value);
      },
    };
  }
  return {
    async get(key) {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    },
    async set(key, value) {
      await Preferences.set({ key, value });
    },
  };
}
```

- [ ] **Step 4: Create index.html shell**

Create `www/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Knight's Treasure</title>
  <link rel="stylesheet" href="css/main.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create base styles**

Create `www/css/main.css`:
```css
:root { --gold:#c9922a; --gold-lt:#f0c46a; --ember:#e8550a; --parch:#f5ead0; --dark:#0d0a15; }
* , *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html, body { width:100%; height:100%; background:var(--dark); color:var(--parch); font-family:Georgia, serif; overflow:hidden; }
#app { width:100vw; height:100dvh; position:relative; display:flex; flex-direction:column; }

#kt-hud { flex:0 0 auto; display:flex; justify-content:space-between; align-items:center;
  padding:10px 14px; background:rgba(6,4,0,.95); border-bottom:1px solid rgba(107,76,26,.4); }
.kt-hud-item { display:flex; flex-direction:column; align-items:center; min-width:48px; }
.kt-hud-label { font-size:9px; letter-spacing:1px; color:#a07832; text-transform:uppercase; }
.kt-hud-value { font-size:16px; font-weight:700; color:#f5c842; }
#kt-timer-val.danger { color:#e05030; }

#kt-board-wrap { flex:1; overflow:auto; -webkit-overflow-scrolling:touch; display:flex;
  align-items:center; justify-content:center; padding:8px; }
#kt-board { display:grid; gap:8px; }

.kt-tile { width:64px; height:64px; min-width:44px; min-height:44px; perspective:600px;
  cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
.kt-tile-inner { width:100%; height:100%; position:relative; transform-style:preserve-3d;
  transition:transform .18s ease; }
.kt-tile.faceup .kt-tile-inner, .kt-tile.matched .kt-tile-inner { transform:rotateY(180deg); }
.kt-face { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  border-radius:8px; backface-visibility:hidden; font-size:30px; }
.kt-back { background:#1e1200; border:2px solid #6b4c1a; }
.kt-front { background:#2e1e00; border:2px solid #c09030; transform:rotateY(180deg); }
.kt-tile.matched .kt-front { border-color:#60b040; box-shadow:0 0 8px rgba(64,128,16,.4); }
.kt-tile.wrong .kt-tile-inner { animation:kt-shake .35s ease; }
@keyframes kt-shake { 0%,100%{transform:rotateY(180deg) translateX(0);} 25%{transform:rotateY(180deg) translateX(-5px);} 75%{transform:rotateY(180deg) translateX(5px);} }

#kt-overlay { position:absolute; inset:0; display:none; flex-direction:column; gap:16px;
  align-items:center; justify-content:center; background:rgba(6,4,0,.93); text-align:center; padding:24px; z-index:20; }
#kt-overlay.show { display:flex; }
#kt-overlay-title { font-size:28px; color:#f5c842; }
#kt-overlay-stars { font-size:28px; letter-spacing:4px; }
.kt-btn { font-size:16px; font-weight:700; color:#2a1000; background:linear-gradient(180deg,#f0c050,#a06000);
  border:none; border-radius:8px; padding:14px 28px; min-height:44px; cursor:pointer; }
```

- [ ] **Step 6: Add Android platform**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx cap add android
```
Expected: `android/` project created.

> Note: `main.js` and the game scene are built in Task 9. Complete Task 9 before the device launch in Step 8 below — or temporarily verify the shell in a browser first.

- [ ] **Step 7: Commit shell**

```bash
git add www/index.html www/css/main.css www/js/platform/preferencesAdapter.js capacitor.config.json package.json package-lock.json
git commit -m "feat: capacitor shell + preferences adapter + base styles"
```

- [ ] **Step 8: (Deferred to after Task 9) Build & launch on device**

After Task 9 is done, run:
```bash
cd /d/Workspace/KnightTreasure && npx cap sync android && npx cap run android
```
Expected: app installs on the connected Redmi Note 9 Pro and launches to Stage 1, Level 1.

---

### Task 9: Game scene + HUD + bootstrap (playable loop)

**Files:**
- Create: `www/js/ui/sceneManager.js`, `www/js/ui/hud.js`, `www/js/ui/game.js`, `www/js/main.js`

**Interfaces:**
- Consumes: `createMatchState`, `tapTile`, `resolveMismatch` (match.js); `computeStars` (scoring.js); `createGameState`, `recordLevelResult` (state.js); `loadSave`, `persistSave` (save.js); `createPreferencesAdapter`; `createEventBus`; `ICON_POOL`, `TEXT` (config.js).
- Produces:
  - `createSceneManager(root)` → `{ mount(sceneEl), }` — clears `root` and mounts one scene element.
  - `renderHud({ stage, level, timeLimit })` → an HUD element with a `setTime(seconds)` method on it.
  - `createGameScene({ gameState, adapter, bus, onAdvance })` → a scene element that plays `gameState.current`, runs the timer, handles taps, shows win/lose overlay, persists on win, and calls `onAdvance(newGameState)`.

> UI/integration task. Gated by an on-device play-through (Task 8 Step 8) plus a manual browser smoke check in Step 4.

- [ ] **Step 1: Create the scene manager**

Create `www/js/ui/sceneManager.js`:
```js
export function createSceneManager(root) {
  return {
    mount(sceneEl) {
      root.replaceChildren(sceneEl);
    },
  };
}
```

- [ ] **Step 2: Create the HUD**

Create `www/js/ui/hud.js`:
```js
import { TEXT } from '../data/config.js';

export function renderHud({ stage, level, timeLimit }) {
  const el = document.createElement('div');
  el.id = 'kt-hud';
  el.innerHTML = `
    <div class="kt-hud-item">
      <span class="kt-hud-label">${TEXT.stageLabel}</span>
      <span class="kt-hud-value">${stage}</span>
    </div>
    <div class="kt-hud-item">
      <span class="kt-hud-label">${TEXT.levelLabel}</span>
      <span class="kt-hud-value">${level}</span>
    </div>
    <div class="kt-hud-item">
      <span class="kt-hud-label">${TEXT.timeLabel}</span>
      <span class="kt-hud-value" id="kt-timer-val">${timeLimit ?? TEXT.noTimer}</span>
    </div>`;
  el.setTime = (seconds) => {
    const v = el.querySelector('#kt-timer-val');
    v.textContent = seconds == null ? TEXT.noTimer : seconds;
    v.classList.toggle('danger', seconds != null && seconds <= 10);
  };
  return el;
}
```

- [ ] **Step 3: Create the game scene**

Create `www/js/ui/game.js`:
```js
import { createMatchState, tapTile, resolveMismatch } from '../systems/match.js';
import { computeStars } from '../systems/scoring.js';
import { recordLevelResult } from '../core/state.js';
import { persistSave } from '../core/save.js';
import { ICON_POOL, TEXT } from '../data/config.js';
import { renderHud } from './hud.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameScene({ gameState, adapter, bus, onAdvance }) {
  const level = gameState.current;
  let match = createMatchState({ pairs: level.pairs, iconPool: shuffle(ICON_POOL), shuffle });
  let timeLeft = level.timeLimit;
  let elapsed = 0;
  let timerId = null;
  let finished = false;

  const scene = document.createElement('div');
  scene.style.cssText = 'display:flex;flex-direction:column;flex:1;height:100%;';

  const hud = renderHud({ stage: level.stage, level: level.levelInStage, timeLimit: level.timeLimit });
  const boardWrap = document.createElement('div');
  boardWrap.id = 'kt-board-wrap';
  const board = document.createElement('div');
  board.id = 'kt-board';
  board.style.gridTemplateColumns = `repeat(${level.grid.cols}, 1fr)`;
  boardWrap.appendChild(board);

  const overlay = document.createElement('div');
  overlay.id = 'kt-overlay';
  scene.append(hud, boardWrap, overlay);

  function renderBoard() {
    board.replaceChildren(
      ...match.tiles.map((tile) => {
        const t = document.createElement('div');
        t.className = 'kt-tile' + (tile.matched ? ' matched' : tile.faceUp ? ' faceup' : '');
        t.dataset.index = tile.index;
        t.innerHTML = `<div class="kt-tile-inner">
            <div class="kt-face kt-back">⚔️</div>
            <div class="kt-face kt-front">${tile.icon}</div>
          </div>`;
        t.addEventListener('click', () => onTap(tile.index, t));
        return t;
      })
    );
  }

  function onTap(index) {
    if (finished) return;
    const { state, result } = tapTile(match, index);
    match = state;
    if (result === 'ignored') return;
    bus.emit('tile:' + result, { index });
    renderBoard();

    if (result === 'mismatch') {
      const el = board.querySelector(`[data-index="${index}"]`);
      el?.classList.add('wrong');
      setTimeout(() => {
        match = resolveMismatch(match);
        renderBoard();
      }, level.flipMemoryMs);
    } else if (result === 'win') {
      win();
    }
  }

  function win() {
    finished = true;
    stopTimer();
    const stars = computeStars({
      mistakes: match.mistakes,
      pairs: match.totalPairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
    const advanced = recordLevelResult(gameState, { stars });
    persistSave(adapter, advanced.save);
    showOverlay(TEXT.win, '⭐'.repeat(stars), TEXT.next, () => onAdvance(advanced));
  }

  function lose() {
    finished = true;
    stopTimer();
    showOverlay(TEXT.lose, '', TEXT.retry, () => onAdvance(gameState));
  }

  function showOverlay(title, stars, btnLabel, onClick) {
    overlay.innerHTML = `
      <div id="kt-overlay-title">${title}</div>
      <div id="kt-overlay-stars">${stars}</div>`;
    const btn = document.createElement('button');
    btn.className = 'kt-btn';
    btn.textContent = btnLabel;
    btn.addEventListener('click', onClick);
    overlay.appendChild(btn);
    overlay.classList.add('show');
  }

  function startTimer() {
    if (level.timeLimit == null) {
      const tick = () => { elapsed += 1; };
      timerId = setInterval(tick, 1000);
      return;
    }
    hud.setTime(timeLeft);
    timerId = setInterval(() => {
      timeLeft -= 1;
      elapsed += 1;
      hud.setTime(timeLeft);
      if (timeLeft <= 0) lose();
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  renderBoard();
  startTimer();
  return scene;
}
```

- [ ] **Step 4: Create the bootstrap**

Create `www/js/main.js`:
```js
import { createPreferencesAdapter } from './platform/preferencesAdapter.js';
import { loadSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';

async function boot() {
  const adapter = createPreferencesAdapter();
  const bus = createEventBus();
  const scenes = createSceneManager(document.getElementById('app'));

  let gameState = createGameState(await loadSave(adapter));

  function showGame(gs) {
    gameState = gs;
    scenes.mount(createGameScene({
      gameState,
      adapter,
      bus,
      onAdvance: showGame,
    }));
  }

  showGame(gameState);
}

boot();
```

- [ ] **Step 5: Browser smoke check**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx cap sync android
```
Then serve and open in a browser:
```bash
cd /d/Workspace/KnightTreasure && npx serve www
```
Open the printed URL. Expected: HUD shows Stage 1 / Level 1 / time ∞; tapping two tiles flips them; a match stays up; a mismatch shakes and flips back after ~1.5s; clearing all pairs shows "Level Cleared!" with stars and a Next button that loads Level 2. Reload the page — you remain on the level you advanced to (localStorage in browser).

- [ ] **Step 6: Commit**

```bash
git add www/js/ui www/js/main.js
git commit -m "feat: playable game scene + HUD + bootstrap"
```

- [ ] **Step 7: On-device acceptance (Task 8 Step 8)**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx cap sync android && npx cap run android
```
On the Redmi Note 9 Pro verify:
- App launches to Stage 1, Level 1.
- Play through several levels; timer appears from Level 6 (Building block) and counts down; running out of time shows "Time's Up!" + Try Again.
- Win shows stars; Next advances.
- Force-kill the app (swipe from recents), relaunch → you resume on the level you reached (save persisted via Preferences).
- Tiles are tappable with no mis-taps; board scrolls on the 6×4 levels; no visible jank.

- [ ] **Step 8: Commit any device-fix tweaks**

```bash
git add -A
git commit -m "fix: on-device polish for stage 1 core loop"
```

---

## Self-Review

**Spec coverage (vs. plan §"Phase 0" + Phase 1 core of the design doc):**
- Multi-file `www/` structure → Tasks 8–9 ✓
- Capacitor init + device build → Task 8 ✓
- `state.js`/`eventBus.js`/`sceneManager.js`/`save.js`/`config.js` foundation → Tasks 1, 6, 7, 8, 9 ✓
- Durable save (Preferences, not raw localStorage) + migration → Tasks 6, 8 ✓
- Externalized strings (`TEXT`) → Task 3 ✓
- Core match engine (4×3/4×4/6×4, flip-memory, win/lose, retry) → Tasks 5, 9 ✓
- Difficulty engine from block pattern (single source) → Task 2 ✓
- Star rating that works with no timer → Task 4 ✓
- Leaderboard score formula (pure, for later use) → Task 4 ✓
- **Deferred to later plans (out of scope here, by design):** economy/coins, power-up framework + Raven, Blacksmith scene, stamina, story dialog, level map, tutorial, audio, the Decoy mechanic, full 250 levels. These are Plans 2–3.

**Placeholder scan:** No TBD/TODO; every code step contains complete code; every test step has real assertions and exact run commands. ✓

**Type consistency:** `StorageAdapter {get,set}` used identically in Tasks 0/6/8. `tapTile`/`resolveMismatch`/`createMatchState` signatures match between Task 5 and Task 9. `recordLevelResult(gs,{stars})` and `createGameState(save)` match between Task 7 and Task 9. `paramsForLevel` fields (`grid,pairs,timeLimit,flipMemoryMs,parTime,block`) consistent across Tasks 2, 3, 9. ✓

---

## Verification (end-to-end)

1. `npx vitest run` → all unit suites pass (eventBus, difficulty, levels, scoring, match, save, state).
2. Browser: `npx serve www` → play a full level, win, advance, reload-persists (Task 9 Step 5).
3. Device: `npx cap run android` on the Redmi Note 9 Pro → full Stage 1 acceptance checklist (Task 9 Step 7), including force-kill persistence and 6×4 performance.

## Next Plans
- **Plan 2:** Coin economy + Blacksmith scene + power-up framework (Raven) + scene transitions.
- **Plan 3:** Stamina (timestamp regen + clock-guard) + story dialog + level map + tutorial + audio.
