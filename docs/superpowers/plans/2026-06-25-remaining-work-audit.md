# Knight's Treasure — Remaining-Work Audit (compiled 2026-06-25)

> Compiled from the plan index (`2026-06-21-plan-index-and-later-phases.md`), the roadmap
> (`shiny-crafting-key.md`), the design-decisions spec, and a live audit of the codebase on
> branch `feat/plan-1-foundation`. Marks what's **done**, what's **partial**, and what's
> **remaining** — and for each remaining item, whether it's safe to do autonomously or needs
> an owner gate (visual sign-off / playtest feel / money-legal-brand decision).

## Status at a glance

| Plan | Area | Status |
|---|---|---|
| 1 | Foundation & core loop | ✅ Done (ledger tasks 0–9; 42 tests green) |
| 2 | Economy + Blacksmith + power-up framework | ✅ Done |
| 3 | Stamina + story + map + audio | ✅ Done **except tutorial** (missing) |
| 4 | Mechanics & power-up breadth | 🟡 Partial — see below |
| 5 | Content: 250 levels, 10 themes, bosses | 🟡 Partial — engine done, per-stage tilesets + boss gimmicks remain |
| 6 | Tavern hub, ranks, full economy | ✅ Done (inn/bard/gambler/quests/glory/ranks/mail/map) |
| 7 | Services: Firebase, AdMob, Hiligaynon | ⛔ Deferred — **owner-gated** (money/legal/brand) |
| 8 | Polish & release | 🟡 Partial — animations/achievements done; lifecycle + perf + store remain |
| — | Asset track | ✅ 188 final art assets in place |

---

## Done in this session (2026-06-25)

