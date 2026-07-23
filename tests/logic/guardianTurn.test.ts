import { describe, it, expect } from 'vitest';
import { guardianTurn } from '../../src/logic/actions/guardianTurn';
import { makeState } from './helpers';

describe('guardianTurn (Phase 3)', () => {
  it('is a no-op once the run has already ended', () => {
    const state = makeState({ status: 'dead' });
    expect(guardianTurn(state)).toBe(state);
  });

  it('auto-escapes with loot when the guardian is defeated, without attacking', () => {
    const state = makeState({
      guardian: { hp: 0, maxHp: 300, armor: 0, rage: 0, turnCounter: 3 },
      knight: { hp: 100, maxHp: 100 },
      gold: 250,
    });

    const next = guardianTurn(state);

    expect(next.status).toBe('escaped');
    expect(next.gold).toBe(250);
    expect(next.knight.hp).toBe(100);
  });

  it('derives rage/armor from greed without attacking below the turn threshold', () => {
    const state = makeState({
      meters: { rations: 5, greed: 100, valor: 0, exhausted: false },
      guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 2 },
    });

    const next = guardianTurn(state);

    expect(next.guardian.rage).toBe(4); // floor(100/25)
    expect(next.guardian.armor).toBe(8); // 4 * 2
    expect(next.guardian.turnCounter).toBe(2);
    expect(next.knight.hp).toBe(100);
  });

  it('clamps rage and armor at their caps for very high greed', () => {
    const state = makeState({
      meters: { rations: 5, greed: 10000, valor: 0, exhausted: false },
    });

    const next = guardianTurn(state);

    expect(next.guardian.rage).toBe(10);
    expect(next.guardian.armor).toBe(20);
  });

  it('counter-attacks once turnCounter reaches the attack interval, carrying the remainder', () => {
    const state = makeState({
      meters: { rations: 5, greed: 0, valor: 0, exhausted: false },
      guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 5 },
      knight: { hp: 100, maxHp: 100 },
    });

    const next = guardianTurn(state);

    expect(next.guardian.turnCounter).toBe(1); // 5 - attackInterval(4)
    expect(next.knight.hp).toBe(94); // 100 - baseCounterDamage(6)
  });

  it('scales counter-attack damage with rage', () => {
    const state = makeState({
      meters: { rations: 5, greed: 100, valor: 0, exhausted: false }, // rage 4
      guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 4 },
      knight: { hp: 100, maxHp: 100 },
    });

    const next = guardianTurn(state);

    // (6 + 4*2) = 14
    expect(next.knight.hp).toBe(86);
  });

  it('multiplies counter-attack damage by 1.5x while exhausted', () => {
    const state = makeState({
      meters: { rations: 0, greed: 0, valor: 0, exhausted: true },
      guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 4 },
      knight: { hp: 100, maxHp: 100 },
    });

    const next = guardianTurn(state);

    // round(6 * 1.5) = 9
    expect(next.knight.hp).toBe(91);
  });

  it('sets status to dead and clamps hp at 0 when the counter-attack is lethal', () => {
    const state = makeState({
      meters: { rations: 5, greed: 0, valor: 0, exhausted: false },
      guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 4 },
      knight: { hp: 4, maxHp: 100 },
    });

    const next = guardianTurn(state);

    expect(next.knight.hp).toBe(0);
    expect(next.status).toBe('dead');
  });
});
