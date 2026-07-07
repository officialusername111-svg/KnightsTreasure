import { createMatchState, tapTile, resolveMismatch } from '../systems/match.js';
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
import { renderHud } from './hud.js';
import { showInteractiveTutorial, showMechanicTutorial } from './tutorial.js';
import { burst, popMatch, burstAtEl, staggerIn, comboBanner, countUp, starSlam, castProjectile, castImpact, boardWave, shieldBubble, igniteReveal, slashAcross, boardFlash, irisBloom, streakReveal, edgePulse, sceneShake, impactFreeze, radialStreaks, scorchGlow, tileKick } from './animations.js';

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
  let warHornActive = false;     // War Horn: doubles match score for its window
  let warHornBonus = 0;          // extra score banked from matches made under War Horn
  let castSrc = null;            // {x,y} origin (tapped power button) for cast projectiles
  let aiming = null;             // { id, targets:Set } while a targeted power-up awaits its tile

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
  board.style.width = `min(100%, ${level.grid.cols * 148}px)`;   // baseline; fitBoard refines it
  boardWrap.appendChild(board);

  // Size the board to fit BOTH dimensions of the wrap (tiles are square) so it never needs
  // to scroll — the wrap clips, so no animation can spill scrollbars onto the screen.
  // A ResizeObserver fires once the wrap is laid out and on every resize/orientation change.
  function fitBoard() {
    const cols = level.grid.cols;
    const rows = Math.ceil(match.tiles.length / cols);
    const availW = boardWrap.clientWidth - 12;   // minus the 6px padding each side
    const availH = boardWrap.clientHeight - 12;
    if (availW <= 0 || availH <= 0) return;
    const size = Math.min(availW, (availH * cols) / rows, cols * 148);
    board.style.width = Math.floor(size) + 'px';
  }
  const boardRO = new ResizeObserver(() => {
    if (!boardWrap.isConnected) { boardRO.disconnect(); return; }
    fitBoard();
  });
  boardRO.observe(boardWrap);

  const tray = document.createElement('div');
  tray.id = 'kt-tray';

  const footer = document.createElement('div');
  footer.id = 'kt-footer';
  footer.innerHTML = `<button type="button" class="kt-foot-home">Home</button><button type="button" class="kt-foot-story">Story</button><button type="button" class="kt-foot-settings">Settings</button>`;
  // Leaving mid-level forfeits it (stamina already spent) — confirm first.
  // Abandoning ends the game cleanly: stop the timer + any pending flip, then leave.
  const endGame = () => { finished = true; cancelAim(); stopTimer(); stopMoving(); if (mismatchTimer) clearTimeout(mismatchTimer); document.removeEventListener('visibilitychange', onVisibility); };
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
    // Aim mode captures the tap: it targets the armed power-up instead of flipping.
    if (aiming) { aimTap(index); return; }
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
      if (warHornActive) warHornBonus += 100;   // War Horn doubles this match (base 100 → 200)
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
    }) - powerPenalty + warHornBonus;
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
        `<div class="row" style="color:#c06a4a;"><span>Mistakes ×50</span><span>−${mistakePenalty({ matches: match.totalPairs, timeRemaining, comboBonus: comboBonus(), mistakes: match.mistakes })}</span></div>` +
        (powerPenalty ? `<div class="row" style="color:#c06a4a;"><span>Power-ups used</span><span>−${powerPenalty}</span></div>` : '') +
        (warHornBonus ? `<div class="row" style="color:#8fd07a;"><span>War Horn ×2</span><span>+${warHornBonus}</span></div>` : '') +
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
    tray.querySelectorAll('.kt-power').forEach((b) => b.addEventListener('click', () => usePower(b.dataset.id, b)));
  }

  function flash(els, ms, dimEls = []) {
    revealActive += 1;             // pause movement (D12) while a reveal is on screen
    els.forEach((el) => el && el.classList.add('flipped'));
    dimEls.forEach((el) => el && el.classList.add('kt-decoy-dim'));   // D12: decoys shown dimmed
    setTimeout(() => {
      revealActive = Math.max(0, revealActive - 1);
      dimEls.forEach((el) => el && el.classList.remove('kt-decoy-dim'));
      syncBoard();
    }, ms);
  }
  function realUnmatched() {
    return match.tiles.filter((t) => !t.matched && !t.isDecoy);
  }
  // Center-out fire reveal (Torch / King's Decree): pause movement, light tiles from the
  // board centre outward, then revert. `items` = [{ el, decoy }].
  function igniteRevealTiles(items, holdMs, tone) {
    revealActive += 1;
    igniteReveal(scene, board, {
      tiles: items, holdMs, tone,
      reveal: (it) => { if (it.el) { it.el.classList.add('flipped'); if (it.decoy) it.el.classList.add('kt-decoy-dim'); } },
      hide: (it) => { if (it.el) it.el.classList.remove('flipped', 'kt-decoy-dim'); },
    });
    setTimeout(() => { revealActive = Math.max(0, revealActive - 1); syncBoard(); }, holdMs + 550);
  }
  // Floating "Double Score" banner while War Horn is active.
  function warHornBanner() {
    const b = document.createElement('div');
    b.className = 'kt-warhorn-badge';
    b.innerHTML = '<span>⚔ Double Score · 10s</span>';
    scene.appendChild(b);
    setTimeout(() => b.remove(), 10000);
  }
  // Power-up icon art used as the flying projectile.
  const POWER_ICON = (id) => `${ASSETS.ui}${ITEMS[id].icon}.png`;
  // Fire a projectile from the tapped button to each target tile; on landing, shake + onImpact.
  function castToTiles(id, idxs, onImpact, opts = {}) {
    const src = castSrc;            // snapshot the origin (the button may re-render away)
    const arc = opts.arc != null ? opts.arc : 70;
    const spin = opts.spin || 0;
    const stagger = opts.stagger != null ? opts.stagger : 90;
    idxs.forEach((idx, k) => {
      const toEl = tileEls[idx];
      setTimeout(() => castProjectile(scene, src, toEl, {
        icon: POWER_ICON(id), arc, spin, stickMs: opts.stickMs || 0,
        onImpact: () => { castImpact(scene, toEl, { count: 18 }); onImpact(idx); },
      }), k * stagger);
    });
  }

  const EFFECTS = {
    // Raven flutters to a real pair → both pulse and glow.
    raven() {
      const byIcon = {};
      realUnmatched().forEach((t) => (byIcon[t.icon] = byIcon[t.icon] || []).push(t));
      const pair = Object.values(byIcon).find((g) => g.length >= 2);
      if (!pair) return false;
      const els = [tileEls[pair[0].index], tileEls[pair[1].index]];
      // raven flies in flapping (spin wobble), scatters feathers over the pair, they glow
      castProjectile(scene, castSrc, els[0], { icon: POWER_ICON('raven'), arc: 90, spin: 18,
        onImpact: () => { els.forEach((e) => { burstAtEl(scene, e, 9, 'feather'); castImpact(scene, e, { count: 6 }); }); flash(els, 1200); } });
      return true;
    },
    // Torch ignites: a faint fire-light blooms from the centre and reveals tiles center-out.
    torch() {
      const decoys = match.tiles.filter((t) => t.isDecoy && !t.matched);
      const items = realUnmatched().concat(decoys).map((t) => ({ el: tileEls[t.index], decoy: t.isDecoy }));
      if (!items.length) return false;
      igniteRevealTiles(items, 2000);
      return true;
    },
    // Eagle Eye: an iris opens over the board, then real pairs glow gold.
    eagleEye() {
      irisBloom(scene, board);
      const els = realUnmatched().map((t) => tileEls[t.index]);
      els.forEach((el) => el && el.classList.add('hint'));
      setTimeout(() => els.forEach((el) => el && el.classList.remove('hint')), 5000);
      return true;
    },
    // Hourglass flies up to the timer → +15s with a sparkle.
    hourglass() {
      if (level.timeLimit == null) return false;
      castProjectile(scene, castSrc, hud, { icon: POWER_ICON('hourglass'), arc: 40,
        onImpact: () => { timeLeft += 15; hud.setTime(timeLeft); burstAtEl(scene, hud, 10, 'spark'); } });
      return true;
    },
    // Shield slams down onto the board → a blue ripple + flash, then a shimmering bubble holds.
    shield() {
      if (level.timeLimit == null) return false;
      frozen = true; activeBuffs.add('shield');
      castProjectile(scene, castSrc, board, { icon: POWER_ICON('shield'), arc: 10, ms: 320,
        onImpact: () => {
          boardFlash(scene, { color: 'rgba(150,210,255,.5)' });
          boardWave(scene, { x: board.getBoundingClientRect().left - scene.getBoundingClientRect().left + board.clientWidth / 2, y: board.getBoundingClientRect().top - scene.getBoundingClientRect().top + board.clientHeight / 2 }, { color: 'rgba(150,210,255,.7)', rings: 2 });
          shieldBubble(boardWrap, 10000);
        } });
      setTimeout(() => { frozen = false; activeBuffs.delete('shield'); }, 10000);
      return true;
    },
    // Arrow shoots to one real tile → it thuds in (sticks briefly), shakes and reveals (−25 score).
    arrow() {
      const t = realUnmatched().find((x) => !permaReveal.has(x.index));
      if (!t) return false;
      powerPenalty += 25;
      castToTiles('arrow', [t.index], (idx) => { permaReveal.add(idx); syncBoard(); }, { arc: 36, stagger: 0, stickMs: 280 });
      return true;
    },
    // Sword slashes across a matching real pair → a blade-streak + glint, both reveal (−25 score).
    sword() {
      const byIcon = {};
      realUnmatched().filter((t) => !permaReveal.has(t.index))
        .forEach((t) => (byIcon[t.icon] = byIcon[t.icon] || []).push(t));
      const pair = Object.values(byIcon).find((g) => g.length >= 2);
      if (!pair) return false;
      powerPenalty += 25;
      const els = [tileEls[pair[0].index], tileEls[pair[1].index]];
      slashAcross(scene, els);
      els.forEach((e, k) => setTimeout(() => { castImpact(scene, e, { count: 14 }); }, 120 + k * 80));
      setTimeout(() => { permaReveal.add(pair[0].index); permaReveal.add(pair[1].index); syncBoard(); }, 180);
      return true;
    },
    // Bomb (player-aimed): lobbed to the tapped 2×2 zone → hit-stop, screen shake,
    // shockwave + fire streaks, tiles kick outward and reveal with scorch (−25 score).
    bomb(targetIdx) {
      const zone = bombZone(targetIdx);
      if (!zone.length) return false;
      powerPenalty += 25;
      const centre = targetIdx;
      castProjectile(scene, castSrc, tileEls[centre], { icon: POWER_ICON('bomb'), arc: 150, spin: 720, ms: 520,
        onImpact: () => impactFreeze(scene, { holdMs: 90, onRelease: () => {
          const sr = scene.getBoundingClientRect();
          const cr = tileEls[centre].getBoundingClientRect();
          const at = { x: cr.left - sr.left + cr.width / 2, y: cr.top - sr.top + cr.height / 2 };
          boardFlash(scene, { color: 'rgba(255,210,120,.85)' });
          sceneShake(scene, { amp: 9, ms: 520 });
          boardWave(scene, at, { color: 'rgba(255,170,80,.8)', rings: 2 });
          radialStreaks(scene, at, { count: 10 });
          zone.forEach((i, k) => setTimeout(() => {
            const el = tileEls[i];
            const r = el.getBoundingClientRect();
            const dx = (r.left - cr.left) || (Math.random() - 0.5);
            const dy = (r.top - cr.top) || (Math.random() - 0.5);
            const len = Math.hypot(dx, dy) || 1;
            tileKick(el, dx / len, dy / len, { dist: i === centre ? 6 : 12 });
            castImpact(scene, el, { kind: 'ember', count: i === centre ? 26 : 14 });
            permaReveal.add(i);
            syncBoard();
          }, k * 70));
          scorchGlow(zone.map((i) => tileEls[i]), 1100);
        } }) });
      return true;
    },
    // Spear thrusts across the row richest in hidden real tiles → the row flips for 3s.
    spear() {
      const cols = level.grid.cols, rows = Math.ceil(match.tiles.length / cols);
      let bestRow = -1, bestCount = 0;
      for (let r = 0; r < rows; r++) {
        let cnt = 0;
        for (let c = 0; c < cols; c++) { const t = match.tiles[r * cols + c]; if (t && !t.matched && !t.isDecoy) cnt++; }
        if (cnt > bestCount) { bestCount = cnt; bestRow = r; }
      }
      if (bestRow < 0) return false;
      const els = [], dim = []; let mid = bestRow * cols;
      for (let c = 0; c < cols; c++) {
        const i = bestRow * cols + c, t = match.tiles[i];
        if (t && !t.matched) { els.push(tileEls[i]); mid = i; if (t.isDecoy) dim.push(tileEls[i]); }
      }
      // a horizontal streak spears the row left→right; tiles flip in its wake
      revealActive += 1;
      const items = els.map((e) => ({ el: e, decoy: dim.includes(e) }));
      streakReveal(scene, {
        tiles: items, holdMs: 3000,
        reveal: (it) => { castImpact(scene, it.el, { count: 8 }); it.el.classList.add('flipped'); if (it.decoy) it.el.classList.add('kt-decoy-dim'); },
        hide: (it) => { it.el.classList.remove('flipped', 'kt-decoy-dim'); },
      });
      setTimeout(() => { revealActive = Math.max(0, revealActive - 1); syncBoard(); }, 3000 + 500);
      return true;
    },
    // King's Decree: a golden royal bloom sweeps the whole board center-out.
    kingsDecree() {
      if (level.isBoss) return false;
      const items = match.tiles.filter((t) => !t.matched).map((t) => ({ el: tileEls[t.index], decoy: t.isDecoy }));
      if (!items.length) return false;
      igniteRevealTiles(items, 2500, 'gold');
      return true;
    },
    // War Horn: sound-wave rings ripple out + a gold board vignette pulses while ×2 is active.
    warHorn() {
      warHornActive = true;
      activeBuffs.add('warHorn');
      boardWave(scene, castSrc, { color: 'rgba(245,200,66,.5)', rings: 4 });
      edgePulse(boardWrap, 10000);
      warHornBanner();
      setTimeout(() => { warHornActive = false; activeBuffs.delete('warHorn'); }, 10000);
      return true;
    },
    // Holy Water: a droplet flies to each chained tile → splash, chains shatter (D9).
    holyWater() {
      const locked = match.tiles.filter((t) => t.locked);
      if (!locked.length) return false;
      locked.forEach((t, k) => setTimeout(() => castProjectile(scene, castSrc, tileEls[t.index], {
        icon: POWER_ICON('holyWater'), arc: 60,
        onImpact: () => { t.locked = false; castImpact(scene, tileEls[t.index], { count: 10 }); burstAtEl(scene, tileEls[t.index], 12, 'shard'); syncBoard(); },
      }), k * 110));
      match.locksRemaining = 0;
      return true;
    },
  };
  // Durational power-ups subject to the D11 "max 2 active / no stacking" rule.
  const ACTIVE_BUFFS = new Set(['shield', 'warHorn']);

  // The 2×2 blast zone anchored at the tapped tile, clamped inside the grid (deduped so
  // 1-row / 1-col boards still work).
  function bombZone(idx) {
    const cols = level.grid.cols, rows = Math.ceil(match.tiles.length / cols);
    const r = Math.max(0, Math.min(Math.floor(idx / cols), rows - 2));
    const c = Math.max(0, Math.min(idx % cols, cols - 2));
    return [...new Set([r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1])]
      .filter((i) => i < match.tiles.length);
  }

  // Player-aimed power-ups: which tiles are valid targets + what the hint chip says.
  // (Bomb is the approved slice; Arrow/Spear/Sword join this map on replication.)
  const AIM_POWERS = {
    bomb: {
      hint: 'Tap a tile — drop the Bomb there',
      targets: () => match.tiles.filter((t) => !t.matched).map((t) => t.index),
    },
  };

  function enterAim(id) {
    const cfg = AIM_POWERS[id];
    const targets = new Set(cfg.targets());
    if (!targets.size) return;
    aiming = { id, targets };
    board.classList.add('kt-aiming');
    targets.forEach((i) => tileEls[i] && tileEls[i].classList.add('kt-aim-target'));
    const btn = tray.querySelector(`.kt-power[data-id="${id}"]`);
    if (btn) btn.classList.add('kt-armed');
    const hint = document.createElement('div');
    hint.className = 'kt-aim-hint';
    hint.innerHTML = `<span>🎯 ${cfg.hint}</span><button type="button" class="kt-aim-x" aria-label="Cancel">✕</button>`;
    hint.querySelector('.kt-aim-x').addEventListener('click', cancelAim);
    boardWrap.appendChild(hint);
    aiming.hintEl = hint;
    aiming.onKey = (e) => { if (e.key === 'Escape') cancelAim(); };
    document.addEventListener('keydown', aiming.onKey);
  }

  function cancelAim() {
    if (!aiming) return;
    board.classList.remove('kt-aiming');
    tileEls.forEach((el) => el && el.classList.remove('kt-aim-target'));
    tray.querySelectorAll('.kt-power.kt-armed').forEach((b) => b.classList.remove('kt-armed'));
    if (aiming.hintEl) aiming.hintEl.remove();
    document.removeEventListener('keydown', aiming.onKey);
    aiming = null;
  }

  function aimTap(index) {
    if (!aiming.targets.has(index)) return;   // invalid target: ignore, stay in aim mode
    const id = aiming.id;
    cancelAim();
    const ok = EFFECTS[id](index);
    if (ok) consumePower(id);
  }

  // Shared post-fire bookkeeping: bonus forfeit, sfx, inventory, save, tray refresh.
  function consumePower(id) {
    usedPowerup = true;                  // forfeits the "no power-ups" coin bonus (D13)
    sfx('powerup');
    gameState.save.inventory[id] -= 1;
    persistSave(adapter, gameState.save);
    bus.emit('powerup:used', { id });
    buildTray();
  }

  function usePower(id, srcEl) {
    if (finished) return;
    const fn = EFFECTS[id];
    if (!fn) { return; }                 // not-yet-implemented power-ups stay in the pack
    // Re-tapping the armed power-up cancels aim mode; arming a different one switches.
    if (aiming) { const same = aiming.id === id; cancelAim(); if (same) return; }
    // D11: at most 2 durational buffs active at once, and never stack the same one.
    if (ACTIVE_BUFFS.has(id) && (activeBuffs.has(id) || activeBuffs.size >= 2)) return;
    // Capture the projectile origin (the tapped button's centre, scene-relative) before the
    // tray re-renders and detaches the button.
    const btn = srcEl || tray.querySelector(`.kt-power[data-id="${id}"]`);
    const sr = scene.getBoundingClientRect();
    if (btn) { const br = btn.getBoundingClientRect(); castSrc = { x: br.left - sr.left + br.width / 2, y: br.top - sr.top + br.height / 2 }; }
    else castSrc = { x: sr.width / 2, y: sr.height - 30 };
    // Targeted power-ups arm and wait for the player's tile pick instead of auto-firing.
    if (AIM_POWERS[id]) { enterAim(id); return; }
    const ok = fn();
    if (!ok) return;                     // timer power-ups are no-ops on untimed levels
    consumePower(id);
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
  // Contextual mechanic tutorials: show each new mechanic/feature once, in sequence,
  // before play begins. Skipped on daily-challenge boards.
  function runMechTutorials(done) {
    if (daily) { done(); return; }
    const seen = gameState.save.tutorialsSeen || (gameState.save.tutorialsSeen = {});
    const queue = [];
    if (level.lockedCount > 0) queue.push('locked');
    if (level.moveIntervalMs > 0) queue.push('moving');
    if (level.decoyCount > 0) queue.push('decoy');
    if (level.hidden) queue.push('hidden');
    if (ownedPowerups().length) queue.push('powerups');
    const pending = queue.filter((k) => !seen[k]);
    const next = () => {
      if (!pending.length) { done(); return; }
      const k = pending.shift();
      seen[k] = true;
      persistSave(adapter, gameState.save);
      showMechanicTutorial(scene, k, { onDone: next });
    };
    next();
  }
  // First launch (level 1-1) gets the live, interactive basics: the board stays tappable while
  // the Forest Guard reacts to the player's real taps. Other levels gate new-mechanic lessons first.
  if (!daily && level.id === '1-1' && !gameState.save.tutorialSeen) {
    begin();
    showInteractiveTutorial(scene, {
      bus, boardWrap,
      onDone: () => { gameState.save.tutorialSeen = true; persistSave(adapter, gameState.save); },
    });
  } else {
    runMechTutorials(begin);
  }
  return scene;
}
