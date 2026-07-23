> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Knight's Treasure — Plan 2: Economy, Blacksmith & Power-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **Prerequisite:** Plan 1 (Foundation & Core Loop) complete and green. **Authority:** design-decisions doc `docs/superpowers/specs/2026-06-21-knights-treasure-design-decisions.md` (D1, D10–D13).

**Goal:** Earn coins from level performance, spend them in a Blacksmith shop (single items + bundles), and own/use power-ups in a level — starting with the Raven hint — all wired through the event bus with a flame-wipe scene transition.

**Architecture:** New pure modules `economy.js`, `items.js`, `inventory.js` (Node-tested). Save schema extends to **v2** (coins, inventory, settings, ad counters) via `defaultSave()` + `SAVE_VERSION` bump; migration stays merge-over-defaults. The Blacksmith is a new scene; `sceneManager` gains a transition; the game scene gains a coin HUD, a power-up tray (max 2/level), and the Raven effect.

**Tech Stack:** Same as Plan 1 (vanilla ES modules, Vitest, Capacitor). No new dependencies.

## Global Constraints
- All constraints from Plan 1 still hold (pure modules import no DOM/Capacitor; difficulty only from `difficulty.js`; strings only from `config.js TEXT`).
- Item data comes ONLY from `items.js`; coin reward constants ONLY from `config.js REWARDS`.
- Save migration never destroys data — `migrate()` merges old saves over `defaultSave()`.
- Power-up rules (D11): max 2 active/level, no stacking same id, permanent reveals −25 score, timer power-ups disabled on untimed levels.
- Coin reward values (GDD): base 10; stars 1/2/3 → +5/+15/+30; first clear +20; no power-up +15; no mistakes +20; speed +10; combo coins capped +20/level (D13).

---

## File Structure (this plan)
```
www/js/
├── data/
│   ├── config.js          MODIFY: add REWARDS, bump SAVE_VERSION→2, extend TEXT
│   └── items.js           NEW: item registry (12 power-ups + consumables) + bundles
├── systems/
│   ├── economy.js         NEW: reward calc, combo coins, earn/spend (pure)
│   └── inventory.js       NEW: buy/grant/consume items + bundles (pure)
├── core/save.js           MODIFY: defaultSave v2 fields
├── ui/
│   ├── sceneManager.js    MODIFY: add flame-wipe transition
│   ├── blacksmith.js      NEW: shop scene
│   ├── hud.js             MODIFY: coin counter
│   └── game.js            MODIFY: coin award, power-up tray, Raven effect, shop entry
└── main.js                MODIFY: route map→game→shop with shared adapter/bus
tests/
├── economy.test.js · items.test.js · inventory.test.js   NEW
└── save.test.js           MODIFY: assert v2 default fields
```

---

### Task 1: Economy (pure)

**Files:** Create `www/js/systems/economy.js`; Modify `www/js/data/config.js`; Test `tests/economy.test.js`

**Interfaces:**
- Consumes: `REWARDS` from `config.js`.
- Produces:
  - `computeComboCoins(maxCombo): number` — `Σ_{pos=3..maxCombo} clamp(pos-2,1,5)`, capped at 20.
  - `computeLevelReward({ stars, firstClear, noPowerUp, noMistakes, speedClear, comboCoins }): number`.
  - `earnCoins(save, amount): save` (new object).
  - `spendCoins(save, amount): { save, ok }` — `ok:false` and unchanged save if insufficient.

- [ ] **Step 1: Add REWARDS + bump SAVE_VERSION in config.js**

In `www/js/data/config.js` change `export const SAVE_VERSION = 1;` to `export const SAVE_VERSION = 2;` and append:
```js
export const REWARDS = {
  base: 10,
  star: { 1: 5, 2: 15, 3: 30 },
  firstClear: 20,
  noPowerUp: 15,
  noMistakes: 20,
  speedClear: 10,
  comboCap: 20,
};
```

- [ ] **Step 2: Write the failing test**

