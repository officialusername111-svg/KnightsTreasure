# Knight's Treasure — Asset Status & Remaining Prompts

> Snapshot after processing the first Google Flow batch. Source drop: `.claude/assets/`. Processed into canonical `www/assets/images/`. **Date:** 2026-06-21.
> Companion to the full manifest: `2026-06-21-asset-manifest-and-prompts.md` (style prefix + workflow live there).

## 1. What's processed (in `www/assets/images/`)

| State | Meaning | Files |
|---|---|---|
| ✅ Ready | Cut-out, game-usable as the base/default pose | knight (`knight/knight.png`), village_elder, innkeeper, ferryman, forest_guard, gambler, castle_guard_captain, bard, villager, king, shadow_lord_hidden |
| 🟨 Sliced (has bg) | Expression cells split from sheets — **still need background removal** | knight ×12, princess ×4, cave_spirit ×4, dragon_voice ×4, shadow_lord_reveal ×4 |
| 🟥 Raw | Single pose, **needs background removal** (suffix `_raw`) | blacksmith, dungeon_prisoner, bandit_captain, elders_daughter |
| ♻ Regenerate | Off-palette — re-generate (see §3) | village_elder (blue→brown), princess (pink→crimson/gold), shadow_lord_hidden (purple→crimson) |

**Pending processing on the above:** background removal on the 🟨/🟥 files (use remove.bg), and crop the Gemini ✦ watermark where present. The ✅ Ready files are good to wire in as-is.

## 2. Coverage vs. need (characters)

| Character | Folder | Need | Have | Missing expressions |
|---|---|---|---|---|
| Knight | knight | 12 | 12 | — ✅ |
| Princess | princess | 4 | 4 | — ✅ (but ♻ palette) |
| Cave Spirit | cave_spirit | 4 | 4 | — ✅ |
| Dragon's Voice | dragon_voice | 4 | 4 | — ✅ |
| Shadow Lord (reveal) | shadow_lord_reveal | 5 | 4 | +1 (e.g. `triumphant`) |
| Shadow Lord (main/hidden) | shadow_lord_hidden | 9 | 1 | +8 |
| Village Elder | village_elder | 10 | 1 | +9 |
| Blacksmith | blacksmith | 9 | 1 | +8 |
| Innkeeper | innkeeper | 9 | 1 | +8 |
| Bard | bard | 8 | 1 | +7 |
| Gambler | gambler | 8 | 1 | +7 |
| Forest Guard | forest_guard | 3 | 1 | +2 |
| Elder's Daughter | elders_daughter | 4 | 1 | +3 |
| Ferryman | ferryman | 4 | 1 | +3 |
| Bandit Captain | bandit_captain | 4 | 1 | +3 |
| Castle Guard Captain | castle_guard_captain | 4 | 1 | +3 |
| Dungeon Prisoner | dungeon_prisoner | 4 | 1 | +3 |
| **Bonus (not in GDD)** | king, villager | — | 1 each | keep as quest-giver / townsfolk |

**Entire categories not started:** tiles (back + ~40 icons), backgrounds (10 stages + 7 rooms/cover/map), badges (4 rank + 3 titles), UI icons (12 power-ups + 5 consumables + ~14 HUD), app icon + feature graphic, audio (non-Flow).

---

## 3. Regeneration prompts (palette fix — owner asked)
Attach the existing image as a reference ingredient; keep design, change only the palette.
- **Village Elder:** `[MASTER STYLE PREFIX]` "the same elderly village elder (reference attached), but change the robe to **rich brown with antique-gold trim** (remove the blue); keep face, beard, staff, pose identical."
- **Princess:** `[MASTER STYLE PREFIX]` "the same princess (reference attached), but change the gown to **deep crimson with gold accents and ivory underskirt** (remove the pink); keep face, hair, tiara, poses identical." (re-run the 4-pose sheet)
- **Shadow Lord (hidden/main):** `[MASTER STYLE PREFIX]` "the same shadowy hooded villain silhouette (reference attached), but change the glow and eyes to **menacing crimson-red** (remove the purple); keep the dark form and crown."

---

## 4. Remaining generation prompts — PRIORITIZED for the Stage-1 slice

> Reminder: prefix every prompt with the MASTER STYLE PREFIX; for expression sheets, attach the character's base image as a reference ingredient and request a "4-across (or 3×4) character expression sheet, same outfit/colours, plain grey background, label-free."

### P1 — Stage-1 essentials (do these first)
The slice (Plans 1–3) only needs: Knight (done), Village Elder (story NPC), Forest Guard, plus Blacksmith & Innkeeper for the shop/tavern, and the non-character UI below.

**Village Elder — remaining 9 expressions** (after palette regen):
> `[MASTER STYLE PREFIX]` "Expression sheet of the same village elder, brown/gold robe, 9 expressions in a grid: neutral, happy, surprised, worried, thinking, sad, warning, proud, tired; identical outfit, plain grey background, no captions."

**Forest Guard — 2 more** · **Blacksmith — 8 more** · **Innkeeper — 8 more:** same template, swap the character + count + this expression set: `neutral, happy, surprised, angry, thinking, worried, triumphant, tired` (trim to the needed count).

**Tiles (Stage 1 minimum):**
- Tile back: `[MASTER STYLE PREFIX]` "a square memory-game tile back, dark engraved iron-and-wood with gold filigree border and a faint crossed-swords crest, top-down flat, square."
- 12 front icons (batch, one prompt, swap subject): `[MASTER STYLE PREFIX]` "a single centered medieval game icon of a {subject}, bold readable silhouette, gold rim, square, flat grey." Subjects: sword, shield, bow, crown, gem, key, potion, scroll, helmet, coin, ring, candle.
- *Alternative:* keep emoji tiles (already coded) → skip these.

**Stage-1 backgrounds:**
> `[MASTER STYLE PREFIX without "isolated on grey"]` "a medieval game stage background, sun-dappled green forest path with tall trees and fireflies, soft vignette, empty calm center for the board, portrait 9:16, no characters, no text." (also: blacksmith forge room, cozy tavern interior, parchment world map, epic title vista — see manifest §3.)

**Stage-1 UI icons (batch):**
> `[MASTER STYLE PREFIX]` "a single glossy medieval game UI icon of a {subject}, gold rim, square, flat grey." Subjects: raven, gold coin, full star, empty star, full tankard, empty tankard, chain-lock overlay, parchment panel, flame-wipe texture.

**Badges (4 rank):** see manifest §4.

### P2 — Remaining characters (post-slice, Plans 5–6)
Run expression sheets for: Shadow Lord hidden (+8), Shadow Lord reveal (+1), Bard (+7), Gambler (+7), Elder's Daughter (+3), Ferryman (+3), Bandit (+3), Castle Guard (+3), Dungeon Prisoner (+3) — same sheet template, vocabulary from §2 of the manifest.

### P3 — Remaining content (Plan 5)
Stage 2–10 backgrounds (manifest §3), remaining tile icons, full power-up/consumable icon set (manifest §5), title emblems, app store assets.

---

## 5. Next actions checklist
- [ ] Regenerate elder / princess / shadow_lord_hidden to palette (§3), re-drop into `.claude/assets/`, I re-process.
- [ ] Background-remove the 🟨 sliced + 🟥 raw files; crop watermarks.
- [ ] Generate P1 set (Stage-1 essentials).
- [ ] When Plan 1 scaffolds `www/`, the assets are already in `www/assets/images/` ready to reference.
