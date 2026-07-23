# Knight's Treasure — Match-3 Heist Pivot: Decisions & Mechanics Specification

> **Status:** Authoritative for the match-3 dungeon-heist rework. Covers Phase 1 (match-3 core) and Phase 2 (depletion & descent) only — Phases 3–6 (guardian/greed reaction, fog/torchlight, banners, memory-attacking enemies) are named where the code leaves a hook for them, not designed here. Supersedes `docs/superpowers/specs/archive/2026-06-21-knights-treasure-design-decisions.md` (the memory-match design) for everything except the still-active asset-production docs (asset manifest, prompt packs, character prompts — see `docs/superpowers/specs/`, not archived).
> **Date:** 2026-07-23 · **Owner review:** pending — the pivot itself ("full pivot — replace current game") and three governing calls (archive not delete; TypeScript + PixiJS; scope Phase 1+2) were made explicitly by the owner. Everything below is my execution of those calls, delegated per this project's own rule ("delegated ≠ silent — every decision is written down").

Each decision: **D#** — the decision · **Why** · **Affects**.

---

## Part A — Migration & toolchain

### D1 — Archive, don't delete, the retired memory-match build
**Decision:** `git mv` (history-preserving) the old game to `archive/memory-match-www/` (code), `.claude/mechanics/archive/knights_treasure_GDD_v3_memory_match.md` (GDD v3.0), and `docs/superpowers/{specs,plans}/archive/` (the 4 gameplay-mechanic spec docs and all 7 plan docs — the 9 art/asset-production spec docs stayed active since the pivot reuses the same 45 tile icons). Every archived file got a one-line `SUPERSEDED` banner pointing back here. Old tests moved to `tests/archive/` with imports rewritten to the new archive path; excluded from the default `vitest` run via `vitest.config.ts`'s `exclude`.
**Why:** Owner's explicit call — reversible, keeps ~5,438 LOC of working (if now-retired) code and its full design-decision trail available for reference, at zero ongoing cost since it's excluded from build/test.
**Affects:** Repo layout, `CLAUDE.md` sources-of-truth pointers, `tests/` structure.

### D2 — TypeScript + PixiJS + Vite, replacing vanilla JS/DOM
**Decision:** New source lives in `src/` (Vite convention), built by `vite`, typed by `typescript` (`tsconfig.json`: `strict: true`, `ES2022`/`Bundler` resolution), rendered on canvas via `pixi.js` for the interactive board; the HUD stays DOM/CSS (`src/style.css`) since it's simpler to keep it there and it faithfully reproduces the approved mockup. `public/` holds the relocated static assets (`www/assets/images` → `public/images`, unchanged filenames). `vitest.config.ts` (renamed from `.js`) now targets `tests/**/*.test.{js,ts}`.
**Why:** Owner's explicit call, over the "stay vanilla JS" recommendation — PixiJS needs a real bundler; Vite was chosen over webpack/Parcel/esbuild because it shares tooling lineage with the already-used Vitest, needs zero config for TS, and is the standard Capacitor `webDir` source if/when packaging is wired up (not done in this pass).
**Affects:** `package.json` scripts (`dev`/`build`/`preview`/`typecheck`/`test`/`test:watch`), `index.html` (new root entry point), all new `src/**` code.

### D3 — Hybrid rendering: PixiJS board, DOM HUD
**Decision:** The interactive 8×N tile board is a `pixi.js` `Application` mounted into `#board-wrap`; the HUD (guardian/rations/greed bars, gold, floor/stratum chip, win banner) is plain DOM elements addressed by `data-hud="..."` attributes and updated directly by `HudView.sync()`. Bar fills animate via `transform: scaleX()`, not `width`, to avoid layout-thrash (caught by the design-hook scan on the first draft).
**Why:** The board benefits from Pixi's sprite/texture batching and is where future animation/particle work (Phase 4 fog, Phase 6 hazards) will land; the HUD doesn't need canvas and DOM is simpler to keep in exact sync with the approved wireframe mockup (see D-mockup below).
**Affects:** `src/render/{PixiApp,BoardView,TileSprite,HudView,assetManifest}.ts`, `index.html`, `src/style.css`.

