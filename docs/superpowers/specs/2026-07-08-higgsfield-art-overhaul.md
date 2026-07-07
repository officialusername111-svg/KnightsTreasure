# Higgsfield Art Overhaul — Decision Record (2026-07-08)

**Owner decision:** regenerate ALL 188 existing final assets (characters, backgrounds, badges,
titles, tiles, UI, store) through Higgsfield AI, restyled to match the knight character sheet at
`www/assets/images/reference/knight_reference.webp`. This supersedes the per-asset art of
`_READY_FIX_NOBG` **only after per-category owner approval** — the old finals stay in place until
the owner signs off on replacements.

## Locked parameters (approved via 3-image pilot, 2026-07-08)

- **Model:** Higgsfield `nano_banana_2` (Nano Banana Pro backend), 2 credits/image, 2K resolution,
  `knight_reference.webp` passed as image reference on every generation.
- **Prompts:** taken verbatim from the existing locked packs —
  `2026-06-26-character-design-prompts.md` (105 characters) and
  `2026-06-21-google-flow-prompt-pack.md` (backgrounds, badges, titles, tiles, UI, store).
- **Style transform (delegated decision):** the non-character packs were written for
  "2D cartoon" art. Their style heads are swapped for the character pack's locked 3D style tail
  (*Supercell / Clash Royale stylized 3D mobile-game art, semi-realistic cartoon, glossy PBR
  materials, clean specular highlights*), and every prompt gains a trailing
  "match the reference character sheet" clause. Subjects, motifs, palettes, and composition rules
  (framed-tile D16 uniformity, empty-center backgrounds, no-text) are unchanged.
  **Why:** the whole point of the overhaul is converging every surface on the knight sheet's
  render style; keeping "2D cartoon"/"hand-painted" wording would fight the style reference.
- **Aspect ratios:** characters 3:4 · backgrounds 9:16 · badges/titles/tiles/UI/app icon 1:1 ·
  feature graphic 16:9.

## Run mechanics

- Manifest of all 188 prompts: `.claude/assets/_HIGGSFIELD_OVERHAUL/manifest.json`.
- Output staging: `.claude/assets/_HIGGSFIELD_OVERHAUL/<category>/<asset_name>.png`.
  Resumable — re-running skips any asset whose PNG already exists.
- Budget: 610 credits at run start; pilot 6 cr; full batch 185 × 2 = 370 cr; remainder is retry
  headroom. Account: official.username111@gmail.com (Pro).

## Mid-run corrections (owner feedback 2026-07-08, batch restarted as v2)

1. **Hard proportion clause (owner-reported defect):** first-pass renders drifted per character —
   forest guard came out slender/tall (~6 heads), village elder chibi with an oversized head,
   while the knight matched the reference (stocky, ~4.5 heads). Every humanoid character prompt
   now carries: *same body-proportion system as the reference knight — stocky heroic build about
   4.5 heads tall, broad chest, chunky limbs, large hands/feet; head same relative size as the
   knight's; figure fills ~90% of frame height, camera at chest height.* Exempt: `dragon_voice_*`,
   `cave_spirit_*` (non-humanoid by design). Approved via re-pilot of forest_guard_neutral +
   village_elder_neutral. The 18 drifted first-pass portraits were discarded and regenerated;
   the 12 knight portraits were kept as the baseline.
2. **Transparent backgrounds (owner decision):** characters, badges/titles, and UI icons must ship
   as transparent cutouts (like the old `_NOBG` finals). Generation keeps the neutral-grey studio
   background; transparency is a **post-processing step** after the batch (sample shown to owner
   before mass-applying). Backgrounds and the store feature graphic stay full-bleed.
3. **Edge-to-edge tiles (owner decision):** tile faces and `tile_back` must fill the entire image
   with ZERO margin — the gold frame's outer edge IS the image border, flat front-facing, no drop
   shadow — so tiles sit flush on the board with no gaps. Tile prompts rewritten accordingly;
   the pilot `tile_sword` was superseded and regenerated. Tiles therefore need **no** transparency.

## Batch v2 outcome (2026-07-08)

- All 188 assets generated, zero failed jobs. Transparency pass applied: 105 characters
  (plain rembg), 20 badges + 31 UI (hole-filled alpha + original RGB) → `<category>_nobg/`
  folders. Tiles/backgrounds/store stay full-bleed.
- **Owner approved as final art:** characters, badges & UI, backgrounds, store (contact sheets
  in `.claude/assets/_HIGGSFIELD_OVERHAUL/review/`).
- **Tile defect + fix (owner-approved):** first-pass tile faces each invented a different frame,
  violating the D16 identical-frame rule. The 11 non-sword faces were regenerated passing
  `tile_sword` as the image reference with a "change ONLY the central object" prompt —
  **tile_sword's frame is the canonical board frame.** `tile_back` is intentionally distinct.
- Credit spend through batch v2: 424 of 610 (186 remaining before the 22-credit tile regen).

## Integration — DONE (2026-07-08)

- **Scope completion first (owner-approved):** the live game's board uses a 43-icon pool
  (`STAGE_TILES`, D-decision 2026-06-25), not the original 12, and `www/ui` carries 7 D17 assets
  (2 banners, `ui_stamina`, 4 nav icons) — none in the 188-asset scope. Generated the missing
  32 tile faces (canonical sword-tile frame reference) + 7 UI assets (~78 credits). `tile_sword`
  itself is not in the pool; it remains in staging as the canonical frame reference only.
- **226 files integrated into `www/assets/images/`** by script (`integrate.py` pattern):
  characters → trimmed transparent cutouts at 512px height into `characters/<char>/` (runtime
  `portraitFit.js` frames figures by alpha bounds, so NO baked height normalization — baking the
  spec height table would fight the runtime normalizer); badges/UI trimmed to ≤360px (banners
  ≤1024px); tiles 360×360 full-bleed; backgrounds 768×1376; store 512² icon + 1024×500 feature
  graphic (center-cropped from 16:9).
- **Verified in the running game:** name entry → home (new badges/UI) → quest map → stage-1 story
  dialogue → board renders new tiles (stage-themed pool) → pair match works, matched tiles stay
  face-up, console clean.
- Credit position after everything: ~86 of 610 remaining.
- Old art is recoverable via git (`www/` was committed before replacement) and `_READY_FIX_NOBG`
  is untouched as the pre-overhaul archive.
