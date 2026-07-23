# Knight's Treasure — Project Instructions

Medieval match-3 dungeon-heist battler built from `.claude/mechanics/knights_treasure_GDD.md` (GDD v4.0).
TypeScript + PixiJS (Vite build) + Capacitor (Android, planned — not yet wired). Package `com.silentstroke.knightstreasure2`.

Pivoted 2026-07-23 from a memory-matching game (GDD v3.0). The old build is archived, not deleted — see
`archive/memory-match-www/` (code), `.claude/mechanics/archive/` (old GDD), and the `archive/` subfolders under
`docs/superpowers/specs/` and `docs/superpowers/plans/` (retired gameplay-mechanic docs). The pivot's own
decisions live in `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md`.

## Working principles (apply to every task)

1. **Exactness & synchronization above all.** This project must stay internally consistent — code, plans, the GDD, naming, data values, and the save schema must agree at all times. Before adding or changing anything, confirm it matches the single sources of truth (`difficulty.js` for difficulty values, the decisions doc for design rules, this file for conventions). No drift, no parallel copies of the same fact.

2. **When something is vague, do NOT assume — ask.** If a requirement, the owner's intent, or how a feature should behave is unclear or under-specified, stop and ask a clarifying question to get the clear picture. Never paper over ambiguity with a guess.
   - **The one exception:** when the owner has *explicitly delegated* a specific decision to you (e.g. "you decide the mechanics"), make the call, but **document the decision and your reasoning** in the design-decisions doc so it can be reviewed. Delegated ≠ silent — every decision is written down.

3. **Decisions are recorded, not implied.** Every design/mechanics decision lives in `docs/superpowers/specs/` (decisions doc). If a decision isn't written there, it hasn't been made.

## Sources of truth
- Game design: `.claude/mechanics/knights_treasure_GDD.md` (v4.0, match-3 dungeon-heist)
- Roadmap + challenges report: `C:\Users\USER\.claude\plans\shiny-crafting-key.md`
- Design decisions / mechanics specs: `docs/superpowers/specs/` (authoritative for all rules; pivot decisions in `2026-07-23-match3-heist-pivot-decisions.md`)
- Implementation plans: `docs/superpowers/plans/`
- Balance values: `src/logic/data/balance.ts` (nothing else hardcodes weapon damage/food refill/guardian HP)
- Tile role/asset mapping: `src/logic/data/tileTaxonomy.ts`
- Stratum pool composition: `src/logic/data/strata.ts`

## Build decisions (locked 2026-06-20, superseded in part 2026-07-23)
- Vertical slice first (Phase 1 end-to-end, then Phase 2, ...), then replicate — carried forward into the match-3 pivot's phased build order.
- Local-first: Capacitor Preferences save (planned); Firebase / AdMob / Hiligaynon deferred behind seams.
- Asset production in scope but kept off the critical path — the match-3 pivot reuses the existing 45 tile icons under `public/images/tiles/` rather than generating new art to start.
- Old "Greenfield — no code/assets reused from the prototype" note referred to `temp_clone/index.html` (still reference-only, untouched by the pivot) — superseded by the 2026-07-23 pivot's own instruction to reuse the memory-match build's art assets (not its code).

## Housekeeping
- Root `TEAM-STATUS.md` and `GLOSSARY.md` are stale leftovers from an unrelated "Fortress Inventory" project — ignore / remove.
