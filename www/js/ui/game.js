import { createMatchState, tapTile, resolveMismatch } from '../systems/match.js';
import { computeStars, computeScore } from '../systems/scoring.js';
import { recordLevelResult } from '../core/state.js';
import { persistSave } from '../core/save.js';
import { ICON_POOL, ASSETS, TEXT } from '../data/config.js';
import { ITEMS } from '../data/items.js';
import { rankFor } from '../systems/ranks.js';
import { levelReward, comboCoins as comboCoinsFor, earn } from '../systems/economy.js';
import { recordWin } from '../systems/dailyDuty.js';
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

export function createGameScene({ gameState, adapter, bus, onAdvance, onRetry, onHome, onStory, onSettings }) {
  const level = gameState.current;
  let match = createMatchState({ pairs: level.pairs, iconPool: shuffle(ICON_POOL), shuffle, decoyCount: level.decoyCount || 0 });
  let timeLeft = level.timeLimit;
  let elapsed = 0;
  let combo = 0;
  let maxCombo = 0;
  let timerId = null;
  let mismatchTimer = null;
  let finished = false;
  let frozen = false; // Shield power-up freezes the countdown

  const scene = document.createElement('div');
  scene.id = 'kt-game';

  const rank = rankFor(gameState.save);
  const hud = renderHud({
    stage: level.stage,
    level: level.levelInStage,
    timeLimit: level.timeLimit,
    coins: gameState.save.coins || 0,
    name: gameState.save.displayName || 'Knight',
    rank: rank.name,
    badge: rank.badge,
  });

  const boardWrap = document.createElement('div');
  boardWrap.id = 'kt-board-wrap';
  // Absolute URL: a relative url() inside a CSS custom property resolves against the
  // stylesheet that consumes it (/css/), not the document — which 404s. (See home.js.)
  boardWrap.style.setProperty('--bg-forest', `url("${new URL(ASSETS.bgForest, document.baseURI).href}")`);
  const board = document.createElement('div');
  board.id = 'kt-board';
  board.style.gridTemplateColumns = `repeat(${level.grid.cols}, 1fr)`;
  // Fill the available width (bigger tiles, no wasted margins), capped so very small
  // grids don't blow up on wide screens.
  board.style.width = `min(100%, ${level.grid.cols * 148}px)`;
  boardWrap.appendChild(board);

  const tray = document.createElement('div');
  tray.id = 'kt-tray';

  const footer = document.createElement('div');
  footer.id = 'kt-footer';
  footer.innerHTML = `<button type="button" class="kt-foot-home">Home</button><button type="button" class="kt-foot-story">Story</button><button type="button" class="kt-foot-settings">Settings</button>`;
  footer.querySelector('.kt-foot-home').addEventListener('click', () => onHome && onHome());
  footer.querySelector('.kt-foot-story').addEventListener('click', () => onStory && onStory());
  footer.querySelector('.kt-foot-settings').addEventListener('click', () => onSettings && onSettings());

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
    let stars = computeStars({
      mistakes: match.mistakes,
      pairs: match.totalPairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
    if (gameState.save.brewBonusNext) stars = Math.max(stars, 2); // Knight's Brew floor
    const timeRemaining = level.timeLimit ? Math.max(0, timeLeft) : 0;
    const score = computeScore({
      matches: match.totalPairs,
      timeRemaining,
      comboBonus: comboBonus(),
      mistakes: match.mistakes,
    });
    const firstClear = !gameState.save.completedLevels.includes(level.id);
    const coins = levelReward({
      stars, firstClear, noPowerup: true,
      noMistakes: match.mistakes === 0,
      speed: elapsed <= level.parTime,
      comboCoins: comboCoinsFor(maxCombo),
    });
    const advanced = recordLevelResult(gameState, { stars });
    earn(advanced.save, coins);
    recordWin(advanced.save, { mistakes: match.mistakes });
    advanced.save.bestScores = { ...advanced.save.bestScores, [level.id]: Math.max(advanced.save.bestScores?.[level.id] || 0, score) };
    advanced.save.brewBonusNext = false;
    persistSave(adapter, advanced.save);
    bus.emit('level:complete', { id: level.id, stars, score });
    showWin(stars, score, timeRemaining, advanced, coins);
  }

  function lose() {
    finished = true;
    stopTimer();
    showOverlay(
      `<div class="kt-ov-banner defeat"><img src="${ASSETS.ui}ui_banner_defeat.png" alt="" onerror="this.remove()">` +
        `<span class="kt-ov-banner-label">${TEXT.lose}</span></div>`,
      [{ label: TEXT.retry, fn: () => (onRetry ? onRetry() : onHome && onHome()) }]
    );
  }

  function showWin(stars, score, timeRemaining, advanced, coins) {
    const breakdown =
      `<div class="kt-ov-score">` +
        `<div class="total">${TEXT.score}: <span id="kt-ov-score">0</span></div>` +
        `<div class="row"><span>Matches ×100</span><span>+${match.totalPairs * 100}</span></div>` +
        `<div class="row"><span>Time left ×10</span><span>+${timeRemaining * 10}</span></div>` +
        `<div class="row"><span>Combo bonus</span><span>+${comboBonus()}</span></div>` +
        `<div class="row" style="color:#a05040;"><span>Mistakes ×50</span><span>−${match.mistakes * 50}</span></div>` +
      `</div>` +
      `<div class="kt-ov-reward"><img src="${ASSETS.ui}ui_coin.png" alt="">+${coins} coins</div>`;
    showOverlay(
      `<div class="kt-ov-banner victory"><img src="${ASSETS.ui}ui_banner_victory.png" alt="" onerror="this.remove()">` +
        `<span class="kt-ov-banner-label">${TEXT.win}</span></div>` +
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
      elapsed += 1;
      if (frozen) return;            // Shield holds the countdown
      timeLeft -= 1;
      hud.setTime(timeLeft);
      if (timeLeft <= 0) lose();
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  // ---- power-up tray (D10/D11; first pass: Raven, Torch, Eagle Eye, Hourglass, Shield) ----
  function ownedPowerups() {
    return Object.values(ITEMS).filter((it) =>
      it.category === 'powerup' && (gameState.save.inventory[it.id] || 0) > 0 &&
      (it.unlockStage === 99 ? true : level.stage >= it.unlockStage));
  }
  function buildTray() {
    const owned = ownedPowerups();
    if (!owned.length) {
      tray.innerHTML = `<span class="kt-tray-hint">Visit the Blacksmith to forge power-ups</span>`;
      return;
    }
    tray.innerHTML = owned.map((it) =>
      `<button type="button" class="kt-power" data-id="${it.id}" title="${it.effect}">` +
        `<img src="${ASSETS.ui}${it.icon}.png" alt="" onerror="this.style.display='none'">` +
        `<span class="cnt">×${gameState.save.inventory[it.id]}</span></button>`
    ).join('');
    tray.querySelectorAll('.kt-power').forEach((b) => b.addEventListener('click', () => usePower(b.dataset.id)));
  }

  function flash(els, ms) {
    els.forEach((el) => el && el.classList.add('flipped'));
    setTimeout(() => { syncBoard(); }, ms);
  }
  function realUnmatched() {
    return match.tiles.filter((t) => !t.matched && !t.isDecoy);
  }

  const EFFECTS = {
    raven() {
      const pool = realUnmatched();
      const byIcon = {};
      pool.forEach((t) => (byIcon[t.icon] = byIcon[t.icon] || []).push(t));
      const pair = Object.values(byIcon).find((g) => g.length >= 2);
      if (!pair) return false;
      flash([tileEls[pair[0].index], tileEls[pair[1].index]], 1200);
      return true;
    },
    torch() { flash(realUnmatched().concat(match.tiles.filter((t) => t.isDecoy)).map((t) => tileEls[t.index]), 2000); return true; },
    eagleEye() {
      const els = realUnmatched().map((t) => tileEls[t.index]);
      els.forEach((el) => el && el.classList.add('hint'));
      setTimeout(() => els.forEach((el) => el && el.classList.remove('hint')), 5000);
      return true;
    },
    hourglass() { if (level.timeLimit == null) return false; timeLeft += 15; hud.setTime(timeLeft); return true; },
    shield() { if (level.timeLimit == null) return false; frozen = true; setTimeout(() => { frozen = false; }, 10000); return true; },
  };

  function usePower(id) {
    if (finished) return;
    const fn = EFFECTS[id];
    if (!fn) { return; }                 // not-yet-implemented power-ups stay in the pack
    const ok = fn();
    if (!ok) return;                     // timer power-ups are no-ops on untimed levels
    gameState.save.inventory[id] -= 1;
    persistSave(adapter, gameState.save);
    bus.emit('powerup:used', { id });
    buildTray();
  }

  buildBoard();
  buildTray();
  startTimer();
  return scene;
}
