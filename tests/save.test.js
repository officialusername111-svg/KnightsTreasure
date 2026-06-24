import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMemoryAdapter } from './helpers/memoryAdapter.js';
import { defaultSave, loadSave, persistSave, migrate } from '../www/js/core/save.js';
import { SAVE_KEY, SAVE_VERSION } from '../www/js/data/config.js';

describe('save', () => {
  // defaultSave() stamps staminaLastUpdated/staminaMaxSeen with Date.now(). Tests that
  // compare one defaultSave() snapshot against another (loadSave fallbacks) flake when the
  // two calls straddle a millisecond boundary — freeze the clock so they're always equal.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns default save when storage empty', async () => {
    const save = await loadSave(createMemoryAdapter());
    expect(save).toEqual(defaultSave());
    expect(save.saveVersion).toBe(SAVE_VERSION);
  });

  it('round-trips a save', async () => {
    const adapter = createMemoryAdapter();
    const save = defaultSave();
    save.currentLevel = 7;
    save.completedLevels = ['1-1', '1-2'];
    save.stars = { '1-1': 3 };
    await persistSave(adapter, save);
    const loaded = await loadSave(adapter);
    expect(loaded.currentLevel).toBe(7);
    expect(loaded.completedLevels).toEqual(['1-1', '1-2']);
    expect(loaded.stars['1-1']).toBe(3);
  });

  it('returns default on corrupt JSON', async () => {
    const adapter = createMemoryAdapter({ [SAVE_KEY]: 'not-json{' });
    const save = await loadSave(adapter);
    expect(save).toEqual(defaultSave());
  });

  it('migrate fills missing fields from an older save', () => {
    const migrated = migrate({ saveVersion: 0, currentLevel: 4 });
    expect(migrated.saveVersion).toBe(SAVE_VERSION);
    expect(migrated.currentLevel).toBe(4);
    expect(migrated.currentStage).toBe(1);
    expect(Array.isArray(migrated.completedLevels)).toBe(true);
    expect(migrated.stars).toEqual({});
  });
});
