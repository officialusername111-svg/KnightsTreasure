import { ASSETS } from '../data/config.js';
import { ITEMS } from '../data/items.js';
import { persistSave } from '../core/save.js';
import { TASKS, BONUS, progressOf, isDone, isClaimed, allClaimed, bonusClaimed, claim } from '../systems/dailyDuty.js';
import { sectionTop, toast } from './modal.js';

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

export function createQuestsScene({ gameState, adapter, onBack }) {
  const save = gameState.save;

  const scene = document.createElement('div');
  scene.id = 'kt-quests';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgDaily}")`;

  const taskCard = (t) => {
    const val = progressOf(save, t), done = isDone(save, t), claimed = isClaimed(save, t);
    const prog = t.goal > 1
      ? `<div class="kt-task-prog"><div class="bar"><span style="width:${Math.round((val / t.goal) * 100)}%"></span></div><div class="t">${val} / ${t.goal}</div></div>`
      : '';
    const btn = claimed
      ? `<button type="button" class="kt-task-go sec" disabled>Claimed</button>`
      : done
        ? `<button type="button" class="kt-task-go" data-claim="${t.id}">Claim</button>`
        : `<button type="button" class="kt-task-go sec" data-play="1">Play</button>`;
    return `<div class="kt-task${claimed ? ' is-claimed' : ''}">` +
      `<div class="kt-task-head"><div class="kt-task-ic"><img src="${ASSETS.ui}${ICONS[t.id]}.png" alt="" onerror="this.style.display='none'"></div>` +
      `<div class="kt-task-name"><b>${t.name}</b><span>${t.desc}</span></div></div>` +
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
      `<div class="kt-q-reset">Resets in <b>${resetCountdown()}</b></div>` +
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
  scene.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', onBack));
  scene.querySelectorAll('[data-claim]').forEach((b) =>
    b.addEventListener('click', () => {
      const res = claim(save, b.dataset.claim);
      if (res.ok) {
        persistSave(adapter, save);
        toast(scene, 'Reward claimed!');
        scene.replaceWith(createQuestsScene({ gameState, adapter, onBack }));
      } else {
        toast(scene, res.reason === 'incomplete' ? 'Finish the task first, knight.' : 'Already claimed.');
      }
    })
  );

  return scene;
}
