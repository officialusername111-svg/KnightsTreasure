import { ASSETS } from '../data/config.js';
import { ITEMS } from '../data/items.js';
import { persistSave } from '../core/save.js';
import { TASKS, BONUS, progressOf, isDone, isClaimed, isAccepted, acceptTask,
  allClaimed, bonusClaimed, claim, dailyModifier } from '../systems/dailyDuty.js';
import { sectionTop, toast } from './modal.js';
import { fanfare } from './fanfare.js';

const TWO_H = 2 * 60 * 60 * 1000;
function twoHourLeft() {
  const ms = TWO_H - (Date.now() % TWO_H);
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ICONS = { puzzle: 'ui_power_raven', challenge: 'ui_power_hourglass', guild: 'ui_nav_rank' };
const STREAK = [
  { d: 3, r: '+100' }, { d: 7, r: '+300' }, { d: 14, r: '+500' }, { d: 30, r: '+1000' },
];

function resetCountdown() {
  const now = new Date();
  const mid = new Date(now); mid.setHours(24, 0, 0, 0);
  const ms = mid - now;
  return `${Math.floor(ms / 3.6e6)}h ${Math.floor((ms % 3.6e6) / 6e4)}m`;
}

function rewardChips(reward) {
  const out = [];
  if (reward.coins) out.push(`<span class="kt-chip"><img src="${ASSETS.ui}ui_coin.png" alt="">${reward.coins}</span>`);
  if (reward.stamina) out.push(`<span class="kt-chip"><img src="${ASSETS.ui}ui_stamina.png" alt="">+${reward.stamina}</span>`);
  if (reward.item) out.push(`<span class="kt-chip"><img src="${ASSETS.ui}${ITEMS[reward.item].icon}.png" alt="">${ITEMS[reward.item].name}</span>`);
  return out.join('');
}

export function createQuestsScene({ gameState, adapter, onBack, onPlayDaily }) {
  const save = gameState.save;
  const rerender = () => scene.replaceWith(createQuestsScene({ gameState, adapter, onBack, onPlayDaily }));

  const scene = document.createElement('div');
  scene.id = 'kt-quests';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgDaily}")`;

  const taskCard = (t) => {
    const done = isDone(save, t), claimed = isClaimed(save, t), accepted = isAccepted(save, t.id);
    const desc = t.modifier ? `${t.desc} — ${dailyModifier().label}` : t.desc;
    const prog = t.kind === 'track'
      ? `<div class="kt-task-prog"><div class="bar"><span style="width:${Math.round((progressOf(save, t) / t.goal) * 100)}%"></span></div><div class="t">${progressOf(save, t)} / ${t.goal}</div></div>`
      : '';
    let btn;
    if (claimed) btn = `<button type="button" class="kt-task-go sec" disabled>Claimed</button>`;
    else if (done) btn = `<button type="button" class="kt-task-go" data-claim="${t.id}">Claim</button>`;
    else if (!accepted) btn = `<button type="button" class="kt-task-go" data-accept="${t.id}">Accept</button>`;
    else if (t.kind === 'level') btn = `<button type="button" class="kt-task-go" data-play="${t.id}">Play</button>`;
    else btn = `<button type="button" class="kt-task-go sec" disabled>Tracking…</button>`;
    return `<div class="kt-task${claimed ? ' is-claimed' : ''}">` +
      `<div class="kt-task-head"><div class="kt-task-ic"><img src="${ASSETS.ui}${ICONS[t.id]}.png" alt="" onerror="this.style.display='none'"></div>` +
      `<div class="kt-task-name"><b>${t.name}</b><span>${desc}</span></div></div>` +
      prog +
      `<div class="kt-task-foot"><div class="kt-rewards">${rewardChips(t.reward)}</div>${btn}</div></div>`;
  };

  const claimedCount = TASKS.filter((t) => isClaimed(save, t)).length;
  const bonusReady = allClaimed(save) && !bonusClaimed(save);
  const bonusBtn = bonusClaimed(save)
    ? `<button type="button" class="kt-task-go sec" disabled>Claimed</button>`
    : bonusReady
      ? `<button type="button" class="kt-task-go" data-claim="bonus">Claim</button>`
      : `<div class="kt-bonus-pips">${claimedCount} / 3</div>`;

  const miles = STREAK.map((s) =>
    `<div class="kt-mile${(save.streakDays || 0) >= s.d ? ' done' : ''}"><div class="d">${s.d}d</div>` +
    `<div class="r"><img src="${ASSETS.ui}ui_coin.png" alt="">${s.r}</div></div>`).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop("Knight's daily duty", 'Daily Quests', save.coins || 0) +
    `<div class="kt-sec-body">` +
      `<div class="kt-q-reset">Resets in <b>${resetCountdown()}</b> · no stamina cost</div>` +
      `<div class="kt-q-window">⏳ Bonus window <b id="kt-2h">${twoHourLeft()}</b></div>` +
      TASKS.map(taskCard).join('') +
      `<div class="kt-bonus">` +
        `<div class="kt-bonus-txt"><b>Clear all three</b><span>A hero's bonus awaits</span></div>` +
        `<div class="kt-bonus-side"><div class="kt-rewards">${rewardChips(BONUS.reward)}</div>${bonusBtn}</div>` +
      `</div>` +
      `<div class="kt-streak">` +
        `<div class="kt-streak-head"><b>Daily streak</b><span>Day ${save.streakDays || 0}</span></div>` +
        `<div class="kt-streak-row">${miles}</div>` +
      `</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('[data-accept]').forEach((b) =>
    b.addEventListener('click', () => { acceptTask(save, b.dataset.accept); persistSave(adapter, save); toast(scene, 'Quest accepted!'); rerender(); }));
  scene.querySelectorAll('[data-play]').forEach((b) =>
    b.addEventListener('click', () => onPlayDaily && onPlayDaily(b.dataset.play)));
  scene.querySelectorAll('[data-claim]').forEach((b) =>
    b.addEventListener('click', () => {
      const res = claim(save, b.dataset.claim);
      if (res.ok) {
        persistSave(adapter, save);
        fanfare(scene, { settings: save.settings, kind: 'small', originY: 40 });
        toast(scene, 'Reward claimed!');
        rerender();
      } else toast(scene, res.reason === 'incomplete' ? 'Finish the task first, knight.' : 'Already claimed.');
    }));

  // Live 2-hour bonus-window countdown; self-clears when the scene detaches.
  const cd = scene.querySelector('#kt-2h');
  const tick = setInterval(() => {
    if (!cd.isConnected) { clearInterval(tick); return; }
    cd.textContent = twoHourLeft();
  }, 1000);

  return scene;
}
