import { SAVE_KEY, SAVE_VERSION } from '../data/config.js';

export function defaultSave() {
  const now = Date.now();
  return {
    saveVersion: SAVE_VERSION,
    // v1 — progression
    currentStage: 1,
    currentLevel: 1,
    completedLevels: [],
    stars: {},
    displayName: '',
    settings: { sound: true, music: true, language: 'EN', fanfare: true },
    seenIntros: {},
    // v2 — economy
    coins: 0,
    inventory: {},          // itemId -> count (power-ups + consumables, D1/D10)
    adsWatchedToday: 0,
    adsDay: '',
    // v3 — stamina, story, streak, daily duty, records
    stamina: 5,
    staminaLastUpdated: now,
    staminaMaxSeen: now,    // clock-rollback guard
    storyProgress: {},      // "{stage}-{moment}" -> true (seen beats)
    streakDays: 0,
    lastLogin: '',
    dailyDuty: { day: '', progress: {}, claimed: {}, accepted: {}, dailyLevelDone: {} },
    talesHeard: {},         // bard tale id -> true (first-listen coin given)
    bestScores: {},         // levelId -> best score
    achievements: {},       // achievementId -> true (first-earned record)
    // v4 — social & meta
    rankHistory: {},        // scope -> best place (number), stage -> {n: place}
    mail: [],               // [{ id, type, title, body, date, read }]
    broadcast: { text: '', locked: false, changedOnce: false }, // rank 1-3 motivational line
    pendingFanfare: [],     // achievement ids awaiting a full-page celebration
  };
}

// Upgrade any older/partial save to the current schema. Add ordered steps as the
// schema grows; each step only fills what its version introduced. migrate() merges
// old saves over the new defaults — missing fields get defaults, never destructive.
export function migrate(raw) {
  const base = defaultSave();
  const merged = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) };
  merged.saveVersion = SAVE_VERSION;
  // defensive coercions
  if (!Array.isArray(merged.completedLevels)) merged.completedLevels = [];
  if (!Array.isArray(merged.mail)) merged.mail = [];
  if (!Array.isArray(merged.pendingFanfare)) merged.pendingFanfare = [];
  const obj = (k) => { if (!merged[k] || typeof merged[k] !== 'object') merged[k] = base[k]; };
  ['stars', 'seenIntros', 'inventory', 'storyProgress', 'talesHeard', 'bestScores', 'achievements', 'rankHistory'].forEach(obj);
  merged.settings = { ...base.settings, ...(merged.settings && typeof merged.settings === 'object' ? merged.settings : {}) };
  merged.dailyDuty = { ...base.dailyDuty, ...(merged.dailyDuty && typeof merged.dailyDuty === 'object' ? merged.dailyDuty : {}) };
  merged.broadcast = { ...base.broadcast, ...(merged.broadcast && typeof merged.broadcast === 'object' ? merged.broadcast : {}) };
  if (typeof merged.coins !== 'number') merged.coins = 0;
  if (typeof merged.stamina !== 'number') merged.stamina = 5;
  if (typeof merged.staminaLastUpdated !== 'number') merged.staminaLastUpdated = Date.now();
  if (typeof merged.staminaMaxSeen !== 'number') merged.staminaMaxSeen = merged.staminaLastUpdated;
  return merged;
}

export async function loadSave(adapter) {
  try {
    const raw = await adapter.get(SAVE_KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export async function persistSave(adapter, save) {
  const out = { ...save, saveVersion: SAVE_VERSION };
  await adapter.set(SAVE_KEY, JSON.stringify(out));
}
