# Higgsfield Art Overhaul — Decision Record (2026-07-08)

## Addendum — gameplay & presentation decisions (owner, batch of 2026-07-08 evening)

1. **Auto-match revealed pairs:** when a power-up permanently reveals both tiles of a real
   pair (Arrow/Sword/Bomb), the pair completes automatically through `matchPair()` in
   `www/js/systems/match.js` — combo, War Horn bonus, and win detection all apply.
2. **Spear = cross reveal:** player-aimed; slices BOTH the row and column of the picked tile
   (temporary 3s reveal). Supersedes the row-only D-decision.
3. **Player-aimed power-ups:** Raven (flies picked tile → its pair), Arrow, Spear, Sword
   (stabs picked tile, then its pair 0.5s later), Bomb. Aim-mode: dim board, pulsing valid
   targets, hint chip, cancel via re-tap/✕/Escape; inventory spent only on a valid strike.
4. **Hourglass stays +15s** — green "+15s" float absorbed into the time HUD is visual only.
5. **Shield HUD swap:** while frozen, the timer value shows a blinking shield
   (`hud.setFrozen`); `setTime` is held until unfreeze.
6. **Tutorial NPC is boxless:** full-figure cutout beside the speech bubble (object-fit:
   contain), no frame/crop; the bust-crop portraitFit is intentionally not applied there.
7. **Story dialogue depth:** backdrop blurred (7px) + zoomed (1.07); speaker scales 1.1.
8. **Tile style v2 (pilot approved-pending):** simple thin gold frame, inset color keyed to
   each tile's subject (NOT theme-locked crimson). Supersedes the D16 crimson-inset rule;
   the identical-frame rule stays. Full 43-tile regen deferred to credit top-up; must use a
   canonical-frame reference image + explicit "frame always gold" clause (pilot showed frame
   drift + margin regression without it). Pilot: `.claude/assets/_HIGGSFIELD_OVERHAUL/tiles_v2_pilot/`.
9. **Nav art:** dedicated `ui_nav_mail` / `ui_nav_smith` icons replace the placeholder SVGs.

## Addendum 4 — ideas adopted from the animation-research prompt (owner-approved 2026-07-09)

Source: owner's IMPROVE-PROMPT.md (written for the old single-file prototype; translated to
this build — most of its axes were already implemented here). Adopted, all five approved:

16. **Haptics** — `www/js/systems/haptics.js`: navigator.vibrate patterns per event (flip
    tick, match pulse, mismatch buzz, win celebration, bomb thud, combo run, arm click);
    Settings → "Vibration" toggle (`save.settings.haptics`, default ON); off under
    reduced-motion; silent no-op where unsupported.
17. **AV sync** — impact sounds fire on the impact FRAME, not at cast: new procedural
    voices `boom` (bomb hit-stop release), `thud` (arrow/sword strikes), `arm` (aim mode);
    combo ≥5 plays the fanfare with the shudder.
18. **Colorblind-safe cues** — matched tiles carry a persistent ✓ badge, mismatches flash
    an ✕ while shown (pure CSS ::after; meaning no longer rides on color alone).
19. **Particle textures** — 3 Higgsfield glow sprites (gold spark, ember mote, radial glow,
    3cr, black-backdrop + mix-blend-mode:screen) replace the CSS-gradient particles, with
    the old gradient still painting first as the load-failure fallback.
20. **"New at the Blacksmith" toast** — stage advancement now surfaces newly unlockable
    power-ups on the victory overlay (previously silent).
Rejected from the prompt as not applicable here: ≤1.5MB asset budget (superseded by the
owner's full-art-set decision), relic-bar state model (tray/inventory exists), demo.html
work, sprite-sheet walk cycles, generated narration/ambient audio (deferred — credits).

## Addendum 3 — zoom & impact juice + tile restyle v2 batch (2026-07-09, owner-delegated
## creative pass: "be creative, I'll check later" — decisions recorded per CLAUDE.md rule 2)

13. **Camera zoom language (`boardZoom`):** punch-ins anchored at the impact point with a
    spring release. Rules of use: ≤160ms in for impacts; slow sustained push only for long
    reveals (Torch 420ms in / 1.3s hold); never during aim mode; no-op under reduced-motion.
    Wired: Bomb 1.12 (with hit-stop), Shield bash 1.08, Arrow/Sword 1.05 per strike,
    Raven landing 1.04, Torch push 1.04, combo ≥3 match punch 1.04.
14. **Tile impact juice:** press squash on tap (`scale:.95` via the `scale` property so the
    3D flip transform is untouched); mismatch adds a red glow to the existing shake; every
    match emits a gold impact ring on both tiles; combo ≥5 adds a screen shudder; win plays
    a left-to-right pop wave across the cleared board before the results overlay.
15. **Tile restyle v2 executed at 1K/Lite:** canonical wolf tile (nano_banana_2, 2K, gold
    frame locked) + 42 frame-referenced derivatives via nano_banana_2_lite @1cr (tiles ship
    at 360px, so 1K sources are lossless in practice). Per-subject inset palettes recorded
    in the generation script. Budget: 44cr of the 68 available.

## Addendum 2 — refined effects + whole-game audit (owner, 2026-07-08 late)

10. **Projectile-and-light effect language:** power-ups fire real sprites, not UI icons —
    `www/assets/images/fx/` (fx_raven_fly, fx_arrow, fx_spear, fx_sword_stab; Higgsfield,
    ~8cr). `castProjectile` gained `faceTarget` (rotate along flight vector), `flipX`, and
    `trailColor`; new `lightBeam` / `lightSweep` primitives add tracers (Arrow/Spear), a
    green absorb beam (Hourglass), a blessing shaft (Holy Water), and a board scan
    (Eagle Eye).
11. **Tap-the-twin completes the pair (owner fix):** flipping a tile whose partner is
    permanently revealed auto-matches at once (shared `celebrateMatch` path in game.js).
12. **Audit fixes (approved):**
    - **B1** — positional power-up geometry (bomb 2×2, spear cross) now runs on the VISUAL
      grid: D8 swaps reorder DOM slots while model indices stay identities, so index math
      diverged from what the player sees. Pure `visualBombZone` / `visualCross` in
      mechanics.js, unit-tested incl. the swapped-board case.
    - **B2** — tile movement pauses during aim mode and for 1.4s around an aimed strike.
    - **B3** — `win()`/`lose()` clear a pending mismatch timer (post-level state race).
    Audit also verified sound: permaReveal identity across swaps (pinned), Shield/Hourglass
    freeze interplay, auto-match vs mismatch window, War Horn ×2, Android timer freeze,
    aim cleanup on level end. Accepted as-is: bomb may reveal a chain-locked tile's face
    (info leak, no match) — deliberate power-up value.

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
