# LOOP-STATE — batch: NPC presentation + power-up spectacle + tile restyle (started 2026-07-08)

(Previous batch "test-me whole-project findings" completed 6/6 — see git history of this file.)

## Queue
| ID | Concern                                                            | Tier    | Route     | Attempts | Status |
|----|--------------------------------------------------------------------|---------|-----------|----------|--------|
| T1 | Auto-match permanently revealed pairs (owner-approved gameplay fix)| Small   | fix-me    | 1/3      | passed |
| T2 | Power-up signature effects a–k (owner-specified, on aim-mode infra)| Medium  | design-me | 1/3      | passed |
| T3 | Matched tiles pop up slightly on match                             | Trivial | design-me | 1/3      | passed |
| T4 | NPC dialogue: zoomed portrait + blurred background                 | Small   | design-me | 1/3      | passed |
| T5 | Remove the box around the NPC in tutorial popups                   | Trivial | design-me | 1/3      | passed |
| T6 | Icons for Mail + Smith buttons (Higgsfield, ~4cr)                  | Trivial | higgsfield-generate | 1/3 | passed |
| T7 | Tile restyle PILOT: 3 tiles, simple frame, per-subject color (~6cr); full 43-tile batch deferred to credit top-up | Small | higgsfield-generate | 1/3 | passed |

## Order rationale
T1 first — the auto-match rule changes the reveal semantics T2's Arrow/Sword/Bomb effects build
on; doing it after would rework fresh code. T2 next (largest, same files as T1). T3 rides the
same animation toolkit. T4/T5 are story/tutorial UI, independent. T6 then T7 close the run as
credit-capped generation items; T7 ends at an owner-approval gate on the pilot.

## Owner-locked decisions (intake clarification, 2026-07-08)
- Hourglass stays +15s; green "+15" popup absorbed into the time HUD (visual only).
- Spear becomes a CROSS reveal (row + column), player-aimed — approved gameplay buff.
- Permanently revealed pairs AUTO-MATCH — approved gameplay change.
- Tile budget: pilot 3 tiles + 2 icons now (~10cr); full 43-tile run waits for credit top-up.
- Tile style supersedes part of D16: frame stays uniform-simple, inset color varies per subject.

## Context for any resuming session
- Aim-mode infra + animation primitives committed at 9844269; Bomb slice approved as the base.
- items.js carries an uncommitted TEMP-DEMO change (bomb unlockStage 9→1) — keep during T2,
  revert when T2 lands.
- Preview server config "kt" (localhost:5600). Higgsfield CLI authed; nano_banana_2 @2cr/img;
  ~86 credits remain.

## Attempt log

### T1 — attempt 1 (passed)
- Fix: pure `matchPair(state, i, j)` transition in www/js/systems/match.js (guards: matched/
  locked/decoy/self/icon-mismatch → ignored; preserves matchedPairs, progressive unlock, win,
  firstPick clearing). Game layer: `autoMatchRevealed()` in game.js groups permaRevealed real
  unmatched tiles by icon and completes pairs through the normal celebration path (combo, War
  Horn bonus, popMatch, win()). Wired after Arrow/Sword/Bomb reveals.
- Evidence: suite 73/73 (5 new matchPair tests in tests/match.test.js); live preview — bomb
  aimed at a zone containing the wolf pair → both wolves auto-matched, non-pair zone tiles
  stayed revealed-only.

### T2 — attempt 1 (passed)
- All 11 effects rebuilt per owner spec: aimed Raven (tile→pair flight), green +15s absorb
  (Hourglass), aimed Arrow, pinned Torch, pair sigils (Eagle Eye, pairMarks), Shield screen-
  bash → blinking-shield timer (hud.setFrozen), aimed cross-reveal Spear (vertical streak
  added), glitter-pour Holy Water (pourOver), delayed double-stab Sword, Bomb debris
  (debrisFall), War Horn herald (hornHerald). New primitives in animations.js; CSS in main.css.
