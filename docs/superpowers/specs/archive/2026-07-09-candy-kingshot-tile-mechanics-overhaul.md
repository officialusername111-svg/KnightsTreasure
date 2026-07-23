> **SUPERSEDED (2026-07-23):** Describes the retired memory-match design. See `docs/superpowers/specs/2026-07-23-match3-heist-pivot-decisions.md` for the current match-3 dungeon-heist design.

# Candy Crush / Kingshot Tile & Mechanics Overhaul — Design Spec (2026-07-09)

## Summary

A visual and mechanical pass on the game board, inspired by Candy Crush (piece silhouettes,
juicy match feedback) and Kingshot (glossy fantasy chrome, campaign-pressure pacing). Delivers:
frameless, silhouette-true tile faces; two new emergent mechanics (Combo Streak Wildcard, Chain
Reveal Ripple) plus a stage-gated escalation roster; a per-stage animated board backdrop; and a
pilot-first Higgsfield asset rollout.

Approved via the interactive design report at
`https://claude.ai/code/artifact/1f37258e-4aa4-4f1c-99dc-5c09f9654d8d` (2026-07-09). This document
is the durable record; the artifact is illustrative only (placeholder CSS silhouettes, not final
art).

## Decisions superseded

1. **D16 — identical-frame rule** (`docs/superpowers/specs/2026-06-21-knights-treasure-design-decisions.md`):
   retired for **face art only**. `tile_back` is unaffected and keeps the uniform gold frame — it
   is the grid's "identical slot" signal and every subject shares it. Revealed **faces** stop
   using a baked frame; each subject's outer silhouette becomes its own shape (sword-shaped,
   chalice-shaped, etc.).
2. **"Edge-to-edge, zero-margin" board rule** (`2026-07-08-higgsfield-art-overhaul.md`, Mid-run
   correction 3): retired. Each board cell gains a small CSS-driven inset "slot" backdrop so the
   now-smaller, frameless face art has somewhere to sit rather than bleeding to the cell edge.
   `tile_back` continues to fill its cell edge-to-edge as before; only the face state changes.

No other locked decision in the design-decisions doc or the overhaul record is affected. Existing
power-ups, locked-tile chains (D9), aim-mode power-ups, and camera-zoom language (`boardZoom`) are
unchanged and must keep working exactly as documented.

## 1. Tile visual system

**tile_back** — unchanged. Uniform gold-framed square, same asset used for every subject on every
stage, exactly as today.

**Tile face (revealed state)** — new treatment:
- Transparent-background cutout per subject, outer silhouette shaped to the subject itself (not a
  forced square/circle), sized to roughly 80% of the cell so it sits inside its slot with a small
  margin, similar to a Candy Crush piece.
- A soft drop-shadow on the cutout for depth, consistent with the glossy-3D character style
  already locked for the rest of the game's art.
- The cell itself gets a new reusable **CSS-only** radial-gradient "slot" backdrop (no new
  Higgsfield asset) so a revealed cell never shows raw transparency behind the now-smaller face
  art. One CSS rule, shared by every cell — not per-subject.

**Reveal transition** — layered on top of the existing 3D flip (`www/css/main.css` `.kt-tile-inner`,
unchanged):
- The frame chrome (visually, the border/inset that used to be baked into the face image) fades
  out over ~150ms opacity + blur as the flip completes.
- The freed silhouette overscales 1.0 → 1.12 → 1.0 over ~220ms as it lands, using the same
  overshoot easing (`cubic-bezier(.34,1.56,.64,1)`) already established for "snap into place"
  moments in this codebase (`main.css` `kt-seal-in`, `.kt-tile.matched::after`).
- Existing match/mismatch FX — impact ring, shake, gold `✓`/red `✕` cues, matched-tile recede —
  are unchanged and continue to apply on top of the new face art.

**New tile subject: `tile_wildcard`** — see §2. One asset, used across every stage (like
`tile_back`), not part of any `STAGE_TILES` pool since it is spawned dynamically, not dealt at
board setup. It is a rendering overlay only: the tagged tile's real (hidden) icon is untouched, so
`tile_wildcard.png` displays in place of that tile's true face art, not a swap of the underlying
data.

## 2. Mechanic — Combo Streak Wildcard

