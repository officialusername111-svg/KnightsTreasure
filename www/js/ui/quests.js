import { ASSETS } from '../data/config.js';
import { showInfo, sectionTop } from './modal.js';

// Daily Quests (Knight's Daily Duty, GDD §Knight's Daily Duty). Three tasks reset every 24h.
const TASKS = [
  {
    id: 'puzzle', name: 'Daily Puzzle', icon: 'ui_power_eagle_eye',
    desc: 'A hand-crafted level, the same for every knight. 3 attempts.',
    rewards: [['ui_coin', '100'], ['ui_power_sword', 'Power-up']], cta: 'Play',
  },
  {
    id: 'challenge', name: 'Daily Challenge', icon: 'ui_power_hourglass',
    desc: "Today's twist: clear it with no power-ups.",
    rewards: [['ui_coin', '75'], ['ui_stamina', '+1']], cta: 'Play',
  },
  {
    id: 'guild', name: 'Guild Quest', icon: 'ui_nav_rank',
    desc: 'Win 5 levels today.',
    rewards: [['ui_coin', '150'], ['ui_power_torch', 'Power-up']],
    progress: [2, 5], cta: 'Track', secondary: true,
  },
];

const STREAK = [
  { d: '3',  r: '+100' },
  { d: '7',  r: '+300' },
  { d: '14', r: '+500' },
  { d: '30', r: '+1000' },
];

function resetCountdown() {
  const now = new Date();
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const ms = mid - now;
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return `${h}h ${m}m`;
}

function chips(rewards) {
  return rewards
    .map(([img, txt]) => `<span class="kt-chip"><img src="${ASSETS.ui}${img}.png" alt="">${txt}</span>`)
    .join('');
}

export function createQuestsScene({ gameState, onBack }) {
  const save = gameState.save;
  const coins = save.coins || 0;
  const streak = save.dailyStreak || 0;

  const scene = document.createElement('div');
  scene.id = 'kt-quests';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgDaily}")`;

  const taskCards = TASKS.map((t) => {
    const prog = t.progress
      ? `<div class="kt-task-prog"><div class="bar"><span style="width:${Math.round((t.progress[0] / t.progress[1]) * 100)}%"></span></div>` +
        `<div class="t">${t.progress[0]} / ${t.progress[1]}</div></div>`
      : '';
    return (
      `<div class="kt-task">` +
        `<div class="kt-task-head">` +
          `<div class="kt-task-ic"><img src="${ASSETS.ui}${t.icon}.png" alt="" onerror="this.style.display='none'"></div>` +
          `<div class="kt-task-name"><b>${t.name}</b><span>${t.desc}</span></div>` +
        `</div>` +
        prog +
        `<div class="kt-task-foot">` +
          `<div class="kt-rewards">${chips(t.rewards)}</div>` +
          `<button type="button" class="kt-task-go${t.secondary ? ' sec' : ''}" data-id="${t.id}">${t.cta}</button>` +
        `</div>` +
      `</div>`
    );
  }).join('');

  const miles = STREAK.map((s) =>
    `<div class="kt-mile${streak >= +s.d ? ' done' : ''}"><div class="d">${s.d}d</div>` +
    `<div class="r"><img src="${ASSETS.ui}ui_coin.png" alt="">${s.r}</div></div>`
  ).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop("Knight's daily duty", 'Daily Quests', coins) +
    `<div class="kt-sec-body">` +
      `<div class="kt-q-reset">Resets in <b>${resetCountdown()}</b></div>` +
      taskCards +
      `<div class="kt-bonus">` +
        `<div class="kt-bonus-txt"><b>Clear all three</b><span>A hero's bonus awaits</span></div>` +
        `<div class="kt-bonus-side">` +
          `<div class="kt-rewards"><span class="kt-chip"><img src="${ASSETS.ui}ui_coin.png" alt="">200</span>` +
            `<span class="kt-chip"><img src="${ASSETS.ui}ui_item_knights_brew.png" alt="">Brew</span></div>` +
          `<div class="kt-bonus-pips">0 / 3</div>` +
        `</div>` +
      `</div>` +
      `<div class="kt-streak">` +
        `<div class="kt-streak-head"><b>Daily streak</b><span>Day ${streak}</span></div>` +
        `<div class="kt-streak-row">${miles}</div>` +
      `</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('.kt-task-go').forEach((b) =>
    b.addEventListener('click', () =>
      showInfo(scene, 'The notice board',
        `<p>The daily duties take up their posts in a later chapter, knight. The board is being inked.</p>`)
    )
  );

  return scene;
}
