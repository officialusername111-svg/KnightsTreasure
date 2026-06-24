// Knight's Daily Duty (GDD §Knight's Daily Duty). Three tasks reset at local midnight;
// progress is tracked from in-game wins; rewards are claimed once each, plus an all-3 bonus.
import { earn, EARN_MULTIPLIER } from './economy.js';
import { restore } from './stamina.js';

// puzzle & challenge are PLAYABLE: accept → play a dedicated daily level → it completes.
// guild is passive (tracked from normal wins).
export const TASKS = [
  { id: 'puzzle',    name: 'Daily Puzzle',    desc: "Today's hand-crafted board",  kind: 'level', goal: 1, reward: { coins: 100, item: 'raven' } },
  { id: 'challenge', name: 'Daily Challenge', desc: "A twist on the rules",         kind: 'level', goal: 1, modifier: true, reward: { coins: 75, stamina: 1 } },
  { id: 'guild',     name: 'Guild Quest',     desc: 'Win 3 levels today',           kind: 'track', track: 'levelsWon', goal: 3, reward: { coins: 150, item: 'eagleEye' } },
];
export const BONUS = { id: 'bonus', reward: { coins: 200, item: 'knightsBrew' } };

// Rotating daily modifier (challenge twist), chosen by the date so it's the same all day.
export const MODIFIERS = [
  { id: 'no_powerups', label: 'No power-ups' },
  { id: 'no_mistakes', label: 'No mistakes allowed' },
  { id: 'speed',       label: 'Speed run (less time)' },
  { id: 'fast_flip',   label: 'Tiles hide faster' },
];
export function dailyModifier(now = new Date()) {
  const dayNum = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return MODIFIERS[dayNum % MODIFIERS.length];
}

export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// Reset progress/claims when the day rolls over (also bumps streak if the prior day's
// duty was fully completed before reset).
export function ensureDay(save, now = new Date()) {
  const dd = save.dailyDuty || (save.dailyDuty = { day: '', progress: {}, claimed: {}, accepted: {}, dailyLevelDone: {} });
  if (!dd.accepted) dd.accepted = {};
  if (!dd.dailyLevelDone) dd.dailyLevelDone = {};
  const today = todayStr(now);
  if (dd.day !== today) {
    if (dd.day && dd.claimed && dd.claimed.bonus) save.streakDays = (save.streakDays || 0) + 1;
    else if (dd.day) save.streakDays = 0;
    dd.day = today;
    dd.progress = {};
    dd.claimed = {};
    dd.accepted = {};
    dd.dailyLevelDone = {};
  }
  return dd;
}

export function progressOf(save, task) {
  const dd = ensureDay(save);
  if (task.kind === 'level') return dd.dailyLevelDone[task.id] ? 1 : 0;
  return Math.min(task.goal, dd.progress[task.track] || 0);
}
export function isDone(save, task) {
  const dd = ensureDay(save);
  if (task.kind === 'level') return !!dd.dailyLevelDone[task.id];
  return progressOf(save, task) >= task.goal;
}
export function isAccepted(save, id) { return !!ensureDay(save).accepted[id]; }
export function acceptTask(save, id) { ensureDay(save).accepted[id] = true; }
export function markDailyLevelDone(save, id) { ensureDay(save).dailyLevelDone[id] = true; }
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
  if (reward.coins) earn(save, Math.round(reward.coins * EARN_MULTIPLIER));
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
