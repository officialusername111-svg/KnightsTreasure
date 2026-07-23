// Knight ranks (D15): stage-based, then star-based mastery tiers. Derived purely
// from save progress — no stored rank field. Titles (streaks) are a separate system.

export function totalStars(save) {
  return Object.values(save.stars || {}).reduce((a, b) => a + (b || 0), 0);
}
export function stageComplete(save, n) {
  return (save.completedLevels || []).includes(`${n}-25`);
}

// Ordered low → high. Each rank has a threshold test against the save.
export const RANKS = [
  { id: 'apprentice',  name: 'Apprentice Knight',  badge: 'badge_apprentice',  metal: 'Iron',    reach: () => true },
  { id: 'basic',       name: 'Basic Knight',       badge: 'badge_basic',       metal: 'Bronze',  reach: (s) => stageComplete(s, 3) },
  { id: 'captain',     name: 'Captain Knight',     badge: 'badge_captain',     metal: 'Silver',  reach: (s) => stageComplete(s, 5) },
  { id: 'commander',   name: 'Commander Knight',   badge: 'badge_commander',   metal: 'Gold',    reach: (s) => stageComplete(s, 10) },
  { id: 'champion',    name: 'Champion Knight',    badge: 'badge_champion',    metal: 'Platinum', reach: (s) => totalStars(s) >= 500 },
  { id: 'paladin',     name: 'Paladin Knight',     badge: 'badge_paladin',     metal: 'Diamond', reach: (s) => totalStars(s) >= 625 },
  { id: 'grandmaster', name: 'Grandmaster Knight', badge: 'badge_grandmaster', metal: 'Mythril', reach: (s) => totalStars(s) >= 750 },
];

export function rankFor(save) {
  let r = RANKS[0];
  for (const rank of RANKS) if (rank.reach(save)) r = rank;
  return r;
}

// Progress toward the next rank, for a Glory-hall progress bar.
export function nextRankProgress(save) {
  const cur = rankFor(save);
  const idx = RANKS.indexOf(cur);
  const next = RANKS[idx + 1] || null;
  if (!next) return { current: cur, next: null, pct: 100, label: 'Highest rank reached' };
  // star-tier next vs stage-tier next
  if (next.id === 'champion' || next.id === 'paladin' || next.id === 'grandmaster') {
    const target = next.id === 'champion' ? 500 : next.id === 'paladin' ? 625 : 750;
    const have = totalStars(save);
    return { current: cur, next, pct: Math.min(100, Math.round((have / target) * 100)), label: `${have} / ${target}★` };
  }
  const targetStage = next.id === 'basic' ? 3 : next.id === 'captain' ? 5 : 10;
  const clearedStages = [...Array(10)].filter((_, i) => stageComplete(save, i + 1)).length;
  return { current: cur, next, pct: Math.min(100, Math.round((clearedStages / targetStage) * 100)), label: `Clear Stage ${targetStage}` };
}

// Daily-duty streak titles (separate from ranks).
export const TITLES = [
  { id: 'blazing',   name: 'Blazing Knight',   emblem: 'title_blazing',   days: 7 },
  { id: 'shadow',    name: 'Shadow Knight',    emblem: 'title_shadow',    days: 14 },
  { id: 'legendary', name: 'Legendary Knight', emblem: 'title_legendary', days: 30 },
];

export function titleFor(save) {
  const d = save.streakDays || 0;
  let t = null;
  for (const title of TITLES) if (d >= title.days) t = title;
  return t;
}
