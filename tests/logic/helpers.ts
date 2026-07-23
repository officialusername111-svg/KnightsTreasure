import type { Tile, GameState, Role } from '../../src/logic/types';

let idCounter = 0;

export function makeTile(role: Role, kind: string, value?: number): Tile {
  idCounter += 1;
  return { id: `t${idCounter}`, role, kind, faceDown: false, ...(value !== undefined ? { value } : {}) };
}

export function makeEmptyBoard(rows: number, cols: number): (Tile | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  const board = overrides.board ?? makeEmptyBoard(8, 8);
  return {
    board,
    torchlight: board.map((row) => row.map(() => true)),
    stratum: 0,
    floor: 1,
    banner: '',
    bannerCharge: 0,
    meters: { rations: 5, greed: 0, valor: 0, exhausted: false },
    guardian: { hp: 300, maxHp: 300, armor: 0, rage: 0, turnCounter: 0 },
    knight: { hp: 100, maxHp: 100 },
    gold: 0,
    status: 'playing',
    rngSeed: 42,
    ...overrides,
  };
}
