// Social/online seam (spec §3.2). A LOCAL SIMULATION with a Firebase-shaped async API:
// leaderboards, placements, comments, broadcast, and mail are derived from a deterministic
// bot roster + the player's real progress. Swapping in Firestore later = replacing these
// function bodies; signatures and the save shape stay identical.
import { totalStars, rankFor } from '../systems/ranks.js';
import { checkNewAchievements } from '../data/achievements.js';

// ---- deterministic PRNG + hashing (stable roster, varied windows) ----
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FIRST = ['Aldric','Brienne','Cedric','Dunmar','Edda','Falk','Gwen','Harald','Isolde','Joran',
  'Kaela','Lyle','Mira','Norn','Osric','Perrin','Quill','Rowan','Sable','Tamsin','Ulric','Vesna',
  'Wyot','Yorick','Zara','Bram','Corin','Della','Emeric','Fenn'];
const EPITHET = ['the Bold','of the Vale','Ironheart','the Swift','Stormborn','the Patient','Brightblade',
  'the Cunning','Ashwalker','the True','Dawnbringer','the Grim','Oakshield','the Fox','Emberhand'];
const TITLES = ['Apprentice Knight','Basic Knight','Captain Knight','Commander Knight','Champion Knight','Paladin Knight'];
const COMMENTS = [
  'Sharpen your memory, not just your sword.',
  'Every cleared board is a step toward the treasure.',
  'Patience wins the longest quests.',
  'I started where you stand. Keep going!',
  'Mind the decoys — they fooled me once too.',
  'Speed is good; accuracy is better.',
];

// Stable 60-bot roster (seed fixed).
const ROSTER = (() => {
  const r = rng(0xA17C);
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    name: `${FIRST[Math.floor(r() * FIRST.length)]} ${EPITHET[Math.floor(r() * EPITHET.length)]}`,
    title: TITLES[Math.floor(r() * TITLES.length)],
    base: Math.round(1500 + r() * 8000),
  }));
})();

const SCOPES = ['daily', 'weekly', 'monthly', 'allTime'];
function scopeSeed(scope, now = new Date()) {
  if (scope === 'daily') return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (scope === 'weekly') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return `w${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
  if (scope === 'monthly') return `m${now.getFullYear()}-${now.getMonth()}`;
  return 'all';
}
function botScore(bot, scope) {
  if (scope === 'allTime') return bot.base;
  const v = rng(hash(scopeSeed(scope) + ':' + bot.id))();
  return Math.max(200, Math.round(bot.base * (0.55 + v * 0.7))); // window perturbation
}

export function gloryScore(save) {
  return totalStars(save) * 12 + (save.completedLevels || []).length * 8 + (save.coins || 0);
}
function stageBest(save, stage) {
  return Object.entries(save.bestScores || {})
    .filter(([id]) => id.startsWith(`${stage}-`))
    .reduce((m, [, v]) => Math.max(m, v || 0), 0);
}

function board(rows, save) {
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((row, i) => { row.rank = i + 1; });
  return rows;
}
function withComments(rows, save) {
  for (const row of rows.slice(0, 3)) {
    row.comment = row.you ? (save.broadcast && save.broadcast.text) || '' : COMMENTS[hash(row.name) % COMMENTS.length];
  }
  return rows;
}

// ---- public API (Promises = Firebase-shaped) ----
export function getLeaderboard(scope, save) {
  const rows = ROSTER.map((b) => ({ name: b.name, title: b.title, score: botScore(b, scope) }));
  rows.push({ name: save.displayName || 'You', title: rankFor(save).name, score: gloryScore(save), you: true });
  return Promise.resolve(withComments(board(rows, save), save));
}
export function getStageLeaderboard(stage, save) {
  const rows = ROSTER.slice(0, 40).map((b) => ({ name: b.name, title: b.title, score: botScore(b, `stage${stage}`) }));
  rows.push({ name: save.displayName || 'You', title: rankFor(save).name, score: stageBest(save, stage), you: true });
  return Promise.resolve(board(rows, save));
}
export function getMyPlacement(scope, save) {
  const me = gloryScore(save);
  const rank = ROSTER.filter((b) => botScore(b, scope) > me).length + 1;
  return Promise.resolve({ rank, score: me });
}

export function submitBroadcast(save, text) {
  if (!save.broadcast) save.broadcast = { text: '', locked: false, changedOnce: false };
  if (save.broadcast.locked) return { ok: false, reason: 'locked' };
  save.broadcast.text = String(text || '').slice(0, 100);
  save.broadcast.locked = true;          // submitting your own line locks it
  return { ok: true };
}
// Declining the prompt assigns a random line, changeable exactly once.
export function assignRandomBroadcast(save) {
  if (!save.broadcast) save.broadcast = { text: '', locked: false, changedOnce: false };
  if (save.broadcast.locked) return { ok: false };
  if (save.broadcast.changedOnce && save.broadcast.text) return { ok: false };
  const pool = ['Onward, brave knight!', 'Glory favors the bold.', 'Remember the board, win the day.', 'May your matches be swift.'];
  save.broadcast.text = pool[hash(save.displayName + Date.now()) % pool.length];
  save.broadcast.changedOnce = true;
  return { ok: true };
}

export function getMail(save) { return save.mail || (save.mail = []); }

let mid = 0;
function pushMail(save, m) {
  if (!Array.isArray(save.mail)) save.mail = [];
  if (save.mail.some((x) => x.id === m.id)) return;          // dedupe by id
  save.mail.unshift({ ...m, read: false, date: Date.now() });
}

// Generate mail from local triggers + update rankHistory + queue achievement fanfares.
// Call on launch and after results. Mutates save (caller persists).
export function syncMail(save) {
  save.rankHistory = save.rankHistory || {};
  const today = scopeSeed('daily');
  // placements
  for (const scope of SCOPES) {
    const me = gloryScore(save);
    const rank = ROSTER.filter((b) => botScore(b, scope) > me).length + 1;
    const prevBest = save.rankHistory[scope];
    if (prevBest == null || rank < prevBest) {
      if (prevBest != null) {
        pushMail(save, { id: `rankup_${scope}_${rank}`, type: 'rank-up', title: 'You climbed the ranks!',
          body: `You reached #${rank} on the ${scope} leaderboard — your best yet.` });
      }
      save.rankHistory[scope] = rank;
    } else if (rank > prevBest + 8) {
      pushMail(save, { id: `rankdown_${scope}_${today}`, type: 'rank-down', title: 'Rivals are gaining',
        body: `You slipped to #${rank} on the ${scope} board. Win a few levels to climb back.` });
    }
  }
  // Invite the knight to pen their word for the realm (any player; open to write it).
  if (!(save.broadcast && (save.broadcast.text || save.broadcast.locked))) {
    pushMail(save, { id: 'broadcast_invite', type: 'comment', title: 'Leave a word for the realm',
      body: 'Pen a short line of encouragement, knight — other knights will see it beside your name on the boards. Open this to write and send it.', broadcastInvite: true });
  }
  // a daily motivational comment from a top bot
  pushMail(save, { id: `comment_${today}`, type: 'comment', title: 'A word from a champion',
    body: `"${COMMENTS[hash(today) % COMMENTS.length]}" — ${ROSTER[hash(today) % ROSTER.length].name}` });
  // achievements
  const fresh = checkNewAchievements(save);
  for (const a of fresh) {
    pushMail(save, { id: `ach_${a.id}`, type: 'achievement', title: `Achievement: ${a.name}`, body: a.desc });
    if (!save.pendingFanfare.includes(a.id)) save.pendingFanfare.push(a.id);
  }
  return { newAchievements: fresh };
}
