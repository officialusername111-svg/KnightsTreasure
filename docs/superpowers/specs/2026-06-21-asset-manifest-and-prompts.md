# Knight's Treasure — Asset Manifest & Google Flow Prompts

> **Scope:** Every visual + audio asset the game needs, mapped to the `www/assets/` folders, with ready-to-paste generation prompts. Image prompts are written for **Google Flow / Imagen** (Flow's image "ingredients"). Audio is flagged separately — Flow does not generate game music/SFX.
> **Style authority:** design-decisions doc + GDD "Art Style Notes". **Date:** 2026-06-21.

---

## 0. Production notes (read first)

**Locked style (use the master prefix on EVERY image prompt for consistency):**
> **MASTER STYLE PREFIX —** *"2D cartoon storybook game illustration, hand-painted medieval fantasy style, clean bold outlines, soft cel shading, warm cinematic rim light, cohesive palette of deep crimson red, antique gold, polished silver, and rich brown; high detail, crisp, mobile-game art, centered composition, subject isolated on a flat plain neutral-grey background (#9aa0a6) for clean cut-out, no text, no logo, no watermark, no border."*

**Consistency workflow (critical for the 105 character expressions):**
1. For each character, generate the **base reference sheet** prompt first (neutral pose, front-facing).
2. In Flow, attach that image as an **ingredient / reference**, then run each **expression-variation** prompt so the same character/outfit is preserved — only the face/pose changes.
3. Reuse the same body, re-render only the **bust crop** for dialog portraits.

**Transparency:** Imagen/Flow don't reliably export alpha. Generate on the flat grey background above, then **remove background** (e.g. remove.bg / Photoshop) and export PNG with alpha into the asset folder.

**Aspect/framing:** mascot/full-body → portrait 3:4; dialog bust → square 1:1; backgrounds → 9:16 portrait (phone) ; badges/icons → 1:1.

**Folder mapping (from Plan 1 `www/assets/`):**
```
images/knight/        12 knight expressions
images/characters/    all NPC expressions (main + supporting)
images/tiles/         tile back + tile-front icon set
images/backgrounds/   10 stage bgs + scene rooms + cover/map
images/badges/        rank badges + title emblems
images/ui/            power-up/consumable/HUD icons, coin, star, stamina, lock, parchment
audio/music/          10 stage tracks (NOT Flow)
audio/sfx/            sound effects (NOT Flow — procedural Web Audio in code)
```

**Naming:** `{character}_{expression}.png` (e.g. `knight_confident.png`), `tile_back.png`, `tile_{icon}.png`, `bg_stage{n}_{theme}.png`, `badge_{rank}.png`, `ui_{name}.png`.

---

## 1. Characters & expressions — 105 total

### Standard expression vocabulary
Where the GDD gives only a count, use this ordered set to fill it:
`neutral, happy, surprised, angry, sad, thinking, worried, triumphant, tired, sly, afraid, determined`.

### 1A. The Knight (player) — `images/knight/` — 12 expressions
**Base reference prompt:**
> `[MASTER STYLE PREFIX]` A brave young knight, full body, standing heroically. Polished silver plate armor with a deep-crimson tabard bearing a small gold treasure-chest emblem, brown leather straps and belt, a short cape, tousled brown hair, no helmet so the face is visible. Friendly determined hero face. Front-facing T-pose-ish neutral reference for a game mascot character sheet.

**Expression variations** (attach base as reference; one render each — file → expression):
`confident` (default proud half-smile, hand on hip) · `ready` (gripping sword hilt, eager) · `thinking` (hand on chin, eyes up) · `surprised` (wide eyes, raised brows, slight recoil) · `triumphant` (fist raised, beaming) · `focused` (narrowed eyes, intense, leaning in) · `nervous` (sweat drop, tense smile) · `defeated` (slumped shoulders, downcast) · `frustrated` (gritted teeth, clenched fists) · `overjoyed` (jumping, arms up, huge grin) · `tired` (drooping eyes, leaning on sword) · `grateful` (hand on heart, warm thankful smile).
> Per-expression prompt = `[MASTER STYLE PREFIX]` + "the same knight character (reference attached), full body, showing a **{expression description}** expression and matching body pose. Keep the exact armor, tabard, colors, and hairstyle identical."

### 1B–1G. Other main characters — `images/characters/`
For each: run the **base reference**, then N expression variations from the vocabulary.

| File prefix | Character base prompt (after MASTER STYLE PREFIX) | # expr |
|---|---|---|
| `elder_` | "A kind elderly village elder, long flowing grey beard, deep-brown hooded robe with gold trim, gnarled wooden staff, gentle wise eyes, full body." | 10 |
| `shadowlord_` | "A menacing shadow lord villain, tall imposing silhouette, blackened spiked plate armor edged in dull crimson, tattered dark cloak, glowing ember-red eyes, ominous, full body." | 9 |
| `blacksmith_` | "A burly bearded blacksmith, thick leather apron over a brown tunic, soot-smudged muscular arms, holding a forging hammer, warm gruff face, full body." | 9 |
| `innkeeper_` | "A jovial round-bellied innkeeper, rolled-sleeve linen shirt, brown apron, holding a frothy tankard, hearty welcoming smile, full body." | 9 |
| `bard_` | "A cheerful slim minstrel bard, feathered cap, crimson-and-gold tunic, carrying a wooden lute, playful charming face, full body." | 8 |
| `gambler_` | "A shady lean gambler, hooded dark-brown cloak, sly grin, holding a pair of bone dice, dim mysterious mood, full body." | 8 |

> Variation prompt template (each): `[MASTER STYLE PREFIX]` + "the same {character} (reference attached), full body, showing a **{expression}** expression and fitting pose; keep outfit, colors, and proportions identical."

### 1H. Supporting stage NPCs — `images/characters/`
Base reference + N variations from the vocabulary each.

| File prefix | Base prompt (after MASTER STYLE PREFIX) | # expr |
|---|---|---|
| `forestguard_` | "A sturdy forest guard ranger, green-and-brown leather armor, hooded cloak, longbow on back, watchful face, full body." | 3 |
| `daughter_` | "A young village woman, the elder's daughter, simple brown dress with a crimson shawl, braided hair, gentle hopeful face, full body." | 4 |
| `ferryman_` | "A weathered old ferryman, oilskin cloak, wide-brim hat, holding a long wooden punt pole, calm mysterious face, full body." | 4 |
| `cavespirit_` | "A translucent glowing cave spirit, ethereal blue-silver ghostly form, faint medieval robes, sorrowful otherworldly face, full body, soft glow (still isolate on grey for cut-out)." | 4 |
| `bandit_` | "A rugged bandit captain, mismatched dark leather armor, red bandana, scar, curved dagger, cocky sneer, full body." | 4 |
| `castleguard_` | "A disciplined castle guard captain, gleaming silver plate with a crimson plume helm, tower shield, stern face, full body." | 4 |
| `prisoner_` | "A gaunt dungeon prisoner, torn brown rags, wrist shackles, unkempt hair, weary haunted face, full body." | 4 |
| `princess_` | "A poised princess, elegant crimson-and-gold gown, silver tiara, graceful kind face, full body." | 4 |
| `dragon_` | "A massive dragon's head and neck emerging from shadow, crimson-and-bronze scales, glowing gold eyes, smoke from nostrils, intense, framed for a dialog portrait." | 4 |
| `shadowlord_reveal_` | "The shadow lord fully revealed, ornate black-and-crimson dragon-bone armor, cracked crown, blazing red eyes, terrifying full reveal, full body, dramatic." | 5 |

**Character total: 12 + (10+9+9+9+8+8) + (3+4+4+4+4+4+4+4+4+5) = 12 + 53 + 40 = 105 ✓**

---

## 2. Tiles — `images/tiles/`

**Tile back (1):**
> `[MASTER STYLE PREFIX]` A square memory-game tile back, dark engraved iron-and-wood medieval design with a subtle gold filigree border and a faint crossed-swords crest in the center, slightly worn, top-down flat icon, square.

**Tile-back themed variants (optional, 1 per stage mood — 10):** same prompt, swap the crest motif/accent to match the stage (forest leaf, village banner, river wave, cave crystal, bandit skull, castle portcullis, dungeon chain, throne crown, dragon scale, treasure chest).

**Tile-front relic icons (set of ~40, themed to replace the emoji placeholders):**
> `[MASTER STYLE PREFIX]` A single centered medieval game icon of a **{subject}**, flat top-down emblem style, bold readable silhouette at small size, gold-rimmed, square, on flat grey.

Subjects (group → items):
- **Beasts:** wolf, stag, bear, fox, owl, boar, hawk, serpent, dragonling, warhorse
- **Relics & arms:** sword, shield, bow, crown, gem, amulet, key, candle, potion flask, scroll
- **Provisions:** apple, bread loaf, cheese wheel, roast meat, grapes, honey jar, ale mug, pie
- **Tools & misc:** hammer, anvil, lantern, compass, hourglass, lute, dice, coin, ring, helmet

> Keep all 40 in one batch run with the same prompt body so silhouettes/line-weight stay uniform.

---

## 3. Backgrounds — `images/backgrounds/`

**10 stage backgrounds (portrait 9:16, no characters, leave central area uncluttered for the board):**
> `[MASTER STYLE PREFIX (drop "isolated on grey")]` A medieval game stage background, **{scene}**, atmospheric depth, soft vignette, empty calm center so UI/board sits cleanly on top, portrait orientation, no characters, no text.

| File | {scene} |
|---|---|
| `bg_stage1_forest` | sun-dappled green forest path with tall trees and fireflies |
| `bg_stage2_village` | cozy medieval village square at dusk with timber houses and lanterns |
| `bg_stage3_river` | misty riverside crossing with a wooden ferry dock at dawn |
| `bg_stage4_cave` | dark underground cave with glowing crystals and torchlight |
| `bg_stage5_camp` | rocky wilderness bandit camp with tents and a campfire at night |
| `bg_stage6_gates` | grand castle exterior gates under a stormy sky |
| `bg_stage7_dungeon` | grim stone castle dungeon with chains, bars, and dim torches |
| `bg_stage8_throne` | opulent grand throne room with gold columns and crimson banners |
| `bg_stage9_lair` | fiery volcanic dragon's lair with lava glow and obsidian rock |
| `bg_stage10_vault` | glittering treasure vault of gold, gems, and ancient chests |

**Scene rooms (interactive hubs):**
| File | Prompt subject |
|---|---|
| `bg_blacksmith` | a warm stone forge room, weapons on the wall, anvil, glowing fire, shelves of potions |
| `bg_tavern` | a cozy candlelit medieval inn interior, wooden bar, barrels, hearth |
| `bg_bards_corner` | a snug tavern nook with a stool, lute on the wall, soft candlelight |
| `bg_gamblers_den` | a dim shady tavern back-room with a dice table and low lantern light |
| `bg_daily_duty` | a wooden notice board on a tavern wall with pinned parchment quests |
| `bg_map` | a hand-drawn medieval world map parchment showing a winding path between 10 landmark regions, top-down |
| `bg_cover` | an epic title-screen vista: a lone knight silhouette before a distant glowing castle and treasure light, starry embered sky |

---

## 4. Badges & title emblems — `images/badges/`

**Rank badges (4):**
> `[MASTER STYLE PREFIX]` A circular knight rank badge medallion made of **{metal}**, embossed with a **{motif}**, ornate medieval heraldry, glossy, square icon, on flat grey.

| File | {metal} | {motif} |
|---|---|---|
| `badge_apprentice` | rough iron | a simple sword |
| `badge_basic` | polished bronze | a shield |
| `badge_captain` | bright silver | crossed swords with a star |
| `badge_commander` | brilliant gold | a crown over crossed swords |

**Title emblems (3):**
> `[MASTER STYLE PREFIX]` A small ornate title emblem: **{desc}**, glowing, square icon.
- `title_blazing` — a fiery flaming knight crest, orange-gold flames
- `title_shadow` — a dark skull-and-shadow crest, eerie purple glow
- `title_legendary` — a radiant golden star crest with laurel, legendary aura

---

## 5. UI elements & icons — `images/ui/`

**Power-up icons (12)** — `ui_power_{id}.png`. One batch, uniform style:
> `[MASTER STYLE PREFIX]` A single glossy medieval game power-up icon of a **{subject}**, bold readable emblem, gold rim, square, flat grey bg.

Subjects: raven (bird) · hourglass · arrow · torch · eagle eye (glowing eye) · shield · spear · holy water (glowing vial) · sword · bomb (medieval black powder bomb) · war horn · king's decree (royal scroll with seal).

**Consumable icons (5)** — `ui_item_{id}.png`: ale tankard · wine goblet · mead horn · feast platter · knight's brew (glowing goblet).

**HUD / misc (single icons):**
`ui_coin` (gold coin with crest) · `ui_star_full` / `ui_star_empty` · `ui_tankard_full` / `ui_tankard_empty` (stamina) · `ui_lock_chain` (chain overlay for locked tiles) · `ui_decoy_marker` · `ui_timer` · `ui_heart` · `ui_button_frame` (ornate gold button plate) · `ui_panel_parchment` (aged parchment panel texture) · `ui_flame_wipe` (radial fire transition texture).
> Each: `[MASTER STYLE PREFIX]` + "a single {subject} game UI icon, glossy, gold-rimmed, square."

---

## 6. App store assets — `images/store/`
- `app_icon` (1024×1024): `[MASTER STYLE PREFIX]` "a bold app icon: a golden treasure chest with a knight's sword crossed over it, crimson background, clean, iconic, no text, square."
- `feature_graphic` (1024×500): "a wide Google Play feature banner of the knight before a glowing treasure vault, dramatic, leave right side clear for the title."
- `screenshots`: captured from the running app (not generated).

---

## 7. Animated assets — where Google Flow's *video* (Veo) fits
Generate these as short looping/clip MP4s (Flow's strength), optional polish:
- `anim_knight_idle` — "the knight mascot gently breathing/idle loop, subtle, 2s seamless loop" (map screen mascot).
- `anim_knight_walk` — "the knight walking in place, side view, seamless loop" (map path progress).
- `anim_title_embers` — "embers and dust drifting over the title vista, slow loop."
- **Cutscene clips (10 boss/story moments):** feed the relevant stage background + character as Flow ingredients, prompt a 3–5s cinematic (e.g. "the dragon slowly turns its glowing eyes toward the viewer, smoke curling"). Use sparingly — static parchment dialog is the default per the GDD.

---

## 8. Audio — NOT Google Flow
Flow cannot produce game music/SFX. Plan accordingly:
- **`audio/sfx/`** — handled **procedurally in code** (Web Audio API, `audio.js`, Plan 3). No asset files needed unless you want recorded SFX.
- **`audio/music/`** — 10 stage themes. Options: (a) keep procedural BGM (Plan 8), or (b) generate with a music AI (Suno / Udio) or commission/license royalty-free medieval tracks. Suggested music-AI prompt per stage: *"heroic medieval fantasy {mood} game loop, orchestral lute and strings, {stage feeling}, seamless loop, no vocals"* — e.g. Stage 1 "gentle hopeful adventure", Stage 9 "tense fiery dragon battle", Stage 10 "triumphant grand finale".

---

## 9. Asset count summary

| Category | Count |
|---|---|
| Knight expressions | 12 |
| Main NPC expressions (Elder/Shadow Lord/Blacksmith/Innkeeper/Bard/Gambler) | 53 |
| Supporting NPC expressions | 40 |
| **Characters subtotal** | **105** |
| Tile back (+ optional 10 themed variants) | 1 (+10) |
| Tile-front relic icons | ~40 |
| Stage backgrounds | 10 |
| Scene/room + cover + map backgrounds | 7 |
| Rank badges + title emblems | 4 + 3 |
| Power-up + consumable icons | 12 + 5 |
| HUD/misc UI icons | ~14 |
| App store (icon + feature graphic) | 2 |
| **Image total (excl. optional tile variants)** | **≈ 264 images** |
| Stage music tracks (non-Flow) | 10 |
| SFX | procedural (code) |
| Optional Flow video clips | ~14 |

**v1 / MVP priority (per decisions doc YAGNI, challenge #8):** Knight ×4 expressions, Elder ×3, Blacksmith ×2, Innkeeper ×2; tile back + ~12 front icons; Stage 1 background + blacksmith + tavern + map + cover; 4 rank badges; Raven + the Stage-1 UI icons; app icon. Everything else follows per stage.

---

## Notes / open owner items
- **Art-direction sign-off:** approve this MASTER STYLE PREFIX on the first 3–4 generated samples before bulk runs (avoids re-generating 264 images).
- **Transparent-PNG step** is required after generation (Flow won't export alpha).
- Confirm whether you want **custom tile icons** or to keep **emoji** tiles (emoji = zero asset cost, already in code) — this removes ~40 icons if you keep emoji.
