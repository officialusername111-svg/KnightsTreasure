# Missing-Assets Prompt Pack — 2026-06-25

Audit of what the code references but the repo is **missing**, with ready-to-use generation
prompts. Art (188 images) is done; the gaps are **audio** (no `www/assets/audio/` exists — all
SFX are synthesized placeholders in `audio.js`, music is a silent stub) and **2 nav icons**.

Drop finished files into the paths below; `audio.js` is wired to swap the synth placeholders
for real files with no other code changes (see "Integration" at the end).

---

## A. Music — `www/assets/audio/music/`  (loop-ready, ~60–90s seamless loops)

**Global style direction (paste before every music prompt):**
> Orchestral medieval-fantasy game music, looping, mobile-game-friendly mix. Period instruments:
> lute, harp, recorder/flute, hand percussion, strings, light choir. Warm, heroic, *not* cinematic-loud.
> No modern drums/synths. Seamless loop, clean tail, -14 LUFS, stereo, 60–90s.

Recommended tools: Suno / Udio (songs), or a composer. Filenames are exact.

| File | Track | Prompt (append to the global style) |
|---|---|---|
| `music_home.mp3` | Home / menu | "Gentle, hopeful main theme; solo lute melody over soft harp; the feeling of a quest about to begin." |
| `music_stage1_forest.mp3` | The Forest Path | "Light, pastoral woodland; recorder + plucked strings; curious and bright." |
| `music_stage2_village.mp3` | The Village | "Cheerful market-town jig; tambourine + fiddle; friendly and busy." |
| `music_stage3_river.mp3` | The River Crossing | "Flowing, adventurous; harp arpeggios + airy flute; a journey downstream." |
| `music_stage4_cave.mp3` | The Dark Cave | "Tense, echoing; low strings + sparse hand drums + distant choir; cautious." |
| `music_stage5_camp.mp3` | The Bandit Camp | "Sneaky, rhythmic; pizzicato strings + low percussion; danger and mischief." |
| `music_stage6_gates.mp3` | The Castle Gates | "Martial and proud; brass-lite (horn), snare-like frame drum, marching pulse." |
| `music_stage7_dungeon.mp3` | The Dungeon | "Dark, dripping, suspenseful; minor mode; chains and low drones, faint choir." |
| `music_stage8_throne.mp3` | The Throne Room | "Regal, ceremonial; harp + strings + soft choir; grand but restrained." |
| `music_stage9_lair.mp3` | The Dragon's Lair | "Ominous, fiery; big low strings, taiko-style hits, rising tension; the boss looms." |
| `music_stage10_vault.mp3` | The Final Treasure | "Triumphant climax theme; full warm orchestra + choir; the realm's reward." |
| `music_tavern.mp3` | The Inn / Tavern | "Cozy folk tavern loop; lute + fiddle + hand claps; warm and social." |
| `music_boss.mp3` | Boss (level 25 shared) | "High-stakes battle loop; driving frame drums + urgent strings; heroic resolve." |

## B. Sound effects — `www/assets/audio/sfx/`  (short, dry, mono, 22–48kHz)

**Style direction:** "Clean medieval-fantasy UI/game SFX, short, punchy, no reverb tail, no music.
Diegetic where it fits (wood, metal, parchment, coin)." Filenames match the `VOICES` ids in `audio.js`.

| File | Used for | Prompt |
|---|---|---|
| `sfx_tap.wav` | tile tap / button | "Soft wooden tap, tactile, 60ms." |
| `sfx_flip.wav` | tile flip | "Quick card/wooden flip, light whoosh, 90ms." |
| `sfx_match.wav` | successful pair | "Bright magical chime, two notes rising, pleasant, 200ms." |
| `sfx_mismatch.wav` | wrong pair | "Dull muted thud, gentle negative, not harsh, 160ms." |
| `sfx_coin.wav` | coins earned | "Coins clinking into a pouch, bright metallic sparkle, 250ms." |
| `sfx_win.wav` | level cleared | "Short victory flourish, harp glissando + chime, 600ms." |
| `sfx_lose.wav` | time's up | "Soft descending defeat motif, low flute, not jarring, 600ms." |
| `sfx_powerup.wav` | power-up cast | "Whoosh + magical shimmer, ascending, 300ms." |
| `sfx_dice.wav` | gambler dice roll | "Wooden dice tumbling on a table, 400ms." |
| `sfx_fanfare.wav` | achievement / big win | "Triumphant brass-lite fanfare, 3 notes, celebratory, 900ms." |
| `sfx_mail.wav` | new raven / mail | "Single soft bell + paper rustle, gentle notification, 300ms." |
| `sfx_unlock.wav` | locked tile freed (D9) | "Chain links snapping, small metallic release + sparkle, 300ms." (new — wire to unlock) |
| `sfx_swap.wav` | moving tiles slide (D8) | "Soft stone-on-stone slide, brief, 250ms." (new — wire to swaps) |
| `sfx_lock.wav` | Holy Water / chains break | "Multiple chains shattering + holy shimmer, 500ms." (new) |

## C. Missing icons — `www/assets/images/ui/`  (match existing `ui_nav_*` style)

The Blacksmith and Mail nav buttons currently use inline SVG placeholders (`home.js`). Generate
PNGs in the **same style as the existing `ui_nav_quests/inn/glory/rank.png`** (gold-line emblem on a
dark round/square medallion, ~96×96, transparent bg).

| File | Prompt |
|---|---|
| `ui_nav_smith.png` | "Game nav icon: blacksmith anvil with a hammer, gold line-art on dark medallion, matching set." |
| `ui_nav_mail.png` | "Game nav icon: rolled parchment / raven-letter envelope, gold line-art on dark medallion, matching set." |
| `ui_nav_map.png` *(optional)* | "Game nav icon: folded treasure map, gold line-art on dark medallion, matching set." |

---

## Integration notes (for when files land)
- **SFX:** replace the synth `sfx()` body in `www/js/systems/audio.js` with an `Audio`/buffer player
  keyed by id → `assets/audio/sfx/sfx_${id}.wav`. Keep the `enabled.sound` gate and the id list.
  New ids `unlock`/`swap`/`lock` get `sfx('unlock')` calls at their trigger sites.
- **Music:** implement `music(stage)` to crossfade-load `assets/audio/music/music_stage${n}_*.mp3`
  (and `music_home`/`music_tavern`/`music_boss`), looped, gated by `enabled.music`; suspend/resume
  already handled via the AudioContext + `visibilitychange`.
- **Icons:** drop in the PNGs and replace the `ANVIL_SVG`/`MAIL_SVG` placeholders in `home.js` with
  `<img src="${ASSETS.ui}ui_nav_smith.png" …>` (same `onerror` hide fallback as the other rail icons).
- Keep everything behind the existing settings toggles (`settings.sound`, `settings.music`).
