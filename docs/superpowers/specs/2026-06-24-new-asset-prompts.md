# New Asset Prompts — Polish/Social Batch (2026-06-24)

Generation prompts for the assets introduced by this batch. The game currently runs with
**inline-SVG / emoji placeholders** for the nav icons and **synthesized placeholder SFX**; drop
the finished art/audio into the paths below (no code change needed — paths already wired).

## Style guide (all icons)
Medieval, gold-on-dark. Square, centered, transparent PNG (~256×256). Ornate gold metallic
treatment to match the existing nav set (`ui_nav_quests/inn/glory/rank.png`). Warm palette:
gold `#f5c842`/`#c9922a`, ember `#e8550a`, dark brown grounds. No text in the icon.

## Nav / UI icons → `www/assets/images/ui/`
- **`ui_nav_smith.png`** — *"A medieval blacksmith's anvil with a crossed hammer, ornate gold metallic game icon, dark transparent background, square, centered, matches a gold-framed fantasy UI icon set."*
- **`ui_nav_mail.png`** — *"A rolled parchment letter with a red wax seal (or a sealed envelope), ornate gold medieval game icon, dark transparent background, square, centered."*

## Mail-type icons → `www/assets/images/ui/` (currently inline-SVG placeholders)
- **`ui_mail_rankup.png`** — *"An upward gold chevron over a small shield, triumphant, gold-on-dark game icon."*
- **`ui_mail_rankdown.png`** — *"A downward muted chevron over a cracked shield, somber, desaturated gold game icon."*
- **`ui_mail_achievement.png`** — *"A gold laurel wreath around a bright star, celebratory game icon."*
- **`ui_mail_comment.png`** — *"A small speech scroll / quote bubble made of parchment, gold trim, game icon."*

## Leaderboard place medallions → `www/assets/images/ui/`
- **`ui_place_gold.png` / `ui_place_silver.png` / `ui_place_bronze.png`** — *"A circular tournament place medallion (1st gold / 2nd silver / 3rd bronze) with a laurel border and the rank numeral embossed, fantasy game UI, transparent square."*
- **`ui_place_pip.png`** — *"A small neutral dark-iron rank pip for ranks 4+ on a leaderboard row."*

## Audio (production) → `www/assets/audio/`
System (`systems/audio.js`) plays synth placeholders until these ship. Loop-ready, mobile-friendly file sizes.
- **Music (`music/stage{1..10}.ogg|mp3`)** — 10 looping stage themes, ~60–90s loops, medieval orchestral/folk, intensity rising by stage (1 calm forest → 10 dark final-vault). Seamless loop points.
- **SFX (`sfx/{name}.ogg`)** for: `tap, flip, match, mismatch, coin, win, lose, powerup, dice, fanfare, mail`. Short (<0.6s), punchy, medieval-flavored.

## Notes
- Stage badges, rank badges, and title emblems referenced by Glory/Ranks/Map **already exist** in
  `www/assets/images/badges/` — no new art needed there.
- Once delivered, update `audio.js` to load the real buffers/tracks (the `VOICES` synth map and the
  `music()` stub are the only spots to swap).