**Trigger.** Reads the existing `combo` counter already tracked in `www/js/ui/game.js`
(`celebrateMatch()`, ~line 504–517; reset to `0` on mismatch, ~line 217) but does **not** reset or
otherwise mutate it — `combo` keeps serving its existing jobs (War Horn ×2, combo shudder ≥5,
Stage 3's Streak Banner threshold in §4) untouched. A **separate** counter, `sinceWildcard`, is
introduced solely to gate spawning: it increments on every match exactly when `combo` does, and
resets to `0` on mismatch (mirroring `combo`) and whenever a Wildcard actually spawns. When
`sinceWildcard` reaches **3** and no Wildcard is currently live on the board, spawn one and reset
`sinceWildcard` to `0`.

**Spawn.** Pick one random tile that is currently face-down, unlocked (not under a D9 chain), and
not a decoy tile (D6); tag it `wildcard: true`. **Its real `icon` and real partner are left
untouched** — only its rendered face and matching behavior change (see Resolution). Only one
Wildcard may exist on the board at a time — while one is live, `sinceWildcard` keeps counting but
spawning is skipped until the existing Wildcard is resolved.

**Resolution.** Flipping the Wildcard as either half of a pair always resolves as a match,
regardless of what the second tile's icon is:
- **If the second tile happens to be the Wildcard's own true partner** (same icon), this is simply
  a normal match — no side effects.
- **If the second tile is anything else,** both tiles clear as a pair (score awarded via the normal
  match path), and then each tile's own true partner — the Wildcard's real partner, and the other
  tile's real partner, both elsewhere on the board — is **silently retired**: marked matched with
  no score, so it stops being tappable, and the level's remaining pair target
  (`match.totalPairs`, not the original design-time `level.pairs`) is reduced by **one** to keep
  the count exact. This is what prevents the classic memory-game failure mode of a permanently
  unmatchable orphan tile: every real tile ends the level either normally matched, part of a
  Wildcard pairing, or silently retired as fallout from one — never stranded alone.
- Resolving a Wildcard match still increments `combo` and `sinceWildcard` like any other match
  (subject to the "only one live at a time" spawn gate above).

**Scoring must not use the shrinking target.** Because a Wildcard mismatch can lower
`match.totalPairs` below the level's original pair count, every scoring/star calculation
(`computeScore`, `computeStars`, `mistakePenalty` in `www/js/ui/game.js`'s `win()`) must read the
level's fixed, original `level.pairs` — never the live `match.totalPairs` — so using a Wildcard
never quietly reduces the player's "Matches ×100" score term. `match.totalPairs` is used **only**
internally by match.js's win-condition check (`matchedPairs === totalPairs`).

**Guardrails.**
- No score bonus or score penalty attached to the Wildcard match itself — it is a tempo reward for
  skilled play, not a purchased power-up, and must not be tunable to outperform Sword/Bomb
  (`www/js/data/items.js`), which cost coins and carry a −25 score penalty.
- The Wildcard is exempt from Eagle Eye's "glow all real pairs" targeting (it has no real pair to
  glow differently from its own tile) and from Holy Water's chain-removal logic (it is never
  locked).

## 3. Mechanic — Chain Reveal Ripple

**Trigger.** Every successful match, whether from a normal tap-match or a power-up-driven
auto-match (Sword, Bomb, Wildcard).

**Effect.** Pick one random still-face-down, unlocked tile that is orthogonally adjacent (up,
down, left, right) to either matched tile, using the same **visual-grid** adjacency already used
by `visualBombZone` / `visualCross` in `www/js/systems/mechanics.js` (i.e. DOM slot position, not
model index — this is the same fix documented as audit item B1 in the 2026-07-08 overhaul record,
and the ripple must reuse that existing helper pattern rather than reintroduce raw index math).
Flash that tile's face for 350ms, then return it face-down. This does **not** count as a flip for
mismatch/miss or streak-reset purposes.

**Guardrails.**
- If no valid unflipped, unlocked neighbor exists, the ripple fizzles silently — no fallback
  target elsewhere on the board.
- The ripple only ever peeks; it can never itself complete a match, unlike Sword/Bomb/Wildcard.
  This keeps it from cannibalizing the value of Eagle Eye or Torch.

## 4. Stage unlock roster

Both core mechanics are active from Stage 1. Three escalations unlock later, stored in a new
`MECHANIC_UNLOCKS`-style table in `www/js/data/` (mirroring the existing `unlockStage` convention
in `items.js` and the `STAGE_TILES` convention in `tiles.js`), gated the same way
`powerupsForStage()`-equivalent logic already gates purchasable power-ups:

| Stage | Unlock | Effect |
|---|---|---|
| 1 | Combo Streak Wildcard + Chain Reveal Ripple | Both mechanics active from the first board. |
| 3 | Streak Banner | When `combo` (§2) reaches **5**, sweep a gold banner across the board and widen the Ripple to 2 neighbors instead of 1 until `combo` resets on the next mismatch. Independent of `sinceWildcard`, so it can fire on the same streak that has already produced one or more Wildcards. |
| 5 | Twin Spark | Matching a Wildcard fires an extra ripple pulse (peeks 2 tiles instead of 1), rewarding sustained streak play. |
| 8 | Vault Pulse | Every 20s, one random still-hidden, unlocked tile emits a location-only glow (outline pulse, no face reveal) — ambient late-campaign pressure. Must not overlap Eagle Eye's real-pair highlighting. |

Note: `items.js` currently carries a `TEMP-DEMO (REVERT BEFORE COMMIT)` comment flattening most
power-up `unlockStage` values to `1` for demo purposes. This spec's stage gating (3/5/8) is
independent of that revert and should be implemented against the intended staggered design, not
the temporary demo state.

## 5. Board backdrop

**Bug fix.** `www/js/ui/game.js` (~line 74) currently sets the board's `--bg-forest` CSS variable
from `ASSETS.bgForest` unconditionally, so every stage shows the Stage-1 forest image behind the
board instead of its own `STAGE_BG[stage]` entry (`www/js/data/config.js`). Wire it to the correct
per-stage value.

**Parallax.** CSS-only, no new per-stage image assets beyond the single (regenerated) background
each stage already has: a slow-drifting decorative particle layer (mist/dust/embers, per stage
theme) drawn with CSS gradients/keyframes sits above the existing `#kt-board-wrap::before`
background image; a lightweight foreground vignette layer sits above that for depth. Reuses the
transform/animation conventions already established for `boardZoom` (`www/js/ui/animations.js`),
including its `prefers-reduced-motion` no-op.

## 6. Asset rollout (Higgsfield)

**Pilot (this initiative's first implementation step, not part of this design phase):**
- `tile_dagger` — canonical frameless face, full `nano_banana_2` generation (2K, 2cr), establishes
  the new silhouette style as the reference for every other face.
- `tile_chalice`, `tile_gem`, `tile_dragon` — `nano_banana_2_lite` (1cr each) referencing the
  canonical `tile_dagger` for style consistency, chosen to span visually distinct silhouette
  families (weapon, vessel, gem, creature).
- `tile_wildcard` — new subject, `nano_banana_2_lite` (1cr) referencing the canonical face.
- `bg_stage1_forest` — regenerated in the new style, `nano_banana_2` (2K, 2cr).
- Pilot cost: ≈8 credits.

**Batch (after pilot approval):**
- Remaining ~38 tile faces, `nano_banana_2_lite` referencing the approved canonical face.
- Remaining 9 stage backdrops, `nano_banana_2_lite` referencing the approved pilot backdrop.
- Batch cost: ≈47–56 credits depending on final tier choice.

**Budget note.** ~86 of 610 Higgsfield credits remain as of this writing. Pilot + batch is
estimated at 55–64 credits total, leaving a thin buffer — the batch step must re-confirm remaining
balance before running, and scope should be trimmed (e.g. defer backdrop batch to a follow-up) if
the balance is tighter than estimated.

## 7. Testing

- `tests/mechanics.test.js`: pure-function coverage for `sinceWildcard`-to-spawn logic (fires at 3,
  only one Wildcard live at a time, resets on spawn and on mismatch, does **not** reset `combo`),
  the Stage 3 Streak Banner threshold reading `combo` independently of `sinceWildcard` (including
  the case where a Wildcard already fired earlier in the same streak), Wildcard spawn-candidate
  selection (excludes locked/decoy tiles), and ripple neighbor selection (visual-grid adjacency,
  reuses the `visualBombZone`/`visualCross` pattern, fizzles with no valid neighbor).
- `tests/match.test.js`: Wildcard resolved against its own true partner behaves exactly like a
  normal match (no `totalPairs` change); resolved against a different tile clears both, retires
  each side's real partner with no score, and reduces `totalPairs` by exactly one; a full-board
  simulation proves the level remains winnable (no stranded orphan) after a Wildcard mismatch;
  `combo` and `sinceWildcard` both reset on mismatch; Ripple peek does not affect either counter.

## Out of scope

- No changes to the purchased power-up roster, costs, or effects (Raven, Hourglass, Arrow, Torch,
  Eagle Eye, Shield, Spear, Holy Water, Sword, Bomb, War Horn, King's Decree).
- No changes to scoring formulas, timers, or the save schema.
- `tile_back` art is unchanged; only face art and the board backdrop are regenerated.
- Character, badge, UI, and store art from the 2026-07-08 overhaul are unaffected.
