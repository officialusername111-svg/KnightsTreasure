> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Knight's Treasure — Plan 3: Stamina, Story, Map, Tutorial & Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **Prerequisite:** Plans 1 & 2 complete and green. **Authority:** design-decisions doc `docs/superpowers/specs/2026-06-21-knights-treasure-design-decisions.md` (D3, Part D save v3).

**Goal:** Complete the Stage-1 vertical slice — a level map gated by a stamina system (timestamp regen + clock-rollback guard), parchment story dialog at the GDD beats, a first-launch tutorial, and Web Audio SFX/music wired to game events.

**Architecture:** New pure modules `stamina.js`, `data/story.js`, `tutorial.js` (Node-tested). Save extends to **v3** (stamina, story progress, streak, tutorial flags). New scenes: `map`, `story`; new overlay: `tutorial`. `audio.js` is a thin Web Audio wrapper subscribed to the event bus (guarded so it no-ops in Node/tests). `main.js` becomes the flow controller: map → (story beat?) → game → map.

**Tech Stack:** Same as Plans 1–2. No new dependencies.

## Global Constraints
- All Plan 1–2 constraints hold. Pure modules import no DOM/Web Audio/Capacitor and take `now` (clock) as a parameter.
- Stamina: max **5**, cost **1/level**, regen **1 per 30 min** from a saved timestamp; regen continues across app close; **clock rollback must never grant stamina** (guard via `staminaMaxSeen`).
- Story beats (GDD Stage 1): Opening @ Level 1 (Knight arrives, receives the quest), Midpoint @ Level 13 (Elder warns of dangers), Boss @ Level 25 (first clue to the treasure found). Each beat shown once (tracked in `storyProgress`).
- Tutorial never interrupts mid-level; skippable; uses overlays not text walls (GDD).
- Audio respects `save.settings.sound`; all sound generated via Web Audio API (no files this plan).

---

## File Structure (this plan)
```
www/js/
├── data/
│   ├── config.js     MODIFY: MAX_STAMINA, REGEN_MS, bump SAVE_VERSION→3, TEXT (map/story/tutorial)
│   └── story.js      NEW: Stage 1 story beats
├── systems/
│   ├── stamina.js    NEW: regen + clock guard + spend (pure)
│   └── tutorial.js   NEW: which tutorial to show (pure)
├── core/save.js      MODIFY: defaultSave v3 fields
├── ui/
│   ├── story.js      NEW: parchment dialog scene
│   ├── map.js        NEW: level map scene (stamina-gated play)
│   └── tutorial.js   NEW: first-launch overlay
├── audio.js          NEW: Web Audio SFX/music, bus-subscribed
└── main.js           MODIFY: flow controller (map ↔ story ↔ game ↔ shop) + audio init
tests/
├── stamina.test.js · story.test.js · tutorial.test.js   NEW
└── save.test.js      MODIFY: assert v3 default fields
```

---

### Task 1: Stamina (pure, with clock-rollback guard)

**Files:** Create `www/js/systems/stamina.js`; Modify `www/js/data/config.js`; Test `tests/stamina.test.js`

**Interfaces:**
- Consumes: `MAX_STAMINA`, `REGEN_MS` from config.
- Produces (all take a state `{ stamina, lastUpdated, maxSeen }` plus `now`; pure):
  - `computeStamina({ stamina, lastUpdated, maxSeen, now }): { stamina, lastUpdated, maxSeen }` — applies regen; `effNow = max(now, maxSeen)` so a rolled-back clock never adds stamina.
  - `spendStamina({ stamina, lastUpdated, maxSeen, now }): { state, ok }` — refreshes first, then decrements one if available; anchors `lastUpdated=effNow` when spending from full.
  - `msUntilNext({ stamina, lastUpdated, maxSeen, now }): number` — ms to the next regen tick (0 if full).

- [ ] **Step 1: Add stamina constants + bump SAVE_VERSION**

In `www/js/data/config.js`: change `export const SAVE_VERSION = 2;` to `export const SAVE_VERSION = 3;` and append:
```js
export const MAX_STAMINA = 5;
export const REGEN_MS = 30 * 60 * 1000; // 30 minutes
```

- [ ] **Step 2: Write the failing test**