1. **App lifecycle — level-timer background pause (Plan 8 / challenge #17).**
   `www/js/ui/game.js` now freezes the countdown (and the elapsed clock on untimed levels)
   when the app is backgrounded (`visibilitychange` → `document.hidden`), resuming on return.
   Self-removes the listener once the scene detaches (no teardown hook in the scene manager).
   *Verified live:* time held at 118 across 2.5 s hidden, resumed counting on return; audio
   already suspended via `main.js`. Closes the "background to dodge the timer / think off-screen"
   exploit and the runaway-timer correctness bug.

2. **Power-up breadth — 5 of the 7 unimplemented effects (Plan 4, conforms to D10–D12).**
   `usePower` previously no-opped everything except Raven/Torch/Eagle Eye/Hourglass/Shield.
   Now implemented, matching the authoritative spec:
   - **Arrow** — permanently reveal one unmatched real tile (−25 score).
   - **Sword** — permanently reveal a matching real pair (−25 score).
   - **Bomb** — permanently reveal the 2×2 block richest in hidden tiles (−25 score).
   - **Spear** — briefly (3 s) reveal the grid row with the most hidden real tiles.
   - **King's Decree** — reveal the whole board for ~2.5 s, once; disabled on bosses (per D11).
   Permanent reveal is view-only (a `permaReveal` Set drives `syncBoard`), so `match.js` purity
   is untouched. *Verified live on a Stage-9 level:* arrow→1 tile, bomb→2×2, sword→a real pair,
   all persist; score breakdown shows "Power-ups used −75" for 3 reveal uses.

3. **Bug fix — "no power-ups" coin bonus was always granted.**
   `levelReward` hardcoded `noPowerup: true` (`game.js`), so the +15 coin bonus applied even
   when power-ups were used. Now gated on a `usedPowerup` flag. (Exactness fix.)

4. (Earlier this session) Secret-code redemption (`VIP1515` stocks all power-ups), and fixed
   two stale `state.test.js` tests + one flaky `save.test.js` timestamp comparison.

**Still no-op (documented, by design — don't fit the current model):**
- **War Horn** (2× score for 10 s) — scoring is computed once at level end; a live per-match
  multiplier needs a scoring-model change. Left as a graceful no-op (stays in the pack).
- **Holy Water** (remove chains from locked tiles) — the **locked-tile mechanic isn't rendered
  yet** (`lockedCount` is data-only), so there's nothing to unlock. Tied to the Plan-4 locked
  build below.

---

## Remaining — safe to do autonomously (no owner gate)

These are pure-logic / infra / extend-existing-approved-UI, fully unit- or preview-verifiable:

- **Plan 4 — Locked-tile mechanic (D9) + Holy Water.** `lockedCount` exists in level data but
  isn't rendered or enforced in `match.js`/`game.js`. Build: a locked overlay on N tiles that
  must be unlocked (by adjacent match or Holy Water), then wire Holy Water. Verifiable.
- **Plan 8 — `mechanics.js` extraction.** The plan calls for a pure modifiers module; decoy/
  hidden are currently inlined in `levels.js`/`match.js`. Extracting them (with tests) improves
  testability without behavior change.
- **Small ledger MINORs:** extract `LEVELS_PER_STAGE` constant (used twice as magic `25`);
  `getLevel` rebuilds the stage array each call (memoize).

## Remaining — needs an OWNER GATE before/while building

- **Plan 4 — Moving tiles (D8, Stage 6).** Flagged in the challenges report as the highest
  player-frustration risk ("fights the spatial-memory loop"). Data hook (`moveIntervalMs`)
  exists but no render. The *pure swap scheduler* (`nextSwap(state,now)`) is safe to build and
  unit-test, but the **render + feel needs playtesting** — recommend building the scheduler,
  then reviewing cadence/telegraph with you on-device. Also unblocks the D12 interaction rules
  (reveals pause movement; permanent reveals pin tiles) which are currently unenforced.
- **Plan 4 — D11 "max 2 active power-ups" not enforced.** Trivial to add, but defining "active"
  (only Shield / War Horn are durational) is a small design call — confirm scope.
- **Plan 3 — Tutorial (missing).** First-launch + contextual overlays. Can reuse the already-
  approved `showStoryDialog` component, but the *content/flow* is a new UX surface → sample-gate
  per the global UI rule.
- **Plan 5 — Per-stage tile sets & themes.** The board uses one global `ICON_POOL` for all 10
  stages (backgrounds *are* per-stage via `STAGE_BG`). Theming tiles per stage is a visual call.
- **Plan 5 — Boss gimmick template (D4).** `isBoss` flag + boss timer exist; the parameterized
  "combined-mechanics + score-threshold + cutscene" boss template is not built. Needs design
  review of which gimmick per stage.

## Remaining — DEFERRED, explicitly owner-decision (from the decisions doc "Open items")

- **Plan 7 — Firebase cloud save + global leaderboard, AdMob, Hiligaynon i18n.** All blocked on:
  monetization model (IAP vs ads-only), Firebase/AdMob account ownership, and a Hiligaynon
  translator. Not delegated (money/legal/brand). Seams already exist (`services/social.js`,
  storage adapter, `TEXT` table).
- **Plan 8 — Play Store release.** Content rating, privacy policy, keystore signing, release
  build, on-device perf pass on the Redmi Note 9 Pro. Needs accounts + a device.
- **Hardware back button (Plan 8 / challenge #17).** Deliberately *not* shipped this session:
  there's no Capacitor in the web preview to verify it, and it carries a UX decision (exit-
  confirm on home? forfeit-prompt on back during a level?). Shipping unverifiable navigation
  that could exit the app mid-level is riskier than its value — recommend doing it together
  on-device with the back-semantics decided.

---

## Recommended next batch (when you're back)
1. **Locked tiles + Holy Water** (safe, finishes the mechanic set bar moving tiles).
2. **Moving-tiles scheduler** (pure + tests) — then a quick on-device feel check with you.
3. **Tutorial** — I'll mock the flow for your approval first (UI gate).
4. Then the owner-decision items (Plan 7 / release) once accounts + direction are settled.
