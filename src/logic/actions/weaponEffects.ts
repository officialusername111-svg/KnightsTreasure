import type { GameState, Coord, Tile, WeaponKind } from '../types';
import { WEAPON_BALANCE } from '../data/balance';
import { pick, type Rng } from '../rng';

const NEIGHBOR_DIRS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function applyWeaponMatch(
  state: GameState,
  kind: WeaponKind,
  matchedCells: Coord[],
  board: (Tile | null)[][],
  rng: Rng,
): GameState {
  const def = WEAPON_BALANCE[kind];
  const matchSize = matchedCells.length;
  const bonus = def.bonusPerExtraTile * Math.max(0, matchSize - 3);
  const perHit = def.damagePerHit + bonus;
  const totalDamage = perHit * def.hits;
  const effectiveDamage = def.ignoresArmor ? totalDamage : Math.max(0, totalDamage - state.guardian.armor);
  const hp = Math.max(0, state.guardian.hp - effectiveDamage);
  const turnCounter = state.guardian.turnCounter + def.turnCost;

  if (def.shattersAdjacent) {
    const target = pickAxeShatterTarget(board, matchedCells, rng);
    if (target) board[target.row][target.col] = null;
  }

  return {
    ...state,
    guardian: { ...state.guardian, hp, turnCounter },
  };
}

function pickAxeShatterTarget(board: (Tile | null)[][], matchedCells: Coord[], rng: Rng): Coord | null {
  const matchedKeys = new Set(matchedCells.map((c) => `${c.row},${c.col}`));
  const seen = new Set<string>();
  const candidates: Coord[] = [];

  for (const cell of matchedCells) {
    for (const dir of NEIGHBOR_DIRS) {
      const row = cell.row + dir.row;
      const col = cell.col + dir.col;
      if (row < 0 || col < 0 || row >= board.length || col >= (board[0]?.length ?? 0)) continue;
      const key = `${row},${col}`;
      if (matchedKeys.has(key) || seen.has(key)) continue;
      if (board[row][col] === null) continue;
      seen.add(key);
      candidates.push({ row, col });
    }
  }

  if (candidates.length === 0) return null;
  return pick(rng, candidates);
}