### D4 — Mockup approved before the render layer was built
**Decision:** Per the project's global UI rule, a static wireframe (`mockup.html`, deleted once the real renderer replaced it) was built and shown using the real 45 tile icons and the vault background art (`bg_stage10_vault.png`, dimmed) before any PixiJS code was written. Approved by the owner ("All good continue") on 2026-07-23 with no requested changes.
**Why:** Required gate, not optional — confirms board/HUD layout and the tap-to-select/tap-adjacent-to-swap affordance against real assets before investing in the canvas renderer.
**Affects:** Nothing further — historical record of the approval gate having been honored.

---

## Part B — State model & schema extensions

The spec's literal `GameState`/`Tile` shape (`src/logic/types.ts`) is implemented as given, plus three flagged extensions (the spec explicitly invited "extension, flagged" for anything under-specified):

### D5 — `meters.exhausted: boolean`
**Decision:** Stored flag, set/cleared by `resolveMatches` whenever the per-turn ration drain crosses zero, rather than recomputed as `rations <= 0` at every read site.
**Why:** Simpler to test (`tests/logic/food.test.ts`) and render than duplicating the comparison across `HudView` and any future UI.
**Affects:** `src/logic/types.ts`, `src/logic/actions/resolveMatches.ts`.

### D6 — `guardian.maxHp: number`
**Decision:** Stored alongside `hp`, set once per floor by `createInitialState`/`descend`.
**Why:** Lets `HudView` render the hp bar's fill percentage without re-deriving the floor's starting hp from `balance.ts`'s growth formula.
**Affects:** `src/logic/types.ts`, `src/logic/actions/descend.ts`, `src/render/HudView.ts`.