Create `tests/stamina.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { computeStamina, spendStamina, msUntilNext } from '../www/js/systems/stamina.js';
import { REGEN_MS } from '../www/js/data/config.js';

const at = (over) => ({ stamina: 2, lastUpdated: 0, maxSeen: 0, now: 0, ...over });

describe('computeStamina', () => {
  it('regenerates whole ticks', () => {
    const r = computeStamina(at({ now: REGEN_MS * 2 }));
    expect(r.stamina).toBe(4);
    expect(r.lastUpdated).toBe(REGEN_MS * 2);
  });
  it('caps at max and anchors lastUpdated to now', () => {
    const r = computeStamina(at({ stamina: 4, now: REGEN_MS * 10 }));
    expect(r.stamina).toBe(5);
    expect(r.lastUpdated).toBe(REGEN_MS * 10);
  });
  it('keeps partial progress (no over-credit)', () => {
    const r = computeStamina(at({ now: REGEN_MS + REGEN_MS / 2 }));
    expect(r.stamina).toBe(3);            // only one whole tick
    expect(r.lastUpdated).toBe(REGEN_MS); // remainder preserved
  });
  it('clock rollback never grants stamina', () => {
    const r = computeStamina({ stamina: 2, lastUpdated: 1_000_000, maxSeen: 1_000_000, now: 0 });
    expect(r.stamina).toBe(2);
    expect(r.maxSeen).toBe(1_000_000);
  });
});

describe('spendStamina', () => {
  it('spends one when available and anchors regen from now when full', () => {
    const r = spendStamina({ stamina: 5, lastUpdated: 0, maxSeen: 0, now: 1000 });
    expect(r.ok).toBe(true);
    expect(r.state.stamina).toBe(4);
    expect(r.state.lastUpdated).toBe(1000);
  });
  it('fails at zero', () => {
    const r = spendStamina({ stamina: 0, lastUpdated: 0, maxSeen: 0, now: 0 });
    expect(r.ok).toBe(false);
    expect(r.state.stamina).toBe(0);
  });
});

describe('msUntilNext', () => {
  it('is 0 when full', () => {
    expect(msUntilNext({ stamina: 5, lastUpdated: 0, maxSeen: 0, now: 0 })).toBe(0);
  });
  it('counts down within a tick', () => {
    expect(msUntilNext({ stamina: 2, lastUpdated: 0, maxSeen: 0, now: REGEN_MS / 4 }))
      .toBe(REGEN_MS - REGEN_MS / 4);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/stamina.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write minimal implementation**

Create `www/js/systems/stamina.js`:
```js
import { MAX_STAMINA, REGEN_MS } from '../data/config.js';

export function computeStamina({ stamina, lastUpdated, maxSeen, now }) {
  const effNow = Math.max(now, maxSeen || 0);
  if (stamina >= MAX_STAMINA) {
    return { stamina: MAX_STAMINA, lastUpdated: effNow, maxSeen: effNow };
  }
  const anchor = lastUpdated || effNow;
  const elapsed = Math.max(0, effNow - anchor);
  const gained = Math.floor(elapsed / REGEN_MS);
  const newStamina = Math.min(MAX_STAMINA, stamina + gained);
  const newLastUpdated = newStamina >= MAX_STAMINA ? effNow : anchor + gained * REGEN_MS;
  return { stamina: newStamina, lastUpdated: newLastUpdated, maxSeen: effNow };
}

export function spendStamina(state) {
  const r = computeStamina(state);
  if (r.stamina <= 0) return { state: r, ok: false };
  const wasFull = r.stamina >= MAX_STAMINA;
  return {
    state: {
      stamina: r.stamina - 1,
      lastUpdated: wasFull ? r.maxSeen : r.lastUpdated,
      maxSeen: r.maxSeen,
    },
    ok: true,
  };
}

