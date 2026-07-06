# LOOP-STATE — batch: test-me whole-project findings (started 2026-07-06) — COMPLETE

Source: test-me whole-project verification (session 2026-07-06). Gate: `npm test` + targeted
runtime re-check per item. Owner pre-approved the full queue ("fix all the concerns found").
Excluded by owner-decision-pending: retry stamina cost (do not touch until decided).

## Queue — final
| ID | Concern                                                         | Tier    | Route       | Attempts | Status |
|----|-----------------------------------------------------------------|---------|-------------|----------|--------|
| T1 | Map "Continue" hardcodes level 1 (main.js:135), burns stamina   | Small   | fix-me      | 1/3      | passed |
| T2 | Glory SCOPE_LABEL missing `monthly` key (glory.js:35)           | Trivial | fix-me      | 1/3      | passed |
| T3 | Version drift: settings.js v0.1.0 vs package.json 3.0.0         | Trivial | fix-me      | 1/3      | passed |
| T4 | Settings timer note shown when no level running (settings.js)   | Trivial | design-me   | 1/3      | passed |
| T5 | No suite coverage of defeat/time-up path                        | Small   | test-me     | 1/3      | passed |
| T6 | GDD prose "Stage 2 onwards" contradicts its own block table     | Trivial | document-me | 1/3      | passed |

## Attempt log

### T1 — attempt 1 (passed)
- Fix: pure `mapPlayLevel(save, stage)` in www/js/core/state.js (current stage → pointer,
  completed stage → L1), wired at main.js openMap. Regression test in tests/state.test.js.
- Evidence: suite 58/58; browser re-run of the original repro now lands on Stage 1 / Level 2.

### T2 — attempt 1 (passed)
- Fix: added `monthly: 'Monthly'` to SCOPE_LABEL (glory.js). Verified in browser: capitalized.

### T3 — attempt 1 (passed)
- Fix: `APP_VERSION = '3.0.0'` in www/js/data/config.js (single runtime source, matches
  package.json); settings footer renders it. Sync guard test: tests/config.test.js.

### T4 — attempt 1 (passed)
- Fix: `inLevel` flag threaded openSettings → createSettingsScene; note renders only in-level.
- Evidence: browser — from Home: no note, v3.0.0; from in-game: note shown.

### T5 — attempt 1 (passed)
- Added tests/defeat.test.js (jsdom, fake timers, real createGameScene mount): time-up → failed,
  Try Again wired to onRetry, no completion/stars recorded, no stamina refund. jsdom added as
  devDependency; ResizeObserver stubbed test-side.
- Evidence: suite 62/62.

### T6 — attempt 1 (passed)
- GDD Timer System prose aligned to the per-block table (Warm Up untimed; timer from Building
  block, level 6 of every stage).

## Close-out
- Final gate: `npm test` → 13 files, 62/62 pass. Preview reload: zero console errors.
- All changes STAGED, not committed (commit is an explicit commit-me hand-off).
- Open owner decision: should post-defeat retry cost 1 stamina? (GDD ambiguous; current
  behavior: free retry. Record the decision in docs/superpowers/specs/ when made.)