### D7 — `rngSeed: number`
**Decision:** All randomness (board generation, axe's shatter-target pick) derives from a tiny seeded xorshift32 RNG (`src/logic/rng.ts`) constructed fresh from `state.rngSeed` at the start of any action that needs it; the RNG is drawn from once more at the end to produce the next seed, stored back on the returned state.
**Why:** Keeps every action a true pure function `(state, input) => newState` (the spec's own guardrail) without hidden global RNG state — same input state always produces the same output state, which is what makes the whole `tests/logic/**` suite deterministic.
**Affects:** `src/logic/rng.ts`, `src/logic/board-gen.ts`, `src/logic/actions/{swap,resolveMatches,weaponEffects,descend}.ts`, `src/logic/state.ts`.

### D8 — Guardian defeat is derived, not a stored status
**Decision:** `isGuardianDefeated(state) = state.guardian.hp <= 0` (`src/logic/selectors.ts`). The spec's `status: 'playing'|'escaped'|'dead'` stays reserved for run-level outcomes (Phase 3+ — dying to the guardian's counter-attack, or explicit `escape()`). Phase 1's "damage a guardian to zero" win condition is a render-layer banner only (`#banner.visible` toggled by `HudView`).
**Why:** Avoids inventing a 4th `status` value for a Phase 1 milestone that Phase 3 will fold into real win/lose resolution once the guardian can fight back.
**Affects:** `src/logic/selectors.ts`, `src/render/HudView.ts`, `index.html` (`#banner`).

---

## Part C — Board depletion model (unifies Phase 1 and Phase 2)

### D9 — No gravity, no refill, in either phase
**Decision:** Matched or shattered cells become permanently `null` for the rest of that floor. Tiles never shift to fill gaps and nothing new spawns mid-floor. A floor's board is generated once at floor start, banded top-to-bottom into 3 fixed row ranges (surface/relic/vault — see Part D). `computeStratum` reports how many of those bands are **fully** cleared (0–3); `isBoardEmpty` (not `stratum === 3`, to sidestep row-count rounding edge cases) is the actual descend trigger.
**Why:** The rework spec's Phase 2 text ("tiles do NOT refill... cleared tiles expose the stratum beneath") only makes sense as a literal reading if "expose" means "the band that was already sitting there becomes the shallowest remaining," not a physical fall-through — there's no cell-shifting mechanic described anywhere in the spec, and inventing one would be scope creep the guardrails explicitly warn against ("keep the six [mechanics]... simplify anything else first"). This also means Phase 1 never needed a separate depletion model of its own: an 8×8 board with `dummyHpBase: 300` is sized so the guardian dies long before 64 cells could plausibly empty, so the same representation and helpers (`board: (Tile|null)[][]`, `isBoardEmpty`) carry unchanged from Phase 1 into Phase 2 with zero rewrite at the boundary.
**Affects:** `src/logic/board.ts` (`computeStratum`, `bandForRow`), `src/logic/board-gen.ts`, `src/logic/selectors.ts` (`isFloorFullyCleared`).

### D10 — Match detection: independent horizontal/vertical runs, no shape merging
**Decision:** `findMatches` scans each row and each column independently for runs of 3+ identical `kind`; a tile that's part of both a horizontal and a vertical run is counted (and its effect applied) in both groups rather than merged into one L/T-shaped match.
**Why:** Simpler and sufficient for Phase 1/2's acceptance bar ("you can play a single board... and it feels satisfying") — shape-merging is a common match-3 polish item, not a correctness requirement, and can be added later without touching the state model.
**Affects:** `src/logic/board.ts` (`findMatches`).

---

## Part D — Tile taxonomy, weapon balance, and strata (all in `src/logic/data/`)

### D11 — Role → kind → asset mapping (all 45 committed icons accounted for)
**Decision (final, as shipped):**
| Role | Kinds | Notes |
|---|---|---|
| weapon | `dagger`, `sword`, `axe`, `bow` | `tile_sword.png` didn't exist in the committed set — **promoted** (copied, not generated) from `.claude/assets/_READY_FIX_NOBG/tile_sword.png`. Reserved-unused for now: `mace`, `spear`, `warhammer`, `crossbow`, `flail`, `gauntlet` (later balance-content variety); `helmet`/`shield` are armor, reserved for Phase 3 guardian-armor visuals. |
| food | `bread`, `cheese`, `grapes`, `mushroom`, `turkey`, `wheat`, `acorn` | All 7 behave identically; kind is cosmetic. |
| hoard | surface: `coin`(5) `ring`(8) `gem`(10) `ingot`(12) · relic: `amulet`(15) `rune`(18) `orb`(20) `chalice`(22) `scepter`(25) `potion`(16) · vault: `crown`(40) `grail`(45) `chest`(50) `key`(30) `scroll`(28) | Values = gold worth, tunable in `balance.ts`, scaled per-floor by `hoardValueMultiplierPerFloor`. |
| emblem | `boar`, `dragon`, `falcon`, `griffin`, `owl`, `serpent`, `stag`, `wolf`, `warhorse` | Exactly the 9 heraldic animals; charges `valor`/`bannerCharge` only (Phase 5 stub). |
| light | `candle` | Only light-flavored icon; true no-op in Phase 1/2 (`torchlight` stays all-`true`). |
| hazard | *(none)* | No hazard-flavored icon exists among the 45; Phase 6 needs new art before this role can spawn tiles. |

`tile_back.png` reserved for Phase 4 fog. `tile_wildcard.png` has no assigned role — open question for a later phase, deliberately left undecided.
**Why:** Direct reuse of existing art per the guardrail; every committed icon is accounted for (including `acorn`, which had no obvious home and was assigned to food).
**Affects:** `src/logic/data/tileTaxonomy.ts`, `src/render/assetManifest.ts`.

### D12 — Weapon balance numbers (starting values, tunable)
**Decision:**
```
dagger: 2 hits × 8 dmg (16 total), turnCost 1, no armor-ignore
sword:  1 hit  × 20 dmg + 8/extra-tile, turnCost 2
axe:    1 hit  × 18 dmg + 6/extra-tile, turnCost 2, shatters 1 adjacent non-null tile
bow:    1 hit  × 20 dmg + 8/extra-tile, turnCost 2, ignores guardian.armor
```
Armor is stubbed at 0 for Phase 1/2 (so Bow ≈ Sword numerically), but the ignore-branch exists in code now so Phase 3 doesn't need to touch `weaponEffects.ts` to make armor matter. Axe's shatter target is picked by a seeded-RNG helper over 4-directional non-null, non-matched neighbors of the match.
**Why:** Concrete numbers the spec didn't specify; dagger's low `turnCost` realizes "doesn't advance the guardian's turn as much" from the spec text directly as a tunable rather than a hardcoded special case.
**Affects:** `src/logic/data/balance.ts`, `src/logic/actions/weaponEffects.ts`.

### D13 — Rations/food, greed, and per-turn drain
**Decision:** `refillForMatchSize`: table `{3:2, 4:3, 5:5}`, extrapolated `+2` per tile beyond 5. `maxRations: 10`, `drainPerTurn: 1`, applied once per resolved swap (a "turn"), after all match-group effects for that swap, clamped at 0 with `exhausted` set accordingly. Hoard matches bank `gold += value` and `greed += value * greedPerGold` (1:1 by default) in the same action; greed has no gameplay ceiling yet (Phase 3 owns that), so the HUD bar uses a display-only `displayCap: 200` purely for a legible fill percentage.
**Why:** The spec asks for drain/refill/exhausted to be real in Phase 1/2 but doesn't give exact numbers or say precisely when drain fires relative to a same-turn refill; "refill then drain, once per resolved swap" is the simplest reading that keeps rations meaningful without needing Phase 3's guardian-turn to exist first.
**Affects:** `src/logic/data/balance.ts`, `src/logic/actions/resolveMatches.ts`.

### D14 — Strata bands and vault design
**Decision:** Row-fractions `surface 0.4 / relic 0.35 / vault 0.25`. Per-band pools (weapon/food/hoard/emblem/light weights, `src/logic/data/strata.ts`): vault has **zero food weight** (deliberate) and reduced weapon weight, hoard restricted to the vault-tier 5 kinds. Verified against a real generated floor: 16 vault-band tiles, 0 food, 0 non-vault-tier hoard.
**Why:** Makes the vault meaningfully different from a reskinned descend using only systems Phase 1/2 already has (no new mechanic): rarity gate (vault hoard never appears above the vault band), the already-built rations drain becomes *felt* tension exactly where the richest loot sits (zero food to offset it), and reduced weapon density shifts vault play from fighting to looting — matching the heist framing.
**Affects:** `src/logic/data/strata.ts`, `src/logic/board-gen.ts`.

### D15 — Floor scaling on descend
**Decision:** `descend()`: `floor += 1`, `stratum` resets to 0, board rows grow `baseRows + (floor - 1)` capped at `baseRows + maxExtraRows` (cols fixed at `baseCols`), guardian hp/maxHp reset to `dummyHpBase * (1 + hpGrowthPerFloor * (floor - 1))`, hoard values scale by `1 + hoardValueMultiplierPerFloor * (floor - 1)`. `gold`, `meters.greed`, and `meters.rations` are **not** reset (greed persists per spec explicitly; gold is the running haul; rations is a real resource not free-refilled by digging — this last one is the most overridable of the three if it turns out too punishing in play).
**Why:** Concrete numbers/rules the spec left as "tunable," verified end-to-end in the browser (floor 1→2: 8→9 rows, gold 77 and greed 55 both preserved, guardian reset to 360 = 300×1.2).
**Affects:** `src/logic/actions/descend.ts`, `src/logic/data/balance.ts`.

---

## Part E — Explicit Phase 3–6 hooks left in the code (not designed here)

- `guardian.rage`, `guardian.armor` (armor stubbed at 0) — Phase 3.
- `guardianTurn()` — pure passthrough stub; shape locked (`(state) => state`) so Phase 3 fills in the rage-scaled counter-attack without touching call sites in `GameController`.
- `torchlight: boolean[][]` — always all-`true`; `Tile.faceDown` always `false` — Phase 4.
- `banner: string`, `bannerCharge: number`, `meters.valor` — charged by emblem matches now, spent by nothing yet; `useBanner()` no-ops (deliberately, not a throw) — Phase 5.
- `Role: 'hazard'`, `HAZARD_KINDS: []` — Phase 6, needs new art before any hazard tile can spawn.
- `tile_wildcard.png` — unassigned, open question, not decided in this pass.
