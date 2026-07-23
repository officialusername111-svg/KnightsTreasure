import type { Tile, Role } from './types';
import type { Rng } from './rng';
import { pick } from './rng';
import { bandForRow } from './board';
import { WEAPON_KINDS, FOOD_KINDS, EMBLEM_KINDS, LIGHT_KINDS, HOARD_VALUES } from './data/tileTaxonomy';
import { BAND_POOLS, type StratumBand } from './data/strata';
import { BOARD_BALANCE } from './data/balance';

const MAX_REROLLS = 12;

export function generateBoard(cols: number, rows: number, floor: number, rng: Rng): (Tile | null)[][] {
  const board: (Tile | null)[][] = Array.from({ length: rows }, () => new Array<Tile | null>(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    const band = bandForRow(r, rows);
    for (let c = 0; c < cols; c++) {
      let tile = createRandomTile(band, floor, r, c, rng);
      let attempts = 0;
      while (attempts < MAX_REROLLS && wouldCreateMatch(board, r, c, tile.kind)) {
        tile = createRandomTile(band, floor, r, c, rng);
        attempts++;
      }
      board[r][c] = tile;
    }
  }

  return board;
}

export function wouldCreateMatch(board: (Tile | null)[][], r: number, c: number, kind: string): boolean {
  if (c >= 2 && board[r][c - 1]?.kind === kind && board[r][c - 2]?.kind === kind) return true;
  if (r >= 2 && board[r - 1][c]?.kind === kind && board[r - 2][c]?.kind === kind) return true;
  return false;
}

function weightedRoles(band: StratumBand): Role[] {
  const pool = BAND_POOLS[band];
  const roles: Role[] = [];
  for (let i = 0; i < pool.weaponWeight; i++) roles.push('weapon');
  for (let i = 0; i < pool.foodWeight; i++) roles.push('food');
  for (let i = 0; i < pool.hoardWeight; i++) roles.push('hoard');
  for (let i = 0; i < pool.emblemWeight; i++) roles.push('emblem');
  for (let i = 0; i < pool.lightWeight; i++) roles.push('light');
  return roles;
}

function hoardValueForFloor(kind: string, floor: number): number {
  const base = HOARD_VALUES[kind] ?? 0;
  return Math.round(base * (1 + BOARD_BALANCE.hoardValueMultiplierPerFloor * (floor - 1)));
}

function createRandomTile(band: StratumBand, floor: number, r: number, c: number, rng: Rng): Tile {
  const role = pick(rng, weightedRoles(band));
  let kind: string;
  let value: number | undefined;

  switch (role) {
    case 'weapon':
      kind = pick(rng, WEAPON_KINDS);
      break;
    case 'food':
      kind = pick(rng, FOOD_KINDS);
      break;
    case 'hoard':
      kind = pick(rng, BAND_POOLS[band].hoardKinds);
      value = hoardValueForFloor(kind, floor);
      break;
    case 'emblem':
      kind = pick(rng, EMBLEM_KINDS);
      break;
    default:
      kind = pick(rng, LIGHT_KINDS);
      break;
  }

  return {
    id: `f${floor}-${r}-${c}`,
    role,
    kind,
    // Surface starts lit, Relic/Vault start fogged — D21.
    faceDown: band !== 'surface',
    ...(value !== undefined ? { value } : {}),
  };
}
