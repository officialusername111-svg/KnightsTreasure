import { createMatchState, tapTile, resolveMismatch } from '../systems/match.js';
import { computeStars, computeScore } from '../systems/scoring.js';
import { recordLevelResult } from '../core/state.js';
import { persistSave } from '../core/save.js';
import { ICON_POOL, ASSETS, TEXT } from '../data/config.js';
import { renderHud } from './hud.js';
import { burst, popMatch, burstAtEl, staggerIn, comboBanner, countUp, starSlam } from './animations.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameScene({ gameState, adapter, bus, onAdvance, onHome }) {
  const level = gameState.current;
  let match = createMatchState({ pairs: level.pairs, iconPool: shuffle(ICON_POOL), shuffle });
  let timeLeft = level.timeLimit;
  let elapsed = 0;
  let combo = 0;
  let maxCombo = 0;
  let timerId = null;
  let mismatchTimer = null;
  let finished = false;

  const scene = document.createElement('div');
  scene.id = 'kt-game';

  const hud = renderHud({
    stage: level.stage,
    level: level.levelInStage,
    timeLimit: level.timeLimit,
    coins: gameState.save.coins || 0,
    name: gameState.save.displayName || 'Knight',
    rank: 'Apprentice Knight',
  });

  const boardWrap = document.createElement('div');
  boardWrap.id = 'kt-board-wrap';
  boardWrap.style.setProperty('--bg-forest', `url("${ASSETS.bgForest}")`);
  const board = document.createElement('div');
  board.id = 'kt-board';
  board.style.gridTemplateColumns = `repeat(${level.grid.cols}, 1fr)`;
  board.style.width = `min(96vw, ${level.grid.cols * 112}px)`;
  boardWrap.appendChild(board);

  const tray = document.createElement('div');
  tray.id = 'kt-tray';
  tray.innerHTML = `<span style="color:#6b4c1a;font-size:10px;align-self:center;letter-spacing:1px;">Power-ups arrive with the Blacksmith</span>`;

  const footer = document.createElement('div');
  footer.id = 'kt-footer';
  footer.innerHTML = `<button type="button" class="kt-foot-home">Home</button><button type="button">Story</button><button type="button">Settings</button>`;
  footer.querySelector('.kt-foot-home').addEventListener('click', () => onHome && onHome());

  const overlay = document.createElement('div');
  overlay.id = 'kt-overlay';

  scene.append(hud, boardWrap, tray, footer, overlay);

  const tileEls = [];

  // Build the tile DOM once so taps only toggle classes — this lets the CSS
  // 3D-flip transition actually animate (re-creating nodes would snap instead).
  function buildBoard() {
    tileEls.length = 0;
    board.replaceChildren(
      ...match.tiles.map((tile) => {
        const t = document.createElement('div');
        t.className = 'kt-tile';
        t.dataset.index = tile.index;
        t.innerHTML =
          `<div class="kt-tile-inner">` +
            `<div class="kt-face kt-back"><img src="${ASSETS.tileBack}" alt=""></div>` +
            `<div class="kt-face kt-front"><img src="${ASSETS.tiles}${tile.icon}.png" alt=""></div>` +
          `</div>`;
        t.addEventListener('click', () => onTap(tile.index));
        tileEls[tile.index] = t;
        return t;
      })
    );
    syncBoard();
    staggerIn(tileEls, level.grid.cols);
  }

  // Sync existing tile elements to the model (no DOM recreation → flip animates).
  function syncBoard() {
    match.tiles.forEach((tile) => {
      const el = tileEls[tile.index];
      if (!el) return;
      el.classList.toggle('flipped', tile.faceUp && !tile.matched);
      el.classList.toggle('matched', tile.matched);
    });
  }

  function comboBonus() {
    return Math.max(0, maxCombo - 2) * 20;
  }

  // Flip a shown mismatch back down immediately (used by the timeout and by an
  // interrupting tap, so the player never waits on the flip-memory window).
  function resolvePending() {
    if (mismatchTimer) {
      clearTimeout(mismatchTimer);
      mismatchTimer = null;
    }
    match = resolveMismatch(match);
    tileEls.forEach((e) => e && e.classList.remove('wrong'));
    syncBoard();
  }

  function onTap(index) {
    if (finished) return;
    // A mismatched pair is currently shown: any new tap resolves it at once so the
    // tap is responsive instead of waiting out the flip-memory timer.
    if (match.locked) resolvePending();
    const prevFirst = match.firstPick;
    const { state, result } = tapTile(match, index);
    if (result === 'ignored') return;
    match = state;
    bus.emit('tile:' + result, { index });
    syncBoard();
    if (result === 'match' || result === 'win') {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      const pair = [tileEls[prevFirst], tileEls[index]];
      popMatch(pair);
      pair.forEach((el) => burstAtEl(scene, el, 10, 'spark'));
      comboBanner(scene, combo);
    }
    if (result === 'mismatch') {
      combo = 0;
      const el = tileEls[index];
      if (el) el.classList.add('wrong');
      mismatchTimer = setTimeout(resolvePending, level.flipMemoryMs);
    } else if (result === 'win') {
      win();
    }
  }

  function win() {
    finished = true;
    stopTimer();
    const stars = computeStars({
      mistakes: match.mistakes,
      pairs: match.totalPairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
    const timeRemaining = level.timeLimit ? Math.max(0, timeLeft) : 0;
    const score = computeScore({
      matches: match.totalPairs,
      timeRemaining,
      comboBonus: comboBonus(),
      mistakes: match.mistakes,
    });
    const advanced = recordLevelResult(gameState, { stars });
    persistSave(adapter, advanced.save);
    bus.emit('level:complete', { id: level.id, stars, score });
    showWin(stars, score, timeRemaining, advanced);
  }

  function lose() {
    finished = true;
    stopTimer();
    showOverlay(
      `<div class="kt-ov-banner defeat"><img src="${ASSETS.ui}ui_banner_defeat.png" alt="" onerror="this.remove()"></div>` +
      `<div class="kt-ov-title">${TEXT.lose}</div>`,
      [{ label: TEXT.retry, fn: () => onAdvance(gameState) }]
    );
  }

  function showWin(stars, score, timeRemaining, advanced) {
    const breakdown =
      `<div class="kt-ov-score">` +
        `<div class="total">${TEXT.score}: <span id="kt-ov-score">0</span></div>` +
        `<div class="row"><span>Matches ×100</span><span>+${match.totalPairs * 100}</span></div>` +
        `<div class="row"><span>Time left ×10</span><span>+${timeRemaining * 10}</span></div>` +
        `<div class="row"><span>Combo bonus</span><span>+${comboBonus()}</span></div>` +
        `<div class="row" style="color:#a05040;"><span>Mistakes ×50</span><span>−${match.mistakes * 50}</span></div>` +
      `</div>`;
    showOverlay(
      `<div class="kt-ov-banner victory"><img src="${ASSETS.ui}ui_banner_victory.png" alt="" onerror="this.remove()"></div>` +
      `<div class="kt-ov-title">${TEXT.win}</div>` +
      `<div class="kt-ov-stars" id="kt-ov-stars"></div>` +
      breakdown,
      [{ label: TEXT.next, fn: () => onAdvance(advanced) }]
    );
    // juice: stars slam in, score counts up, warm ember burst behind the panel
    starSlam(overlay.querySelector('#kt-ov-stars'), stars);
    countUp(overlay.querySelector('#kt-ov-score'), score);
    const r = overlay.getBoundingClientRect();
    burst(overlay, r.width / 2, r.height * 0.38, 22, 'ember');
  }

  function showOverlay(html, btns) {
    overlay.innerHTML = html;
    const row = document.createElement('div');
    row.className = 'kt-ov-btns';
    btns.forEach((b) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kt-btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.fn);
      row.appendChild(btn);
    });
    overlay.appendChild(row);
    overlay.classList.add('show');
  }

  function startTimer() {
    if (level.timeLimit == null) {
      timerId = setInterval(() => { elapsed += 1; }, 1000);
      return;
    }
    hud.setTime(timeLeft);
    timerId = setInterval(() => {
      timeLeft -= 1;
      elapsed += 1;
      hud.setTime(timeLeft);
      if (timeLeft <= 0) lose();
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  buildBoard();
  startTimer();
  return scene;
}
