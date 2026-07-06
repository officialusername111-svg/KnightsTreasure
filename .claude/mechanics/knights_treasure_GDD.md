# 🏰 Knight's Treasure
### Game Design Document (GDD)
**Developer:** Silent Stroke
**Platform:** Android (Google Play) via Capacitor WebView
**Package Name:** `com.silentstroke.knightstreasure2`
**Version:** 3.0
**Languages:** English / Hiligaynon

---

## 📖 Table of Contents

1. [Game Overview](#game-overview)
2. [Core Gameplay](#core-gameplay)
3. [Game Structure](#game-structure)
4. [Tile System](#tile-system)
5. [Grid System](#grid-system)
6. [Timer System](#timer-system)
7. [Star Rating System](#star-rating-system)
8. [Difficulty System](#difficulty-system)
9. [Special Tile Mechanics](#special-tile-mechanics)
10. [Knight Rank System](#knight-rank-system)
11. [Coin Economy](#coin-economy)
12. [Power-Up System](#power-up-system)
13. [Blacksmith Shop](#blacksmith-shop)
14. [Tavern System](#tavern-system)
15. [Stamina System](#stamina-system)
16. [Bard's Corner](#bards-corner)
17. [Gambler's Den](#gamblers-den)
18. [Knight's Daily Duty](#knights-daily-duty)
19. [Global Leaderboard](#global-leaderboard)
20. [Save System](#save-system)
21. [Story Dialog System](#story-dialog-system)
22. [Level Map](#level-map)
23. [Tutorial System](#tutorial-system)
24. [Characters & Expressions](#characters--expressions)
25. [Technical Foundation](#technical-foundation)
26. [Project File Structure](#project-file-structure)
27. [Build Phases](#build-phases)

---

## 🎯 Game Overview

**Knight's Treasure** is a medieval-themed memory tile-matching mobile game. The player takes the role of a knight on a quest to find a legendary treasure. Progress is made by completing memory matching levels across 10 stages, each with 25 levels, totalling **250 levels**.

The game features a full medieval world with a Blacksmith Shop, a Tavern hub, a global leaderboard, a coin economy, power-ups, story dialog, and a stamina system — all built on a Capacitor WebView running HTML, CSS, and JavaScript.

---

## 🎮 Core Gameplay

### The Memory Match Mechanic

The entire game is built around one core mechanic — flip and match tiles.

```
1. A grid of face-down tiles is presented to the player
2. Player taps a tile — it flips and reveals its content
3. Player taps a second tile
4. If both tiles match → they stay face up permanently
5. If they don't match → both flip face down after a short delay
6. Player must remember tile positions to find all pairs
7. Clear all pairs → level complete
```

### Win Condition
All tile pairs on the board are matched and revealed.

### Lose Condition
Timer runs out before all pairs are matched (on timed levels).

---

## 🗂️ Game Structure

### Stages and Levels
- The game is organized into **10 stages**
- Each stage contains **25 levels**
- **Total: 250 levels**
- Levels are completed sequentially — no skipping ahead
- Completing all levels in a stage unlocks the next stage
- Level 25 of every stage is a special **Boss Level**

### Level Progression
- Player starts at Stage 1, Level 1
- Each level completed advances to the next
- Progress is saved via localStorage and synced to Firebase
- On next app launch, player resumes exactly where they left off

### Stage Overview

| Stage | Name | Setting | New Mechanic |
|---|---|---|---|
| 1 | The Forest Path | Green forest | Basic matching |
| 2 | The Village | Medieval town | Timer introduced |
| 3 | The River Crossing | Riverside | More tile pairs |
| 4 | The Dark Cave | Underground | Tiles briefly hidden |
| 5 | The Bandit Camp | Wilderness | Decoy tiles |
| 6 | The Castle Gates | Castle exterior | Moving tiles |
| 7 | The Dungeon | Castle dungeon | Locked tiles |
| 8 | The Throne Room | Grand hall | Mixed mechanics |
| 9 | The Dragon's Lair | Volcanic cave | All mechanics |
| 10 | The Final Treasure | Treasure vault | Ultimate boss |

---

## 🃏 Tile System

### Tile States
- **Face-down** — hidden, default state
- **Face-up** — revealed after player tap
- **Matched** — permanently revealed after a correct pair

### Tile Flip Behavior
```
Tap tile A   → flips face up, stays visible
Tap tile B   → flips face up
  Match?     → both stay face up, match animation plays
  No match?  → both flip face down after a short delay
```

### Flip Memory Time
The amount of time a non-matching pair stays visible before flipping back. This is a core difficulty variable — shorter time equals harder.

| Difficulty Block | Flip Memory Time |
|---|---|
| Warm Up | 1500ms |
| Building | 1200ms |
| Midpoint | 1000ms |
| Pressure | 800ms |
| Gauntlet | 700ms |
| Boss | 600ms |

---

## 📐 Grid System

| Grid | Tile Pairs | Used In |
|---|---|---|
| 4×3 | 6 pairs | Early levels |
| 4×4 | 8 pairs | Mid levels |
| 6×4 | 12 pairs | Hard levels |

---

## ⏱️ Timer System

- The Warm Up block (levels 1–5 of every stage) has no timer — relaxed, puzzle-focused
- From the Building block (level 6 of every stage) onwards, a **countdown timer** applies — see "Difficulty Parameters Per Block"
- If timer reaches zero before all pairs matched → level failed
- Player can retry the level immediately
- Timer is displayed prominently in the HUD during gameplay

---

## ⭐ Star Rating System

Each level awards 1 to 3 stars based on performance.

| Stars | Condition |
|---|---|
| ⭐⭐⭐ | Fast completion, few or no mistakes |
| ⭐⭐ | Moderate time used, some mistakes |
| ⭐ | Barely completed — time almost out or many mistakes |

Stars are saved per level and displayed on the level map. Star count contributes to the leaderboard score and coin rewards.

---

## 🎯 Difficulty System

### Difficulty Sawtooth Curve

Each stage resets difficulty slightly at the start before climbing again — this feels fair and satisfying to players.

```
Difficulty
    ▲
    │        Stage 2          Stage 3
    │    ╱▔▔▔╲           ╱▔▔▔╲
    │   ╱     ╲         ╱     ╲
    │  ╱  St.1 ╲       ╱       ╲
    │ ╱         ╲     ╱         ╲
    │╱            ╲  ╱            ╲
    └─────────────────────────────► Levels
       1    25  1    25   1    25
```

### 25 Levels Per Stage — Internal Structure

Every stage follows this 5-block pattern:

| Block | Levels | Description |
|---|---|---|
| Warm Up | 1–5 | Introduce stage mechanic gently |
| Building | 6–10 | Mechanic becomes required |
| Midpoint | 11–15 | First real challenge spike |
| Pressure | 16–20 | Time and mechanic combined |
| Gauntlet | 21–24 | Hardest levels of the stage |
| Boss | 25 | Unique challenge and story moment |

### Difficulty Parameters Per Block

| Parameter | Warm Up | Building | Midpoint | Pressure | Gauntlet | Boss |
|---|---|---|---|---|---|---|
| Grid size | 4×3 | 4×3 | 4×4 | 4×4 | 6×4 | 6×4 |
| Tile pairs | 6 | 6 | 8 | 8 | 12 | 12 |
| Time limit | None | 120s | 90s | 60s | 45s | 90s* |
| Flip memory | 1500ms | 1200ms | 1000ms | 800ms | 700ms | 600ms |

*Boss level gets more time but has special gimmicks.

---

## 🎭 Special Tile Mechanics

### Decoy Tiles (Stage 5+)
Tiles that look like real pairs but have no match on the board. Wastes the player's flips and memory.

```
Normal board:  Every tile has exactly one match
Decoy board:   Some tiles have no match — tapping them costs a flip and reveals nothing useful
```

Eagle Eye power-up helps players identify real pairs vs decoys.

### Hidden Tiles (Stage 4+)
Tiles flip back faster than normal — shorter memory time makes them harder to track.

### Moving Tiles (Stage 6+)
Tiles shift position on the board periodically — player must track movement.

### Locked Tiles (Stage 7+)
Tiles locked with a chain — must be unlocked before they can be flipped. Holy Water power-up removes locks.

---

## 🏅 Knight Rank System

| Rank | Badge | How Earned |
|---|---|---|
| 🔰 Apprentice Knight | Iron | Default |
| 🛡️ Basic Knight | Bronze | Stage 3 complete |
| ⚔️ Captain Knight | Silver | Stage 5 complete |
| 👑 Commander Knight | Gold | Stage 10 complete |

Rank is displayed on the player profile, HUD, and global leaderboard.

---

## 💰 Coin Economy

### Earning Coins

| Action | Coins |
|---|---|
| Complete any level | +10 base |
| 1 star clear bonus | +5 |
| 2 star clear bonus | +15 |
| 3 star clear bonus | +30 |
| First time clear bonus | +20 |
| No power-up used bonus | +15 |
| No mistakes bonus | +20 |
| Speed clear bonus | +10 |
| Stage complete milestone | +150 to +375 |
| Daily login | +20 |
| 3-day login streak | +50 |
| 7-day login streak | +150 |
| 30-day login streak | +500 |
| Complete daily challenge | +75 |
| 3-star daily challenge | +120 |
| Watch rewarded ad | +25 (max 3/day) |
| Combo chain 3+ matches | +3 to +20 |
| Decoy tile avoided | +5 |

### Maximum Coins Per Level (First Clear)
```
10 + 30 + 20 + 15 + 20 + 10 = 105 coins (skilled player)
10 + 5 = 15 coins minimum (casual player)
```

### Anti-Grinding Rules

| Rule | Reason |
|---|---|
| First clear bonus given once only | Prevents replaying Level 1 forever |
| Ad reward capped at 3 per day | Prevents ad farming |
| Combo coins capped at 20 per level | Prevents exploit |
| Daily challenge resets every 24 hours | Keeps players returning daily |

---

## ⚡ Power-Up System

Power-ups are single-use items purchased with coins. Used during a level to assist the player. Each unlocks at a specific stage.

| Power-Up | Effect | Cost | Unlocks |
|---|---|---|---|
| 🐦 Raven | Briefly flashes one correct matching pair as a hint | 20🪙 | Stage 1 |
| ⏳ Hourglass | Adds 15 seconds to the timer | 30🪙 | Stage 2 |
| 🏹 Arrow | Permanently reveals 1 tile of your choice | 35🪙 | Stage 3 |
| 🔦 Torch | Reveals ALL tiles for 3 seconds | 50🪙 | Stage 4 |
| 🦅 Eagle Eye | Highlights all real matching pairs with a faint glow for 5 seconds | 55🪙 | Stage 5 |
| 🛡️ Shield | Pauses the timer for 10 seconds | 45🪙 | Stage 6 |
| 🗡️ Spear | Reveals an entire row or column temporarily for 3 seconds | 40🪙 | Stage 7 |
| ⚔️ Sword | Permanently reveals an entire row or column | 65🪙 | Stage 8 |
| 💣 Bomb | Permanently reveals a 2×2 area of tiles | 80🪙 | Stage 9 |
| 📯 War Horn | Doubles score multiplier for 10 seconds | 60🪙 | Stage 10 |
| 👑 King's Decree | Skips the current level and awards 1 star | 200🪙 | All stages complete |

### Power-Up Tiers

| Tier | Power-Ups | Cost Range |
|---|---|---|
| 🟢 Basic | Raven, Hourglass, Arrow | 20–35🪙 |
| 🟡 Advanced | Shield, Spear, Eagle Eye, Torch, War Horn | 40–60🪙 |
| 🔴 Premium | Sword, Bomb, King's Decree | 65–200🪙 |

### Power-Up Rules
```
Maximum 2 power-ups active per level
Power-ups cannot be stacked (no 2 Shields at once)
Boss levels — King's Decree disabled
Daily challenge levels — no power-ups allowed
Permanent reveals apply a small score penalty
```

---

## 🏪 Blacksmith Shop

A dedicated full scene separate from the main map. Player taps the shop icon to transition into a medieval blacksmith room with a Blacksmith NPC.

### Scene Description
```
A stone forge room. Weapons on the wall.
Blacksmith NPC behind the counter.
Anvil, fire, medieval shelves of power-ups.
Player's coin count shown as a coin pouch top right.
```

### Shop Transition
```
Player taps Shop icon
      ↓
Screen wipes with a torch flame effect
      ↓
Blacksmith shop scene fades in
      ↓
Blacksmith NPC greets the player
      ↓
Player browses and buys
      ↓
Tap Leave → flame wipe back to map
```

### Shop Contents
- Individual power-up purchases
- Bundle deals at a discount
- Only unlocked power-ups visible and purchasable
- Locked power-ups shown greyed out with stage requirement

### Bundles

| Bundle | Contents | Cost |
|---|---|---|
| Starter Pack | 3× Raven | 50🪙 |
| Explorer Pack | 2× Arrow + 1× Hourglass | 60🪙 |
| Warrior's Pack | 1× Feast + 1× Shield | 100🪙 |
| Champion's Pack | 1× Knight's Brew + 1× Torch | 130🪙 |

---

## 🍺 Tavern System

A full hub scene with a main room and three sub-areas accessible via icons at the bottom of the screen.

### Tavern Main Room
Warm, cozy medieval inn. Innkeeper NPC behind the bar. Players buy drinks to replenish stamina.

| Drink | Stamina | Cost |
|---|---|---|
| 🍺 Ale | +1 | 15🪙 |
| 🍷 Wine | +2 | 25🪙 |
| 🥃 Mead | +3 | 35🪙 |
| 🍖 Feast | Full restore | 60🪙 |
| 💫 Knight's Brew | Full restore + 2-star bonus next level | 90🪙 |
| 📺 Watch Ad | +1 stamina free | 3 per hour max, then 1 hour cooldown |

### Tavern Sub-Areas

| Icon | Room | Description |
|---|---|---|
| 🎵 | Bard's Corner | Music, lore stories, unlockable songs |
| 🎲 | Gambler's Den | Dice rolls for stamina prizes |
| ⚔️ | Knight's Daily Duty | Daily puzzle, challenge, and guild quest |

---

## ❤️ Stamina System

Stamina controls how many levels a player can play per session.

```
Max stamina        → 5 (shown as 5 tankards 🍺🍺🍺🍺🍺)
Cost per level     → 1 stamina
Stamina at 0       → Cannot play levels
Natural regen      → 1 stamina per 30 minutes
Full natural regen → 2.5 hours
```

Stamina persists through app close and phone shutdown. The regen timer continues counting in the background using a saved timestamp.

### Cooldown Summary

| Feature | Free Limit | Ad Extension | Cooldown |
|---|---|---|---|
| Watch Ad stamina | 3 per hour | None | 1 hour |
| Gambler tries | 3 per hour | +3 once | 1 hour |
| Natural regen | 1 per 30 min | None | Continuous |

---

## 🎵 Bard's Corner

A sub-room of the Tavern. A Bard NPC plays music on a lute.

- Ambient medieval music changes per stage theme
- 10 songs total — one per stage, unlocked as stages complete
- Bard tells optional lore stories about the game world
- Listening to a full new lore story rewards +5 coins
- Unlockable songs displayed in a list with lock status

---

## 🎲 Gambler's Den

A dimly lit sub-room of the Tavern. A shady NPC runs a dice table.

```
Wager 1 coin per roll
Win chance: 45%
Win reward: +1 stamina
Lose: -1 coin, no stamina

Free tries:     3 per hour
Ad extension:   +3 tries (once per cooldown only)
Total max:      6 tries per hour
After limit:    1 hour cooldown
```

### Rules
- Minimum 1 coin required to gamble
- Ad extension available only once per cooldown period
- Result saved to Firebase — prevents exploit on app restart
- No gambling during tutorial

---

## ⚔️ Knight's Daily Duty

A notice board sub-room of the Tavern. Three tasks reset every 24 hours. No stamina cost to attempt.

### The Three Tasks

| Task | Description | Reward |
|---|---|---|
| 🧩 Daily Puzzle | Special hand-crafted level, same for all players worldwide. 3 attempts maximum. | 100🪙 + 1 power-up |
| ⚔️ Daily Challenge | Modified level with a special condition such as speed run, no mistakes, or no power-ups. | 75🪙 + 1 stamina |
| 🏆 Guild Quest | Multi-step daily objective spanning the whole day. Examples: win 5 levels, earn 200 coins, use a Torch 3 times. | 150🪙 + 1 power-up |
| 🎁 All 3 Complete | Bonus for completing all three tasks in one day. | 200🪙 + Knight's Brew |

### Daily Duty Streak Rewards

| Streak | Reward |
|---|---|
| 3 days | +100🪙 |
| 7 days | +300🪙 + rare power-up + 🔥 Blazing Knight title |
| 14 days | +500🪙 + King's Decree + 💀 Shadow Knight title |
| 30 days | +1000🪙 + 🌟 Legendary Knight title |

---

## 🏆 Global Leaderboard

### Score Formula
```
Score = (Matches Made × 100) + (Time Remaining × 10) + (Combo Bonus) - (Mistakes × 50)
```

### Leaderboard Display
- Shows top players globally with rank, name, score, and knight title
- Shows current player's exact position even if outside top 10
- Filters: Weekly and All Time
- Player sets a display name on first launch

### Knight Titles

| Title | How Earned |
|---|---|
| 🔰 Apprentice Knight | Default |
| ⚔️ Captain Knight | Complete Stage 5 |
| 👑 Commander Knight | Complete Stage 10 |
| 🔥 Blazing Knight | 7-day daily duty streak |
| 💀 Shadow Knight | 14-day daily duty streak |
| 🌟 Legendary Knight | 30-day daily duty streak |

---

## 💾 Save System

### Save Data Structure
```json
{
  "saveVersion": "v1",
  "currentStage": 1,
  "currentLevel": 1,
  "completedLevels": ["1-1", "1-2"],
  "stars": { "1-1": 3, "1-2": 2 },
  "coins": 340,
  "rank": "Basic Knight",
  "storyProgress": 1,
  "stamina": 4,
  "staminaLastUpdated": "timestamp",
  "powerUps": { "raven": 2, "arrow": 1 },
  "settings": { "sound": true, "language": "EN" },
  "streakDays": 3,
  "lastLogin": "timestamp",
  "displayName": "Player"
}
```

### Save Behavior
```
Saves locally to localStorage immediately after every level
Syncs to Firebase when internet is available
On reinstall — restores from Firebase
Stamina regen calculated from timestamp difference on load
Off-by-one prevention — stage/level stored as 1-based, converted to 0-based on load
```

---

## 📖 Story Dialog System

### Structure
Each stage has 3 story moments:

| Moment | When | Content |
|---|---|---|
| Opening | Level 1 of each stage | New location intro, character introduced |
| Midpoint | Level 13 of each stage | Story development, tension builds |
| Boss | Level 25 of each stage | Boss confrontation and stage completion cutscene |
| Ending | Stage 10 Level 25 | Final cinematic — treasure found |

### Dialog Box Style
- Parchment texture background
- Character portrait displayed beside dialog text
- Old-style medieval font
- Skip button for returning players
- Language toggle: English / Hiligaynon

### Story Beats Per Stage

| Stage | Opening | Midpoint | Boss Completion |
|---|---|---|---|
| 1 | Knight arrives at the forest, receives the quest | Elder warns of dangers ahead | First clue to treasure found |
| 2 | Knight enters the village, meets new ally | Village in danger revealed | Village saved |
| 3 | Knight reaches the river, meets the Ferryman | Ferryman's riddle | River crossed |
| 4 | Knight enters the Dark Cave, meets the Cave Spirit | Spirit's tragic story | Spirit freed |
| 5 | Knight confronts the Bandit Captain | Bandit challenge proposed | Bandits stand aside |
| 6 | Knight reaches the Castle Gates | Guard Captain's test | Castle entry granted |
| 7 | Knight enters the Dungeon, finds the Prisoner | Prisoner's secret revealed | Prisoner freed |
| 8 | Knight reaches the Throne Room, meets the Princess | Princess joins the quest | Throne Room cleared |
| 9 | Knight enters the Dragon's Lair | Dragon speaks — offers a choice | Dragon stands aside |
| 10 | Final confrontation with the Shadow Lord | Shadow Lord's last stand | Treasure found — ending cinematic |

---

## 🗺️ Level Map

- Visual map showing all 10 stages as geographic locations
- Each stage node shows locked, unlocked, or completed state
- Animated glowing path connecting unlocked stages
- Tap any completed stage to replay it
- Tap next locked stage to see a teaser preview
- Animated knight mascot walks along the path as stages complete
- Stars earned per level displayed on each node

---

## 🎓 Tutorial System

### First Launch Tutorial
Step-by-step guidance for brand new players using animated hand pointer overlays:

```
Step 1 → Tap any tile to flip it
Step 2 → Tap another tile to find a match
Step 3 → Match found — see the coins fly
Step 4 → Wrong match — tiles flip back, remember positions
Step 5 → Clear the board to complete the level
```

### Contextual Tutorials

| Trigger | Tutorial Shown |
|---|---|
| Stage 2 starts | Timer introduced — match faster |
| Stage 4 starts | Tiles hide faster here |
| Stage 5 starts | Decoy tiles appear — not everything has a match |
| Stage 6 starts | Tiles move — plan before you tap |
| Stage 7 starts | Locked tiles — unlock them first |
| First power-up unlocked | How to use power-ups |
| First coin earned | Visit the Shop to spend coins |
| First shop visit | Shop tutorial overlay |
| First tavern visit | Tavern tutorial overlay |
| Stamina first depleted | Visit the Tavern to refill |
| Daily challenge unlocked | Daily challenge explanation |

### Tutorial Rules
```
Skippable for returning players
Replayable from Settings → Help
Never interrupts mid-level
Uses animated overlays not text walls
Village Elder character delivers tutorial dialog
```

---

## 🎭 Characters & Expressions

### Main Characters

#### 🗡️ The Knight (Player Character)
Full-body cartoon illustrated style. 12 expressions. Production-ready asset confirmed.

| Expression | When Used |
|---|---|
| Confident | Default / map screen |
| Ready | Level start |
| Thinking | Idle during gameplay / tutorial |
| Surprised | New mechanic introduced |
| Triumphant | Level complete / combo |
| Focused | Gauntlet levels / low time |
| Nervous | Timer running low |
| Defeated | Level failed |
| Frustrated | After 3 failed attempts |
| Overjoyed | 3-star clear / stage complete |
| Tired | Stamina empty |
| Grateful | Power-up saves the player |

#### 👴 The Village Elder
Guide and mentor. 10 expressions needed.

#### 😈 The Shadow Lord (Villain)
Antagonist. 9 expressions needed.

#### 🔨 The Blacksmith (Shop NPC)
Shop scene character. 9 expressions needed.

#### 🍺 The Innkeeper (Tavern NPC)
Tavern main room character. 9 expressions needed.

#### 🎵 The Bard (Bard's Corner NPC)
Bard's Corner character. 8 expressions needed.

#### 🎲 The Gambler (Gambler's Den NPC)
Gambler's Den character. 8 expressions needed.

### Supporting Characters (Stage NPCs)

| Stage | Character | Expressions |
|---|---|---|
| 1 | Forest Guard | 3 |
| 2 | Elder's Daughter | 4 |
| 3 | The Ferryman | 4 |
| 4 | Cave Spirit | 4 |
| 5 | Bandit Captain | 4 |
| 6 | Castle Guard Captain | 4 |
| 7 | Dungeon Prisoner | 4 |
| 8 | The Princess | 4 |
| 9 | Dragon's Voice | 4 |
| 10 | Shadow Lord (full reveal) | 5 |

### Total Expressions Required
```
Main characters       → 65 expressions
Supporting characters → 40 expressions
Total                 → 105 expressions
```

### Art Style Notes
```
Style     → Cartoon / illustrated (matching Knight asset)
Format    → Full body for mascot use, bust crop for dialog box
Background → Transparent
Colors    → Consistent medieval palette: red, gold, silver, brown
```

---

## 🛠️ Technical Foundation

| Component | Technology |
|---|---|
| Game engine | Vanilla HTML / CSS / JavaScript |
| Audio | Web Audio API |
| Native wrapper | Capacitor |
| Platform | Android (Google Play) |
| Local save | localStorage (JSON structured) |
| Cloud save | Firebase Firestore |
| Ads | Google AdMob (rewarded) |
| Package name | com.silentstroke.knightstreasure2 |
| Keystore alias | upload |
| Developer | Silent Stroke |
| Code editor | Visual Studio 2022 |
| Build tool | Android Studio |
| Test device | Xiaomi Redmi Note 9 Pro |

---

## 📁 Project File Structure

```
www/
├── index.html                  ← Shell only, loads all files
├── css/
│   ├── main.css                ← Base styles and CSS variables
│   ├── animations.css          ← All keyframes and transitions
│   └── modals.css              ← Modal and overlay styles
├── js/
│   ├── config.js               ← Game constants and save keys
│   ├── difficulty.js           ← Stage and level difficulty data
│   ├── levels.js               ← All 250 level configurations
│   ├── save.js                 ← Save and load logic
│   ├── audio.js                ← Web Audio API sound system
│   ├── animations.js           ← JS-driven animation controller
│   ├── modals.js               ← Modal open, close, and render
│   ├── story.js                ← Story dialog and cutscene system
│   ├── leaderboard.js          ← Firebase leaderboard integration
│   ├── ui.js                   ← HUD, score, overlays
│   ├── ads.js                  ← AdMob Capacitor plugin bridge
│   └── game.js                 ← Core game loop (loads last)
└── assets/
    ├── images/
    │   ├── knight/             ← 12 knight expression sprites
    │   ├── characters/         ← All NPC portraits
    │   ├── tiles/              ← Custom tile designs
    │   ├── backgrounds/        ← Stage background scenery
    │   └── badges/             ← Iron, Bronze, Silver, Gold badges
    └── audio/
        ├── music/              ← 10 stage theme tracks
        └── sfx/                ← Sound effects
```

---

## 🚀 Build Phases

### Phase 1 — Foundation
- Convert single HTML file to multi-file Capacitor structure
- Implement structured JSON save system via localStorage
- Fix level progression off-by-one bug
- Verify save persists through app close and phone shutdown

### Phase 2 — Cloud and Social
- Firebase Firestore setup and integration
- Cloud sync for all save data
- Global leaderboard implementation
- Player display name setup on first launch
- Knight title system

### Phase 3 — Story and World
- Story dialog system with character portraits
- English and Hiligaynon language toggle
- Level map with stage nodes and animations
- Stage unlock and completion states

### Phase 4 — Economy and Scenes
- Full coin economy implementation
- Blacksmith Shop scene with NPC and transitions
- Tavern main room scene with NPC and stamina drinks
- Stamina system with background regen timer

### Phase 5 — Tavern Hub
- Bard's Corner scene with music and lore system
- Gambler's Den scene with dice mechanic and cooldowns
- Knight's Daily Duty board with all three task types
- Daily streak tracking and title rewards

### Phase 6 — Tutorial and Polish
- First launch tutorial with animated pointer
- Contextual tutorial overlays for each new mechanic
- Full CSS animation system
- Web Audio API sound effects and music

### Phase 7 — Content
- All 250 levels configured across 10 stages
- Difficulty tuning per stage and level block
- Special tile mechanics: decoy, hidden, moving, locked
- Boss level designs for all 10 stages

### Phase 8 — Extras
- Achievement system
- Daily streak rewards and title unlocks
- Power-up bundles in shop
- Animated knight mascot reactions on map screen

---

*Knight's Treasure Game Design Document — Silent Stroke*
*Last updated: June 2026*
