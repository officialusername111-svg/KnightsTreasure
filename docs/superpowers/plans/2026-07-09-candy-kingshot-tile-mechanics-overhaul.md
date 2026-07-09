# Candy Crush / Kingshot Tile & Mechanics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frameless silhouette-true tiles, a Combo Streak Wildcard + Chain Reveal Ripple mechanic pair with a stage-gated escalation roster, a fixed and livelier board backdrop, and the Higgsfield pilot assets that make it all visible.

**Architecture:** Pure state/logic lands first in `www/js/data/mechanics.js`, `www/js/systems/mechanics.js`, and `www/js/systems/match.js` (all vitest-covered, zero DOM). The Higgsfield pilot assets land next. Everything DOM-facing (CSS, `www/js/ui/game.js` wiring, `www/js/ui/animations.js` effects) is layered on top and verified by running the app — this repo has no jsdom/DOM test harness (`vitest.config.js` sets `environment: 'node'`), so UI tasks are proven by serving `www/` and exercising the golden path in a browser, matching how every prior UI change in this codebase (see `docs/superpowers/specs/2026-07-08-higgsfield-art-overhaul.md`, "Verified in the running game") has been checked.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), vitest for pure-logic tests, Higgsfield CLI/skill for art generation. No build step, no framework.

## Global Constraints

- Source doc: `docs/superpowers/specs/2026-07-09-candy-kingshot-tile-mechanics-overhaul.md`. Every task below implements a numbered section of it — if code and spec ever disagree, the spec wins and the code is wrong.
- No code comments except where they explain a non-obvious WHY (a hidden constraint, a bug being worked around, an invariant). Match the terse, comment-sparse style already in `www/js/systems/match.js` and `www/js/systems/mechanics.js`.
- Pure logic (`www/js/data/*.js`, `www/js/systems/*.js`) gets a vitest test in the matching `tests/*.test.js` file. DOM/CSS/`www/js/ui/*.js` changes are verified manually (serve `www/`, e.g. `npx http-server www -p 8080`, open a browser) — do not attempt to add jsdom or DOM tests; that would be a scope change to the project's test infrastructure this plan does not include.
- `tile.wildcard`, `sinceWildcard`, and every other new identifier must be spelled exactly as introduced in the task that defines it — later tasks consume the exact names below, not synonyms.
- `match.totalPairs` may shrink at runtime (Wildcard mismatch fallout, §2 of the spec); `level.pairs` never changes and is what scoring must read. Do not use `match.totalPairs` in any scoring/star calculation.
- Commit after every task passes its verification step.

---

## File Structure

**New files:**
- `www/js/data/mechanics.js` — `MECHANIC_UNLOCKS` table + `unlockedMechanics(stage)`, mirrors the existing `STAGE_TILES`/`tilePoolForStage` pattern in `www/js/data/tiles.js`.

**Modified files:**
- `www/js/systems/mechanics.js` — add `pickWildcardCandidate(tiles, rng)` and `visualOrthogonalNeighbors(domOrder, cols, anchorModelIdx)`, alongside the existing `visualBombZone`/`visualCross`.
- `www/js/systems/match.js` — add `spawnWildcard(state, index)` and `matchWildcard(state, wildcardIdx, otherIdx)`.
- `www/js/ui/game.js` — STAGE_BG wiring fix, Wildcard spawn/resolve/render, Ripple trigger, Streak Banner / Twin Spark / Vault Pulse escalations, scoring fixed to `level.pairs`.
- `www/js/ui/animations.js` — add `streakBannerSweep(host)` and reuse existing `fxLayer`/`reduced` helpers.
- `www/css/main.css` — `--ripple` token, frameless `.kt-front` face treatment + slot backdrop + pop-in transition, `.kt-wildcard` glow, `.kt-peek` ring, `.kt-vault-pulse` keyframe hook, board backdrop parallax layer.
- `www/css/animations.css` — `kt-streak-sweep`, `kt-vault-pulse`, `kt-bg-drift` keyframes.
- `tests/mechanics.test.js` — tests for the two new pure functions plus `MECHANIC_UNLOCKS`/`unlockedMechanics`.
- `tests/match.test.js` — tests for `spawnWildcard`/`matchWildcard`, including the winnability regression test.

**Asset files (Task 5, generated not hand-written):**
- `www/assets/images/tiles/tile_dagger.png`, `tile_chalice.png`, `tile_gem.png`, `tile_dragon.png` — regenerated frameless.
- `www/assets/images/tiles/tile_wildcard.png` — new subject.
- `www/assets/images/backgrounds/bg_stage1_forest.png` — regenerated.

---

### Task 1: Mechanic unlock data table

**Files:**
- Create: `www/js/data/mechanics.js`
- Test: `tests/mechanics.test.js`

**Interfaces:**
- Produces: `MECHANIC_UNLOCKS` (object keyed by mechanic id, each `{ id, name, unlockStage }`), `unlockedMechanics(stage)` → array of unlocked entries, ascending by `unlockStage` not guaranteed (filter order = object insertion order).

- [ ] **Step 1: Write the failing test**

Add to `tests/mechanics.test.js` (new `describe` block, new import — the file already imports from `../www/js/systems/mechanics.js`; this is a separate import from the new data file):

