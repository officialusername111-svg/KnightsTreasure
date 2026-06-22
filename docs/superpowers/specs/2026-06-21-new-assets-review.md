# Knight's Treasure — New Assets Review (batch 2 / `_new_assets`)

> Review of the 90 images in `.claude/_new_assets/` against the asset manifest, GDD theme, and the design decisions. Covers theme-fit, coverage, what's missing, and what needs regeneration/rework. **Date:** 2026-06-21.

## Summary
A large, high-quality batch (90 JPEGs) that — together with batch 1 — brings the project to **near-complete art coverage**: all 17 character expression sheets (with the palette fixes and the new label+divider layout), all 10 stage backgrounds + all scene rooms, the tile back + 12 tile icons, the full UI icon set, 4 rank medallions + 3 title crests, and the store art. Two real gaps remain (stage badges, a few rank metals) and a few cross-cutting rework items (orientation, format).

---

## Batch 3 update — `_new_assets_2` (32 files, the regeneration batch)
The decided rework + missing badges came through. Verified:
- **Backgrounds (17) re-generated at 9:16 portrait** ✅ — confirmed **768×1376**; forest/dungeon/throne/lair/vault/rooms/map/cover all portrait now, with open central composition for the board. Theme/quality excellent. *(Resolves Rework A.)*
- **Stage badges (10)** ✅ — all themed circular medallions present (forest oak-leaf, village, river, cave, bandit daggers, castle gates, dungeon chain, throne crown, dragon, vault chest). On-theme. *(Resolves Missing §3a.)*
- **Rank badges — the 3 missing metals** ✅ — **Bronze/Basic** (shield+lion), **Silver/Captain** (crossed swords+star), **Platinum/Champion** (winged swords+star), **Mythril/Grandmaster** (crown-of-stars over sword). With batch 2's Iron/Gold/Diamond, **all 7 ranks are now complete.** *(Resolves Missing §3b.)*

**Still outstanding after batch 3:**
- **12 frameless tile icons** (Rework C decision) — NOT in this batch. Prompts ready in the prompt pack §B. *(Or keep emoji tiles → drop entirely.)*
- **Processing:** JPEG→PNG + background removal for badges/medallions/character sprites (backgrounds can stay as portrait JPEG/WebP).
- **Duplicate:** two `Treasure_vault_piled_with_gold` portrait versions (…2206 & …2207) — keep one.

**Net:** the only art left to generate is the 12 frameless tile icons (optional if keeping emoji). Everything else in the manifest is generated and on-theme.

## Batch 4 update — `_new_asset_3` (12 files): tile icons ✅
The **12 frameless tile-front icons** are done (sword, shield, longbow, crown, gem, key, potion, scroll, helmet, coin, ring, candle) — object-only, bold outline, on-palette, plain-grey for cut-out. The candle (previously framed) is now frameless too. **This closes the last art gap.**

**ART IS NOW 100% GENERATED.** Remaining work is processing only: JPEG→PNG + background removal + slice sheets + crop badges/icons to content + normalize tile-icon scale + rename into `www/assets/images/`. *(Minor: the longbow is thin/diagonal — when processing, crop to content and center on a square so it reads at tile size.)*

---

## 1. Theme-fit assessment (verdict per category)

| Category | Verdict | Notes |
|---|---|---|
| **Character sheets** | ★★★★★ Excellent | Cohesive medieval cartoon, on-palette. The 3 palette fixes landed: Elder now **crimson/gold** (was blue), Princess **crimson/gold/ivory** (was pink), Shadow Lord **crimson glow** (was purple). The new **label-below + divider-line + even grid** layout is exactly right for clean slicing. |
| **Backgrounds (stages + rooms)** | ★★★★☆ Excellent art, wrong orientation | Each scene is beautifully on-theme (forest fireflies, volcanic lair, throne room, etc.). **But all are landscape; the game is portrait 9:16** → see Rework A. |
| **Tile back** | ★★★★★ Excellent | Dark iron/wood + gold filigree + crossed-swords crest. Perfect. |
| **Tile front icons (12)** | ★★★★☆ Great, framed | All 12 present incl. candle. They carry an ornate gold frame + colored backplate — gorgeous, but see Rework C (frame may double up with the tile face). |
| **UI icons (power-ups/consumables/HUD)** | ★★★★★ Excellent | The framed "collectible card" look (e.g. raven on crimson) is cohesive and premium. All present incl. arrow, empty-star, coin-pouch, flame-wipe. |
| **Rank medallions** | ★★★★★ for the 4 present | Iron, Gold, Diamond, radiant-Silver are stunning and clearly tiered. A few metals still missing (see §3). |
| **Title crests (3)** | ★★★★★ Excellent | Blazing (fire), Shadow (skull), Legendary (gold star+laurel) all on-theme. |
| **Store (app icon, feature, cover)** | ★★★★★ Excellent | App icon (chest+sword+lock on crimson) is iconic and readable; cover + feature vistas are dramatic and on-brand. |

**Overall theme fit: excellent and consistent.** The whole set reads as one cohesive medieval-fantasy game.

---

## 2. Coverage — what this batch completes
- **Characters:** all 17 sheets present → the full **105 expressions** are now generated (as sheets, pending slicing). Palette fixes done.
- **Backgrounds:** all **10 stage** + blacksmith, tavern, bard's corner, gambler's den, daily-duty board, world map, cover = **17/17** (orientation aside).
- **Tiles:** `tile_back` + **12/12** front icons (sword, shield, bow, crown, gem, key, potion, scroll, helmet, coin, ring, candle).
- **UI icons:** **12/12 power-ups** (incl. arrow, holy water), **5/5 consumables**, **14/14 HUD** (incl. empty star, timer, lock-chain, decoy `?`, heart, button frame, parchment, flame-wipe, rank frame, coin pouch).
- **Badges:** 4 rank medallions (iron, gold, diamond, radiant-silver) + 3 title crests.
- **Store:** app icon + feature graphic + cover.

