import { SAVE_KEY, SAVE_VERSION } from '../data/config.js';

export function defaultSave() {
  return {
    saveVersion: SAVE_VERSION,
    currentStage: 1,
    currentLevel: 1,
    completedLevels: [],
    stars: {},
    displayName: '',
    settings: { sound: true, music: true, language: 'EN' },
    seenIntros: {},
  };
}

// Upgrade any older/partial save to the current schema. Add ordered steps as
// the schema grows; each step only fills what its version introduced.
export function migrate(raw) {
  const base = defaultSave();
  const merged = { ...base, ...(raw && typeof raw === 'object' ? raw : {}) };
  merged.saveVersion = SAVE_VERSION;
  // defensive coercions
  if (!Array.isArray(merged.completedLevels)) merged.completedLevels = [];
  if (!merged.stars || typeof merged.stars !== 'object') merged.stars = {};
  // deep-merge settings so a partial saved object keeps the new defaults
  merged.settings = { ...base.settings, ...(merged.settings && typeof merged.settings === 'object' ? merged.settings : {}) };
  if (!merged.seenIntros || typeof merged.seenIntros !== 'object') merged.seenIntros = {};
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