Create `tests/economy.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { computeComboCoins, computeLevelReward, earnCoins, spendCoins } from '../www/js/systems/economy.js';

describe('computeComboCoins', () => {
  it('is 0 below combo 3', () => {
    expect(computeComboCoins(0)).toBe(0);
    expect(computeComboCoins(2)).toBe(0);
  });
  it('escalates then caps at 20', () => {
    expect(computeComboCoins(3)).toBe(1);   // pos3 →1
    expect(computeComboCoins(5)).toBe(6);   // 1+2+3
    expect(computeComboCoins(10)).toBe(20); // 1+2+3+4+5+5+5+5=30 → cap 20
  });
});

describe('computeLevelReward', () => {
  it('sums all bonuses', () => {
    const coins = computeLevelReward({
      stars: 3, firstClear: true, noPowerUp: true, noMistakes: true, speedClear: true, comboCoins: 6,
    });
    expect(coins).toBe(10 + 30 + 20 + 15 + 20 + 10 + 6); // 111
  });
  it('minimum casual clear', () => {
    expect(computeLevelReward({
      stars: 1, firstClear: false, noPowerUp: false, noMistakes: false, speedClear: false, comboCoins: 0,
    })).toBe(10 + 5);
  });
});

describe('earn/spend', () => {
  it('earns coins immutably', () => {
    const s = { coins: 5 };
    expect(earnCoins(s, 10).coins).toBe(15);
    expect(s.coins).toBe(5);
  });
  it('spends when affordable', () => {
    const r = spendCoins({ coins: 30 }, 20);
    expect(r.ok).toBe(true);
    expect(r.save.coins).toBe(10);
  });
  it('rejects overspend', () => {
    const r = spendCoins({ coins: 5 }, 20);
    expect(r.ok).toBe(false);
    expect(r.save.coins).toBe(5);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/economy.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write minimal implementation**

Create `www/js/systems/economy.js`:
```js
import { REWARDS } from '../data/config.js';

export function computeComboCoins(maxCombo) {
  let c = 0;
  for (let pos = 3; pos <= maxCombo; pos++) {
    c += Math.min(Math.max(pos - 2, 1), 5);
  }
  return Math.min(REWARDS.comboCap, c);
}

export function computeLevelReward({ stars, firstClear, noPowerUp, noMistakes, speedClear, comboCoins }) {
  return (
    REWARDS.base +
    (REWARDS.star[stars] || 0) +
    (firstClear ? REWARDS.firstClear : 0) +
    (noPowerUp ? REWARDS.noPowerUp : 0) +
    (noMistakes ? REWARDS.noMistakes : 0) +
    (speedClear ? REWARDS.speedClear : 0) +
    (comboCoins || 0)
  );
}

export function earnCoins(save, amount) {
  return { ...save, coins: (save.coins || 0) + amount };
}

