// Knight's Daily Duty (GDD §Knight's Daily Duty). Three tasks reset at local midnight;
// progress is tracked from in-game wins; rewards are claimed once each, plus an all-3 bonus.
import { earn } from './economy.js';
import { restore } from './stamina.js';

export const TASKS = [
  { id: 'puzzle',    name: 'Daily Puzzle',    desc: 'Clear any level today',        track: 'anyWin',       goal: 1, reward: { coins: 100, item: 'raven' } },
  { id: 'challenge', name: 'Daily Challenge', desc: 'Win a level with no mistakes',  track: 'noMistakeWin', goal: 1, reward: { coins: 75,  stamina: 1 } },
  { id: 'guild',     name: 'Guild Quest',     desc: 'Win 3 levels today',           track: 'levelsWon',    goal: 3, reward: { coins: 150, item: 'eagleEye' } },
];
export const BONUS = { id: 'bonus', reward: { coins: 200, item: 'knightsBrew' } };

export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Reset progress/claims when the day rolls over (also bumps streak if the prior day's
// duty was fully completed before reset).
export function ensureDay(save, now = new Date()) {
  const dd = save.dailyDuty || (save.dailyDuty = { day: '', progress: {}, claimed: {} });
  const today = todayStr(now);
  if (dd.day !== today) {
    if (dd.day && dd.claimed && dd.claimed.bonus) save.streakDays = (save.streakDays || 0) + 1;
    else if (dd.day) save.streakDays = 0;
    dd.day = today;
    dd.progress = {};
    dd.claimed = {};
  }
  return dd;
}

export function progressOf(save, task) {
  const dd = ensureDay(save);
  return Math.min(task.goal, dd.progress[task.track] || 0);
}
export function isDone(save, task) { return progressOf(save, task) >= task.goal; }
export function isClaimed(save, task) { return !!ensureDay(save).claimed[task.id]; }
export function allClaimed(save) { return TASKS.every((t) => isClaimed(save, t)); }
export function bonusClaimed(save) { return !!ensureDay(save).claimed.bonus; }

// Record a level win toward the day's tasks. Call once per win.
export function recordWin(save, { mistakes = 0 } = {}) {
  const dd = ensureDay(save);
  dd.progress.anyWin = 1;
  dd.progress.levelsWon = (dd.progress.levelsWon || 0) + 1;
  if (mistakes === 0) dd.progress.noMistakeWin = 1;
}

function grant(save, reward) {
  if (reward.coins) earn(save, reward.coins);
  if (reward.stamina) restore(save, reward.stamina);
  if (reward.item) save.inventory[reward.item] = (save.inventory[reward.item] || 0) + 1;
}

// Returns { ok, reason? }. Mutates save (caller persists).
export function claim(save, taskId) {
  const dd = ensureDay(save);
  if (taskId === 'bonus') {
    if (!allClaimed(save)) return { ok: false, reason: 'incomplete' };
    if (dd.claimed.bonus) return { ok: false, reason: 'claimed' };
    grant(save, BONUS.reward);
    dd.claimed.bonus = true;
    return { ok: true };
  }
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return { ok: false, reason: 'unknown' };
  if (dd.claimed[taskId]) return { ok: false, reason: 'claimed' };
  if (!isDone(save, task)) return { ok: false, reason: 'incomplete' };
  grant(save, task.reward);
  dd.claimed[taskId] = true;
  return { ok: true };
}
