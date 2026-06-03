# ⚔️ Knight's Treasure

> *A medieval memory matching game — flip tiles, find pairs, claim the glory.*

![Game Banner](https://img.shields.io/badge/Knight's%20Treasure-Memory%20Game-c09030?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMiAyMmgyMEwxMiAyeiIgZmlsbD0iI2YwZDA4MCIvPjwvc3ZnPg==)
![Levels](https://img.shields.io/badge/Levels-20-6b4c1a?style=for-the-badge)
![Tiles](https://img.shields.io/badge/Max%20Tiles-32-2a1800?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🏰 Overview

**Knight's Treasure** is a browser-based memory tile-matching game built in pure HTML, CSS, and JavaScript — no dependencies, no build tools. Players flip tiles to find matching pairs of medieval relics, enchanted creatures, and royal artifacts before the hourglass runs dry.

The game spans **20 levels**, progressively increasing in difficulty with more tiles and shorter timers. Survive all 20 and the realm delivers a final message — the journey is never truly over.

---

## 🎮 Gameplay

1. A grid of **face-down tiles** is presented at the start of each level.
2. Click any tile to **reveal its image**.
3. Click a second tile to try to find its **matching pair**.
   - ✅ **Match** — both tiles stay face-up and glow green.
   - ❌ **No match** — both tiles shake and flip back face-down.
4. Match **all pairs** before the timer hits zero to advance to the next level.

---

## 📜 Level Progression

| Level | Tiles | Timer (seconds) |
|------:|------:|----------------:|
| 1     | 4     | 100             |
| 2     | 6     | 95              |
| 3     | 8     | 90              |
| 4     | 10    | 85              |
| 5     | 12    | 80              |
| 6     | 14    | 75              |
| 7     | 16    | 70              |
| 8     | 18    | 65              |
| 9     | 20    | 60              |
| 10    | 22    | 55              |
| 11    | 24    | 50              |
| 12    | 26    | 45              |
| 13    | 28    | 40              |
| 14    | 30    | 35              |
| 15    | 32    | 30              |
| 16    | 32    | 25              |
| 17    | 32    | 20              |
| 18    | 32    | 20              |
| 19    | 32    | 20              |
| 20    | 32    | 20              |

> Tiles increase by **2 per level** (starting from 4) up to a maximum of **32**. Timer decreases by **5 seconds per level** down to a minimum of **20 seconds**.

---

## 🃏 Tile Themes

Each level randomly draws pairs from a pool of **80+ unique icons** across themed categories:

| Category         | Examples                              |
|-----------------|---------------------------------------|
| 🐾 Animals       | 🦁 🐯 🦊 🐉 🦄 🦅 🦋 🦚 🦌 🐬       |
| 💎 Royal Relics  | 💎 👑 🔱 ⚗️ 🔮 🪬 🧲 🕯️             |
| ⚔️ Weapons       | ⚔️ 🛡️ 🗡️ 🏹 🪃                      |
| 🔧 Tools         | 🔨 🪚 🪛 🔧 🪝 🗝️                    |
| 🍳 Kitchen       | 🫕 🍯 🧇 🥩 🍖 🧁 🥐 🫙              |
| 🌿 Nature        | 🌋 🏔️ 🌊 🌪️ 🌙 ☄️ 🌈 🍄 🌿 🪨       |
| 🎭 Mystical      | 🎭 🎲 🎯 🪩 🌹 🌻                    |

---

## 💀 Ways the Game Ends

| Condition                        | Outcome                        |
|----------------------------------|--------------------------------|
| All pairs matched                | 🏆 **Victory** — advance to the next level |
| Timer reaches zero               | 💀 **Defeated** — try the level again      |
| Player clicks **Try Again**      | 🔄 **Reset** — restart current level       |
| All 20 levels completed          | 🏰 **Epilogue message** — the realm awaits |

---

## 🖥️ Tech Stack

- **HTML5** — structure and layout
- **CSS3** — 3D card flip animations, medieval dark-gold theme
- **Vanilla JavaScript** — all game logic, no frameworks or libraries
- **Google Fonts** — [Cinzel](https://fonts.google.com/specimen/Cinzel) for the medieval serif aesthetic

> **Zero dependencies.** Drop a single HTML file into any browser and it works.

---

## 🚀 Getting Started

### Play instantly
Just open `index.html` in any modern browser — no server, no install.

```bash
git clone https://github.com/your-username/knights-treasure.git
cd knights-treasure
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### Or serve locally (optional)
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Then visit `http://localhost:8000`.

---

## 📁 Project Structure

```
knights-treasure/
├── index.html        # The entire game — HTML, CSS, and JS in one file
├── README.md         # This file
└── LICENSE           # MIT License
```

---

## 🎨 Design

The visual theme draws from medieval dungeon aesthetics:

- **Color palette** — deep parchment blacks (`#1a0f00`), aged gold (`#f5c842`), torch amber (`#a07832`)
- **Typography** — [Cinzel](https://fonts.google.com/specimen/Cinzel), a Roman-inspired serif font
- **Tile animations** — CSS 3D `perspective` + `rotateY` flip with a `0.35s` ease transition
- **Feedback** — matched tiles glow green; mismatched tiles play a CSS shake animation
- **HUD** — live timer bar, level counter, pairs found, and tiles remaining

---

## 🛠️ Customization

All configuration lives in the `LEVELS` array and `ICONS` array near the top of the `<script>` tag.

**Change level config:**
```javascript
const LEVELS = [
  { level: 1, timer: 100, tiles: 4 },
  { level: 2, timer: 95,  tiles: 6 },
  // add or modify levels here
];
```

**Add more icons:**
```javascript
const ICONS = [
  '🦁','🐯','🦊', // ... existing icons
  '🧸','🪆','🎋', // add yours here
];
```

---

## 🔮 Roadmap

- [ ] Sound effects (flip, match, fail, level-up)
- [ ] High score persistence via `localStorage`
- [ ] Mobile touch optimizations
- [ ] Custom difficulty selector (Easy / Normal / Hard)
- [ ] Leaderboard support
- [ ] Additional tile themes (Seasons, Mythology, Space)

---

## 🤝 Contributing

Contributions, ideas, and bug reports are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- Font: [Cinzel by Google Fonts](https://fonts.google.com/specimen/Cinzel)
- Emoji icons: Unicode Standard / platform rendering
- Inspiration: Classic concentration/memory card games

---

<div align="center">

*"Brave knight, the realm stirs with deeper mysteries.*
*Rest now, sharpen thy blade, and gather thy courage —*
*for greater treasures and darker dungeons still await."*

⚔️ **Knight's Treasure** ⚔️

</div>
