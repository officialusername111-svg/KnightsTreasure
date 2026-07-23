import { describe, it, expect } from 'vitest';
import { escape } from '../../src/logic/actions/escape';
import { makeState } from './helpers';

describe('escape', () => {
  it('sets status to escaped and preserves gold', () => {
    const state = makeState({ gold: 123 });
    const result = escape(state);
    expect(result.status).toBe('escaped');
    expect(result.gold).toBe(123);
  });
});
