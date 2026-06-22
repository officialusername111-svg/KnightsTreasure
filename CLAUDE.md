# Knight's Treasure — Project Instructions

Medieval memory-matching Android game built from `.claude/mechanics/knights_treasure_GDD.md` (GDD v3.0).
Greenfield. Vanilla HTML/CSS/JS (ES modules) + Capacitor (Android). Package `com.silentstroke.knightstreasure2`.

## Working principles (apply to every task)

1. **Exactness & synchronization above all.** This project must stay internally consistent — code, plans, the GDD, naming, data values, and the save schema must agree at all times. Before adding or changing anything, confirm it matches the single sources of truth (`difficulty.js` for difficulty values, the decisions doc for design rules, this file for conventions). No drift, no parallel copies of the same fact.

2. **When something is vague, do NOT assume — ask.** If a requirement, the owner's intent, or how a feature should behave is unclear or under-specified, stop and ask a clarifying question to get the clear picture. Never paper over ambiguity with a guess.
   - **The one exception:** when the owner has *explicitly delegated* a specific decision to you (e.g. "you decide the mechanics"), make the call, but **document the decision and your reasoning** in the design-decisions doc so it can be reviewed. Delegated ≠ silent — every decision is written down.

3. **Decisions are recorded, not implied.** Every design/mechanics decision lives in `docs/superpowers/specs/` (decisions doc). If a decision isn't written there, it hasn't been made.

## Sources of truth
- Game design: `.claude/mechanics/knights_treasure_GDD.md`
- Roadmap + challenges report: `C:\Users\USER\.claude\plans\shiny-crafting-key.md`
- Design decisions / mechanics specs: `docs/superpowers/specs/` (authoritative for all rules)
- Implementation plans: `docs/superpowers/plans/`
- Difficulty values: `www/js/data/difficulty.js` (nothing else hardcodes grid/timer/flip)

## Build decisions (locked 2026-06-20)
- Greenfield — no code/assets reused from the prototype (`temp_clone/index.html` is reference only).
- Vertical slice first (Stage 1 end-to-end), then replicate.
- Local-first: Capacitor Preferences save; Firebase / AdMob / Hiligaynon deferred behind seams.
- Asset production in scope but kept off the critical path via placeholders.

## Housekeeping
- Root `TEAM-STATUS.md` and `GLOSSARY.md` are stale leftovers from an unrelated "Fortress Inventory" project — ignore / remove.
