import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../www/js/data/config.js';

describe('config', () => {
  // Regression (T3): the Settings footer once hardcoded a version that drifted
  // from package.json. APP_VERSION is the single runtime source; keep it synced.
  it('APP_VERSION matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(APP_VERSION).toBe(pkg.version);
  });
});
