# 🏰 Knight's Treasure
### Game Design Document (GDD) — v4.0
**Developer:** Silent Stroke
**Platform:** Browser (single-page); Android via Capacitor planned, not yet wired
**Package Name:** `com.silentstroke.knightstreasure2`
**Version:** 4.0 (match-3 dungeon-heist pivot, 2026-07-23)
**Tech:** TypeScript + PixiJS (board) + DOM/CSS (HUD), Vite build, Vitest tests

> **Pivoted from v3.0** (a memory-matching game — see `.claude/mechanics/archive/knights_treasure_GDD_v3_memory_match.md`). Decision record: `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md`.

---

## 📖 Table of Contents

1. [Game Overview](#game-overview)
2. [The Six Signature Mechanics](#the-six-signature-mechanics)
3. [Core Loop](#core-loop)
4. [Tile Taxonomy](#tile-taxonomy)
5. [Weapon Behaviors](#weapon-behaviors)
6. [Meters](#meters)
7. [Board Depletion & Strata](#board-depletion--strata)
8. [Banners (9 Knightly Orders)](#banners-9-knightly-orders)
9. [State Model](#state-model)
10. [Implementation Status](#implementation-status)
11. [Technical Foundation](#technical-foundation)

---

## Game Overview

Knight's Treasure is a **match-3 dungeon-heist battler**. The player is a knight descending into a dungeon, swapping tiles to fight, feed themselves, and steal a guardian's hoard — then escaping before greed gets them killed. It reads as its own game (not a match-3 clone) because of six mechanics that no mainstream match-3 battler combines (below). **If a decision ever conflicts with one of the six, keep the six.**

---

## The Six Signature Mechanics

1. **Torchlit board** *(Phase 4, not yet built)* — part of the board starts face-down (fog). Matching at the light's frontier flips neighboring fog tiles face-up. Some enemies re-shroud seen tiles.
2. **Heist, not a fight** *(hoard/gold banking — built; greed's guardian-reaction — Phase 3)* — the guardian's hoard sits on the board as treasure tiles. Stealing them is the goal; slaying the guardian is optional. Every theft raises a **greed meter** that will make the guardian stronger and more aggressive once Phase 3 lands.
3. **Depleting floors** *(built)* — tiles do **not** refill from the top. Each floor is a finite board; clearing tiles exposes the **stratum** beneath (common gear near the surface → relics deeper → vault at the bottom). Matching literally digs downward. Empty floor = descend.
4. **You wield what you match** *(built)* — weapon matches *are* the attack (each weapon type behaves differently). Food matches refill a draining **rations** meter, not a health bar.
5. **Banners** *(Phase 5, not yet built)* — before each run the player swears to one knightly order (from the 9 heraldic animals). Each banner is a build-defining passive. One per run.
6. **Memory-attacking enemies** *(Phase 6, not yet built)* — because the board has hidden information (once Phase 4 lands), enemies can mess with it: a mimic swaps places with a real treasure after a shuffle; dragon breath burns a spreading row.

---

## Core Loop

```
Descend to floor 1  ──────────────┐
   ↓                              │
Swap tiles:                       │
  · weapon match → strike         │
  · food match   → refill rations │
  · hoard match  → steal (gold+, greed+) │
   ↓                              │
Floor depletes → stratum exposed  │
   ↓                              │
Floor empties → descend ──────────┘  (repeat, deeper & bigger)
   ↓
Damage the guardian to 0 = Phase 1's win condition today.
(Escape-with-loot / knight-falls resolution is Phase 3.)
```

The tension the whole game is built around: **push deeper for more, or bolt now and keep what you have** (bolt/escape resolution lands with Phase 3's real lose conditions).

---

## Tile Taxonomy

| Role | Kinds | Match effect |
|---|---|---|
| **Weapon** | `dagger`, `sword`, `axe`, `bow` | Attacks the guardian. Behavior varies by weapon (below). |
| **Food** | `bread`, `cheese`, `grapes`, `mushroom`, `turkey`, `wheat`, `acorn` | Refills the **rations** meter. Bigger matches refill more. |
| **Hoard** | 4 surface / 6 relic / 5 vault kinds (see decisions doc D11) | Banks gold **and** raises greed. Relics/vault worth more than surface coins. |
| **Emblem** | the 9 heraldic animals | Charges the sworn **banner's** power (Phase 5 — charge accrues now, nothing spends it yet). |
| **Light** | `candle` | Widens torchlight (Phase 4 — no-op until fog exists). |
| **Hazard** | *(none committed yet)* | Not player-matchable; spawned by enemies (Phase 6). No hazard art exists yet. |

All 45 committed tile icons are mapped — see the decisions doc D11 for the exact table, including the one-time `tile_sword.png` art promotion.

## Weapon Behaviors

| Weapon | Effect | Starting numbers |
|---|---|---|
| Dagger | Strikes twice, fast — low damage per hit, advances the guardian's turn the least | 2×8 dmg, turnCost 1 |
| Sword | Balanced single strike | 20 dmg (+8/extra tile), turnCost 2 |
| Axe | Cleaves: damages the guardian **and** shatters one adjacent tile (helps dig) | 18 dmg (+6/extra tile), turnCost 2 |
| Bow | Ranged: ignores the guardian's armor | 20 dmg (+8/extra tile), turnCost 2, armor-ignoring |

Exact numbers live in `src/logic/data/balance.ts` (the single tunable source — nothing else hardcodes weapon damage). See decisions doc D12.

## Meters

- **Rations** — drains by 1 each turn (each resolved swap). Refilled by food matches, scaled by match size. Hits 0 → `exhausted` flag set (Phase 3 will attach a real gameplay penalty; the flag itself is live now). *Per-run, persists across floors.*
- **Greed** — rises with every hoard theft (1:1 with gold banked, tunable). Does **not** reset between floors. Guardian reaction to greed is Phase 3. *Per-run.*
- **Valor** — charged by emblem matches. Spent on the banner power once Phase 5 exists; `useBanner()` currently no-ops. *Per-run.*

## Board Depletion & Strata

Neither Phase 1 nor Phase 2 has gravity or refill-from-top — matched or shattered cells stay empty for the rest of that floor. A floor's board is generated once at floor start, banded top-to-bottom into three fixed row ranges:

- **Surface** (top 40% of rows) — common weapon/food, surface-tier hoard (`coin`/`ring`/`gem`/`ingot`).
- **Relic** (next 35%) — same weapon/food density, relic-tier hoard.
- **Vault** (bottom 25%) — reduced weapon density, **zero food**, only vault-tier hoard (`crown`/`grail`/`chest`/`key`/`scroll`).

`stratum` reports how many bands are fully cleared (0–3); the board is fully empty (not merely `stratum === 3`, to sidestep row-count rounding) triggers `descend()`. Each descend: floor+1, a bigger board (rows grow, capped), a reset-and-scaled guardian, richer hoard values — but gold/greed/rations persist. See decisions doc D9–D10, D14–D15 for the full reasoning.

## Banners (9 Knightly Orders)

*(Phase 5 — not yet built; names/effects below are the design target, not implemented.)*

| Banner | Power |
|---|---|
| Owl | Free peek at one fog tile each turn |
| Wolf | Chain/cascade matches deal bonus damage |
| Boar | Supercharged opening strike each floor |
| Serpent | Weapon matches also poison the guardian |
| Falcon | One extra swap per turn |
| Stag | Food matches refill more rations |
| Bear | Reduces incoming guardian damage |
| Raven | Reveals the nearest hoard tile in the fog |
| Lion | Higher gold value on every theft (greed rises faster) |

## State Model

```ts
type Role = 'weapon' | 'food' | 'hoard' | 'emblem' | 'light' | 'hazard';

interface Tile { id: string; role: Role; kind: string; faceDown: boolean; value?: number; }

interface GameState {
  board: (Tile | null)[][];
  torchlight: boolean[][];   // all-true stub until Phase 4
  stratum: number;
  floor: number;
  banner: string;            // unused stub until Phase 5
  bannerCharge: number;
  meters: { rations: number; greed: number; valor: number; exhausted: boolean }; // exhausted: extension, D5
  guardian: { hp: number; maxHp: number; armor: number; rage: number; turnCounter: number };  // maxHp: extension, D6
  gold: number;
  status: 'playing' | 'escaped' | 'dead';  // 'escaped'/'dead' resolution is Phase 3
  rngSeed: number;           // extension, D7 — keeps every action a pure function
}
```

Core pure actions (`(state, input) => newState`, no rendering dependency — unit-tested in `tests/logic/**`): `swap`, `resolveMatches`, `guardianTurn` (Phase 3 stub), `descend`, `useBanner` (Phase 5 stub), `escape`.

## Implementation Status

| Phase | Status |
|---|---|
| 1 — Match-3 core (typed tiles, weapon/food/hoard effects, dummy guardian) | **Built & verified** |
| 2 — Depletion & descent (strata, no-refill, floor growth) | **Built & verified** |
| 3 — Guardian & greed (rage-scaled counter-attack, real win/lose) | Not started — stubs in place (`guardian.rage`, `guardian.armor`, `guardianTurn()`) |
| 4 — Fog & torchlight | Not started — stubs in place (`torchlight`, `Tile.faceDown`) |
| 5 — Banners | Not started — stubs in place (`banner`, `bannerCharge`, `meters.valor`, `useBanner()`) |
| 6 — Memory-attacking enemies | Not started — `hazard` role has no kinds/art yet |

## Technical Foundation

- **Logic before rendering:** `src/logic/**` has zero PixiJS/DOM dependency; fully unit-tested via Vitest (`tests/logic/**`, `npm test`).
- **Rendering:** `src/render/**` (PixiJS board) + `src/style.css`/`index.html` (DOM HUD), wired by `src/app/GameController.ts`.
- **Balance/data:** `src/logic/data/balance.ts` (weapon/food/guardian/board numbers), `tileTaxonomy.ts` (role↔kind↔asset map), `strata.ts` (per-band pool weights) — single sources of truth, nothing else hardcodes these values.
- **Build:** `npm run dev` (Vite dev server), `npm run build` (production bundle to `dist/`), `npm run typecheck` (`tsc --noEmit`), `npm test` (Vitest).
- **Assets:** reuses the existing `public/images/tiles/*.png` icon set (45 files, one promoted from staging — see decisions doc D11); no new art generated for Phase 1/2.
