> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Feature Batch Report — 2026-06-25 (for owner review)

You delegated the "Safe to do autonomously" **and** "Needs your gate" items from the remaining-work
audit. All are built, verified, and documented. **54/54 unit tests pass; no console errors.** Per the
project exactness rule, every delegated design call is recorded in the decisions doc (D18–D22, save v5).

> Changes are **uncommitted** in the working tree for your review. Say the word and I'll commit them as
> a clean, logically-grouped set.

---

## 1. Locked tiles + Holy Water (Plan 4 / D9) — ✅ verified
- Per-tile `locked` flag in `match.js`; locked tiles render a chain/padlock overlay and **can't be flipped**.
- **Progressive unlock**: one chain falls every `unlockAfterMatches` (default 2) matches — guarantees every
  locked level is completable without spending coins.
- **Holy Water** power-up strips all chains at once (`removeAllLocks`). Was a no-op before (no mechanic to act on).
- Auto-applied on Stage 7+ hard blocks via `mechanics.mechanicsFor`.
- *Verified live (Stage 7):* 2 chained tiles shown, tap on a locked tile ignored, Holy Water cleared both. Unit-tested.

## 2. `mechanics.js` extraction + cleanups (Plan 4 / housekeeping) — ✅
- New pure module `systems/mechanics.js`: `mechanicsFor` (moved out of `levels.js`), `chooseSwaps` (D8), `chooseLocked` (D9).
- Cleanups: `LEVELS_PER_STAGE` constant (was magic `25` ×2); `getLevel` now memoizes per stage.
- New `tests/mechanics.test.js` (9 cases) + locked-tile cases in `match.test.js`.

## 3. Moving tiles (Plan 4 / D8) — ✅ built, ⚠️ feel needs on-device check
- Telegraphed swap scheduler: every `moveIntervalMs`, `chooseSwaps` picks face-down/unmatched/unlocked/unpinned
  tiles; `doSwaps` reorders their **DOM nodes** with a ~0.6s FLIP slide. Model identity is unchanged, so taps
  still resolve correctly and `match.js` stays pure.
- **Pauses** mid-turn, during reveals, while backgrounded, and once finished. Permanent-reveal tiles are pinned.
- Auto-applied on Stage 6+ late blocks.
- *Verified:* scheduler logic unit-tested; the DOM-swap mechanism verified live (positions exchange, a tap on a
  moved node still flips the correct tile). **The swap cadence/telegraph couldn't be watched in the headless
  preview** (it throttles timers; movement also correctly pauses when the tab reports hidden) — so the *feel/timing*
  is the one thing worth a quick look on a real device.

## 4. Max-2 active power-ups (Plan 4 / D11) — ✅
- `usePower` blocks a durational buff (`shield`/`warHorn`) if it's already active or 2 buffs are already running.
  Instant/short reveals are unrestricted. (Scope clarified in D20.)

## 5. Per-stage tile themes (Plan 5 / D18) — ✅ verified
- `data/tiles.js STAGE_TILES`: each stage draws from a themed icon subset (≥16 distinct each). Castle Gates shows
  arms/armor; Throne Room shows regalia; etc. Falls back to the full pool if a stage is missing.
- *Verified live:* the Stage 6 board rendered only castle-arms icons (shield/gauntlet/spear/mace/flail/warhammer/crown).

## 6. Boss template (Plan 5 / D4 → D19) — ✅ verified (data)
- `levels.js applyBoss()` gives every level 25 a `bossGimmick`, 90s timer, and `scoreThreshold = 600 + (stage−1)·150`.
- Gimmicks wired in `game.js`: pre-show reveal (S3), time-drain (S2 1.25×), shrinking clock (S10), plus param
  gimmicks (extra decoys/locks, faster moves). 3rd star requires the score threshold **and** the D3 conditions.
- *Verified:* boss configs across S1/2/3/6/7/10 carry the right gimmick, threshold, time, and mechanic params.
- **Simplification (documented):** S8 "rotate mechanics mid-level" → both mechanics active at once. Full mid-level
  rotation deferred as a polish item.

## 7. Tutorial (Plan 3 / D21) — ✅ verified
- New `ui/tutorial.js`: a 4-step first-launch dialog (welcome → reveal & match → clear/stars → power-ups & rest).
- Shows once on level 1-1 (after the opening story beat), **gates the timer** until dismissed, persists
  `tutorialSeen` (save v5), and is **replayable** from Settings → Replay tutorial.
- *Verified live:* appeared on a fresh save, stepped through 4 dots, persisted the flag, handed off to play.

---

## Files touched
**New:** `www/js/systems/mechanics.js`, `www/js/data/tiles.js`, `www/js/ui/tutorial.js`,
`tests/mechanics.test.js`.
**Changed:** `www/js/systems/match.js` (locked tiles + Holy Water), `www/js/data/levels.js` (mechanics import,
boss template, `LEVELS_PER_STAGE`, memoize), `www/js/ui/game.js` (themed pool, locked render, moving scheduler,
max-2 buffs, boss gimmicks, tutorial hook), `www/js/core/save.js` (+`tutorialSeen`), `www/js/data/config.js`
(`SAVE_VERSION` 4→5), `www/js/ui/settings.js` (replay tutorial), `www/css/main.css` (lock/swap styles),
`www/css/home.css` (tutorial dots), `tests/match.test.js`.
**Docs:** decisions doc D18–D22 + save v4/v5; this report.

## What's still open (from the audit, by design)
- **Moving-tiles feel** — quick on-device pass to tune cadence/telegraph (headless can't show it).
- **S8 boss mechanic-rotation** — currently both-active; full rotation is a polish item.
- **Plan 7 (Firebase/leaderboard/AdMob/Hiligaynon)** and **Plan 8 release** — still owner-gated
  (monetization, account ownership, translator, store accounts, device perf pass). Hardware back button still
  wants on-device verification + a back-semantics decision.

## How to try it
- **Tutorial:** clear the app's saved data (fresh start) → name → Play (it appears on level 1-1). Or Settings → Replay tutorial.
- **Power-ups/locked/Holy Water:** Settings → Enter code → `VIP1515`, then play a Stage 7+ level for chains, Stage 6+ for moving tiles.
