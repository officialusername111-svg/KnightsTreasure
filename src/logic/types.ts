export type Role = 'weapon' | 'food' | 'hoard' | 'emblem' | 'light' | 'hazard';

export type WeaponKind = 'dagger' | 'sword' | 'axe' | 'bow';

export interface Coord {
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  role: Role;
  kind: string;
  faceDown: boolean;
  value?: number;
}

export interface Meters {
  rations: number;
  greed: number;
  valor: number;
  /** Extension beyond the spec's literal {rations,greed,valor}: a stored flag is simpler
   * to test/render than recomputing `rations <= 0` everywhere. See pivot decisions doc D5. */
  exhausted: boolean;
}

export interface Guardian {
  hp: number;
  /** Extension: lets the HUD render an hp bar without duplicating the balance formula
   * that produced this floor's starting hp. See pivot decisions doc D6. */
  maxHp: number;
  armor: number;
  rage: number;
  turnCounter: number;
}

export type RunStatus = 'playing' | 'escaped' | 'dead';

export interface GameState {
  board: (Tile | null)[][];
  torchlight: boolean[][];
  stratum: number;
  floor: number;

  banner: string;
  bannerCharge: number;

  meters: Meters;
  guardian: Guardian;

  gold: number;
  status: RunStatus;

  /** Extension: keeps swap()/resolveMatches()/descend() pure — randomness (axe shatter
   * target, board generation) is derived from this seed and the seed is advanced and
   * returned as part of the new state, instead of relying on hidden global RNG state.
   * See pivot decisions doc D7. */
  rngSeed: number;
}
