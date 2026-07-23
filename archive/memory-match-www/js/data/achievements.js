import { totalStars, stageComplete, rankFor } from '../systems/ranks.js';
import { STAGE_NAMES } from './config.js';

// Achievement registry (Glory trophy hall). Each: id, name, desc, group, test(save) -> bool,
// and optional progress(save) -> {have, need} for count-style trophies. Earned-state is
// derived from test(); save.achievements records the first-earned moment (mail/fanfare trigger).
const STAGE_CONQUESTS = Object.keys(STAGE_NAMES).map((k) => {
  const n = +k;
  return {
    id: `stage_${n}`, group: 'Stage Conquests',
    name: `Conqueror of Stage ${n}`, desc: `First to clear ${STAGE_NAMES[n]}`,
    test: (s) => stageComplete(s, n),
  };
});

export const ACHIEVEMENTS = [
  // Progress
  { id: 'first_steps', group: 'Progress', name: 'First Steps', desc: 'Clear your first level',
    test: (s) => (s.completedLevels || []).includes('1-1') },
  { id: 'into_woods', group: 'Progress', name: 'Into the Woods', desc: 'Clear Stage 1',
    test: (s) => stageComplete(s, 1) },
  { id: 'halfway', group: 'Progress', name: 'Halfway Hero', desc: 'Clear 5 stages',
    test: (s) => [...Array(10)].filter((_, i) => stageComplete(s, i + 1)).length >= 5,
    progress: (s) => ({ have: [...Array(10)].filter((_, i) => stageComplete(s, i + 1)).length, need: 5 }) },
  { id: 'realm_saved', group: 'Progress', name: 'Realm Saved', desc: 'Clear all 10 stages',
    test: (s) => stageComplete(s, 10),
    progress: (s) => ({ have: [...Array(10)].filter((_, i) => stageComplete(s, i + 1)).length, need: 10 }) },
  // Mastery
  { id: 'star_50', group: 'Mastery', name: 'Star Gatherer', desc: 'Earn 50 stars',
    test: (s) => totalStars(s) >= 50, progress: (s) => ({ have: totalStars(s), need: 50 }) },
  { id: 'star_250', group: 'Mastery', name: 'Constellation', desc: 'Earn 250 stars',
    test: (s) => totalStars(s) >= 250, progress: (s) => ({ have: totalStars(s), need: 250 }) },
  { id: 'flawless', group: 'Mastery', name: 'Flawless', desc: '3-star any level',
    test: (s) => Object.values(s.stars || {}).some((v) => v === 3) },
  { id: 'commander', group: 'Mastery', name: 'Commander', desc: 'Reach Commander rank',
    test: (s) => ['commander', 'champion', 'paladin', 'grandmaster'].includes(rankFor(s).id) },
  { id: 'grandmaster', group: 'Mastery', name: 'Grandmaster', desc: '3-star every level (750★)',
    test: (s) => totalStars(s) >= 750, progress: (s) => ({ have: totalStars(s), need: 750 }) },
  // Economy / social
  { id: 'coin_500', group: 'Fortune', name: 'Coin Hoarder', desc: 'Hold 500 coins',
    test: (s) => (s.coins || 0) >= 500, progress: (s) => ({ have: s.coins || 0, need: 500 }) },
  { id: 'top3', group: 'Renown', name: 'Among the Greats', desc: 'Place top-3 in any leaderboard',
    test: (s) => Object.values(s.rankHistory || {}).some((v) => (typeof v === 'number' ? v <= 3 : false)) },
  { id: 'broadcaster', group: 'Renown', name: 'Voice of the Realm', desc: 'Leave a motivational message',
    test: (s) => !!(s.broadcast && s.broadcast.text) },
  ...STAGE_CONQUESTS,
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function earned(save, a) { return a.test(save); }

// Compare derived earned-set to recorded; return newly-earned achievement ids and record them.
// Drives mail + post-sync fanfare. Returns [{id, name, desc}].
export function checkNewAchievements(save) {
  save.achievements = save.achievements || {};
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (a.test(save) && !save.achievements[a.id]) {
      save.achievements[a.id] = true;
      fresh.push({ id: a.id, name: a.name, desc: a.desc });
    }
  }
  return fresh;
}
