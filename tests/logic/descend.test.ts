import { describe, it, expect } from 'vitest';
import { descend } from '../../src/logic/actions/descend';
import { bandForRow, isBoardEmpty } from '../../src/logic/board';
import { HOARD_VAULT } from '../../src/logic/data/tileTaxonomy';
import { makeState } from './helpers';

describe('descend', () => {
  it('produces a fresh non-empty board, advances floor, and resets stratum to 0', () => {
    const state = makeState({ floor: 1 });
    const result = descend(state);
    expect(result.floor).toBe(2);
    expect(result.stratum).toBe(0);
    expect(isBoardEmpty(result.board)).toBe(false);
  });

  it('lights only the surface band on the new floor, matching the new board tiles\' faceDown', () => {
    const state = makeState({ floor: 1 });
    const result = descend(state);
    const rows = result.board.length;

    for (let r = 0; r < rows; r++) {
      const lit = bandForRow(r, rows) === 'surface';
      expect(result.torchlight[r].every(Boolean)).toBe(lit);
      for (const tile of result.board[r]) {
        expect(tile?.faceDown).toBe(!lit);
      }
    }
  });

  it("the new floor's vault band never contains a food tile and only rare hoard kinds", () => {
    const state = makeState({ floor: 1 });
    const result = descend(state);
    const rows = result.board.length;

    for (let r = 0; r < rows; r++) {
      if (bandForRow(r, rows) !== 'vault') continue;
      for (const tile of result.board[r]) {
        if (!tile) continue;
        expect(tile.role).not.toBe('food');
        if (tile.role === 'hoard') {
          expect((HOARD_VAULT as readonly string[]).includes(tile.kind)).toBe(true);
        }
      }
    }
  });

  it("resets the guardian's hp/maxHp but leaves rations untouched", () => {
    const state = makeState({
      floor: 1,
      guardian: { hp: 5, maxHp: 300, armor: 0, rage: 0, turnCounter: 9 },
      meters: { rations: 7, greed: 0, valor: 0, exhausted: false },
    });
    const result = descend(state);
    expect(result.guardian.hp).toBe(result.guardian.maxHp);
    expect(result.guardian.hp).not.toBe(5);
    expect(result.guardian.turnCounter).toBe(0);
    expect(result.meters.rations).toBe(7);
  });
});