export function spendCoins(save, amount) {
  if ((save.coins || 0) < amount) return { save, ok: false };
  return { save: { ...save, coins: save.coins - amount }, ok: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/economy.test.js`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add www/js/systems/economy.js www/js/data/config.js tests/economy.test.js
git commit -m "feat: coin economy (rewards, combo coins, earn/spend)"
```

---

### Task 2: Item registry (pure)

**Files:** Create `www/js/data/items.js`; Test `tests/items.test.js`

**Interfaces:**
- Produces:
  - `ITEMS: Record<id, { id, name, emoji, category:'powerup'|'consumable', cost, unlockStage, effect }>` — 12 power-ups (incl. `holyWater`, per D2) + 5 consumables (per D10).
  - `getItem(id): item | null`.
  - `itemsForShop(maxStage): item[]` — all items with `unlockStage <= maxStage`, sorted by cost.
  - `BUNDLES: Record<id, { id, name, cost, contents: Record<itemId, qty> }>` — Starter/Explorer/Warrior/Champion (GDD).

- [ ] **Step 1: Write the failing test**

Create `tests/items.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, itemsForShop, BUNDLES } from '../www/js/data/items.js';

describe('items', () => {
  it('includes the 12 power-ups incl. Holy Water', () => {
    const powerups = Object.values(ITEMS).filter((i) => i.category === 'powerup');
    expect(powerups).toHaveLength(12);
    expect(getItem('holyWater').unlockStage).toBe(7);
    expect(getItem('holyWater').cost).toBe(40);
  });
  it('includes the 5 consumables', () => {
    const cons = Object.values(ITEMS).filter((i) => i.category === 'consumable');
    expect(cons.map((i) => i.id).sort()).toEqual(['ale', 'feast', 'knightsBrew', 'mead', 'wine']);
  });
  it('shop shows only unlocked items', () => {
    const shop = itemsForShop(1);
    expect(shop.every((i) => i.unlockStage <= 1)).toBe(true);
    expect(shop.some((i) => i.id === 'raven')).toBe(true);
    expect(shop.some((i) => i.id === 'sword')).toBe(false); // stage 8
  });
  it('bundles reference items and have a discounted flat cost', () => {
    expect(BUNDLES.starter.contents).toEqual({ raven: 3 });
    expect(BUNDLES.warrior.contents).toEqual({ feast: 1, shield: 1 });
    expect(typeof BUNDLES.champion.cost).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/items.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/data/items.js`:
```js
export const ITEMS = {
  raven:       { id: 'raven',       name: 'Raven',         emoji: '🐦', category: 'powerup', cost: 20,  unlockStage: 1,  effect: 'hintPair' },
  hourglass:   { id: 'hourglass',   name: 'Hourglass',     emoji: '⏳', category: 'powerup', cost: 30,  unlockStage: 2,  effect: 'addTime' },
  arrow:       { id: 'arrow',       name: 'Arrow',         emoji: '🏹', category: 'powerup', cost: 35,  unlockStage: 3,  effect: 'revealOnePerm' },
  torch:       { id: 'torch',       name: 'Torch',         emoji: '🔦', category: 'powerup', cost: 50,  unlockStage: 4,  effect: 'revealAllTemp' },
  eagleEye:    { id: 'eagleEye',    name: 'Eagle Eye',     emoji: '🦅', category: 'powerup', cost: 55,  unlockStage: 5,  effect: 'glowPairs' },
  shield:      { id: 'shield',      name: 'Shield',        emoji: '🛡️', category: 'powerup', cost: 45,  unlockStage: 6,  effect: 'pauseTimer' },
  spear:       { id: 'spear',       name: 'Spear',         emoji: '🗡️', category: 'powerup', cost: 40,  unlockStage: 7,  effect: 'revealLineTemp' },
  holyWater:   { id: 'holyWater',   name: 'Holy Water',    emoji: '🜍', category: 'powerup', cost: 40,  unlockStage: 7,  effect: 'removeLocks' },
  sword:       { id: 'sword',       name: 'Sword',         emoji: '⚔️', category: 'powerup', cost: 65,  unlockStage: 8,  effect: 'revealLinePerm' },
  bomb:        { id: 'bomb',        name: 'Bomb',          emoji: '💣', category: 'powerup', cost: 80,  unlockStage: 9,  effect: 'reveal2x2Perm' },
  warHorn:     { id: 'warHorn',     name: 'War Horn',      emoji: '📯', category: 'powerup', cost: 60,  unlockStage: 10, effect: 'scoreX2' },
  kingsDecree: { id: 'kingsDecree', name: "King's Decree", emoji: '👑', category: 'powerup', cost: 200, unlockStage: 99, effect: 'skipLevel' },

  ale:         { id: 'ale',         name: 'Ale',           emoji: '🍺', category: 'consumable', cost: 15, unlockStage: 1, effect: 'stamina:1' },
  wine:        { id: 'wine',        name: 'Wine',          emoji: '🍷', category: 'consumable', cost: 25, unlockStage: 1, effect: 'stamina:2' },
  mead:        { id: 'mead',        name: 'Mead',          emoji: '🥃', category: 'consumable', cost: 35, unlockStage: 1, effect: 'stamina:3' },
  feast:       { id: 'feast',       name: 'Feast',         emoji: '🍖', category: 'consumable', cost: 60, unlockStage: 1, effect: 'stamina:full' },
  knightsBrew: { id: 'knightsBrew', name: "Knight's Brew", emoji: '💫', category: 'consumable', cost: 90, unlockStage: 1, effect: 'stamina:full+star' },
};

export function getItem(id) {
  return ITEMS[id] || null;
}

export function itemsForShop(maxStage) {
  return Object.values(ITEMS)
    .filter((i) => i.unlockStage <= maxStage)
    .sort((a, b) => a.cost - b.cost);
}

export const BUNDLES = {
  starter:   { id: 'starter',   name: 'Starter Pack',    cost: 50,  contents: { raven: 3 } },
  explorer:  { id: 'explorer',  name: 'Explorer Pack',   cost: 60,  contents: { arrow: 2, hourglass: 1 } },
  warrior:   { id: 'warrior',   name: "Warrior's Pack",  cost: 100, contents: { feast: 1, shield: 1 } },
  champion:  { id: 'champion',  name: "Champion's Pack", cost: 130, contents: { knightsBrew: 1, torch: 1 } },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/items.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/data/items.js tests/items.test.js
git commit -m "feat: unified item registry + bundles"
```

---

### Task 3: Inventory (buy / grant / consume — pure)

**Files:** Create `www/js/systems/inventory.js`; Test `tests/inventory.test.js`

**Interfaces:**
- Consumes: `getItem`, `BUNDLES` (items.js); `spendCoins` (economy.js).
- Produces:
  - `grantItem(save, id, qty=1): save`.
  - `countOf(save, id): number`.
  - `buyItem(save, id): { save, ok, reason }` — checks unlock (`save.currentStage >= item.unlockStage`) then coins. `reason ∈ 'unknown'|'locked'|'coins'|null`.
  - `buyBundle(save, bundleId): { save, ok, reason }` — flat bundle cost, grants all contents.
  - `consumeItem(save, id): { save, ok }` — decrements if owned.

- [ ] **Step 1: Write the failing test**

Create `tests/inventory.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { grantItem, countOf, buyItem, buyBundle, consumeItem } from '../www/js/systems/inventory.js';

const base = () => ({ coins: 100, currentStage: 1, inventory: {} });

describe('inventory', () => {
  it('grants and counts items', () => {
    const s = grantItem(base(), 'raven', 2);
    expect(countOf(s, 'raven')).toBe(2);
  });
  it('buys an unlocked affordable item', () => {
    const r = buyItem(base(), 'raven'); // 20
    expect(r.ok).toBe(true);
    expect(r.save.coins).toBe(80);
    expect(countOf(r.save, 'raven')).toBe(1);
  });
  it('rejects a locked item', () => {
    const r = buyItem(base(), 'sword'); // stage 8
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('locked');
  });
  it('rejects when broke', () => {
    const r = buyItem({ coins: 5, currentStage: 1, inventory: {} }, 'raven');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('coins');
  });
  it('buys a bundle and grants all contents', () => {
    const r = buyBundle(base(), 'explorer'); // 60 → arrow x2 + hourglass x1
    expect(r.ok).toBe(true);
    expect(r.save.coins).toBe(40);
    expect(countOf(r.save, 'arrow')).toBe(2);
    expect(countOf(r.save, 'hourglass')).toBe(1);
  });
  it('consumes an owned item', () => {
    let s = grantItem(base(), 'raven', 1);
    const r = consumeItem(s, 'raven');
    expect(r.ok).toBe(true);
    expect(countOf(r.save, 'raven')).toBe(0);
  });
  it('cannot consume what you do not own', () => {
    const r = consumeItem(base(), 'raven');
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/inventory.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `www/js/systems/inventory.js`:
```js
import { getItem, BUNDLES } from '../data/items.js';
import { spendCoins } from './economy.js';

export function countOf(save, id) {
  return (save.inventory && save.inventory[id]) || 0;
}

export function grantItem(save, id, qty = 1) {
  const inventory = { ...(save.inventory || {}) };
  inventory[id] = (inventory[id] || 0) + qty;
  return { ...save, inventory };
}

export function buyItem(save, id) {
  const item = getItem(id);
  if (!item) return { save, ok: false, reason: 'unknown' };
  if ((save.currentStage || 1) < item.unlockStage) return { save, ok: false, reason: 'locked' };
  const paid = spendCoins(save, item.cost);
  if (!paid.ok) return { save, ok: false, reason: 'coins' };
  return { save: grantItem(paid.save, id, 1), ok: true, reason: null };
}

export function buyBundle(save, bundleId) {
  const bundle = BUNDLES[bundleId];
  if (!bundle) return { save, ok: false, reason: 'unknown' };
  const paid = spendCoins(save, bundle.cost);
  if (!paid.ok) return { save, ok: false, reason: 'coins' };
  let next = paid.save;
  for (const [id, qty] of Object.entries(bundle.contents)) next = grantItem(next, id, qty);
  return { save: next, ok: true, reason: null };
}

export function consumeItem(save, id) {
  if (countOf(save, id) <= 0) return { save, ok: false };
  const inventory = { ...(save.inventory || {}) };
  inventory[id] -= 1;
  return { save: { ...save, inventory }, ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/inventory.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add www/js/systems/inventory.js tests/inventory.test.js
git commit -m "feat: inventory buy/grant/consume + bundles"
```

---

### Task 4: Extend save to v2

**Files:** Modify `www/js/core/save.js`; Modify `tests/save.test.js`

**Interfaces:**
- Produces: `defaultSave()` now also returns `coins: 0, inventory: {}, settings: { sound: true, language: 'EN' }, adsWatchedToday: 0, adsDay: ''`. `SAVE_VERSION` is 2 (set in Task 1). Migration of a v1 save fills the new fields with defaults.

- [ ] **Step 1: Write the failing test (extend save.test.js)**

Add to `tests/save.test.js` inside the `describe('save', ...)` block:
```js
  it('v2 default has economy fields', () => {
    const s = defaultSave();
    expect(s.saveVersion).toBe(2);
    expect(s.coins).toBe(0);
    expect(s.inventory).toEqual({});
    expect(s.settings).toEqual({ sound: true, language: 'EN' });
  });

  it('migrates a v1 save by filling new fields', () => {
    const migrated = migrate({ saveVersion: 1, currentLevel: 3, coins: undefined });
    expect(migrated.saveVersion).toBe(2);
    expect(migrated.currentLevel).toBe(3);
    expect(migrated.coins).toBe(0);
    expect(migrated.inventory).toEqual({});
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/save.test.js`
Expected: FAIL — `coins` undefined / saveVersion 1.

- [ ] **Step 3: Update defaultSave**

In `www/js/core/save.js`, replace the `defaultSave` return object with:
```js
  return {
    saveVersion: SAVE_VERSION,
    currentStage: 1,
    currentLevel: 1,
    completedLevels: [],
    stars: {},
    displayName: '',
    coins: 0,
    inventory: {},
    settings: { sound: true, language: 'EN' },
    adsWatchedToday: 0,
    adsDay: '',
  };
```
(No change needed to `migrate()` — it already merges over `defaultSave()`, so new fields auto-fill. Add one defensive coercion after the existing ones:)
```js
  if (!merged.inventory || typeof merged.inventory !== 'object') merged.inventory = {};
  if (!merged.settings || typeof merged.settings !== 'object') merged.settings = { sound: true, language: 'EN' };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/save.test.js`
Expected: PASS (all save tests, incl. the two new ones).

- [ ] **Step 5: Commit**

```bash
git add www/js/core/save.js tests/save.test.js
git commit -m "feat: save schema v2 (coins, inventory, settings)"
```

---

### Task 5: Scene transition (flame wipe)

**Files:** Modify `www/js/ui/sceneManager.js`; Modify `www/css/main.css`

**Interfaces:**
- Produces: `createSceneManager(root)` → `{ mount(sceneEl, opts?) }` where `opts.transition === 'flame'` plays a ~350ms wipe overlay before swapping. Default (no opts) behaves exactly as Plan 1 (instant `replaceChildren`).

> DOM task. Verified by browser smoke in Task 7.

- [ ] **Step 1: Add transition CSS**

Append to `www/css/main.css`:
```css
#kt-wipe { position:fixed; inset:0; z-index:300; pointer-events:none; opacity:0;
  background:radial-gradient(circle at 50% 60%, #e8550a, #6a1500 60%, #0d0a15);
}
#kt-wipe.run { animation:kt-flame .36s ease forwards; }
@keyframes kt-flame { 0%{opacity:0;} 40%{opacity:1;} 100%{opacity:0;} }
```

- [ ] **Step 2: Update sceneManager**

Replace `www/js/ui/sceneManager.js` with:
```js
export function createSceneManager(root) {
  function swap(sceneEl) {
    root.replaceChildren(sceneEl);
  }

  function mount(sceneEl, opts = {}) {
    if (opts.transition !== 'flame') return swap(sceneEl);
    const wipe = document.createElement('div');
    wipe.id = 'kt-wipe';
    document.body.appendChild(wipe);
    requestAnimationFrame(() => wipe.classList.add('run'));
    // swap at the peak of the wipe, remove after it finishes
    setTimeout(() => swap(sceneEl), 160);
    setTimeout(() => wipe.remove(), 380);
  }

  return { mount };
}
```

- [ ] **Step 3: Commit**

```bash
git add www/js/ui/sceneManager.js www/css/main.css
git commit -m "feat: flame-wipe scene transition"
```

---

### Task 6: Blacksmith shop scene

**Files:** Create `www/js/ui/blacksmith.js`; Modify `www/css/main.css`; Modify `www/js/data/config.js` (TEXT)

**Interfaces:**
- Consumes: `itemsForShop`, `BUNDLES`, `getItem` (items.js); `buyItem`, `buyBundle`, `countOf` (inventory.js); `persistSave` (save.js); `TEXT` (config.js).
- Produces: `createBlacksmithScene({ gameState, adapter, bus, onLeave })` → a scene element listing unlocked items + bundles with Buy buttons; buying mutates `gameState.save`, persists, emits `coins:spent`, and re-renders the coin total; a Leave button calls `onLeave()`.

> DOM task. Verified in Task 7 browser smoke.

- [ ] **Step 1: Add shop TEXT + styles**

In `www/js/data/config.js`, add to the `TEXT` object:
```js
  shopTitle: 'Blacksmith',
  buy: 'Buy',
  owned: 'Owned',
  bundles: 'Bundles',
  leave: 'Leave',
  coins: 'Coins',
  locked: 'Locked',
```
Append to `www/css/main.css`:
```css
#kt-shop { flex:1; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
#kt-shop h2 { color:var(--gold-lt); text-align:center; }
.kt-coinbar { text-align:center; color:#f5c842; font-weight:700; }
.kt-shop-item { display:flex; align-items:center; gap:10px; background:rgba(24,14,0,.7);
  border:1px solid rgba(107,76,26,.4); border-radius:8px; padding:10px 12px; }
.kt-shop-item .emoji { font-size:26px; }
.kt-shop-item .meta { flex:1; }
.kt-shop-item .name { color:#f5ead0; }
.kt-shop-item .cost { color:#a07832; font-size:13px; }
.kt-shop-buy { background:linear-gradient(180deg,#f0c050,#a06000); border:none; border-radius:6px;
  color:#2a1000; font-weight:700; padding:8px 14px; min-height:44px; min-width:64px; cursor:pointer; }
.kt-shop-buy:disabled { filter:grayscale(.7); opacity:.5; }
```

- [ ] **Step 2: Write the blacksmith scene**

Create `www/js/ui/blacksmith.js`:
```js
import { itemsForShop, BUNDLES, getItem } from '../data/items.js';
import { buyItem, buyBundle, countOf } from '../systems/inventory.js';
import { persistSave } from '../core/save.js';
import { TEXT } from '../data/config.js';

export function createBlacksmithScene({ gameState, adapter, bus, onLeave }) {
  const scene = document.createElement('div');
  scene.id = 'kt-shop';

  function render() {
    const save = gameState.save;
    const items = itemsForShop(save.currentStage || 1);
    scene.innerHTML = `<h2>${TEXT.shopTitle}</h2>
      <div class="kt-coinbar">🪙 ${TEXT.coins}: ${save.coins}</div>`;

    items.forEach((item) => scene.appendChild(itemRow(item)));

    const bdr = document.createElement('h2');
    bdr.textContent = TEXT.bundles;
    scene.appendChild(bdr);
    Object.values(BUNDLES).forEach((b) => scene.appendChild(bundleRow(b)));

    const leave = document.createElement('button');
    leave.className = 'kt-btn';
    leave.textContent = TEXT.leave;
    leave.addEventListener('click', onLeave);
    scene.appendChild(leave);
  }

  function itemRow(item) {
    const row = document.createElement('div');
    row.className = 'kt-shop-item';
    row.innerHTML = `<span class="emoji">${item.emoji}</span>
      <span class="meta"><div class="name">${item.name}</div>
      <div class="cost">${item.cost} 🪙 · ${TEXT.owned} ${countOf(gameState.save, item.id)}</div></span>`;
    const btn = document.createElement('button');
    btn.className = 'kt-shop-buy';
    btn.textContent = `${TEXT.buy}`;
    btn.disabled = gameState.save.coins < item.cost;
    btn.addEventListener('click', () => {
      const r = buyItem(gameState.save, item.id);
      if (r.ok) {
        gameState.save = r.save;
        persistSave(adapter, gameState.save);
        bus.emit('coins:spent', { id: item.id, cost: item.cost });
        render();
      }
    });
    row.appendChild(btn);
    return row;
  }

  function bundleRow(b) {
    const row = document.createElement('div');
    row.className = 'kt-shop-item';
    const contents = Object.entries(b.contents)
      .map(([id, q]) => `${q}× ${getItem(id).name}`)
      .join(', ');
    row.innerHTML = `<span class="emoji">🎁</span>
      <span class="meta"><div class="name">${b.name}</div>
      <div class="cost">${b.cost} 🪙 · ${contents}</div></span>`;
    const btn = document.createElement('button');
    btn.className = 'kt-shop-buy';
    btn.textContent = TEXT.buy;
    btn.disabled = gameState.save.coins < b.cost;
    btn.addEventListener('click', () => {
      const r = buyBundle(gameState.save, b.id);
      if (r.ok) {
        gameState.save = r.save;
        persistSave(adapter, gameState.save);
        bus.emit('coins:spent', { id: b.id, cost: b.cost });
        render();
      }
    });
    row.appendChild(btn);
    return row;
  }

  render();
  return scene;
}
```

- [ ] **Step 3: Commit**

```bash
git add www/js/ui/blacksmith.js www/css/main.css www/js/data/config.js
git commit -m "feat: blacksmith shop scene"
```

---

### Task 7: Integrate coins, power-up tray & Raven into the game scene

**Files:** Modify `www/js/ui/hud.js`, `www/js/ui/game.js`, `www/js/main.js`; Modify `www/js/data/config.js` (TEXT)

**Interfaces:**
- Consumes: `computeLevelReward`, `computeComboCoins`, `earnCoins` (economy.js); `countOf`, `consumeItem` (inventory.js); `persistSave` (save.js); flame transition (sceneManager).
- Produces:
  - `renderHud(...)` gains a coin field with `setCoins(n)`.
  - Game scene: tracks `maxCombo`, `usedPowerUp`; on win computes reward via economy and `earnCoins`, persists; shows a coin delta on the win overlay; offers a "Shop" button (flame transition to Blacksmith); renders a power-up tray of owned, level-legal power-ups (max 2 selectable); **Raven** flashes one real matching pair for 1s, consuming one Raven and emitting `powerup:used`.
  - `main.js`: shared `bus`/`adapter`; `onAdvance`/shop routing with flame transition.

> DOM/integration task. Gated by the browser smoke (Step 5) and on-device check (Step 6).

- [ ] **Step 1: Add HUD coins + TEXT**

In `www/js/data/config.js` `TEXT`, add:
```js
  shop: 'Shop',
  usePowerup: 'Power-ups',
  reward: 'Reward',
```
In `www/js/ui/hud.js`, add a coins item to the HUD HTML (after the time item) and a setter. Replace the HUD innerHTML's closing and add before `el.setTime`:
```js
  // inside renderHud, append a coins block to the innerHTML template:
  // <div class="kt-hud-item"><span class="kt-hud-label">Coins</span>
  //   <span class="kt-hud-value" id="kt-coins-val">0</span></div>
  el.setCoins = (n) => { el.querySelector('#kt-coins-val').textContent = n; };
```
Concretely, change the template string to include this as the last `.kt-hud-item`:
```html
    <div class="kt-hud-item">
      <span class="kt-hud-label">Coins</span>
      <span class="kt-hud-value" id="kt-coins-val">0</span>
    </div>
```
and add `el.setCoins` next to `el.setTime`.

- [ ] **Step 2: Add power-up tray styles**

Append to `www/css/main.css`:
```css
#kt-tray { flex:0 0 auto; display:flex; gap:8px; justify-content:center; padding:6px;
  background:rgba(6,4,0,.95); border-top:1px solid rgba(107,76,26,.3); }
.kt-power { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:48px;
  min-height:44px; background:none; border:1px solid #6b4c1a; border-radius:8px; padding:4px 8px;
  color:#f5c842; cursor:pointer; }
.kt-power:disabled { opacity:.4; }
.kt-power .cnt { font-size:11px; color:#a07832; }
.kt-tile.hint .kt-front { box-shadow:0 0 12px 3px #f5c842; }
.kt-overlay-reward { color:#f5c842; font-size:16px; }
.kt-overlay-row { display:flex; gap:12px; }
```

- [ ] **Step 3: Wire economy + Raven into the game scene**

In `www/js/ui/game.js`:

(a) Add imports at the top:
```js
import { computeLevelReward, computeComboCoins, earnCoins } from '../systems/economy.js';
import { countOf, consumeItem } from '../systems/inventory.js';
```
(b) Add tracking vars next to `finished`:
```js
  let combo = 0;
  let maxCombo = 0;
  let usedPowerUp = false;
```
(c) In `onTap`, after `match = state;` and the `bus.emit`, update combo on match/mismatch — replace the `if (result === 'mismatch')` / `else if (result === 'win')` block with:
```js
    if (result === 'match' || result === 'win') {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    }
    if (result === 'mismatch') {
      combo = 0;
      const el = board.querySelector(`[data-index="${index}"]`);
      el?.classList.add('wrong');
      setTimeout(() => {
        match = resolveMismatch(match);
        renderBoard();
      }, level.flipMemoryMs);
    } else if (result === 'win') {
      win();
    }
```
(d) Replace `win()` to compute and award coins:
```js
  function win() {
    finished = true;
    stopTimer();
    const stars = computeStars({
      mistakes: match.mistakes, pairs: match.totalPairs, timeUsed: elapsed, parTime: level.parTime,
    });
    const firstClear = !gameState.save.completedLevels.includes(level.id);
    const reward = computeLevelReward({
      stars,
      firstClear,
      noPowerUp: !usedPowerUp,
      noMistakes: match.mistakes === 0,
      speedClear: level.timeLimit != null && elapsed <= level.parTime,
      comboCoins: computeComboCoins(maxCombo),
    });
    const advanced = recordLevelResult(gameState, { stars });
    advanced.save = earnCoins(advanced.save, reward);
    persistSave(adapter, advanced.save);
    bus.emit('coins:earned', { amount: reward });
    showWin(stars, reward, advanced);
  }
```
(e) Add a `showWin` that shows stars, coin reward, Next and Shop buttons:
```js
  function showWin(stars, reward, advanced) {
    overlay.innerHTML = `
      <div id="kt-overlay-title">${TEXT.win}</div>
      <div id="kt-overlay-stars">${'⭐'.repeat(stars)}</div>
      <div class="kt-overlay-reward">+${reward} 🪙</div>`;
    const row = document.createElement('div');
    row.className = 'kt-overlay-row';
    const next = document.createElement('button');
    next.className = 'kt-btn';
    next.textContent = TEXT.next;
    next.addEventListener('click', () => onAdvance(advanced));
    const shop = document.createElement('button');
    shop.className = 'kt-btn';
    shop.textContent = TEXT.shop;
    shop.addEventListener('click', () => onShop(advanced));
    row.append(next, shop);
    overlay.appendChild(row);
    overlay.classList.add('show');
  }
```
(f) Accept `onShop` in the scene factory signature and add the power-up tray + Raven. Change the factory signature line to:
```js
export function createGameScene({ gameState, adapter, bus, onAdvance, onShop }) {
```
Add, before `renderBoard(); startTimer();`, a tray builder and the Raven effect:
```js
  const tray = document.createElement('div');
  tray.id = 'kt-tray';
  scene.appendChild(tray);

  function renderTray() {
    tray.replaceChildren();
    // Plan-2 scope: Raven only. Later plans add more power-up buttons here.
    const ravenCount = countOf(gameState.save, 'raven');
    const btn = document.createElement('button');
    btn.className = 'kt-power';
    btn.innerHTML = `🐦<span class="cnt">${ravenCount}</span>`;
    btn.disabled = ravenCount <= 0 || finished;
    btn.addEventListener('click', useRaven);
    tray.appendChild(btn);
  }

  function useRaven() {
    if (finished) return;
    const c = consumeItem(gameState.save, 'raven');
    if (!c.ok) return;
    gameState.save = c.save;
    usedPowerUp = true;
    persistSave(adapter, gameState.save);
    bus.emit('powerup:used', { id: 'raven' });
    flashRealPair();
    renderTray();
  }

  function flashRealPair() {
    // find two unmatched tiles with the same icon (a real pair)
    const byIcon = {};
    for (const t of match.tiles) {
      if (t.matched || t.isDecoy) continue;
      (byIcon[t.icon] = byIcon[t.icon] || []).push(t.index);
    }
    const pair = Object.values(byIcon).find((arr) => arr.length >= 2);
    if (!pair) return;
    pair.slice(0, 2).forEach((idx) => {
      const el = board.querySelector(`[data-index="${idx}"]`);
      el?.classList.add('hint');
      setTimeout(() => el?.classList.remove('hint'), 1000);
    });
  }
```
Call `renderTray()` right after `renderBoard()` at the bottom, and add `hud.setCoins(gameState.save.coins);` after the hud is appended.
Also update the `hud` creation to set coins initially (after `scene.append(hud, boardWrap, overlay);`):
```js
  hud.setCoins(gameState.save.coins);
```

- [ ] **Step 4: Route shop in main.js**

Replace `www/js/main.js` with:
```js
import { createPreferencesAdapter } from './platform/preferencesAdapter.js';
import { loadSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';
import { createBlacksmithScene } from './ui/blacksmith.js';

async function boot() {
  const adapter = createPreferencesAdapter();
  const bus = createEventBus();
  const scenes = createSceneManager(document.getElementById('app'));
  let gameState = createGameState(await loadSave(adapter));

  function showGame(gs, opts) {
    gameState = gs;
    scenes.mount(
      createGameScene({
        gameState, adapter, bus,
        onAdvance: (next) => showGame(next),
        onShop: (next) => showShop(next),
      }),
      opts
    );
  }

  function showShop(gs) {
    gameState = gs;
    scenes.mount(
      createBlacksmithScene({
        gameState, adapter, bus,
        onLeave: () => showGame(gameState, { transition: 'flame' }),
      }),
      { transition: 'flame' }
    );
  }

  showGame(gameState);
}

boot();
```

- [ ] **Step 5: Browser smoke check**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx serve www
```
Open the URL. Expected: HUD shows a Coins field. Clear a level → overlay shows stars + "+N 🪙"; coins increase. Click **Shop** → flame wipe → Blacksmith lists Raven (and other Stage-1-unlocked items) + bundles; buy Raven (coins drop, Owned increments); **Leave** → flame wipe back. Back in a level, the 🐦 tray button shows the owned count; tapping it briefly glows a real matching pair and decrements the count. Reload → coins and owned items persist.

- [ ] **Step 6: On-device acceptance**

Run:
```bash
cd /d/Workspace/KnightTreasure && npx cap sync android && npx cap run android
```
On the Redmi: earn coins, enter the shop via flame transition, buy Raven and a bundle, use Raven in a level, force-kill & relaunch → coins + inventory intact. Transitions are smooth.

- [ ] **Step 7: Commit**

```bash
git add www/js/ui/hud.js www/js/ui/game.js www/js/main.js www/js/data/config.js www/css/main.css
git commit -m "feat: coin HUD, win reward, power-up tray + Raven, shop routing"
```

---

## Self-Review

**Spec coverage (vs design-decisions doc + GDD economy/shop):**
- Coin earning sources (base, stars, first-clear, no-power-up, no-mistakes, speed, combo) → Task 1 ✓
- Anti-grind: first-clear-once (via `completedLevels`), combo cap 20 → Tasks 1, 7 ✓
- Unified item model + 12 power-ups incl. Holy Water + consumables (D1/D2/D10) → Task 2 ✓
- Bundles (Starter/Explorer/Warrior/Champion, mixed categories) → Tasks 2, 6 ✓
- Buy/own/consume + unlock gating → Task 3 ✓
- Blacksmith scene + flame transition (GDD) → Tasks 5, 6 ✓
- Power-up framework + Raven effect + "no power-up used" tracking → Task 7 ✓
- Save v2 + non-destructive migration → Task 4 ✓
- **Deferred (later plans):** remaining 11 power-up effects + interaction matrix (Phase 2 breadth plan), consumable *use* (needs stamina — Plan 3), ad reward counters wiring (Phase 5).

**Placeholder scan:** every code step is complete; tray explicitly notes Raven-only scope with the extension point. No TBD/TODO. ✓

**Type consistency:** `spendCoins` returns `{save, ok}` used identically in economy/inventory. `countOf/consumeItem/buyItem` signatures match between Task 3 and Tasks 6–7. `gameState.save` mutation pattern matches Plan 1's `recordLevelResult` (returns new state; scenes reassign `gameState.save`). `renderHud` `setCoins`/`setTime` both defined. `createGameScene` gains `onShop` — `main.js` supplies it. ✓

---

## Verification (end-to-end)
1. `npx vitest run` → economy, items, inventory, save (v2) suites green + all Plan 1 suites still green.
2. Browser: earn → shop (flame) → buy → use Raven → reload-persists (Task 7 Step 5).
3. Device: full economy + shop + Raven + kill/relaunch persistence (Task 7 Step 6).
