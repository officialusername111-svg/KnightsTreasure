import { createMatchState, tapTile, resolveMismatch, removeAllLocks } from '../systems/match.js';
import { chooseSwaps } from '../systems/mechanics.js';
import { computeStars, computeScore, mistakePenalty } from '../systems/scoring.js';
import { recordLevelResult } from '../core/state.js';
import { persistSave } from '../core/save.js';
import { ASSETS, TEXT } from '../data/config.js';
import { tilePoolForStage } from '../data/tiles.js';
import { ITEMS } from '../data/items.js';
import { rankFor } from '../systems/ranks.js';
import { levelReward, comboCoins as comboCoinsFor, earn } from '../systems/economy.js';
import { recordWin } from '../systems/dailyDuty.js';
import { sfx } from '../systems/audio.js';
import { confirmModal } from './modal.js';
import { fanfare } from './fanfare.js';
import { renderHud } from './hud.js';
import { showTutorial } from './tutorial.js';
import { burst, popMatch, burstAtEl, staggerIn, comboBanner, countUp, starSlam } from './animations.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameScene({ gameState, adapter, bus, onAdvance, onRetry, onHome, onStory, onSettings, daily }) {
  const level = gameState.current;
  let match = createMatchState({
    pairs: level.pairs, iconPool: shuffle(tilePoolForStage(level.stage)), shuffle,
    decoyCount: level.decoyCount || 0,
    lockedCount: level.lockedCount || 0,
    unlockAfterMatches: level.unlockAfterMatches || 2,
  });
  let timeLeft = level.timeLimit;
  let elapsed = 0;
  let combo = 0;
  let maxCombo = 0;
  let timerId = null;
  let moveTimer = null;          // D8 moving-tiles scheduler
  let mismatchTimer = null;
  let finished = false;
  let frozen = false; // Shield power-up freezes the countdown
  let revealActive = 0;          // >0 while a power-up reveal is on screen (pauses movement)
  let drainAcc = 0;              // fractional carry for boss time-drain gimmicks
  const permaReveal = new Set(); // indices held face-up by arrow/sword/bomb (view-only)
  const activeBuffs = new Set(); // durational power-ups in effect (D11: max 2, no stacking)
  let powerPenalty = 0;          // score deducted by reveal power-ups (−25 each use)
  let usedPowerup = false;       // gates the "no power-ups" coin bonus (D13)

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
  // Leaving mid-level forfeits it (stamina already spent) — confirm first.
  // Abandoning ends the game cleanly: stop the timer + any pending flip, then leave.
  const endGame = () => { finished = true; stopTimer(); stopMoving(); if (mismatchTimer) clearTimeout(mismatchTimer); document.removeEventListener('visibilitychange', onVisibility); };
  const leaveGuard = (action) => {
    if (finished) { action(); return; }
    confirmModal(scene, {
      title: 'Abandon this level?',
      body: "Leave now and you forfeit this level — your stamina won't be refunded.",
      confirmLabel: 'Leave', cancelLabel: 'Stay', onConfirm: () => { endGame(); action(); },
    });
  };
  footer.querySelector('.kt-foot-home').addEventListener('click', () => leaveGuard(() => onHome && onHome()));
  footer.querySelector('.kt-foot-story').addEventListener('click', () => leaveGuard(() => onStory && onStory()));
  // Settings opens as an overlay and the timer keeps running (intentional).
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
          `</div>` +
          `<div class="kt-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>`;
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
      el.classList.toggle('flipped', (tile.faceUp || permaReveal.has(tile.index)) && !tile.matched);
      el.classList.toggle('matched', tile.matched);
      el.classList.toggle('locked', !!tile.locked && !tile.matched);
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
    if (result === 'flip') sfx('flip');
    else if (result === 'mismatch') sfx('mismatch');
    else if (result === 'match') sfx('match');
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
      // Daily "no mistakes" challenge: a single slip ends the run.
      if (daily && daily.modifier === 'no_mistakes') setTimeout(() => { if (!finished) lose(); }, 650);
    } else if (result === 'win') {
      win();
    }
  }

  function win() {
    finished = true;
    stopTimer();
    stopMoving();
    sfx('win'); sfx('coin');
    let stars = computeStars({
      mistakes: match.mistakes,
      pairs: match.totalPairs,
      timeUsed: elapsed,
      parTime: level.parTime,
    });
    // Daily duty level: no campaign record/coins — the reward is claimed in Quests.
    if (daily) {
      showOverlay(
        `<div class="kt-ov-banner victory"><img src="${ASSETS.ui}ui_banner_victory.png" alt="" onerror="this.remove()">` +
          `<span class="kt-ov-banner-label">${TEXT.win}</span></div>` +
        `<div class="kt-ov-stars" id="kt-ov-stars"></div>` +
        `<div class="kt-ov-reward">Daily duty done — collect your reward in Quests.</div>`,
        [{ label: 'Collect', fn: () => daily.onDone() }]
      );
      starSlam(overlay.querySelector('#kt-ov-stars'), stars);
      return;
    }
    if (gameState.save.brewBonusNext) stars = Math.max(stars, 2); // Knight's Brew floor
    const timeRemaining = level.timeLimit ? Math.max(0, timeLeft) : 0;
    const score = computeScore({
      matches: match.totalPairs,
      timeRemaining,
      comboBonus: comboBonus(),
      mistakes: match.mistakes,
    }) - powerPenalty;
    // D4: a boss's 3rd star also requires clearing the stage-scaled score threshold.
    if (level.isBoss && level.scoreThreshold && score < level.scoreThreshold) stars = Math.min(stars, 2);
    const firstClear = !gameState.save.completedLevels.includes(level.id);
    const coins = levelReward({
      stars, firstClear, noPowerup: !usedPowerup,
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
    stopMoving();
    sfx('lose');
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
        `<div class="row" style="color:#a05040;"><span>Mistakes ×50</span><span>−${mistakePenalty({ matches: match.totalPairs, timeRemaining, comboBonus: comboBonus(), mistakes: match.mistakes })}</span></div>` +
        (powerPenalty ? `<div class="row" style="color:#a05040;"><span>Power-ups used</span><span>−${powerPenalty}</span></div>` : '') +
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
      // Boss time-drain (D4): fast_timer drains 1.25×/s; final's clock tightens over time.
      const rate = level.shrinkTimer ? 1 + elapsed / 60 : (level.timeDrainRate || 1);
      drainAcc += rate;
      const dec = Math.floor(drainAcc);
      drainAcc -= dec;
      timeLeft -= dec;
      hud.setTime(timeLeft);
      // running-out feedback: pulsing red vignette + a soft tick in the last 10s
      const low = timeLeft <= 10 && timeLeft > 0;
      boardWrap.classList.toggle('low-time', low);
      if (low) sfx('tap');
      if (timeLeft <= 0) lose();
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    boardWrap.classList.remove('low-time');
  }

  // Android lifecycle (challenge #17): freeze the level clock while the app is backgrounded
  // so the countdown can't drain — or be paused to "think" — off-screen, then resume on return.
  // Self-removes once the scene is detached (no teardown hook in the scene manager).
  function onVisibility() {
    if (!scene.isConnected) { document.removeEventListener('visibilitychange', onVisibility); return; }
    if (document.hidden) {
      if (timerId) { clearInterval(timerId); timerId = null; }   // hold timeLeft/elapsed as-is
    } else if (!finished && timerId == null) {
      startTimer();                                              // resume from where we paused
    }
  }

  // ---- moving tiles (D8) — telegraphed swaps of face-down tiles ----
  function movementPaused() {
    // Never move mid-turn, during a reveal, while paused/backgrounded, or once finished.
    return finished || document.hidden || revealActive > 0 || match.firstPick !== null || match.locked;
  }
  function startMoving() {
    if (!level.moveIntervalMs) return;
    moveTimer = setInterval(() => {
      if (movementPaused()) return;
      doSwaps(chooseSwaps(match.tiles, { moveCount: level.moveCount || 1, pinned: permaReveal }));
    }, level.moveIntervalMs);
  }
  function stopMoving() { if (moveTimer) clearInterval(moveTimer); moveTimer = null; }

  // Swap two tiles' grid positions by reordering their DOM nodes. The model index is the
  // tile's identity (taps still match correctly); only the on-screen position changes.
  function doSwaps(pairs) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pairs.forEach(([i, j]) => {
      const a = tileEls[i], b = tileEls[j];
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const marker = document.createComment('swap');
      board.insertBefore(marker, a);
      board.insertBefore(a, b);
      board.insertBefore(b, marker);
      board.removeChild(marker);
      if (reduce) return;
      const na = a.getBoundingClientRect(), nb = b.getBoundingClientRect();
      animateSlide(a, ra.left - na.left, ra.top - na.top);
      animateSlide(b, rb.left - nb.left, rb.top - nb.top);
    });
  }
  function animateSlide(el, dx, dy) {
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.classList.add('kt-swapping');
    requestAnimationFrame(() => { el.style.transition = 'transform .6s cubic-bezier(.4,0,.2,1)'; el.style.transform = ''; });
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.classList.remove('kt-swapping'); }, 640);
  }

  // ---- power-up tray (D10/D11; first pass: Raven, Torch, Eagle Eye, Hourglass, Shield) ----
  function ownedPowerups() {
    return Object.values(ITEMS).filter((it) =>
      it.category === 'powerup' && (gameState.save.inventory[it.id] || 0) > 0 &&
      (it.unlockStage === 99 ? true : level.stage >= it.unlockStage));
  }
  function buildTray() {
    if (daily && daily.modifier === 'no_powerups') {
      tray.innerHTML = `<span class="kt-tray-hint">No power-ups in today's challenge</span>`;
      return;
    }
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
    revealActive += 1;             // pause movement (D12) while a reveal is on screen
    els.forEach((el) => el && el.classList.add('flipped'));
    setTimeout(() => { revealActive = Math.max(0, revealActive - 1); syncBoard(); }, ms);
  }
  function realUnmatched() {
    return match.tiles.filter((t) => !t.matched && !t.isDecoy);
  }
  // Keep the given tiles face-up for the rest of the level (arrow/sword/bomb). View-only:
  // the model is untouched, so match purity holds; the player still taps to match them.
  function revealPerm(indices) {
    const fresh = indices.filter((i) => i != null && match.tiles[i] && !match.tiles[i].matched && !permaReveal.has(i));
    if (!fresh.length) return false;
    fresh.forEach((i) => permaReveal.add(i));
    powerPenalty += 25;          // D-decision: reveal power-ups cost a flat 25 score
    syncBoard();
    return true;
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
    shield() { if (level.timeLimit == null) return false; frozen = true; activeBuffs.add('shield'); setTimeout(() => { frozen = false; activeBuffs.delete('shield'); }, 10000); return true; },
    // Permanently reveal one unmatched real tile (−25 score).
    arrow() {
      const t = realUnmatched().find((x) => !permaReveal.has(x.index));
      return t ? revealPerm([t.index]) : false;
    },
    // Permanently reveal a matching real pair (−25 score).
    sword() {
      const byIcon = {};
      realUnmatched().filter((t) => !permaReveal.has(t.index))
        .forEach((t) => (byIcon[t.icon] = byIcon[t.icon] || []).push(t));
      const pair = Object.values(byIcon).find((g) => g.length >= 2);
      return pair ? revealPerm([pair[0].index, pair[1].index]) : false;
    },
    // Permanently reveal the 2×2 block (anchored to fit the grid) richest in hidden tiles (−25 score).
    bomb() {
      const cols = level.grid.cols, rows = Math.ceil(match.tiles.length / cols);
      let best = null, bestCount = 0;
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
        const idxs = [r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1]
          .filter((i) => i < match.tiles.length);
        const cnt = idxs.filter((i) => !match.tiles[i].matched && !permaReveal.has(i)).length;
        if (cnt > bestCount) { bestCount = cnt; best = idxs; }
      }
      return best ? revealPerm(best) : false;
    },
    // Briefly reveal the grid row holding the most hidden real tiles (3s).
    spear() {
      const cols = level.grid.cols, rows = Math.ceil(match.tiles.length / cols);
      let bestRow = -1, bestCount = 0;
      for (let r = 0; r < rows; r++) {
        let cnt = 0;
        for (let c = 0; c < cols; c++) { const t = match.tiles[r * cols + c]; if (t && !t.matched && !t.isDecoy) cnt++; }
        if (cnt > bestCount) { bestCount = cnt; bestRow = r; }
      }
      if (bestRow < 0) return false;
      const els = [];
      for (let c = 0; c < cols; c++) { const i = bestRow * cols + c; if (match.tiles[i] && !match.tiles[i].matched) els.push(tileEls[i]); }
      flash(els, 3000);
      return true;
    },
    // Reveal the whole board for a moment, once. Not on boss levels (effect text).
    kingsDecree() {
      if (level.isBoss) return false;
      flash(match.tiles.filter((t) => !t.matched).map((t) => tileEls[t.index]), 2500);
      return true;
    },
    // Strip every chain at once (D9). No-op if nothing is locked.
    holyWater() {
      if (!match.tiles.some((t) => t.locked)) return false;
      match = removeAllLocks(match);
      syncBoard();
      return true;
    },
  };
  // Durational power-ups subject to the D11 "max 2 active / no stacking" rule.
  const ACTIVE_BUFFS = new Set(['shield', 'warHorn']);

  function usePower(id) {
    if (finished) return;
    const fn = EFFECTS[id];
    if (!fn) { return; }                 // not-yet-implemented power-ups stay in the pack
    // D11: at most 2 durational buffs active at once, and never stack the same one.
    if (ACTIVE_BUFFS.has(id) && (activeBuffs.has(id) || activeBuffs.size >= 2)) return;
    const ok = fn();
    if (!ok) return;                     // timer power-ups are no-ops on untimed levels
    usedPowerup = true;                  // forfeits the "no power-ups" coin bonus (D13)
    sfx('powerup');
    fanfare(scene, { settings: gameState.save.settings, kind: 'small', originY: 84 });
    gameState.save.inventory[id] -= 1;
    persistSave(adapter, gameState.save);
    bus.emit('powerup:used', { id });
    buildTray();
  }

  buildBoard();
  buildTray();
  document.addEventListener('visibilitychange', onVisibility);
  // S3 boss gimmick: flash the whole board for preShowMs, then hide and begin.
  const begin = () => {
    if (level.preShowMs) {
      match.tiles.forEach((t) => { const el = tileEls[t.index]; if (el && !t.locked) el.classList.add('flipped'); });
      setTimeout(() => { if (finished) return; syncBoard(); startTimer(); startMoving(); }, level.preShowMs);
    } else {
      startTimer();
      startMoving();
    }
  };
  // First-launch tutorial (Plan 3): teach the loop on level 1-1, then start play.
  if (!daily && level.id === '1-1' && !gameState.save.tutorialSeen) {
    showTutorial(scene, { onDone: () => { gameState.save.tutorialSeen = true; persistSave(adapter, gameState.save); begin(); } });
  } else {
    begin();
  }
  return scene;
}
