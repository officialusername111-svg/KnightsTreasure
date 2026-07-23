> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Knight's Treasure — Design Decisions & Mechanics Specification

> **Status:** Authoritative. This document resolves every open/ambiguous point in the GDD and fully specifies all mechanics. All implementation plans reference it. Decisions were delegated to the implementer (owner: "all decision making is handed to you") and are recorded here for the owner's batch review. Where a decision is reversible, the alternative is noted so the owner can override.
> **Date:** 2026-06-21 · **Owner review:** pending

Each decision: **D#** — the decision · **Why** · **Affects** · (**Override** if the owner wants the other path).

---

## Part A — Resolutions to GDD inconsistencies

### D1 — Unified inventory-item model (resolves "shop bundles mix consumables & power-ups")
**Decision:** One data model, `InventoryItem = { id, name, emoji, category, cost, unlockStage, effect }`, with `category ∈ 'powerup' | 'consumable'`. Power-ups are used inside a level; consumables (stamina drinks, Feast, Knight's Brew) are used from menus. Bundles reference any item ids regardless of category, so "Warrior's Pack = Feast + Shield" and "Champion's Pack = Knight's Brew + Torch" work cleanly. The owner's `powerUps` save map becomes a single `inventory` map (id → count) holding both categories.
**Why:** The GDD already sells mixed bundles; a split model would force awkward special-casing. One model keeps shop, bundles, and save uniform.
**Affects:** `data/powerups.js` (renamed conceptually to the item registry), shop scene, save schema, Tavern drinks.

### D2 — Add "Holy Water" as a real power-up (resolves the missing unlock item)
**Decision:** Add **🜍 Holy Water** to the item registry — category `powerup`, unlocks Stage 7, cost **40🪙**, effect: *removes the chains from all locked tiles for the current level.* This brings the power-up count to **12** (the GDD's 11 + Holy Water).
**Why:** The GDD's Locked-tile section explicitly says "Holy Water power-up removes locks," but the power-up table omits it. Adding it is truer to intent than repurposing Spear/Sword (which are reveal tools).
**Affects:** item registry, Locked mechanic (D9), power-up count copy anywhere it says "11".
**Override:** drop Holy Water and use progressive auto-unlock only (see D9) — then locks need no dedicated item.

### D3 — Star rating works without a visible timer
**Decision:** Stars derive from mistakes + an internal **par time**, even on untimed levels. Formula (already in `scoring.js`): start 3; `mistakes/pairs > 0.34` → −1; `mistakes/pairs > 1.0` → −1; `timeUsed > parTime` → −1; clamp [1,3]. `parTime = timeLimit ? round(timeLimit*0.6) : pairs*6`. Untimed levels still track elapsed time internally for `parTime`.
**Why:** Stage 1 has no countdown but the GDD rates "fast completion." An internal par lets early levels still award 3 vs 1 stars fairly.
**Affects:** `scoring.js`, `difficulty.js` (`parTime`), game scene (tracks `elapsed`).

### D4 — Parameterized boss-level template (resolves "boss gimmicks undefined")
**Decision:** Level 25 of every stage uses a boss template:
```
boss = {
  timeLimit: 90,                       // GDD: bosses get more time
  mechanics: [...thisStageMechanics],  // all mechanics the stage taught
  preview: nextStageMechanic | null,   // a small taste of what's next (≤2 tiles)
  scoreThreshold: <stage-scaled>,      // hit it for the 3rd star (in addition to D3)
  gimmick: <one per stage, see D-table>,
  story: 'boss',                       // bookended by opening + completion cutscene
}
```
The 3rd star on a boss requires **both** the D3 star conditions **and** `computeScore ≥ scoreThreshold`.
Per-stage gimmick (one line each): S1 none (pure speed) · S2 timer ticks 1.25× · S3 board pre-shown for 2s then hidden · S4 all-hidden (fast flip) · S5 extra decoys · S6 faster moves · S7 more locks · S8 two mechanics rotate mid-level · S9 all mechanics · S10 all mechanics + shrinking timer.
**Why:** Gives content designers a single knob-set; keeps bosses distinct without bespoke code each.
**Affects:** `difficulty.js` (boss params), `levels.js`, story system, Plan covering Phase 3.

### D5 — Content rating & ads stance
**Decision:** Target **ESRB Everyone / PEGI 3**, Play Console target-age **general audiences incl. teens, NOT designated "primarily child-directed."** AdMob: rewarded ads only, **G-rated content filter**, **non-personalized by default**, honoring the GDD caps (3/day stamina ad, etc.). A privacy policy is required for release.
**Why:** Keeps rewarded ads (a core economy lever) viable while staying family-friendly. Designating "primarily child-directed" would force a Families-compliant ad SDK and kill personalized monetization — not warranted for a teen+ medieval game.
**Affects:** Phase 5 (ads), Play Store release checklist.
**Override:** If the owner wants under-13 as the primary audience, switch to Families policy + drop personalized ads (revenue impact).

### D14 — Stage-completion badges (one per stage) — added 2026-06-21
**Decision:** Add **10 collectible stage badges**, one per stage, earned when the player clears that stage's Boss level (`"{stage}-25"` in `completedLevels`). Each badge has a stage-themed motif (forest leaf → village house → river wave → cave crystal → bandit daggers → castle portcullis → dungeon chain/key → throne crown → dragon → treasure chest). They are **cosmetic** — displayed on the level map and player profile — with **no mechanical effect**. They are separate from the 4 rank badges (D-existing) and the 3 streak title emblems.
**Why:** Gives each stage a tangible completion reward and a collection meta-goal, reinforcing progression without touching the economy/balance.
**Affects:** assets (`badges/badge_stage{n}_{theme}.png` ×10 — see asset checklist + prompt pack), map/profile UI (Phase 3/6). **No save change:** earned-state is derived from `completedLevels` (no new field).
**Override:** make them purely decorative map markers, or attach a small one-time coin reward per badge.

### D15 — Ranks above Commander (post-game mastery tier) — added 2026-06-21
**Decision:** Extend the knight rank ladder past Commander with **3 new ranks earned by total stars collected** (max 750 = 250 levels × 3★). The ladder becomes two phases — stage-based, then star-based:

| Rank | Badge metal | Earned when |
|---|---|---|
| Apprentice Knight | Iron | default (existing) |
| Basic Knight | Bronze | Stage 3 complete (existing) |
| Captain Knight | Silver | Stage 5 complete (existing) |
| Commander Knight | Gold | Stage 10 complete (existing) |
| **Champion Knight** | **Platinum** | **500★ total** |
| **Paladin Knight** | **Diamond** | **625★ total** |
| **Grandmaster Knight** | **Mythril (radiant)** | **750★ total** (every level 3-starred) |

**Why:** Commander is reached the moment all stages are cleared, leaving no chase. Star milestones give end-game mastery goals; 500★+ inherently requires all 250 levels done, so the new ranks sit naturally after Commander. Distinct from the daily-duty **titles** (Blazing/Shadow/Legendary) — ranks and titles remain separate systems.
**Affects:** `ranks.js` derivation (Plan 6) — `rankFor(save)` now also reads total stars (sum of `save.stars`); 3 new rank badges (`badges/badge_champion.png`, `badge_paladin.png`, `badge_grandmaster.png`). **No save change:** derived from existing `stars` map.
**Override:** swap the star thresholds, or base the post-Commander ranks on a different metric (coins earned, daily-duty streak, leaderboard placement).

### D16 — Game-scene visual direction (approved via mockup 2026-06-22)
**Decision:** The Stage-1 game scene uses **full custom art, not emoji/CSS**:
- Tile **fronts** = the custom **framed** tile icons (`assets/images/tiles/tile_*.png`) — each icon image is a complete tile face (ornate gold frame + dark crimson/brown inset panel + centered object), so the front is rendered as the `<img>` with NO separate CSS tile border. Tile **backs** = `tile_back.png`; board sits over `bg_stage1_forest.png`. **Frame + inset must be identical across all tiles** so the board reads as a uniform set — only the central object changes. (Reverses the earlier frameless tile decision: the existing 12 frameless icons are to be re-generated framed for consistency — all 48 framed.)
- `ICON_POOL` in `config.js` becomes a list of tile-icon **asset base-names** (e.g. `'tile_sword'`), not emoji. The match engine is unchanged (it matches on the icon string identity); the game scene renders each as `<img src="assets/images/tiles/{icon}.png">`.
- **Tile-icon set expanded from 12 → 48** for variety (a 12-pair board uses 12 unique icons). All 48 use the framed-tile prompt. The 36 additions, grouped: **Heraldic beasts** — dragon, wolf, stag, owl, falcon, boar, warhorse, serpent, griffin; **Treasure/relics** — chalice, amulet, orb, scepter, ingot, chest, grail, rune, goblet; **Arms/armor** — axe, mace, dagger, spear, crossbow, gauntlet, warhammer, flail, buckler; **Provisions/nature** — apple, bread, cheese, turkey, grapes, mushroom, acorn, honey, wheat. Files: `tile_<name>.png`. (The existing 12 are enough to build/run Stage 1; the 36 add variety when generated.)
- **HUD (in-play):** rank badge + name, coins (top-right), Stage / Level / Time. **No live score** in-play.
- **Score:** the leaderboard metric — shown only on the **Level Cleared results overlay** (with breakdown) and submitted to the leaderboard; not a live HUD number.
- **Power-ups:** a **bottom tray** of owned-power-up chips with counts (max 2 active/level, greyed at 0). Tray space reserved in Plan 1; framework + Raven in Plan 2.
**Affects:** `config.js` (`ICON_POOL`), Plan 1 Tasks 8–9 (image tiles, forest bg, tray, results-overlay score) — these supersede the plan's emoji/CSS code for the game scene. Match/scoring/state logic unchanged.

### D17 — Home hub redesign + feedback polish (approved 2026-06-22, ref: stage-hub mockup)
**Decision:** Reshape the home into a **full-bleed stage hub** (reference-inspired):
- **Background = the current stage's art** (`bg_stage{n}`), full-screen, swapping per stage, with a scrim + ambient embers.
- **Top resource bar (overlaid):** rank/level · **stamina** (5 max + regen timer) · **coins** · settings. Stamina (Plan 3) and coins (Plan 2) render as display placeholders (5/5, 0) until those systems exist. No gems/seasons/modes/mail (not in GDD).
- **Upper-center:** stage name ("Stage 1 · The Forest Path") + progress bar ("Level 21/25").
- **Play** (bottom): "Continue · Level N", costs ⚡1 stamina once stamina exists.
- **Bottom icon nav:** Quests · The Inn · Glory · Ranks (unbuilt → themed placeholder + Back, per the home-hub work). New nav icons generated.
- **First-launch name entry:** before the home first appears (no `displayName`), a small parchment interaction asks the knight's name → saves `displayName`. Reuses parchment art.
- **Bigger tiles:** CSS-only — increase tile/board scale for phone readability. No asset.
- **Win / Game Over:** results overlay gains a decorative **banner** (`ui_banner_victory` / `ui_banner_defeat`, text-free for i18n) above the existing localized title + stars/score; buttons unchanged (Next Level / Try Again).
- **How to earn coins:** tapping the coins pill opens a small info panel listing GDD earn sources; uses `ui_coin_pouch`. No new asset.
**New assets (7):** `ui_banner_victory`, `ui_banner_defeat`, `ui_stamina`, `ui_nav_quests`, `ui_nav_inn`, `ui_nav_glory`, `ui_nav_rank` — prompts in the prompt pack §7.
**Affects:** `home.js`/`home.css` (full-bleed restyle + nav icons), a new name-entry scene, `game.js` (bigger board CSS, banner in overlay, coins-info panel). Supersedes the first home-hub pass (516f313). Logic modules unchanged.

---

## Part B — Core mechanic specifications

### D6 — Decoy tiles (Stage 5)
A level may declare `decoyCount`. The board holds `pairs*2 + decoyCount` tiles; decoy tiles carry a unique icon (no partner) and `isDecoy: true`. **Win = all real pairs matched** (decoys never need matching). Tapping a decoy reveals it, then it flips back after the block's flip-memory time; **a decoy reveal does not increment `mistakes`** (it isn't a wrong *pair*) but it costs time. If a decoy is the second pick of a turn, it's treated as a non-match (flip both back) but still not counted as a mistake. **Coin bonus:** clearing the level without ever leaving a decoy face-up as a *committed second pick* awards "Decoy avoided" +5 (GDD). Eagle Eye highlights only real pairs.
**Implements GDD:** "Some tiles have no match — tapping them costs a flip."

### D7 — Hidden tiles (Stage 4)
Stage 4 sets `hiddenFlipFactor` (default **0.6**). Flip-memory for the level = `round(blockFlipMemoryMs * hiddenFlipFactor)` — tiles flip back faster, harder to track. Torch and Eagle Eye reveal/highlight normally (counter the speed). At the data level this is just a multiplier on the difficulty value; no special tile flag needed unless we later want per-tile hiding.
**Implements GDD:** "Tiles flip back faster than normal."

### D8 — Moving tiles (Stage 6) — telegraphed swap (per challenge-report workaround)
Level declares `moveIntervalMs` (default **8000**) and `moveCount` (default **1** swap per tick). Every interval, pick `moveCount` pairs of **face-down, unmatched** tiles and **animate a position swap** over ~600ms (a visible slide so the player can track it). Matched and face-up tiles never move. Movement **pauses** while any tile is face-up mid-turn, during power-up reveals, and while the game is paused. Gauntlet/Boss use a shorter interval.
**Why telegraphed swaps not teleports:** raw shuffling fights spatial memory and feels unfair (challenge #1); a tracked slide preserves fairness.
**Implements GDD:** "Tiles shift position periodically — player must track movement."

### D9 — Locked tiles (Stage 7) — never a paywall
Level declares `lockedCount` and `unlockAfterMatches` (default **2**). Locked tiles render with a chain overlay and cannot be flipped. They unlock **progressively**: after every `unlockAfterMatches` successful matches, one locked tile loses its chain. **Holy Water** (D2) removes all chains instantly. This guarantees every locked level is completable without spending coins.
**Implements GDD:** "Tiles locked with a chain — must be unlocked first; Holy Water removes locks."

---

## Part C — Power-up system rules

### D10 — Item registry (12 power-ups + consumables)
Power-ups (category `powerup`): Raven 20🪙/S1 · Hourglass 30🪙/S2 · Arrow 35🪙/S3 · Torch 50🪙/S4 · Eagle Eye 55🪙/S5 · Shield 45🪙/S6 · Spear 40🪙/S7 · **Holy Water 40🪙/S7** · Sword 65🪙/S8 · Bomb 80🪙/S9 · War Horn 60🪙/S10 · King's Decree 200🪙/all-complete.
Consumables (category `consumable`, Tavern): Ale 15🪙(+1 stam) · Wine 25🪙(+2) · Mead 35🪙(+3) · Feast 60🪙(full) · Knight's Brew 90🪙(full + next-level 2★ floor).
Effects are data-driven where possible; complex effects (Bomb 2×2 reveal) are coded handlers keyed by id.

### D11 — Power-up usage rules
Max **2** power-ups active per level · no stacking the same power-up · **King's Decree disabled on boss levels** · **no power-ups on Daily Challenge levels** · permanent reveals (Arrow, Sword, Bomb) apply a **−25 score penalty each** · Hourglass/Shield affect the timer (no-op on untimed levels — disabled in UI there).

### D12 — Power-up × mechanic interaction matrix
| Power-up | Decoy | Hidden | Moving | Locked |
|---|---|---|---|---|
| Raven (flash a real pair) | flashes a **real** pair only | normal | movement pauses during flash | won't pick locked tiles |
| Torch (reveal all 3s) | decoys shown **dimmed** | reveals despite fast-flip | movement pauses during reveal | shows locked icons but they stay locked |
| Eagle Eye (glow real pairs 5s) | glows real pairs only (decoy-finder) | normal | pauses during glow | ignores locked |
| Arrow / Sword / Bomb (permanent reveal) | never reveals a decoy as "matchable" | normal | revealed tiles are **pinned** (won't move) | cannot target locked tiles |
| Hourglass / Shield (timer) | n/a | n/a | n/a | n/a |
| Spear (reveal row/col 3s) | dims decoys in the line | reveals | pauses during reveal | locked in line stay locked |
| War Horn (2× score 10s) | — | — | — | — |
**Rule of thumb:** any reveal **pauses movement** for its duration and **never validates a decoy**; permanent reveals **pin** their tiles against movement.

### D13 — Combo & coin rules (anti-grind preserved)
Combo = consecutive matches with no mismatch between them. At combo length ≥3, each further match grants escalating coins, **capped at +20/level**: `comboCoins = min(20, sum over matches#3.. of clamp(match#-2,1,5))`. Mismatch resets combo to 0. Anti-grind (GDD, kept): first-clear bonus once per level (tracked via `completedLevels`); rewarded-ad cap 3/day; combo cap 20/level; daily content resets at local midnight (server time once online — D5/Phase 5).

---

## Part D — Save schema evolution (single source: `save.js` + `config.js`)
Schema grows by **extending `defaultSave()` and bumping `SAVE_VERSION`**; `migrate()` merges old saves over the new defaults (missing fields get defaults — no destructive migration, ever).
- **v1** (Plan 1): `saveVersion, currentStage, currentLevel, completedLevels[], stars{}, displayName`.
- **v2** (Plan 2): + `coins: 0`, `inventory: {}` (id→count, both categories), `settings: { sound: true, language: 'EN' }`, `adsWatchedToday: 0`, `adsDay: ''`.
- **v3** (Plan 3): + `stamina: 5`, `staminaLastUpdated: <ts>`, `staminaMaxSeen: <ts>` (clock-rollback guard), `storyProgress: {}`, `streakDays: 0`, `lastLogin: ''`.
- **v4** (social/meta): + `rankHistory`, `mail[]`, `broadcast`, `pendingFanfare[]`, `bestScores`, `achievements`, `dailyDuty`, `talesHeard`, `seenIntros`.
- **v5** (onboarding, 2026-06-25): + `tutorialSeen: false` (first-launch tutorial shown once; replayable from Settings).
- **v6** (contextual tutorials, 2026-06-25): + `tutorialsSeen: {}` (mechanic/feature key → true; each new-mechanic lesson shown once on first encounter).

---

## Part F — Delegated decisions, 2026-06-25 batch (owner delegated "Safe + Gated" work)
These were built autonomously at the owner's explicit direction; recorded here per the project exactness rule.

### D18 — Per-stage tile themes (Plan 5)
Each stage's boards draw icons from a thematically-fitting subset of `ICON_POOL`, defined in `data/tiles.js` `STAGE_TILES` (forest → woodland/quarry icons; village → food/trade; … throne → regalia; lair → beasts/hoard; final → treasure). Pools overlap (43 icons across 10 stages) and each holds **≥16 distinct** icons — enough for the largest board (12 pairs) plus boss decoys (≤4). `tilePoolForStage(stage)` falls back to the full pool if a stage is missing. Backgrounds remain per-stage via `STAGE_BG`.

### D19 — Boss template realized (implements D4)
`levels.js applyBoss()` sets per-stage `bossGimmick`, `timeLimit: 90`, and `scoreThreshold = 600 + (stage−1)·150`. Gimmick→effect mapping: `fast_timer` → `timeDrainRate 1.25`; `preshow` → `preShowMs 2000` (board flashed then hidden before play); `all_hidden` → 0.5× flip-memory; `extra_decoys` → +2 decoys; `fast_moves` → `moveIntervalMs 5000`; `more_locks` → +1 lock; `rotate` (S8) → **both decoy + moving active** (simplified from "rotate mid-level" — full rotation deferred, documented); `all_mechanics`/`final` → every mechanic on; `final` adds `shrinkTimer` (drain rate rises ~1→2 over 60s). The 3rd star needs the D3 conditions **and** `score ≥ scoreThreshold`.

### D20 — "Max 2 active power-ups" scope (clarifies D11)
"Active" = **durational** power-ups only (`shield`, `warHorn`). Instant reveals (raven/arrow/sword/bomb) and short visual reveals (torch/eagleEye/spear/king's decree) are not counted. Enforced in `game.js usePower`: a durational buff is blocked if already active or if 2 are already running.

### D21 — Tutorial content (Plan 3)
First-launch tutorial is a 4-step dialog (`ui/tutorial.js`): welcome → reveal & match → clear the board / stars → power-ups & rest. Shown once on level 1-1 (gated on `tutorialSeen`, after the opening story beat), gates the timer until dismissed, and is replayable from Settings → Replay tutorial. Uses the shared `.kt-info` styling.

### D27 — Scroll fix + matched-tile indicator (2026-06-25, owner feedback)
- **No more animation scroll:** `#app`/`#kt-game`/`#kt-board-wrap` are now `overflow:hidden`; the board is sized to fit both wrap dimensions via a `ResizeObserver` (`fitBoard` in game.js), so the board never needs to scroll and transforms (flip, shake, quake, fire-spread) can't spill scrollbars. The scaling fire-glow now mounts inside `#kt-board` (clipped).
- **Matched indicator:** the loud green glow is removed. Matched pairs now **settle quietly** — gently fade (opacity .8) + slight desaturate — with a small **gold ✓ seal** in the corner. (Alternatives offered to owner: gold border, fold-back/shrink, or a linked-ribbon — pending choice.)

### D26 — Power-up cast animations (2026-06-25, owner request)
Each power-up now plays a custom cast that **originates from its tray button** and resolves on impact (`animations.js`: `castProjectile`, `tileShake`, `boardWave`, `shieldBubble`; styles in `main.css`). The flying projectile is the power-up's own icon art.
- **Arrow / Sword / Bomb** — projectile flies to the target tile(s); on landing the tile(s) shake + spark, then reveal permanently (Bomb lobs in an arc and bursts over its 2×2).
- **Spear** — thrusts to the chosen row, which then flips. **Raven** — flutters to a real pair, which pulses.
- **Torch / Eagle Eye / King's Decree / War Horn** — expanding rings (`boardWave`) sweep from the button (warm for Torch, gold for the rest) alongside the existing reveal/glow/badge.
- **Hourglass** — flies up to the HUD timer, then +15s with a sparkle. **Shield** — wraps the board in a shimmering bubble for its freeze. **Holy Water** — a droplet flies to each chained tile, shattering it on impact.
- `prefers-reduced-motion` skips the flight and fires the reveal immediately; a timeout fallback guarantees the reveal even if the animation finish event is throttled. Replaces the old generic power-up fanfare.
- **Scaled up (2026-06-25):** projectile is a 60px glowing element with a live **comet trail**; impact = a **shockwave ring + white flash + stronger particle burst** (`castImpact`); Bomb adds a board **quake**; rings/shake enlarged.
- **Distinct per-power casts (2026-06-25):** Arrow **thuds + sticks** then reveals; Sword **slashes** across the pair (`slashAcross`) with a glint; Bomb lobs → **board flash** + quake; Spear is a **horizontal streak** sweeping the row (`streakReveal`); Raven scatters **feathers** (`burst` 'feather'); Eagle Eye opens an **iris** (`irisBloom`); Torch/King's Decree use the center-out bloom (`igniteReveal`, gold tone for Decree); Hourglass flies to the timer; Shield **slams** (flash + blue ripple + bubble); Holy Water shatters chains with **shards**; War Horn rings + a **gold edge vignette** (`edgePulse`) for its 10s.

### D25 — Tutorials made interactive + NPC-led (2026-06-25, owner request)
- **Interactive basics (level 1-1):** the board stays live and tappable while the **Forest Guard** is docked at the bottom (circular portrait + parchment speech bubble) and reacts to the player's *real* taps via the event bus — no "Next" button. Beats: "tap a tile" (board pulses) → on `tile:flip` "find its twin" → on `tile:mismatch` "not a pair, remember them" (portrait turns *alert*) → on `tile:match` "well matched, clear them all" (Got it). 1-1 is untimed, so play and guidance run concurrently.
- **Per-stage NPC mechanic lessons:** each new mechanic is introduced over a dimmed board by a stage-fitting guide — **Cave Spirit** (hidden), **Bandit Captain** (decoys), **Castle Guard** (moving), **Dungeon Prisoner** (chains), **Blacksmith** (power-ups). Shown once each (`tutorialsSeen`), queued in sequence, skipped on daily challenges.
- **Settings → Replay tutorial:** a narrated 4-step Forest Guard walkthrough (no live board needed).
- Implemented in `ui/tutorial.js` (`showInteractiveTutorial` / `showMechanicTutorial` / `showTutorial`) + a shared NPC dock; supersedes D21's static cards.

### D24 — War Horn + decoy-dim completed (2026-06-25)
- **War Horn (D10/D11):** now live. Each match made within its 10s window banks **+100 bonus** (doubling the match's base 100 → 200), summed into the final score as a "War Horn ×2" breakdown line. A floating "Double Score · 10s" badge marks the window; counts as a durational buff under the D11 max-2 rule. (Combo/time components are not doubled — only the per-match value.)
- **Decoy-dim (D12):** Torch, Spear, and King's Decree now reveal decoy tiles **dimmed with a red ring** (`.kt-decoy-dim`) so the player can tell real pairs from decoys during a reveal. Eagle Eye/Raven already target reals only. **All 12 power-ups are now implemented.**

### D23 — UI feedback batch (2026-06-25, owner punch-list)
- **Matched-pair glow:** matched tiles settle into a persistent green ring/glow (`.kt-tile.matched`) after the gold match-pop, so cleared pairs read at a glance.
- **Mail:** paginated **10 per page** (`mail.js` PER_PAGE) with Prev/Next; per-row **delete** + a **"Clear read"** bulk button (`social.deleteMail`/`clearReadMail`).
- **Leaderboard top-3:** ranks 1-3 render as a gold/silver/bronze **podium** (crown on #1); ranks 4+ stay as the list.
- **Glory placements:** the knight's diary is **paged like a book** (4 entries/page, ❮ ❯ arrows).
- **Contextual tutorials:** first time a level introduces locked/moving/decoy/hidden tiles — or the player first has a usable power-up — a one-card lesson shows (queued in sequence, gated by `tutorialsSeen`), skipped on daily challenges.

### D22 — Moving-tiles rendering (implements D8)
Swaps reorder the two tiles' **DOM nodes** (FLIP slide ~0.6s); the model index stays the tile's identity, so taps still match and `match.js` purity holds. Movement pauses mid-turn, during any reveal, while backgrounded, and once finished (`movementPaused()`); permanent-reveal tiles are pinned. Scheduler (`mechanics.chooseSwaps`) is unit-tested. **Open for on-device feel review:** swap cadence/telegraph timing — unobservable in the headless preview (timer throttling), so tuning wants a real device.

---

## Part E — Naming & event conventions (exactness)
- Level id: `"{stage}-{levelInStage}"` (1-based both).
- Event bus event names: `tile:flip`, `tile:match`, `tile:mismatch`, `tile:win`, `level:complete`, `coins:earned`, `coins:spent`, `stamina:spent`, `stamina:regen`, `powerup:used`, `scene:change`.
- Difficulty values come ONLY from `difficulty.js`. Item data ONLY from the item registry. Strings ONLY from `config.js` `TEXT` (EN now; HIL slot later).

---

## Open items that genuinely need the OWNER (not delegated — money/legal/brand)
These are flagged, not decided, because they're outside design authority:
1. **Monetization model** — are there paid IAPs (coin packs / remove-ads), or ads-only? (affects Play billing setup)
2. **Firebase project ownership** — whose Google account/project hosts Firestore + the AdMob app id?
3. **Hiligaynon translator** — who provides/reviews the translation? (quality gate)
4. **Final art direction sign-off** — the style guide needs one human approval before bulk art production.