```js
import { MECHANIC_UNLOCKS, unlockedMechanics } from '../www/js/data/mechanics.js';

describe('unlockedMechanics', () => {
  it('none unlocked before stage 3', () => {
    expect(unlockedMechanics(1)).toEqual([]);
    expect(unlockedMechanics(2)).toEqual([]);
  });
  it('streakBanner unlocks at stage 3', () => {
    expect(unlockedMechanics(3).map((m) => m.id)).toEqual(['streakBanner']);
  });
  it('twinSpark joins at stage 5', () => {
    expect(unlockedMechanics(5).map((m) => m.id)).toEqual(['streakBanner', 'twinSpark']);
  });
  it('all three unlocked by stage 8', () => {
    expect(unlockedMechanics(8).map((m) => m.id)).toEqual(['streakBanner', 'twinSpark', 'vaultPulse']);
  });
  it('MECHANIC_UNLOCKS carries the exact spec stages', () => {
    expect(MECHANIC_UNLOCKS.streakBanner.unlockStage).toBe(3);
    expect(MECHANIC_UNLOCKS.twinSpark.unlockStage).toBe(5);
    expect(MECHANIC_UNLOCKS.vaultPulse.unlockStage).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mechanics.test.js -t unlockedMechanics`
Expected: FAIL — `Failed to resolve import "../www/js/data/mechanics.js"`

- [ ] **Step 3: Write minimal implementation**

Create `www/js/data/mechanics.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mechanics.test.js -t unlockedMechanics`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add www/js/data/mechanics.js tests/mechanics.test.js
git commit -m "feat: add stage-gated mechanic unlock table"
```

---

### Task 2: Pure logic — Wildcard candidate picker + ripple neighbor geometry

**Files:**
- Modify: `www/js/systems/mechanics.js`
- Test: `tests/mechanics.test.js`

**Interfaces:**
- Consumes: nothing new (tile shape already established by `www/js/systems/match.js`'s `buildDeck`: `{ index, icon, isDecoy, faceUp, matched, locked }`).
- Produces: `pickWildcardCandidate(tiles, rng = Math.random)` → tile index or `null`. `visualOrthogonalNeighbors(domOrder, cols, anchorModelIdx)` → array of model indices (up to 4, edge-clamped).

- [ ] **Step 1: Write the failing test**

Add to `tests/mechanics.test.js`:

```js
import { pickWildcardCandidate, visualOrthogonalNeighbors } from '../www/js/systems/mechanics.js';

describe('pickWildcardCandidate', () => {
  const board = tiles([{}, { matched: true }, { faceUp: true }, { locked: true }, { isDecoy: true }, {}]);

  it('picks only from face-down, unmatched, unlocked, non-decoy tiles', () => {
    const idx = pickWildcardCandidate(board, () => 0);
    expect([0, 5]).toContain(idx);
  });
  it('returns null when nothing is eligible', () => {
    expect(pickWildcardCandidate(tiles([{ matched: true }, { locked: true }]))).toBeNull();
  });
});