- Evidence: suite 73/73 (game scene mounts clean); owner live-played raven/arrow/torch/
  eagleEye/spear/bomb/warHorn in the preview with ZERO console errors; instrumented raven
  aim-mode check (targets/hint/consumption correct). Feel-tuning feedback stays open with
  the owner; holyWater/hourglass/shield paths mirror verified patterns (locked tiles and
  timers don't occur on the demo level).

### T3–T5 — attempt 1 (passed)
- T3: kt-pop now lifts tiles 8px with settle. T4: story backdrop blur(7px)+scale(1.07),
  speaker zoom 1.1 (sections.css). T5: boxless tutorial NPC — full-figure contain, portrait
  crop/frame removed (home.css + tutorial.js fitDock no-op).
- Evidence: suite 73/73; CSS-only/presentation changes, visible on next page load (owner's
  live session predates them — do a reload to see).

### T6 — attempt 1 (passed)
- ui_nav_mail + ui_nav_smith generated (4cr), transparent, placed in www/assets/images/ui;
  home.js placeholder SVGs replaced (rail icon branch + kt-mail-ic sizing).

### T7 — attempt 1 (passed, pilot delivered — full batch pending top-up)
- 3 pilot tiles in .claude/assets/_HIGGSFIELD_OVERHAUL/tiles_v2_pilot/ (wolf steel-blue,
  grapes violet, candle amber). Direction confirmed: subject-keyed inset colors read well.
  Pilot flaws for the full run to fix: margin regression on 2/3, frame drift (wolf frame
  went silver) — full batch MUST reference a canonical simple-gold-frame tile + explicit
  "frame always gold" clause. ~86cr needed after top-up.

## Close-out
- Final gate: npm test → 73/73. Owner played T2 effects live, zero console errors.
- items.js TEMP-DEMO (all power-ups unlockStage=1) kept for the owner's ongoing feel
  testing — REVERT BEFORE COMMIT (real values recorded in the file comment).
- Changes NOT committed (commit-me is an explicit hand-off).

# LOOP-STATE — follow-up batch: refined effects + audit (2026-07-08 late) — COMPLETE
| ID | Concern                                                     | Route     | Attempts | Status |
|----|-------------------------------------------------------------|-----------|----------|--------|
| R1 | Projectile+light effect language (4 fx sprites, beams/sweep)| design-me | 1/3      | passed |
| R2 | Tap-the-twin of a revealed tile auto-matches                | fix-me    | 1/3      | passed |
| R3 | Whole-game audit (brainstormed) → B1/B2/B3 fixed            | fix-me    | 1/3      | passed |
- R1 evidence: fx sprites live (arrow caught in flight rotated −102° with tracer); 79/79.
- R2 evidence: live — arrow-revealed cheese + twin tap → instant match.
- R3 evidence: 6 new unit tests (visualBombZone/visualCross incl. swapped board); 79/79.
  Refuted hypotheses + accepted behaviors recorded in the decision doc Addendum 2.
- Credits after fx sprites: ~68 remain. Full 43-tile restyle still awaits top-up.

# LOOP-STATE — batch: zoom juice + tile restyle v2 (2026-07-09) — COMPLETE
| ID | Concern                                                       | Route     | Attempts | Status |
|----|---------------------------------------------------------------|-----------|----------|--------|
| Z1 | Camera-zoom impact language for power-ups (owner-delegated)   | design-me | 1/3      | passed |
| Z2 | Tile impact juice (press squash, wrong-glow, match rings, win wave) | design-me | 1/3 | passed |
| Z3 | Tile restyle v2 FULL batch: 43 faces + back, canonical-frame Lite flow | higgsfield | 1/3 | passed |
- Z1/Z2 evidence: 79/79 suite; boardZoom/impactRing primitives; wired into bomb/sword/
  arrow/shield/torch/raven/combo/win. Owner reviews feel later (delegated pass).
- Z3 evidence: 44/44 generated zero-fail (canonical nano_banana_2 2K + 43 Lite 1K
  derivatives, 45cr), frame-locked; integrated at 360px into www/assets/images/tiles;
  live board screenshot shows flush uniform gold frames; defeat overlay path also
  verified in passing. Credits remaining: ~24.
- Owner review pending on: zoom feel, v2 tile set (board mockup in
  .claude/assets/_HIGGSFIELD_OVERHAUL/tiles_v2/board_mockup_v2.jpg), defeat-banner art
  (generated ribbon includes an odd seal-creature blob), TEMP-DEMO unlock still active.
