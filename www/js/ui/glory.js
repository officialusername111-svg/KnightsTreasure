import { ASSETS } from '../data/config.js';
import { sectionTop } from './modal.js';
import {
  rankFor, nextRankProgress, titleFor, totalStars, stageComplete,
  RANKS, TITLES,
} from '../systems/ranks.js';

// Hall of Glory (D15): rank, titles, stage badges, stats, achievements + a mock
// global leaderboard (Firebase deferred). Read-only celebration scene.

const STAGE_SLUG = {
  1: 'forest', 2: 'village', 3: 'river', 4: 'cave', 5: 'camp',
  6: 'gates', 7: 'dungeon', 8: 'throne', 9: 'lair', 10: 'vault',
};
const STAGE_NAME = {
  1: 'Forest', 2: 'Village', 3: 'River', 4: 'Cave', 5: 'Camp',
  6: 'Gates', 7: 'Dungeon', 8: 'Throne', 9: 'Lair', 10: 'Vault',
};

// Mock rival knights for the leaderboard (descending). Player is spliced in by score.
const RIVALS = [
  { name: 'Sir Aldric the Bold',  title: 'Grandmaster Knight', score: 8840 },
  { name: 'Dame Rowena',          title: 'Paladin Knight',     score: 7720 },
  { name: 'Sir Cedric Ironhand',  title: 'Champion Knight',    score: 6610 },
  { name: 'Lady Maerwynn',        title: 'Champion Knight',    score: 5480 },
  { name: 'Sir Gawain of Ashford', title: 'Commander Knight',  score: 4530 },
  { name: 'Dame Isolde',          title: 'Commander Knight',   score: 3710 },
  { name: 'Sir Percival',         title: 'Captain Knight',     score: 2940 },
  { name: 'Bran the Steadfast',   title: 'Captain Knight',     score: 2410 },
  { name: 'Sir Owain',            title: 'Basic Knight',       score: 2050 },
];

const img = (src) => `<img src="${src}" alt="" onerror="this.style.display='none'">`;

export function createGloryScene({ gameState, onBack }) {
  const save = gameState.save;
  const coins = Math.round(save.coins || 0);
  const stars = totalStars(save);
  const cleared = (save.completedLevels || []).length;
  const bestScore = Math.round(Math.max(0, ...Object.values(save.bestScores || {})));
  const completed = save.completedLevels || [];
  const starsMap = save.stars || {};

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

  // ----- stage badges (2 rows of 5) -----
  const stageBadges = [...Array(10)].map((_, i) => {
    const n = i + 1;
    const earned = stageComplete(save, n);
    return `<div class="kt-glory-stage${earned ? '' : ' locked'}">` +
      `<span class="bd">${img(`${ASSETS.badges}badge_stage${n}_${STAGE_SLUG[n]}.png`)}` +
        (earned ? '' : `<span class="lk">🔒</span>`) +
      `</span>` +
      `<span class="nm">${STAGE_NAME[n]}</span>` +
    `</div>`;
  }).join('');

  // ----- stats tiles -----
  const stat = (label, val, sub) =>
    `<div class="kt-glory-stat"><div class="v">${val}</div><div class="l">${label}</div>` +
    (sub ? `<div class="s">${sub}</div>` : '') + `</div>`;
  const statsGrid =
    stat('Total stars', `${stars}`, 'of 750') +
    stat('Levels cleared', `${cleared}`, 'of 250') +
    stat('Coins', `${coins}`, 'in the vault') +
    stat('Best score', `${bestScore}`, 'single level');

  // ----- achievements (derived locally) -----
  const anyThreeStar = Object.values(starsMap).some((v) => v === 3);
  const isChampion = ['champion', 'paladin', 'grandmaster'].includes(rank.id);
  const ACHIEVEMENTS = [
    { name: 'First Steps',     desc: 'Clear level 1', earned: completed.includes('1-1') },
    { name: 'Into the Woods',  desc: 'Clear Stage 1', earned: stageComplete(save, 1) },
    { name: 'Star Collector',  desc: 'Earn 50★',      earned: stars >= 50 },
    { name: 'Knight of Coin',  desc: 'Hold 500 coins', earned: coins >= 500 },
    { name: 'Flawless',        desc: '3-star any level', earned: anyThreeStar },
    { name: 'Realm Champion',  desc: 'Reach Champion rank', earned: isChampion },
  ];
  const achRows = ACHIEVEMENTS.map((a) =>
    `<div class="kt-glory-ach${a.earned ? ' on' : ''}">` +
      `<span class="ic">${a.earned ? '✦' : '✧'}</span>` +
      `<span class="t"><b>${a.name}</b><span>${a.desc}</span></span>` +
      `<span class="st">${a.earned ? '✓' : '🔒'}</span>` +
    `</div>`
  ).join('');

  // ----- leaderboard (mock) -----
  const playerScore = Math.round(stars * 12 + cleared * 8 + coins);
  const playerName = save.displayName || 'You';
  const board = RIVALS.map((r) => ({ ...r, me: false }))
    .concat([{ name: playerName, title: rank.name, score: playerScore, me: true }])
    .sort((a, b) => b.score - a.score);
  const boardRows = board.map((r, i) =>
    `<div class="kt-glory-lb-row${r.me ? ' me' : ''}">` +
      `<span class="rk">${i + 1}</span>` +
      `<span class="who"><b>${r.name}</b><span>${r.title}</span></span>` +
      `<span class="sc">${Math.round(r.score).toLocaleString('en-US')}</span>` +
    `</div>`
  ).join('');

  // ----- assemble -----
  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('The realm remembers', 'Glory', coins) +
    `<div class="kt-sec-body">` +
      `<div class="kt-seg kt-glory-seg" id="glory-tabs">` +
        `<button type="button" data-tab="hall" class="on">Hall</button>` +
        `<button type="button" data-tab="board">Leaderboard</button>` +
      `</div>` +

      // ===== Hall =====
      `<div class="kt-glory-pane" data-pane="hall">` +
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
        `<div class="kt-sub-head left">Stage badges</div>` +
        `<div class="kt-glory-stages">${stageBadges}</div>` +
        `<div class="kt-sub-head left">Your deeds</div>` +
        `<div class="kt-glory-stats">${statsGrid}</div>` +
        `<div class="kt-sub-head left">Achievements</div>` +
        `<div class="kt-panel">${achRows}</div>` +
      `</div>` +

      // ===== Leaderboard =====
      `<div class="kt-glory-pane hidden" data-pane="board">` +
        `<div class="kt-glory-chips">` +
          `<span class="kt-chip ghost">Weekly</span>` +
          `<span class="kt-chip on">All Time</span>` +
        `</div>` +
        `<div class="kt-glory-mine">` +
          `<span class="l">Your Glory score</span>` +
          `<span class="v">${playerScore.toLocaleString('en-US')}</span>` +
        `</div>` +
        `<div class="kt-panel kt-glory-lb">${boardRows}</div>` +
        `<p class="kt-glory-note">The global board goes live with online play. For now you spar against the realm's legends.</p>` +
      `</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  // tab toggle
  const tabs = scene.querySelector('#glory-tabs');
  const panes = scene.querySelectorAll('.kt-glory-pane');
  tabs.querySelectorAll('button').forEach((btn) =>
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
      panes.forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== tab));
    })
  );

  return scene;
}