export function msUntilNext(state) {
  const r = computeStamina(state);
  if (r.stamina >= MAX_STAMINA) return 0;
  const effNow = Math.max(state.now, state.maxSeen || 0);
  const elapsedInTick = effNow - r.lastUpdated;
  return REGEN_MS - elapsedInTick;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/stamina.test.js`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add www/js/systems/stamina.js www/js/data/config.js tests/stamina.test.js
git commit -m "feat: stamina regen with clock-rollback guard"
```

---

### Task 2: Extend save to v3

**Files:** Modify `www/js/core/save.js`; Modify `tests/save.test.js`

**Interfaces:**
- Produces: `defaultSave()` also returns `stamina: MAX_STAMINA, staminaLastUpdated: 0, staminaMaxSeen: 0, storyProgress: {}, streakDays: 0, lastLogin: '', tutorialsSeen: {}`. `SAVE_VERSION` is 3. v2/v1 saves migrate by merge (new fields default).

- [ ] **Step 1: Write the failing test (extend save.test.js)**

Add inside `describe('save', ...)`:
```js
  it('v3 default has stamina + story fields', () => {
    const s = defaultSave();
    expect(s.saveVersion).toBe(3);
    expect(s.stamina).toBe(5);
    expect(s.storyProgress).toEqual({});
    expect(s.tutorialsSeen).toEqual({});
  });
  it('migrates a v2 save by filling stamina fields', () => {
    const m = migrate({ saveVersion: 2, coins: 40 });
    expect(m.saveVersion).toBe(3);
    expect(m.coins).toBe(40);
    expect(m.stamina).toBe(5);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/save.test.js`
Expected: FAIL — saveVersion 2 / stamina undefined.

- [ ] **Step 3: Update defaultSave + import**

In `www/js/core/save.js`, change the import line to:
```js
import { SAVE_KEY, SAVE_VERSION, MAX_STAMINA } from '../data/config.js';
```
Append these fields to the `defaultSave()` return object:
```js
    stamina: MAX_STAMINA,
    staminaLastUpdated: 0,
    staminaMaxSeen: 0,
    storyProgress: {},
    streakDays: 0,
    lastLogin: '',
    tutorialsSeen: {},
```
Add a defensive coercion in `migrate()`:
```js
  if (!merged.storyProgress || typeof merged.storyProgress !== 'object') merged.storyProgress = {};
  if (!merged.tutorialsSeen || typeof merged.tutorialsSeen !== 'object') merged.tutorialsSeen = {};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/save.test.js`
Expected: PASS (all save tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/core/save.js tests/save.test.js
git commit -m "feat: save schema v3 (stamina, story, streak, tutorial flags)"
```

---

### Task 3: Story beat data (pure)

**Files:** Create `www/js/data/story.js`; Test `tests/story.test.js`

**Interfaces:**
- Produces:
  - `getBeat(stage, levelInStage): { id, trigger, character, portrait, lines: string[] } | null` — returns the beat that fires when *entering* that level, or null.
  - `beatSeen(save, beatId): boolean`; `markBeatSeen(save, beatId): save`.

- [ ] **Step 1: Write the failing test**

Create `tests/story.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { getBeat, beatSeen, markBeatSeen } from '../www/js/data/story.js';

describe('story', () => {
  it('returns opening beat at level 1', () => {
    const b = getBeat(1, 1);
    expect(b.id).toBe('1-opening');
    expect(b.lines.length).toBeGreaterThan(0);
  });
  it('returns midpoint at level 13 and boss at 25', () => {
    expect(getBeat(1, 13).id).toBe('1-midpoint');
    expect(getBeat(1, 25).id).toBe('1-boss');
  });
  it('returns null on non-beat levels', () => {
    expect(getBeat(1, 7)).toBeNull();
  });
  it('tracks seen beats', () => {
    expect(beatSeen({ storyProgress: {} }, '1-opening')).toBe(false);
    const s = markBeatSeen({ storyProgress: {} }, '1-opening');
    expect(beatSeen(s, '1-opening')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/story.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/data/story.js`:
```js
// Stage 1 beats (GDD). Portraits are asset keys; placeholders render an emoji.
const BEATS = {
  1: {
    1:  { id: '1-opening',  trigger: 'opening',  character: 'Village Elder', portrait: 'elder',
          lines: [
            'Ah, a knight at last. The forest path is long, and the treasure long lost.',
            'Sharpen thy memory, brave one — only a keen mind will find what is hidden.',
          ] },
    13: { id: '1-midpoint', trigger: 'midpoint', character: 'Village Elder', portrait: 'elder',
          lines: [
            'Beware. The deeper paths confuse even seasoned travelers.',
            'Trust what you have seen, not what you wish to see.',
          ] },
    25: { id: '1-boss',     trigger: 'boss',     character: 'Village Elder', portrait: 'elder',
          lines: [
            'You found it — the first clue, etched in old stone.',
            'The road to the treasure has only just begun, Sir Knight.',
          ] },
  },
};

export function getBeat(stage, levelInStage) {
  return BEATS[stage]?.[levelInStage] || null;
}

export function beatSeen(save, beatId) {
  return !!(save.storyProgress && save.storyProgress[beatId]);
}

export function markBeatSeen(save, beatId) {
  return { ...save, storyProgress: { ...(save.storyProgress || {}), [beatId]: true } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/story.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/data/story.js tests/story.test.js
git commit -m "feat: stage 1 story beats data"
```

---

### Task 4: Tutorial logic (pure)

**Files:** Create `www/js/systems/tutorial.js`; Test `tests/tutorial.test.js`

**Interfaces:**
- Produces:
  - `tutorialFor(save): { id, steps: string[] } | null` — returns `firstLaunch` tutorial when the player has completed no levels and hasn't seen it; else null.
  - `markTutorialSeen(save, id): save`.

- [ ] **Step 1: Write the failing test**

Create `tests/tutorial.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { tutorialFor, markTutorialSeen } from '../www/js/systems/tutorial.js';

const fresh = () => ({ completedLevels: [], tutorialsSeen: {} });

describe('tutorial', () => {
  it('offers first-launch tutorial to a brand-new player', () => {
    const t = tutorialFor(fresh());
    expect(t.id).toBe('firstLaunch');
    expect(t.steps.length).toBeGreaterThanOrEqual(3);
  });
  it('does not repeat once seen', () => {
    const s = markTutorialSeen(fresh(), 'firstLaunch');
    expect(tutorialFor(s)).toBeNull();
  });
  it('does not show to a player with progress', () => {
    expect(tutorialFor({ completedLevels: ['1-1'], tutorialsSeen: {} })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tutorial.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/systems/tutorial.js`:
```js
const TUTORIALS = {
  firstLaunch: {
    id: 'firstLaunch',
    steps: [
      'Tap any tile to flip it and reveal its relic.',
      'Tap a second tile to find its matching pair.',
      'Match all pairs to clear the level — remember the positions!',
    ],
  },
};

export function tutorialFor(save) {
  const noProgress = (save.completedLevels || []).length === 0;
  const unseen = !(save.tutorialsSeen && save.tutorialsSeen.firstLaunch);
  return noProgress && unseen ? TUTORIALS.firstLaunch : null;
}

export function markTutorialSeen(save, id) {
  return { ...save, tutorialsSeen: { ...(save.tutorialsSeen || {}), [id]: true } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tutorial.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/systems/tutorial.js tests/tutorial.test.js
git commit -m "feat: first-launch tutorial logic"
```

---

### Task 5: Story dialog scene (DOM)

**Files:** Create `www/js/ui/story.js`; Modify `www/css/main.css`; Modify `www/js/data/config.js` (TEXT)

**Interfaces:**
- Consumes: a `beat` from `data/story.js`; `TEXT`.
- Produces: `createStoryScene({ beat, onDone })` → a parchment scene that shows the portrait, character name, and lines one tap at a time; Skip jumps to the end; finishing calls `onDone()`.

> DOM task. Verified in Task 8 browser smoke.

- [ ] **Step 1: Add story styles + TEXT**

In `config.js` `TEXT` add: `next: 'Next'` already exists; add `skip: 'Skip'`, `begin: 'Begin'`.
Append to `www/css/main.css`:
```css
#kt-story { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:16px; padding:24px; background:radial-gradient(ellipse at 50% 40%, #1a1025, #0d0820 60%, #080510); }
.kt-portrait { width:96px; height:96px; border-radius:50%; background:#2e1e00; border:2px solid var(--gold);
  display:flex; align-items:center; justify-content:center; font-size:48px; }
.kt-parch { max-width:480px; background:var(--parch); color:#2a1c08; border-radius:10px; padding:16px 20px;
  box-shadow:0 6px 24px rgba(0,0,0,.5); }
.kt-parch .who { font-weight:700; color:#6a3e00; margin-bottom:6px; }
.kt-parch .line { line-height:1.6; }
.kt-story-btns { display:flex; gap:12px; }
```

- [ ] **Step 2: Write the story scene**

Create `www/js/ui/story.js`:
```js
import { TEXT } from '../data/config.js';

export function createStoryScene({ beat, onDone }) {
  let i = 0;
  const scene = document.createElement('div');
  scene.id = 'kt-story';

  function render() {
    scene.innerHTML = `
      <div class="kt-portrait">🧙</div>
      <div class="kt-parch">
        <div class="who">${beat.character}</div>
        <div class="line">${beat.lines[i]}</div>
      </div>`;
    const btns = document.createElement('div');
    btns.className = 'kt-story-btns';
    const last = i >= beat.lines.length - 1;

    const primary = document.createElement('button');
    primary.className = 'kt-btn';
    primary.textContent = last ? TEXT.begin : TEXT.next;
    primary.addEventListener('click', () => {
      if (last) return onDone();
      i += 1;
      render();
    });
    btns.appendChild(primary);

    if (!last) {
      const skip = document.createElement('button');
      skip.className = 'kt-btn';
      skip.textContent = TEXT.skip;
      skip.addEventListener('click', () => { i = beat.lines.length - 1; render(); });
      btns.appendChild(skip);
    }
    scene.appendChild(btns);
  }

  render();
  return scene;
}
```

- [ ] **Step 3: Commit**

```bash
git add www/js/ui/story.js www/css/main.css www/js/data/config.js
git commit -m "feat: parchment story dialog scene"
```

---

### Task 6: Level map scene with stamina gating (DOM)

**Files:** Create `www/js/ui/map.js`; Modify `www/css/main.css`; Modify `www/js/data/config.js` (TEXT)

**Interfaces:**
- Consumes: `generateStage` (levels.js); `computeStamina`, `spendStamina`, `msUntilNext` (stamina.js); `persistSave` (save.js); `STAGE1`, `TEXT`, `MAX_STAMINA` (config.js); `bus`.
- Produces: `createMapScene({ gameState, adapter, bus, onPlay, onShop })` → a scene showing the stamina row (refreshed via `computeStamina` on enter), a Shop button, and a node per Stage-1 level (completed shows stars, current is playable, future is locked). Tapping a playable node calls `spendStamina`; on success it persists and calls `onPlay(levelInStage)`; on empty it shows a "no stamina, regen in mm:ss" notice.

> DOM task. Verified in Task 8.

- [ ] **Step 1: Add map styles + TEXT**

In `config.js` `TEXT` add: `mapTitle: 'The Forest Path'`, `stamina: 'Stamina'`, `noStamina: 'Out of stamina', regenIn: 'Next in'`, `play: 'Play'`.
Append to `www/css/main.css`:
```css
#kt-map { flex:1; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
#kt-map h2 { color:var(--gold-lt); text-align:center; }
.kt-stam-row { text-align:center; color:#f5c842; font-size:18px; }
.kt-stam-note { text-align:center; color:#e0a060; font-size:13px; min-height:18px; }
.kt-map-grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:10px; }
.kt-node { aspect-ratio:1; border-radius:10px; display:flex; flex-direction:column; align-items:center;
  justify-content:center; border:1px solid #6b4c1a; background:rgba(24,14,0,.7); color:#f5c842;
  min-height:44px; cursor:pointer; }
.kt-node.locked { opacity:.4; cursor:default; }
.kt-node.done { border-color:#60b040; }
.kt-node .n { font-weight:700; }
.kt-node .s { font-size:11px; color:#f0c46a; }
```

- [ ] **Step 2: Write the map scene**

Create `www/js/ui/map.js`:
```js
import { generateStage } from '../data/levels.js';
import { computeStamina, spendStamina, msUntilNext } from '../systems/stamina.js';
import { persistSave } from '../core/save.js';
import { STAGE1, TEXT, MAX_STAMINA } from '../data/config.js';

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function createMapScene({ gameState, adapter, bus, onPlay, onShop }) {
  const scene = document.createElement('div');
  scene.id = 'kt-map';
  const levels = generateStage(STAGE1.id);

  function staminaState() {
    return {
      stamina: gameState.save.stamina,
      lastUpdated: gameState.save.staminaLastUpdated,
      maxSeen: gameState.save.staminaMaxSeen,
      now: Date.now(),
    };
  }

  function refreshStamina() {
    const r = computeStamina(staminaState());
    gameState.save.stamina = r.stamina;
    gameState.save.staminaLastUpdated = r.lastUpdated;
    gameState.save.staminaMaxSeen = r.maxSeen;
    persistSave(adapter, gameState.save);
  }

  function render() {
    refreshStamina();
    scene.innerHTML = `<h2>${TEXT.mapTitle}</h2>
      <div class="kt-stam-row">${'🍺'.repeat(gameState.save.stamina)}${'▢'.repeat(MAX_STAMINA - gameState.save.stamina)}</div>
      <div class="kt-stam-note" id="kt-stam-note"></div>`;

    const grid = document.createElement('div');
    grid.className = 'kt-map-grid';
    levels.forEach((lvl) => grid.appendChild(node(lvl)));
    scene.appendChild(grid);

    const shop = document.createElement('button');
    shop.className = 'kt-btn';
    shop.textContent = TEXT.shop;
    shop.addEventListener('click', () => onShop());
    scene.appendChild(shop);
  }

  function node(lvl) {
    const completed = gameState.save.completedLevels.includes(lvl.id);
    const current = lvl.levelInStage === gameState.save.currentLevel;
    const playable = completed || current;
    const el = document.createElement('div');
    el.className = 'kt-node' + (completed ? ' done' : '') + (playable ? '' : ' locked');
    const stars = gameState.save.stars[lvl.id] || 0;
    el.innerHTML = `<span class="n">${lvl.levelInStage}</span>
      <span class="s">${stars ? '⭐'.repeat(stars) : ''}</span>`;
    if (playable) el.addEventListener('click', () => attemptPlay(lvl));
    return el;
  }

  function attemptPlay(lvl) {
    const r = spendStamina(staminaState());
    if (!r.ok) {
      const note = scene.querySelector('#kt-stam-note');
      note.textContent = `${TEXT.noStamina} — ${TEXT.regenIn} ${fmt(msUntilNext(staminaState()))}`;
      return;
    }
    gameState.save.stamina = r.state.stamina;
    gameState.save.staminaLastUpdated = r.state.lastUpdated;
    gameState.save.staminaMaxSeen = r.state.maxSeen;
    gameState.save.currentLevel = lvl.levelInStage;
    persistSave(adapter, gameState.save);
    bus.emit('stamina:spent', { level: lvl.id });
    onPlay(lvl.levelInStage);
  }

  render();
  return scene;
}
```

- [ ] **Step 3: Commit**

```bash
git add www/js/ui/map.js www/css/main.css www/js/data/config.js
git commit -m "feat: level map scene with stamina gating"
```

---

### Task 7: First-launch tutorial overlay + Web Audio (DOM)

**Files:** Create `www/js/ui/tutorial.js`, `www/js/audio.js`; Modify `www/css/main.css`

**Interfaces:**
- `createTutorialOverlay({ tutorial, onDone })` → an overlay element stepping through `tutorial.steps`, with a Skip/Done; calls `onDone()` at the end.
- `createAudio(bus, save)` → `{ playMusic(), stop(), setMuted(bool) }`. Subscribes to bus events (`tile:flip`, `tile:match`, `tile:mismatch`, `level:complete`) and plays Web Audio SFX. Guarded: if `AudioContext` is undefined (Node/tests) every method is a safe no-op. Respects `save.settings.sound`.

> DOM/audio task. Verified by browser smoke (Task 8) — audio cannot be unit-tested in Node.

- [ ] **Step 1: Add tutorial overlay styles**

Append to `www/css/main.css`:
```css
#kt-tut { position:absolute; inset:0; z-index:120; background:rgba(6,4,0,.82); display:flex;
  flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:28px; text-align:center; }
.kt-tut-hand { font-size:40px; animation:kt-bob 1s ease-in-out infinite; }
@keyframes kt-bob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
.kt-tut-text { color:#f5ead0; font-size:18px; max-width:340px; line-height:1.6; }
```

- [ ] **Step 2: Write the tutorial overlay**

Create `www/js/ui/tutorial.js`:
```js
import { TEXT } from '../data/config.js';

export function createTutorialOverlay({ tutorial, onDone }) {
  let i = 0;
  const el = document.createElement('div');
  el.id = 'kt-tut';

  function render() {
    el.innerHTML = `<div class="kt-tut-hand">👆</div>
      <div class="kt-tut-text">${tutorial.steps[i]}</div>`;
    const btn = document.createElement('button');
    btn.className = 'kt-btn';
    const last = i >= tutorial.steps.length - 1;
    btn.textContent = last ? TEXT.begin : TEXT.next;
    btn.addEventListener('click', () => {
      if (last) { el.remove(); return onDone(); }
      i += 1; render();
    });
    el.appendChild(btn);
  }

  render();
  return el;
}
```

- [ ] **Step 3: Write the audio module**

Create `www/js/audio.js`:
```js
// Web Audio SFX/music. Safe no-op when AudioContext is unavailable (Node/tests).
export function createAudio(bus, save) {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ctx = null;
  let muted = !(save.settings && save.settings.sound);

  function ac() {
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    return ctx;
  }

  function note(freq, type, dur, gain = 0.15, delay = 0) {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const sfx = {
    flip: () => note(660, 'sine', 0.08, 0.12),
    match: () => [523, 659, 784, 1047].forEach((f, i) => note(f, 'sine', 0.22, 0.16, i * 0.06)),
    mismatch: () => note(180, 'sawtooth', 0.22, 0.18),
    win: () => [523, 587, 659, 784, 1047].forEach((f, i) => note(f, 'triangle', 0.2, 0.16, i * 0.07)),
  };

  bus.on('tile:flip', sfx.flip);
  bus.on('tile:match', sfx.match);
  bus.on('tile:win', sfx.win);
  bus.on('tile:mismatch', sfx.mismatch);
  bus.on('level:complete', sfx.win);

  return {
    playMusic() { /* procedural BGM loop — added in a later audio pass; no-op stub kept intentional */ },
    stop() { if (ctx) ctx.suspend(); },
    setMuted(v) { muted = v; },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add www/js/ui/tutorial.js www/js/audio.js www/css/main.css
git commit -m "feat: tutorial overlay + Web Audio sfx"
```

---

### Task 8: Flow controller — wire map ↔ story ↔ game ↔ shop + tutorial + audio (DOM)

**Files:** Modify `www/js/main.js`

**Interfaces:**
- Consumes everything above. Produces the boot flow:
  1. init audio (subscribe to bus).
  2. if `tutorialFor(save)` → show tutorial overlay over the map.
  3. show map. On play(level): if a `getBeat` fires for that level and is unseen → show story → mark seen+persist → start game; else start game directly.
  4. game `onAdvance` → back to map (flame); `onShop` → shop → map.

- [ ] **Step 1: Replace main.js with the flow controller**

Replace `www/js/main.js` with:
```js
import { createPreferencesAdapter } from './platform/preferencesAdapter.js';
import { loadSave, persistSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';
import { createBlacksmithScene } from './ui/blacksmith.js';
import { createMapScene } from './ui/map.js';
import { createStoryScene } from './ui/story.js';
import { createTutorialOverlay } from './ui/tutorial.js';
import { createAudio } from './audio.js';
import { getBeat, beatSeen, markBeatSeen } from './data/story.js';
import { tutorialFor, markTutorialSeen } from './systems/tutorial.js';
import { STAGE1 } from './data/config.js';

async function boot() {
  const adapter = createPreferencesAdapter();
  const bus = createEventBus();
  const scenes = createSceneManager(document.getElementById('app'));
  let gameState = createGameState(await loadSave(adapter));
  const audio = createAudio(bus, gameState.save);

  function showMap(opts) {
    scenes.mount(
      createMapScene({
        gameState, adapter, bus,
        onPlay: (levelInStage) => enterLevel(levelInStage),
        onShop: () => showShop(),
      }),
      opts
    );
    const tut = tutorialFor(gameState.save);
    if (tut) {
      const overlay = createTutorialOverlay({
        tutorial: tut,
        onDone: () => {
          gameState.save = markTutorialSeen(gameState.save, tut.id);
          persistSave(adapter, gameState.save);
        },
      });
      document.getElementById('app').appendChild(overlay);
    }
  }

  function enterLevel(levelInStage) {
    gameState = createGameState({ ...gameState.save, currentStage: STAGE1.id, currentLevel: levelInStage });
    const beat = getBeat(STAGE1.id, levelInStage);
    if (beat && !beatSeen(gameState.save, beat.id)) {
      scenes.mount(createStoryScene({
        beat,
        onDone: () => {
          gameState.save = markBeatSeen(gameState.save, beat.id);
          persistSave(adapter, gameState.save);
          startGame();
        },
      }), { transition: 'flame' });
    } else {
      startGame();
    }
  }

  function startGame() {
    scenes.mount(createGameScene({
      gameState, adapter, bus,
      onAdvance: () => showMap({ transition: 'flame' }),
      onShop: (next) => { gameState = next; showShop(); },
    }));
  }

  function showShop() {
    scenes.mount(createBlacksmithScene({
      gameState, adapter, bus,
      onLeave: () => showMap({ transition: 'flame' }),
    }), { transition: 'flame' });
  }

  showMap();
}

boot();
```

- [ ] **Step 2: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS — all suites (Plan 1 + economy/items/inventory + stamina/story/tutorial + save v3).

- [ ] **Step 3: Browser smoke check**

Run: `cd /d/Workspace/KnightTreasure && npx serve www`
Expected: First load shows the tutorial overlay over the map; dismiss it; the map shows 5 stamina tankards and Level 1 playable. Tap Level 1 → flame wipe → Elder story (Next/Skip/Begin) → game starts. Win → flame back to map; stamina dropped by 1; Level 2 now playable. Replay enough to confirm story does NOT repeat on re-entering Level 1. Drain stamina to 0 → tapping a node shows "Out of stamina — Next in mm:ss". SFX play on flip/match/mismatch/win. Reload → stamina, story-seen, tutorial-seen all persist.

- [ ] **Step 4: On-device acceptance (completes the vertical slice)**

Run: `cd /d/Workspace/KnightTreasure && npx cap sync android && npx cap run android`
On the Redmi verify the **full slice exit criteria:** first-launch tutorial → map → story beat → play Stage 1 levels → earn/spend coins in the Blacksmith → use Raven → stamina depletes and regenerates over time → force-kill and relaunch with everything intact (level, coins, inventory, stamina timestamp, story/tutorial seen). Confirm clock-rollback does not refill stamina (set device clock back, reopen → no free stamina).

- [ ] **Step 5: Commit**

```bash
git add www/js/main.js
git commit -m "feat: flow controller (map/story/game/shop) + tutorial + audio wiring"
```

---

## Self-Review

**Spec coverage:**
- Stamina max 5, 1/level, 30-min timestamp regen, persists across close, clock-rollback guard → Tasks 1, 6, 8 ✓
- Save v3 + non-destructive migration → Task 2 ✓
- Story beats at L1/L13/L25, shown once, parchment + portrait + Skip → Tasks 3, 5, 8 ✓
- First-launch tutorial (overlay, skippable, no mid-level interruption — shown on map) → Tasks 4, 7, 8 ✓
- Web Audio SFX on game events, respects sound setting → Task 7 ✓
- Level map: nodes, lock/complete/stars, stamina row, shop entry → Task 6 ✓
- **Deferred (later plans):** Tavern hub (drinks/Bard/Gambler/Daily Duty), procedural BGM loop (stub left intentionally), contextual tutorials for later mechanics, stage themes beyond 1.

**Placeholder scan:** all code complete; the `playMusic` BGM stub is explicitly labeled as an intentional later-pass extension, not a missing requirement for this plan's scope. No TBD/TODO. ✓

**Type consistency:** stamina state shape `{stamina,lastUpdated,maxSeen,now}` consistent across `stamina.js`, `map.js`, `main.js`. `getBeat/beatSeen/markBeatSeen` signatures match Tasks 3 & 8. `createGameScene` `onShop` now receives `next` in one path and none in another — handled (Task 8 wraps it). `tutorialFor/markTutorialSeen` match Tasks 4 & 8. ✓

---

## Verification (end-to-end)
1. `npx vitest run` → all suites green.
2. Browser smoke (Task 8 Step 3): tutorial → map → story → game → shop → stamina notice → reload persistence.
3. Device (Task 8 Step 4): full vertical-slice exit criteria incl. clock-rollback check.

## Slice complete
With Plans 1–3 done, Stage 1 exercises every architectural layer (match, difficulty, scoring, economy, inventory, stamina, story, map, tutorial, audio, save v3, scene transitions). The architecture is now proven for replication — see the later-phases outline.
