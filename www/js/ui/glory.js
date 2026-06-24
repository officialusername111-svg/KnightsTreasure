import { ASSETS, STAGE_NAMES } from '../data/config.js';
import { sectionTop } from './modal.js';
import {
  rankFor, nextRankProgress, titleFor, totalStars, stageComplete,
} from '../systems/ranks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

// Glory (trophy hall): rank, title, placements, stats, and the achievement grid.
// The competitive leaderboard now lives in its own Ranks scene. Read-only celebration.

const img = (src) => `<img src="${src}" alt="" onerror="this.style.display='none'">`;

// Stage Conquest trophies (group "Stage Conquests") map to a stage badge; everything
// else gets a medal/trophy glyph keyed off its group.
const STAGE_SLUG = {
  1: 'forest', 2: 'village', 3: 'river', 4: 'cave', 5: 'camp',
  6: 'gates', 7: 'dungeon', 8: 'throne', 9: 'lair', 10: 'vault',
};
const GROUP_GLYPH = {
  Progress: '🏰',
  Mastery: '⭐',
  Fortune: '💰',
  Renown: '🎖️',
  'Stage Conquests': '🛡️',
};

// Ordinal suffix for placement numbers (1 -> 1st, 2 -> 2nd, ...).
function ordinal(n) {
  const v = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const m = v % 100;
  return `${v}${s[(m - 20) % 10] || s[m] || s[0]}`;
}

const SCOPE_LABEL = { daily: 'Daily', weekly: 'Weekly', allTime: 'All-Time' };

export function createGloryScene({ gameState, onBack }) {
  const save = gameState.save;
  const coins = Math.round(save.coins || 0);
  const stars = totalStars(save);
  const cleared = (save.completedLevels || []).length;
  const bestScore = Math.round(Math.max(0, ...Object.values(save.bestScores || {})));

  const scene = document.createElement('div');
  scene.id = 'kt-glory';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgMap}")`;

  // ----- rank + progress -----
  const rank = rankFor(save);
  const prog = nextRankProgress(save);

  // ----- title banner -----
  const title = titleFor(save);
  const titleBanner = title
    ? `<div class="kt-glory-title">` +
        `<span class="em">${img(`${ASSETS.badges}${title.emblem}.png`)}</span>` +
        `<span class="t"><b>${title.name}</b><span>Earned title of honor</span></span>` +
      `</div>`
    : '';

  // ----- placements -----
  const history = save.rankHistory || {};
  const placeKeys = Object.keys(history).filter((k) => typeof history[k] === 'number');
  // Rendered as a knight's diary page (parchment) rather than chips.
  const placements = placeKeys.length
    ? placeKeys
        .map((k) => `<p class="kt-diary-line"><span class="dt">${SCOPE_LABEL[k] || k}</span> — I climbed to <b>${ordinal(history[k])}</b> place.</p>`)
        .join('')
    : `<p class="kt-diary-line empty">The pages await your first triumph, knight.</p>`;

  // ----- stats tiles -----
  const stat = (label, val, sub) =>
    `<div class="kt-glory-stat"><div class="v">${val}</div><div class="l">${label}</div>` +
    (sub ? `<div class="s">${sub}</div>` : '') + `</div>`;
  const statsGrid =
    stat('Total stars', `${stars}`, 'of 750') +
    stat('Levels cleared', `${cleared}`, 'of 250') +
    stat('Coins', `${coins}`, 'in the vault') +
    stat('Best score', `${bestScore}`, 'single level');

  // ----- trophy grid (grouped achievements) -----
  const groups = [];
  const byGroup = {};
  for (const a of ACHIEVEMENTS) {
    if (!byGroup[a.group]) { byGroup[a.group] = []; groups.push(a.group); }
    byGroup[a.group].push(a);
  }

  const trophyTile = (a) => {
    const earnedIt = a.test(save);
    // Stage Conquests show the matching stage badge; the rest a group glyph.
    let glyph;
    const stageMatch = /^stage_(\d+)$/.exec(a.id);
    if (stageMatch) {
      const n = +stageMatch[1];
      glyph = `<span class="bd">${img(`${ASSETS.badges}badge_stage${n}_${STAGE_SLUG[n]}.png`)}</span>`;
    } else {
      glyph = `<span class="gl">${GROUP_GLYPH[a.group] || '🏆'}</span>`;
    }

    let progBar = '';
    if (!earnedIt && typeof a.progress === 'function') {
      const p = a.progress(save) || {};
      const have = Math.round(p.have || 0);
      const need = Math.round(p.need || 0);
      const pct = need ? Math.min(100, Math.round((have / need) * 100)) : 0;
      progBar =
        `<div class="kt-glory-trophy-prog">` +
          `<div class="kt-stage-bar"><span style="width:${pct}%"></span></div>` +
          `<span class="cnt">${have}/${need}</span>` +
        `</div>`;
    }

    return `<div class="kt-glory-trophy${earnedIt ? ' on' : ' locked'}">` +
      `<span class="ic">${glyph}` +
        (earnedIt ? `<span class="mark on">✓</span>` : `<span class="mark">🔒</span>`) +
      `</span>` +
      `<b class="nm">${a.name}</b>` +
      `<span class="ds">${a.desc}</span>` +
      progBar +
    `</div>`;
  };

  const trophyGrid = groups.map((g) =>
    `<div class="kt-sub-head left">${g}</div>` +
    `<div class="kt-glory-grid">${byGroup[g].map(trophyTile).join('')}</div>`
  ).join('');

  // ----- assemble (single scrolling view, no tabs) -----
  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('The realm remembers', 'Glory', coins) +
    `<div class="kt-sec-body">` +

      // Rank block
      `<div class="kt-glory-rank">` +
        `<div class="badge">${img(`${ASSETS.badges}${rank.badge}.png`)}</div>` +
        `<div class="meta">` +
          `<b>${rank.name}</b>` +
          `<span class="metal">${rank.metal}</span>` +
          `<div class="kt-stage-bar"><span style="width:${Math.round(prog.pct)}%"></span></div>` +
          `<div class="prog-lbl">${prog.next ? `Next: ${prog.next.name} — ${prog.label}` : prog.label}</div>` +
        `</div>` +
      `</div>` +
      titleBanner +

      // Placements — the knight's diary
      `<div class="kt-sub-head left">Your placements</div>` +
      `<div class="kt-diary">` +
        `<span class="kt-diary-ribbon" aria-hidden="true"></span>` +
        `<div class="kt-diary-title">From the Knight's Chronicle</div>` +
        `<div class="kt-diary-body">${placements}</div>` +
      `</div>` +

      // Stats
      `<div class="kt-sub-head left">Your deeds</div>` +
      `<div class="kt-glory-stats">${statsGrid}</div>` +

      // Trophy grid
      `<div class="kt-sub-head left">Trophies</div>` +
      trophyGrid +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  return scene;
}