describe('visualOrthogonalNeighbors', () => {
  const identity = [0,1,2,3,4,5,6,7,8,9,10,11]; // 4 cols x 3 rows, unswapped

  it('returns up/down/left/right on an interior tile', () => {
    expect(visualOrthogonalNeighbors(identity, 4, 5).sort((a,b)=>a-b)).toEqual([1,4,6,9]);
  });
  it('clamps at the top-left corner (no up, no left)', () => {
    expect(visualOrthogonalNeighbors(identity, 4, 0).sort((a,b)=>a-b)).toEqual([1,4]);
  });
  it('clamps at the bottom-right corner (no down, no right)', () => {
    expect(visualOrthogonalNeighbors(identity, 4, 11).sort((a,b)=>a-b)).toEqual([7,10]);
  });
  it('follows a swapped tile to its visual slot', () => {
    const swapped = [5,1,2,3,4,0,6,7,8,9,10,11]; // model 0 now sits at visual slot 5
    expect(visualOrthogonalNeighbors(swapped, 4, 0).sort((a,b)=>a-b)).toEqual([1,4,6,9]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mechanics.test.js -t "pickWildcardCandidate|visualOrthogonalNeighbors"`
Expected: FAIL — both are not exported functions

- [ ] **Step 3: Write minimal implementation**

Append to `www/js/systems/mechanics.js`:

```js
// Combo Streak Wildcard (2026-07-09 spec, §2) — random eligible spawn target. Pure;
// rng injectable, same convention as chooseSwaps/chooseLocked above.
export function pickWildcardCandidate(tiles, rng = Math.random) {
  const pool = tiles.filter((t) => !t.matched && !t.faceUp && !t.locked && !t.isDecoy);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)].index;
}

// Chain Reveal Ripple (2026-07-09 spec, §3) — the up/down/left/right neighbors of a
// tile's VISUAL slot, same domOrder/cols contract as visualBombZone/visualCross above.
// Unlike those, this never dedupes across an anchor since a single tile has at most 4
// orthogonal neighbors already-distinct by construction.
export function visualOrthogonalNeighbors(domOrder, cols, anchorModelIdx) {
  const total = domOrder.length, rows = Math.ceil(total / cols);
  const v = Math.max(0, domOrder.indexOf(anchorModelIdx));
  const r = Math.floor(v / cols), c = v % cols;
  const out = [];
  if (r > 0) out.push(domOrder[v - cols]);
  if (r < rows - 1 && v + cols < total) out.push(domOrder[v + cols]);
  if (c > 0) out.push(domOrder[v - 1]);
  if (c < cols - 1 && v + 1 < total) out.push(domOrder[v + 1]);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mechanics.test.js`
Expected: PASS (all tests in the file, including Task 1's)

- [ ] **Step 5: Commit**

```bash
git add www/js/systems/mechanics.js tests/mechanics.test.js
git commit -m "feat: add wildcard candidate picker and ripple neighbor geometry"
```

---

### Task 3: Pure state — spawnWildcard + matchWildcard (with winnability guarantee)

**Files:**
- Modify: `www/js/systems/match.js`
- Test: `tests/match.test.js`

**Interfaces:**
- Consumes: match state shape from `createMatchState`/`buildDeck` (Task 2's tile shape); no new fields required on tiles besides the new `wildcard` boolean this task introduces.
- Produces: `spawnWildcard(state, index)` → new state (no-op copy if `index` ineligible). `matchWildcard(state, wildcardIdx, otherIdx)` → `{ state, result }` where `result` is `'match'`, `'win'`, or `'ignored'`, same contract as `matchPair`.

- [ ] **Step 1: Write the failing test**

Append to `tests/match.test.js`:

```js
import { spawnWildcard, matchWildcard } from '../www/js/systems/match.js';

describe('spawnWildcard / matchWildcard', () => {
  function board() {
    // identity shuffle -> deck order [A,A,B,B,C,C] (indices 0-5)
    return createMatchState({ pairs: 3, iconPool: ['A', 'B', 'C'], shuffle: identity });
  }

  it('tags an eligible tile without touching its icon', () => {
    const s = spawnWildcard(board(), 0);
    expect(s.tiles[0].wildcard).toBe(true);
    expect(s.tiles[0].icon).toBe('A');
  });

  it('is a no-op on an ineligible tile (already matched)', () => {
    let s = board();
    s.tiles[0].matched = true;
    const next = spawnWildcard(s, 0);
    expect(next.tiles[0].wildcard).toBeUndefined();
  });

  it('resolving against its own true partner behaves like a normal match', () => {
    const s = spawnWildcard(board(), 0);            // tile 0 = wildcard (icon A), true partner tile 1
    const { state, result } = matchWildcard(s, 0, 1);
    expect(result).toBe('match');
    expect(state.tiles[0].matched).toBe(true);
    expect(state.tiles[1].matched).toBe(true);
    expect(state.matchedPairs).toBe(1);
    expect(state.totalPairs).toBe(3);                // unchanged: no orphans possible here
  });

  it('resolving against a different tile retires both true partners and shrinks totalPairs by one', () => {
    const s = spawnWildcard(board(), 0);             // wildcard = tile 0 (icon A), true partner tile 1
    const { state, result } = matchWildcard(s, 0, 2); // tile 2 = icon B, true partner tile 3
    expect(result).toBe('match');
    expect(state.tiles[0].matched).toBe(true);        // wildcard cleared
    expect(state.tiles[2].matched).toBe(true);        // chosen tile cleared
    expect(state.tiles[1].matched).toBe(true);         // wildcard's true partner silently retired
    expect(state.tiles[3].matched).toBe(true);         // chosen tile's true partner silently retired
    expect(state.matchedPairs).toBe(1);                // exactly one scored pairing
    expect(state.totalPairs).toBe(2);                  // 3 - 1: win target stays reachable
  });

  it('stays winnable after a mismatch: the remaining real pair alone reaches the new target', () => {
    let s = spawnWildcard(board(), 0);
    s = matchWildcard(s, 0, 2).state;                  // totalPairs now 2, matchedPairs 1
    const r1 = tapTile(s, 4);                          // tiles 4,5 = icon C, untouched
    const r2 = tapTile(r1.state, 5);
    expect(r2.result).toBe('win');
  });

  it('ignores resolution against an already-matched tile', () => {
    let s = spawnWildcard(board(), 0);
    s = matchWildcard(s, 0, 2).state;
    const { result } = matchWildcard(s, 0, 2);         // tile 0 already matched
    expect(result).toBe('ignored');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/match.test.js -t "spawnWildcard"`
Expected: FAIL — `spawnWildcard`/`matchWildcard` not exported

- [ ] **Step 3: Write minimal implementation**

Append to `www/js/systems/match.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/match.test.js`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions in `tests/config.test.js`, `tests/scoring.test.js`, or any other existing test file.

- [ ] **Step 6: Commit**

```bash
git add www/js/systems/match.js tests/match.test.js
git commit -m "feat: add Wildcard spawn/resolve with orphan-retirement winnability guarantee"
```

---

### Task 4: Board backdrop bug fix + parallax layer

**Files:**
- Modify: `www/js/ui/game.js:6,74`
- Modify: `www/css/main.css` (near line 32, `#kt-board-wrap::before`)
- Modify: `www/css/animations.css` (append)

**Interfaces:**
- Consumes: `STAGE_BG` from `www/js/data/config.js` (already exported, keyed by stage number 1-10).
- Produces: nothing consumed by later tasks; independent of Tasks 1-3 and 5-9, safe to do in any order relative to them.

- [ ] **Step 1: Fix the STAGE_BG wiring**

In `www/js/ui/game.js`, change the import on line 6:

```js
import { ASSETS, TEXT } from '../data/config.js';
```
to:
```js
import { ASSETS, TEXT, STAGE_BG } from '../data/config.js';
```

Then change line 74:
```js
boardWrap.style.setProperty('--bg-forest', `url("${new URL(ASSETS.bgForest, document.baseURI).href}")`);
```
to:
```js
const stageBg = STAGE_BG[level.stage] || ASSETS.bgForest;
boardWrap.style.setProperty('--bg-forest', `url("${new URL(stageBg, document.baseURI).href}")`);
```

- [ ] **Step 2: Add the parallax layer**

In `www/css/main.css`, immediately after the existing rule (near line 32):

```css
#kt-board-wrap::before { content:''; position:absolute; inset:0; background:var(--bg-forest, none) center/cover no-repeat; opacity:.45; }
```

add:

```css
#kt-board-wrap::after { content:''; position:absolute; inset:-20% -20%; pointer-events:none;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,.05), transparent 40%),
    radial-gradient(circle at 70% 65%, rgba(255,255,255,.035), transparent 38%);
  opacity:.5; animation:kt-bg-drift 22s linear infinite; }
@media (prefers-reduced-motion: reduce) { #kt-board-wrap::after { animation:none; } }
```

In `www/css/animations.css`, append:

```css
@keyframes kt-bg-drift { from { transform:translateX(0); } to { transform:translateX(-6%); } }
```

- [ ] **Step 3: Verify manually**

Serve `www/` (e.g. `npx http-server www -p 8080`) and open it in a browser. Play through Stage 1 and Stage 2 (or edit save state / use a level-select shortcut if the app has one) and confirm:
- Stage 1's board shows the forest backdrop; Stage 2's board shows the village backdrop (`bg_stage2_village.png`), not the forest — this is the bug fix.
- A faint drifting glow is visible behind the board (the parallax layer). It stops when the OS "reduce motion" setting is on (toggle it in browser devtools' rendering emulation panel and reload).

- [ ] **Step 4: Commit**

```bash
git add www/js/ui/game.js www/css/main.css www/css/animations.css
git commit -m "fix: wire per-stage board backdrop and add a drift parallax layer"
```

---

### Task 5: Higgsfield pilot asset generation

**Files:**
- Create (generated, not hand-written): `www/assets/images/tiles/tile_dagger.png`, `tile_chalice.png`, `tile_gem.png`, `tile_dragon.png`, `tile_wildcard.png`, `www/assets/images/backgrounds/bg_stage1_forest.png`

This task has no code and no automated test — it is asset generation, verified visually. Do not attempt to write a vitest test for it.

- [ ] **Step 1: Generate the canonical frameless tile face**

Use the `higgsfield-generate` skill (model `nano_banana_2`, 2K) to regenerate `tile_dagger` as a **frameless, transparent-background cutout**: the sword silhouette only, no square/circle border, no baked frame, sized so the sword fills most of the frame with a small margin, glossy stylized-3D rendering consistent with `www/assets/images/reference/knight_reference.webp`. Save to `www/assets/images/tiles/tile_dagger.png`, replacing the current framed version.

- [ ] **Step 2: Generate the remaining pilot faces + Wildcard**

Use `nano_banana_2_lite`, passing the newly-generated `tile_dagger.png` as an image reference for style/frame-absence consistency, to generate:
- `tile_chalice.png` — chalice silhouette
- `tile_gem.png` — gem silhouette
- `tile_dragon.png` — dragon-head or dragon-emblem silhouette
- `tile_wildcard.png` — a new subject: a glowing gold rune-burst or star-seal silhouette, visually distinct from every real subject (this tile represents "any tile," not a real item)

Save each to `www/assets/images/tiles/`.

- [ ] **Step 3: Generate the pilot backdrop**

Use `nano_banana_2` (2K) to regenerate `bg_stage1_forest.png` in the same glossy stylized-3D style as the tiles/characters, full-bleed (backgrounds are not transparency-cut per the 2026-07-08 overhaul record). Save to `www/assets/images/backgrounds/bg_stage1_forest.png`, replacing the current version.

- [ ] **Step 4: Verify manually**

Open each of the 6 new/regenerated files. Confirm: the 4 pilot tile faces have no frame and a distinct silhouette per subject (not all the same square/circle outline); `tile_wildcard.png` is visually distinct from all 4; the backdrop reads as the same forest scene, restyled.

- [ ] **Step 5: Report the pilot for approval before continuing**

Do not proceed to the batch of ~38 remaining tile faces + 9 remaining backdrops (out of scope for this plan — see spec §6 "Batch") until the pilot set above is shown to the project owner and approved, per the pilot-first rollout the owner explicitly chose during brainstorming.

- [ ] **Step 6: Commit**

```bash
git add www/assets/images/tiles/tile_dagger.png www/assets/images/tiles/tile_chalice.png www/assets/images/tiles/tile_gem.png www/assets/images/tiles/tile_dragon.png www/assets/images/tiles/tile_wildcard.png www/assets/images/backgrounds/bg_stage1_forest.png
git commit -m "feat: generate pilot frameless tile faces, wildcard tile, and stage-1 backdrop"
```

---

### Task 6: Tile visual system — frameless face, slot backdrop, reveal transition

**Files:**
- Modify: `www/css/main.css` (near lines 1-4 for the `:root` token, and lines 53-56 for `.kt-face`)

**Depends on:** Task 5 (tunes against the real pilot art, not placeholder framed art).

- [ ] **Step 1: Add the ripple color token**

In `www/css/main.css`, extend the existing `:root` block (currently `--gold`, `--gold-lt`, `--ember`, `--parch`, `--dark`, `--panel`, `--line`):

```css
:root {
  --gold:#c9922a; --gold-lt:#f5c842; --ember:#e8550a;
  --parch:#f5ead0; --dark:#0d0a15; --panel:#060400; --line:#3a2a12;
  --ripple:#6fd3c7;
}
```

- [ ] **Step 2: Give the front face its own slot backdrop and inset**

Replace:

```css
.kt-face { position:absolute; inset:0; overflow:hidden;
  backface-visibility:hidden; -webkit-backface-visibility:hidden; }
.kt-face img { width:100%; height:100%; object-fit:cover; display:block; }
.kt-front { transform:rotateY(180deg); }
```

with:

```css
.kt-face { position:absolute; inset:0; overflow:hidden;
  backface-visibility:hidden; -webkit-backface-visibility:hidden; }
.kt-face img { width:100%; height:100%; object-fit:cover; display:block; }
.kt-face.kt-front {
  transform:rotateY(180deg);
  background:radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--gold) 16%, #2a1c08), #150d02);
  padding:11%;
}
.kt-face.kt-front img {
  object-fit:contain;
  filter:drop-shadow(0 3px 5px rgba(0,0,0,.55));
  opacity:0; transform:scale(.4);
  transition:opacity .15s ease, transform .22s cubic-bezier(.34,1.56,.64,1);
}
.kt-tile.flipped .kt-face.kt-front img,
.kt-tile.matched .kt-face.kt-front img { opacity:1; transform:scale(1); }
```

(`.kt-front` is renamed to `.kt-face.kt-front` for specificity over the shared `.kt-face`/`.kt-face img` rules above it — both classes are already present together on the element in `www/js/ui/game.js`'s tile template, `<div class="kt-face kt-front">`, so no HTML change is needed.)

- [ ] **Step 3: Verify manually**

Serve `www/`, start Stage 1, and tap tiles. Confirm:
- Face-down tiles look unchanged (uniform gold-framed back, edge-to-edge).
- Flipping a tile shows the sword/chalice/gem/dragon (whichever pilot subjects are in the Stage 1 pool) with no frame, popping in with a small overshoot rather than snapping in flatly.
- Tiles whose faces are NOT yet regenerated (still old framed art) still render correctly, just without the pop-in feeling as dramatic — this is expected until the full batch (Task 5's follow-up, out of scope here) lands; note the placeholder-quality tiles explicitly to the reviewer rather than treating it as a bug.

- [ ] **Step 4: Commit**

```bash
git add www/css/main.css
git commit -m "feat: frameless tile face treatment with slot backdrop and pop-in reveal"
```

---

### Task 7: Combo Streak Wildcard — game.js wiring

**Files:**
- Modify: `www/js/ui/game.js`

**Depends on:** Task 2 (`pickWildcardCandidate`), Task 3 (`spawnWildcard`, `matchWildcard`), Task 5 (`tile_wildcard.png` must exist to render).

**Interfaces:**
- Consumes: `pickWildcardCandidate` from `www/js/systems/mechanics.js`; `spawnWildcard`, `matchWildcard` from `www/js/systems/match.js`.
- Produces: `wildcardIndex` (module-scope closure variable, `null` when no Wildcard is live) and `sinceWildcard` (closure variable), both read by Task 9's escalations.

- [ ] **Step 1: Import the new pure functions**

In `www/js/ui/game.js`, change:

```js
import { createMatchState, tapTile, resolveMismatch, matchPair } from '../systems/match.js';
import { chooseSwaps, visualBombZone, visualCross } from '../systems/mechanics.js';
```
to:
```js
import { createMatchState, tapTile, resolveMismatch, matchPair, spawnWildcard, matchWildcard } from '../systems/match.js';
import { chooseSwaps, visualBombZone, visualCross, pickWildcardCandidate } from '../systems/mechanics.js';
```

- [ ] **Step 2: Add the streak/wildcard closure state**

Near line 38 (`let combo = 0;`), add two new closure variables right after it:

```js
  let combo = 0;
  let sinceWildcard = 0;
  let wildcardIndex = null;
  let maxCombo = 0;
```

- [ ] **Step 3: Fix scoring to use the fixed level pair count**

`match.totalPairs` can now shrink at runtime (Task 3). Find the three places in `win()` that currently read `match.totalPairs` for scoring/stars and change them to `level.pairs`:

```js
    let stars = computeStars({
      mistakes: match.mistakes,
      pairs: match.totalPairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
```
becomes:
```js
    let stars = computeStars({
      mistakes: match.mistakes,
      pairs: level.pairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
```

and:
```js
    const score = computeScore({
      matches: match.totalPairs,
      timeRemaining,
      comboBonus: comboBonus(),
      mistakes: match.mistakes,
    }) - powerPenalty + warHornBonus;
```
becomes:
```js
    const score = computeScore({
      matches: level.pairs,
      timeRemaining,
      comboBonus: comboBonus(),
      mistakes: match.mistakes,
    }) - powerPenalty + warHornBonus;
```

and inside `showWin()`'s breakdown string:
```js
        `<div class="row"><span>Matches ×100</span><span>+${match.totalPairs * 100}</span></div>` +
        `<div class="row"><span>Time left ×10</span><span>+${timeRemaining * 10}</span></div>` +
        `<div class="row"><span>Combo bonus</span><span>+${comboBonus()}</span></div>` +
        `<div class="row" style="color:#c06a4a;"><span>Mistakes ×50</span><span>−${mistakePenalty({ matches: match.totalPairs, timeRemaining, comboBonus: comboBonus(), mistakes: match.mistakes })}</span></div>` +
```
becomes:
```js
        `<div class="row"><span>Matches ×100</span><span>+${level.pairs * 100}</span></div>` +
        `<div class="row"><span>Time left ×10</span><span>+${timeRemaining * 10}</span></div>` +
        `<div class="row"><span>Combo bonus</span><span>+${comboBonus()}</span></div>` +
        `<div class="row" style="color:#c06a4a;"><span>Mistakes ×50</span><span>−${mistakePenalty({ matches: level.pairs, timeRemaining, comboBonus: comboBonus(), mistakes: match.mistakes })}</span></div>` +
```

- [ ] **Step 4: Add the face-swap helper**

Near `syncBoard()` (line ~153), add:

```js
  function applyWildcardFace(index) {
    const el = tileEls[index];
    if (!el) return;
    const img = el.querySelector('.kt-front img');
    if (img) img.src = new URL(ASSETS.tiles + 'tile_wildcard.png', document.baseURI).href;
    el.classList.add('kt-wildcard');
  }
```

- [ ] **Step 5: Wire spawn + resolution into celebrateMatch and onTap**

Replace `celebrateMatch`:

```js
  function celebrateMatch(i, j) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    if (warHornActive) warHornBonus += 100;   // War Horn doubles this match (base 100 → 200)
    const pair = [tileEls[i], tileEls[j]];
    popMatch(pair);
    pair.forEach((el) => { if (el) { burstAtEl(scene, el, 10, 'spark'); impactRing(scene, el, 'rgba(245,200,66,.9)'); } });
    comboBanner(scene, combo);
    haptic(combo >= 5 ? 'combo' : 'match');
    // combo escalation: punch-in from 3-chains, add a shudder from 5-chains
    if (combo >= 3) boardZoom(boardWrap, tileEls[j], { scale: 1.04, inMs: 100, holdMs: 40, outMs: 260 });
    if (combo >= 5) { sceneShake(scene, { amp: 4, ms: 260 }); sfx('fanfare'); }
  }
```

with:

```js
  function celebrateMatch(i, j) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    if (warHornActive) warHornBonus += 100;   // War Horn doubles this match (base 100 → 200)
    const pair = [tileEls[i], tileEls[j]];
    popMatch(pair);
    pair.forEach((el) => { if (el) { burstAtEl(scene, el, 10, 'spark'); impactRing(scene, el, 'rgba(245,200,66,.9)'); } });
    comboBanner(scene, combo);
    haptic(combo >= 5 ? 'combo' : 'match');
    // combo escalation: punch-in from 3-chains, add a shudder from 5-chains
    if (combo >= 3) boardZoom(boardWrap, tileEls[j], { scale: 1.04, inMs: 100, holdMs: 40, outMs: 260 });
    if (combo >= 5) { sceneShake(scene, { amp: 4, ms: 260 }); sfx('fanfare'); }
    // Combo Streak Wildcard (2026-07-09 spec, §2): counts every match, resets on spawn
    // and on mismatch, independent of `combo` (which keeps driving the escalations above).
    sinceWildcard += 1;
    if (sinceWildcard >= 3 && wildcardIndex === null) {
      const spawnIdx = pickWildcardCandidate(match.tiles);
      if (spawnIdx !== null) {
        match = spawnWildcard(match, spawnIdx);
        wildcardIndex = spawnIdx;
        applyWildcardFace(spawnIdx);
        sinceWildcard = 0;
      }
    }
  }
```

In `onTap(index)`, immediately after `const prevFirst = match.firstPick;` (line ~186) and before the existing `const { state, result } = tapTile(match, index);` line, insert:

```js
    if (prevFirst !== null && wildcardIndex !== null &&
        (prevFirst === wildcardIndex || index === wildcardIndex) && prevFirst !== index) {
      const otherIdx = prevFirst === wildcardIndex ? index : prevFirst;
      const wcIdx = wildcardIndex;
      const { state, result } = matchWildcard(match, wcIdx, otherIdx);
      if (result !== 'ignored') {
        match = state;
        wildcardIndex = null;
        sfx('match');
        celebrateMatch(wcIdx, otherIdx);
        syncBoard();
        if (result === 'win') win();
        return;
      }
    }
```

- [ ] **Step 6: Reset sinceWildcard alongside combo on mismatch**

In `onTap`, find:

```js
    if (result === 'mismatch') {
      combo = 0;
```
and change to:
```js
    if (result === 'mismatch') {
      combo = 0;
      sinceWildcard = 0;
```

- [ ] **Step 7: Verify manually**

Serve `www/`, play Stage 1, and deliberately match 3 pairs in a row without a miss. Confirm:
- After the 3rd consecutive match, one previously face-down tile now shows the Wildcard glyph (from Task 5's `tile_wildcard.png`) — tap any two tiles to trigger a mismatch first if the RNG spawns it somewhere inconvenient, then re-build the 3-streak, to make the moment easy to spot.
- Tapping the Wildcard, then tapping any other face-down tile, clears both immediately regardless of icon, plays the normal match FX, and the level remains completable (finish the level and confirm it registers a win with all real pairs cleared — some tiles will have quietly gone face-up-and-matched without ever being tapped, which is the silent-retirement behavior from Task 3; that is correct, not a bug).
- The results screen's "Matches ×100" line still shows the level's original pair count × 100, not a reduced number.

- [ ] **Step 8: Commit**

```bash
git add www/js/ui/game.js
git commit -m "feat: wire Combo Streak Wildcard spawn, resolution, and fixed-pair scoring"
```

---

### Task 8: Chain Reveal Ripple — game.js wiring + peek styling

**Files:**
- Modify: `www/js/ui/game.js`
- Modify: `www/css/main.css` (append near the `.kt-tile.hint` rule, line ~86)

**Depends on:** Task 2 (`visualOrthogonalNeighbors`).

**Interfaces:**
- Consumes: `visualOrthogonalNeighbors` from `www/js/systems/mechanics.js`; the existing `domOrder()` helper and `permaReveal` Set already in `www/js/ui/game.js`.
- Produces: `triggerRipple(i, j, count = 1)`, called from `celebrateMatch` (Task 7) and reused by Task 9's Twin Spark/Streak Banner escalations.

- [ ] **Step 1: Import the neighbor helper**

Change:

```js
import { chooseSwaps, visualBombZone, visualCross, pickWildcardCandidate } from '../systems/mechanics.js';
```
to:
```js
import { chooseSwaps, visualBombZone, visualCross, pickWildcardCandidate, visualOrthogonalNeighbors } from '../systems/mechanics.js';
```

- [ ] **Step 2: Add the peek + ripple-trigger functions**

Near `applyWildcardFace` (Task 7, Step 4), add:

```js
  function peekTile(idx) {
    const el = tileEls[idx];
    if (!el || permaReveal.has(idx)) return;
    el.classList.add('kt-peek');
    permaReveal.add(idx);
    syncBoard();
    setTimeout(() => {
      permaReveal.delete(idx);
      el.classList.remove('kt-peek');
      syncBoard();
    }, 350);
  }

  // Chain Reveal Ripple (2026-07-09 spec, §3): peeks `count` random face-down, unlocked
  // neighbors of the just-matched tiles. Peek only — never itself completes a match.
  function triggerRipple(i, j, count = 1) {
    const candidates = [i, j]
      .flatMap((anchor) => visualOrthogonalNeighbors(domOrder(), level.grid.cols, anchor))
      .filter((idx) => {
        const t = match.tiles[idx];
        return t && !t.matched && !t.faceUp && !t.locked;
      });
    const unique = [...new Set(candidates)];
    for (let k = 0; k < count && unique.length; k++) {
      const pick = unique.splice(Math.floor(Math.random() * unique.length), 1)[0];
      peekTile(pick);
    }
  }
```

- [ ] **Step 3: Call it from celebrateMatch**

In `celebrateMatch(i, j)` (as left by Task 7), add the ripple call after the Wildcard-spawn block:

```js
    sinceWildcard += 1;
    if (sinceWildcard >= 3 && wildcardIndex === null) {
      const spawnIdx = pickWildcardCandidate(match.tiles);
      if (spawnIdx !== null) {
        match = spawnWildcard(match, spawnIdx);
        wildcardIndex = spawnIdx;
        applyWildcardFace(spawnIdx);
        sinceWildcard = 0;
      }
    }
    triggerRipple(i, j);
```

- [ ] **Step 4: Add the peek CSS**

In `www/css/main.css`, after the existing hint rule:

```css
.kt-tile.hint .kt-tile-inner { box-shadow:0 0 0 2px var(--gold-lt), 0 0 16px 4px rgba(245,200,66,.55); border-radius:8px; }
```

add:

```css
.kt-tile.kt-peek .kt-face.kt-front { box-shadow:0 0 0 2px var(--ripple), 0 0 14px 3px color-mix(in srgb, var(--ripple) 55%, transparent); }
```

- [ ] **Step 5: Verify manually**

Serve `www/`, play Stage 1. After each successful match, watch neighboring face-down tiles: one should briefly flip face-up with a teal ring (distinct from the gold Eagle Eye hint ring), then flip back down on its own within roughly a third of a second. Confirm it never auto-completes a match by itself — the level's mistake/miss count must not change from a peek alone.

- [ ] **Step 6: Commit**

```bash
git add www/js/ui/game.js www/css/main.css
git commit -m "feat: wire Chain Reveal Ripple with teal peek styling"
```

---

### Task 9: Stage-gated escalations — Streak Banner, Twin Spark, Vault Pulse

**Files:**
- Modify: `www/js/ui/game.js`
- Modify: `www/js/ui/animations.js`
- Modify: `www/css/animations.css`

**Depends on:** Task 1 (`unlockedMechanics`), Task 7 (Wildcard resolution path), Task 8 (`triggerRipple`).

- [ ] **Step 1: Add streakBannerSweep to animations.js**

In `www/js/ui/animations.js`, near `comboTier` (top of the file), add:

```js
// Stage 3 escalation (2026-07-09 spec, §4): a gold bar sweeps across the board once the
// streak crosses 5. Self-removes via the existing fxLayer/animationend convention.
export function streakBannerSweep(host) {
  if (reduced()) return;
  const layer = fxLayer(host);
  const bar = document.createElement('div');
  bar.className = 'kt-streak-banner';
  bar.addEventListener('animationend', () => bar.remove(), { once: true });
  layer.appendChild(bar);
}
```

- [ ] **Step 2: Add the CSS**

In `www/css/animations.css`, append:

```css
.kt-streak-banner { position:absolute; left:-30%; top:46%; width:160%; height:14px; margin-top:-7px;
  background:linear-gradient(90deg, transparent, var(--gold-lt), var(--gold), var(--gold-lt), transparent);
  pointer-events:none; z-index:20; animation:kt-streak-sweep .9s ease-out forwards; }
@keyframes kt-streak-sweep { 0% { transform:translateX(-100%); opacity:0; } 15% { opacity:1; } 100% { transform:translateX(100%); opacity:0; } }

.kt-tile.kt-vault-pulse .kt-face.kt-back { animation:kt-vault-pulse 1.2s ease-out; }
@keyframes kt-vault-pulse {
  0% { box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--gold-lt) 40%, transparent), inset 0 0 18px rgba(0,0,0,.5); }
  50% { box-shadow:0 0 0 3px var(--gold-lt), 0 0 20px 5px rgba(245,200,66,.6); }
  100% { box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--gold-lt) 40%, transparent), inset 0 0 18px rgba(0,0,0,.5); }
}
```

- [ ] **Step 3: Wire the escalations into game.js**

Import in `www/js/ui/game.js`:

```js
import { unlockedMechanics } from '../data/mechanics.js';
```

Change the existing animations import:

```js
import { burst, popMatch, burstAtEl, staggerIn, comboBanner, countUp, starSlam, castProjectile, castImpact, boardWave, shieldBubble, igniteReveal, boardFlash, irisBloom, streakReveal, edgePulse, sceneShake, impactFreeze, radialStreaks, scorchGlow, tileKick, bonusFloat, pairMarks, pourOver, debrisFall, hornHerald, lightBeam, lightSweep, boardZoom, impactRing } from './animations.js';
```
to:
```js
import { burst, popMatch, burstAtEl, staggerIn, comboBanner, countUp, starSlam, castProjectile, castImpact, boardWave, shieldBubble, igniteReveal, boardFlash, irisBloom, streakReveal, edgePulse, sceneShake, impactFreeze, radialStreaks, scorchGlow, tileKick, bonusFloat, pairMarks, pourOver, debrisFall, hornHerald, lightBeam, lightSweep, boardZoom, impactRing, streakBannerSweep } from './animations.js';
```

Near the other per-level `const`s at the top of `createGameScene` (after `const level = gameState.current;`), add:

```js
  const activeMechanics = unlockedMechanics(level.stage).map((m) => m.id);
```

Add the Vault Pulse timer alongside the existing `moveTimer` declaration (line ~41):

```js
  let moveTimer = null;          // D8 moving-tiles scheduler
  let vaultPulseTimer = null;    // Stage 8 escalation: ambient location-only pulse
```

Add start/stop functions next to `startMoving`/`stopMoving` (line ~401):

```js
  function startVaultPulse() {
    if (!activeMechanics.includes('vaultPulse')) return;
    vaultPulseTimer = setInterval(() => {
      if (finished || document.hidden) return;
      const idx = pickWildcardCandidate(match.tiles);
      if (idx === null) return;
      const el = tileEls[idx];
      if (!el) return;
      el.classList.add('kt-vault-pulse');
      setTimeout(() => el.classList.remove('kt-vault-pulse'), 1200);
    }, 20000);
  }
  function stopVaultPulse() { if (vaultPulseTimer) clearInterval(vaultPulseTimer); vaultPulseTimer = null; }
```

Call the new functions at every site that already calls their `*Moving` counterpart:

```js
  const endGame = () => { finished = true; cancelAim(); stopTimer(); stopMoving(); if (mismatchTimer) clearTimeout(mismatchTimer); document.removeEventListener('visibilitychange', onVisibility); };
```
becomes:
```js
  const endGame = () => { finished = true; cancelAim(); stopTimer(); stopMoving(); stopVaultPulse(); if (mismatchTimer) clearTimeout(mismatchTimer); document.removeEventListener('visibilitychange', onVisibility); };
```

In `win()` and in `lose()`, each currently has a bare `stopMoving();` line — change both to:
```js
    stopMoving();
    stopVaultPulse();
```

In `begin` (inside `createGameScene`, called once at level start):
```js
  const begin = () => {
    if (level.preShowMs) {
      match.tiles.forEach((t) => { const el = tileEls[t.index]; if (el && !t.locked) el.classList.add('flipped'); });
      setTimeout(() => { if (finished) return; syncBoard(); startTimer(); startMoving(); }, level.preShowMs);
    } else {
      startTimer();
      startMoving();
    }
  };
```
becomes:
```js
  const begin = () => {
    if (level.preShowMs) {
      match.tiles.forEach((t) => { const el = tileEls[t.index]; if (el && !t.locked) el.classList.add('flipped'); });
      setTimeout(() => { if (finished) return; syncBoard(); startTimer(); startMoving(); startVaultPulse(); }, level.preShowMs);
    } else {
      startTimer();
      startMoving();
      startVaultPulse();
    }
  };
```

- [ ] **Step 4: Wire Streak Banner and Twin Spark into celebrateMatch**

In `celebrateMatch(i, j)` (as left by Tasks 7-8), change its signature and the combo-escalation block:

```js
  function celebrateMatch(i, j) {
```
becomes:
```js
  function celebrateMatch(i, j, { wasWildcard = false } = {}) {
```

and change:

```js
    if (combo >= 5) { sceneShake(scene, { amp: 4, ms: 260 }); sfx('fanfare'); }
```
to:
```js
    if (combo >= 5) { sceneShake(scene, { amp: 4, ms: 260 }); sfx('fanfare'); }
    const streakBannerOn = activeMechanics.includes('streakBanner') && combo >= 5;
    if (streakBannerOn && combo === 5) streakBannerSweep(scene);
```

and change the ripple call from Task 8:

```js
    triggerRipple(i, j);
```
to:
```js
    const twinSparkOn = activeMechanics.includes('twinSpark') && wasWildcard;
    triggerRipple(i, j, (streakBannerOn ? 2 : 1) + (twinSparkOn ? 1 : 0));
```

Finally, in `onTap`'s Wildcard-resolution block (Task 7, Step 5), pass the flag through:

```js
        celebrateMatch(wcIdx, otherIdx);
```
becomes:
```js
        celebrateMatch(wcIdx, otherIdx, { wasWildcard: true });
```

- [ ] **Step 5: Verify manually**

Play a Stage 3+ level: build a 5-match streak and confirm a gold bar sweeps across the board exactly once (not every match after) and ripple peeks widen to 2 tiles while the streak holds ≥5, reverting to 1 after the next mismatch. Play a Stage 5+ level, trigger a Wildcard, resolve it, and confirm an extra ripple peek fires alongside the normal one. Play a Stage 8+ level and wait ~20s without matching: confirm one random hidden tile's BACK pulses gold without ever showing its face.

- [ ] **Step 6: Commit**

```bash
git add www/js/ui/game.js www/js/ui/animations.js www/css/animations.css
git commit -m "feat: add Streak Banner, Twin Spark, and Vault Pulse stage escalations"
```

---

### Task 10: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS, zero failures, across every file in `tests/` — not just the ones touched by this plan.

- [ ] **Step 2: Manual golden-path walkthrough**

Serve `www/` and, in one sitting: start a new game → play Stage 1 through a win (confirm score/stars breakdown shows the correct fixed pair count) → trigger and resolve a Wildcard at least once → confirm a Ripple peek fires on a normal match → use at least one existing power-up (Arrow or Sword) and confirm it still works exactly as before (no interaction with `permaReveal` broke) → lose a level on purpose (let the timer run out) and confirm the retry flow is unaffected → check the browser console is clean of errors throughout.

- [ ] **Step 3: Commit the LOOP-STATE / housekeeping note if applicable**

If this plan was executed as part of a tracked loop/session, update `LOOP-STATE.md` per the project's existing convention; otherwise skip this step.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
```
Review the output — everything from Tasks 1-9 should already be committed individually; this step is only to confirm a clean tree, not to create a new catch-all commit. If anything is still unstaged, commit it with a message describing specifically what it is (never a blanket "final commit").

---

## Deferred (explicitly out of scope for this plan)

- The ~38-tile + 9-backdrop Higgsfield batch (spec §6 "Batch") — gated on pilot approval from Task 5, Step 5.
- Any change to the purchased power-up roster, the `TEMP-DEMO` `unlockStage` flattening in `www/js/data/items.js`, scoring formulas beyond the `level.pairs` fix in Task 7, or the save schema.
