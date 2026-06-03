# ⚔️ Knight's Treasure

> *An animated medieval tale — and the memory game hidden within it.*

![Levels](https://img.shields.io/badge/Levels-35-c9922a?style=for-the-badge)
![Tiles](https://img.shields.io/badge/Max%20Tiles-32-2a1800?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-gold?style=for-the-badge)

---

## 🏰 Overview

**Knight's Treasure** is a single-file browser experience that combines an animated story with a memory tile-matching game. A brave knight journeys through hardship, darkness, and discovery — and when his tale is told, the real challenge begins.

Built entirely in **HTML, CSS, and vanilla JavaScript** with zero dependencies. Drop the file in any browser and it works.

---

## 📖 The Story

The experience opens as an animated storybook across **5 chapters**, each with hand-crafted SVG illustrations and a heroic musical score:

| Chapter | Title | Scene |
|---------|-------|--------|
| Cover | The Knight's Treasure | Starfield with ember particles |
| I | The Long Road | Knight walking through a stormy night |
| II | The Dark Cave | Knight standing before a mountain cave |
| III | The Magnificent Chest | A glowing treasure chest in the depths |
| III | The True Treasure | Knight triumphant at sunrise |
| The End | Epilogue | Starfield finale |

Navigate with the **‹ ›** arrows on the sides, **swipe left/right** on mobile, or use **arrow keys** on desktop.

---

## 🎮 The Game

After the story ends, the knight's real trial begins — a **35-level memory matching game**.

### How to Play

1. A grid of **face-down tiles** is presented at the start of each level
2. Tap any tile to **reveal its relic**
3. Tap a second tile to find its **matching pair**
   - ✅ **Match** — tiles stay revealed and glow green · **+1 second bonus added**
   - ❌ **No match** — tiles shake and flip back face-down
4. Match **all pairs** before the timer hits zero to advance

---

## 📜 Level Progression

| Level | Tiles | Timer (sec) | Level | Tiles | Timer (sec) |
|------:|------:|------------:|------:|------:|------------:|
| 1  | 4  | 130 | 19 | 32 | 94 |
| 2  | 6  | 128 | 20 | 32 | 92 |
| 3  | 8  | 126 | 21 | 32 | 90 |
| 4  | 10 | 124 | 22 | 32 | 88 |
| 5  | 12 | 122 | 23 | 32 | 86 |
| 6  | 14 | 120 | 24 | 32 | 84 |
| 7  | 16 | 118 | 25 | 32 | 82 |
| 8  | 18 | 116 | 26 | 32 | 80 |
| 9  | 20 | 114 | 27 | 32 | 78 |
| 10 | 22 | 112 | 28 | 32 | 76 |
| 11 | 24 | 110 | 29 | 32 | 74 |
| 12 | 26 | 108 | 30 | 32 | 72 |
| 13 | 28 | 106 | 31 | 32 | 70 |
| 14 | 30 | 104 | 32 | 32 | 68 |
| 15 | 32 | 102 | 33 | 32 | 66 |
| 16 | 32 | 100 | 34 | 32 | 64 |
| 17 | 32 | 98  | 35 | 32 | 62 |
| 18 | 32 | 96  |    |    |    |

> Tiles increase by 2 per level up to a maximum of 32. Timer decreases by 2 seconds per level down to a minimum of 62 seconds.

---

## 🃏 Tile Icons

All icons are drawn from universally-supported Unicode emoji (Unicode 6–9) guaranteed to render on every browser, Android, iOS, and Windows device. No boxes. No missing glyphs.

| Category | Examples |
|----------|---------|
| 🐾 Animals | 🐶 🐱 🦊 🐯 🦁 🐉 🦄 🐸 🐬 🐙 |
| 🍎 Food | 🍎 🍊 🍋 🍇 🍓 🍔 🍩 🧁 🍫 🍯 |
| ⚔️ Weapons & Relics | ⚔️ 🛡️ 🏹 👑 💎 🔮 🗝️ 🕯️ ⚗️ 📿 |
| 🎭 Arts & Games | 🎭 🎲 🎯 🎸 🎺 🥁 🎻 🎨 🎵 🔭 |
| 🔧 Tools | 🔧 🔨 ⛏️ 🔩 🧲 🔦 💡 🧪 📜 ⚙️ |

Each level randomly draws fresh pairs from a pool of 90+ icons — no two levels feel the same.

---

## ⏸ Pause Power

Players have **3 pause charges** that carry across levels.

| Rule | Detail |
|------|--------|
| **Duration** | Each pause lasts **20 seconds**, then auto-resumes |
| **Story button** | Navigating to the story mid-game **costs 1 charge** |
| **Victory screen** | Clicking Story from a win screen costs **no charges** |
| **Level reward** | Every **5 levels** completed awards **+1 charge** (max 3) |
| **Countdown** | Live countdown shown on the pause button and overlay |
| **Auto-return** | If the 20s expires while on the story page, the game **resumes and returns you to the game** |

---

## 🏆 Ways the Game Ends

| Condition | Outcome |
|-----------|---------|
| All pairs matched | ✨ **Victory** — advance to next level |
| Timer hits zero | 💀 **Defeated** — try the level again |
| **↺ Replay Level** on victory screen | Restarts the **current level** |
| **↺ Try Again** on defeat screen | Restarts the **current level** |
| All 35 levels cleared | 🏰 **Epilogue** — the realm awaits |

---

## 🎵 Audio

All audio is generated entirely with the **Web Audio API** — no external files, no CDN, no loading.

### Background Music
A heroic, triumphant march in D major built from:
- **Triangle wave melody** with LFO vibrato (brass-like tone)
- **Octave doubling** in sine for warmth
- **Sawtooth oom-pah bass** in march rhythm
- **Sine pad chords** (D major → E minor → B minor progression)
- **Percussion**: sine bass drum + bandpass noise snare

The same music plays continuously across the story and the game — no jarring cuts or overlaps.

### Sound Effects

| Event | Sound |
|-------|-------|
| Tile flip | Short rising ping |
| ✅ Match | Triumphant ascending arpeggio |
| ❌ No match | Descending sawtooth thud |
| 🏆 Level cleared | Rising fanfare run |
| 💀 Time's up | Slow descending minor fall |
| 🎉 All 35 levels | Full victory fanfare |

### Volume Control
A **🔊 slider** in the game footer controls master volume in real time. The icon updates: 🔇 at zero · 🔉 at low · 🔊 at normal.

---

## 📱 Mobile Support

- Full `100dvh` viewport with `env(safe-area-inset-bottom)` for iPhone notches
- **Swipe left/right** to navigate story pages
- **Tap ‹ ›** side arrows (center-left / center-right, never blocking content)
- Responsive tile grid — columns recalculate based on screen width
- `touch-action: manipulation` on all tiles for instant tap response
- Emoji icons pre-warmed via hidden div + double `requestAnimationFrame` — no blank tiles on first reveal

---

## 🖥️ Tech Stack

- **HTML5** — single file structure
- **CSS3** — 3D card flip, particle animations, responsive grid, `100dvh`
- **Vanilla JavaScript** — all game logic, audio engine, story navigation
- **Web Audio API** — full procedural music and SFX, no files
- **Google Fonts** — [Cinzel Decorative](https://fonts.google.com/specimen/Cinzel+Decorative) + [EB Garamond](https://fonts.google.com/specimen/EB+Garamond)
- **SVG** — all story illustrations drawn inline

> **Zero dependencies. Zero external assets (except fonts). One HTML file.**

---

## 🚀 Getting Started

### Play instantly
```bash
git clone https://github.com/your-username/knights-treasure.git
cd knights-treasure
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### Or serve locally
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Then visit `http://localhost:8000`

---

## 📁 Project Structure

```
knights-treasure/
├── index.html     # Entire experience — story + game + audio, self-contained
└── README.md      # This file
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#c9922a` | Primary accent, borders |
| `--gold-lt` | `#f0c46a` | Headings, highlights |
| `--ember` | `#e8550a` | Fire, danger, progress |
| `--parch` | `#f5ead0` | Scroll background |
| `--dark` | `#0d0a15` | Page background |

**Typography** — Cinzel Decorative (display) paired with EB Garamond (body). Both chosen for their medieval character and readability.

**Animations** — tile pop-in uses a spring cubic-bezier with center-out stagger delay. Story pages slide in from the right. SVG characters have idle breathing/walking loops.

---

## 🛠️ Customization

All configuration is at the top of the `<script>` tag in `index.html`.

**Change level config:**
```javascript
const LEVELS = [
  { level: 1, timer: 130, tiles: 4 },
  { level: 2, timer: 128, tiles: 6 },
  // ...
];
```

**Add more icons** (use Unicode 6–9 emoji only):
```javascript
const ALL_ICONS = [
  '🐶','🐱','🦊', // existing
  '🌟','🎃','🧿', // add here
];
```

**Change pause settings:**
```javascript
const MAX_PAUSE = 3;       // max charges
const PAUSE_DURATION = 20; // seconds per pause
```

---

## 🔮 Possible Future Features

- [ ] High score persistence via `localStorage`
- [ ] Difficulty selector (Easy / Normal / Hard)
- [ ] Additional story chapters
- [ ] Unlockable tile themes
- [ ] Leaderboard support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- Fonts: [Google Fonts](https://fonts.google.com) — Cinzel Decorative, EB Garamond
- Emoji: Unicode Standard / platform rendering
- Audio: Web Audio API — all procedurally generated

---

<div align="center">

*"Brave knight, thou hast conquered thirty-five trials of shadow and steel.*
*Yet the realm stirs with deeper mysteries.*
*Rest now — for greater treasures still await thy return."*

**⚔️ Knight's Treasure ⚔️**

</div>