---

## 3. MISSING — needs generation

### 3a. Stage badges (10) — none present
The 10 per-stage completion badges (decision D14) were not in this batch. **Generate all 10.** Exact prompts (square 1:1):
```
2D cartoon medieval game badge, circular collectible emblem, glossy embossed heraldry, antique-gold rim, palette of crimson, gold, silver and brown, plain flat neutral-grey background, no text, no watermark. A circular stage-completion badge themed for {THEME}, featuring {MOTIF} in the center, ornate, centered, square.
```
- `badge_stage1_forest`  → {THEME}=a green forest, {MOTIF}=an oak leaf and a winding path
- `badge_stage2_village` → {THEME}=a medieval village, {MOTIF}=a timber house with a banner
- `badge_stage3_river`   → {THEME}=a river crossing, {MOTIF}=a cresting wave over a wooden oar
- `badge_stage4_cave`    → {THEME}=a dark cave, {MOTIF}=a glowing crystal cluster
- `badge_stage5_camp`    → {THEME}=a bandit camp, {MOTIF}=crossed daggers over a campfire
- `badge_stage6_gates`   → {THEME}=castle gates, {MOTIF}=a portcullis between two towers
- `badge_stage7_dungeon` → {THEME}=a dungeon, {MOTIF}=a broken chain and an iron key
- `badge_stage8_throne`  → {THEME}=a throne room, {MOTIF}=a crown above a throne
- `badge_stage9_lair`    → {THEME}=a dragon's lair, {MOTIF}=a coiled dragon over flames
- `badge_stage10_vault`  → {THEME}=a treasure vault, {MOTIF}=an open treasure chest with a star

### 3b. Rank badges — 3 metals missing
Present: **Iron** (Apprentice), **Gold** (Commander), **Diamond** (Paladin), **radiant-Silver** (covers *one* of Captain/Grandmaster). Missing distinct metals: **Bronze (Basic), Platinum (Champion),** and the other of **Silver (Captain) / Mythril (Grandmaster)**. Net **3 to generate** — verify which of Captain/Grandmaster the radiant-silver one is, then generate the rest. Prompts (square 1:1):
```
2D cartoon medieval game badge, glossy embossed heraldry, antique-gold rim, palette of crimson, gold, silver and brown, plain flat neutral-grey background, no text, no watermark. A circular knight-rank medallion made of {METAL}, embossed with {MOTIF}, ornate, centered, square.
```
- `badge_basic`      → {METAL}=polished bronze, {MOTIF}=a knight's shield
- `badge_captain`    → {METAL}=bright polished silver (no heavy glow), {MOTIF}=two crossed swords with a single star
- `badge_champion`   → {METAL}=shining platinum, {MOTIF}=winged crossed swords
- `badge_grandmaster`→ {METAL}=glowing mythril with a radiant aura, {MOTIF}=a crown of stars above a sword

> (Bonus characters **king** and **villager** still have base-pose only; not GDD-required, low priority.)

---

## 4. REWORK — generated but needs adjustment (your decisions)

**A. Backgrounds are landscape; the game is portrait (9:16). — biggest item.**
The text prompt said "portrait 9:16" but Flow output landscape (it needs the **aspect-ratio control set to 9:16**, the words alone don't force it). Options:
- **Recommended:** re-generate the 17 backgrounds with Flow's aspect ratio explicitly set to **9:16** (same prompts). Best visual result on phones.
- **Cheaper:** keep landscape and crop/letterbox behind the board (acceptable for a memory game where the board covers center). Some scene detail lost.
- Cover (`Knight_facing_glowing_castle`) and feature graphic (`Knight_before_treasure_vault`) are fine as landscape — the **feature graphic is meant to be 1024×500 landscape**.

**B. Format is JPEG (lossy, no transparency).**
Sprites/icons/characters/badges need **PNG + background removal** (JPEG can't hold alpha and adds compression artifacts). If Flow can export PNG, re-download as PNG; otherwise we convert + cut out during processing. Backgrounds can stay JPEG (no alpha needed) but PNG/WebP is preferable for quality.

**C. Tile-front icons have ornate frames + colored backplates.**
For the **power-up/HUD UI icons this is perfect** (cohesive cards). For **tile-front icons**, the frame may double up with the memory-tile's own face frame. Decision: keep them (they read like inventory items) **or** regenerate the 12 tile icons frameless (object only, transparent) so they sit cleanly on the tile face. *(Recommend frameless for tiles, keep frames for UI.)*

**D. Duplicates to delete (3):**
`Circular_knight_rank_medallion_…2112 (1)`, `Fire_wipe_icon_square_…2114 (1)`, `Gambler_character_expression_sheet_…2109 (1)`.

---

## 5. Net to-do
| Item | Count | Action |
|---|---|---|
| Stage badges | 10 | Generate (prompts §3a) |
| Rank badges (missing metals) | 3 | Generate (prompts §3b) |
| Backgrounds | 17 | **DECIDED: re-generate at 9:16 portrait** (prompt pack §A) |
| Format conversion | all sprites/icons | JPEG→PNG + bg-removal (processing) |
| Tile icons frameless | 12 | **DECIDED: re-generate frameless** (prompt pack §B) |
| Duplicates | 3 | Delete |

Everything else from the manifest is now **generated and on-theme**. Once you decide A (orientation) and C (tile frames), I can process this batch into `www/assets/images/` (slice sheets at the divider lines, convert to PNG, cut out backgrounds, rename to the canonical filenames) exactly as I did with batch 1.
```
