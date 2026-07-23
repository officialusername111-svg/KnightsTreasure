import { Container, Assets } from 'pixi.js';
import type { Coord, GameState } from '../logic/types';
import { isAdjacent } from '../logic/board';
import { TileSprite } from './TileSprite';
import { TILE_ASSET_MANIFEST } from './assetManifest';

export interface BoardViewOptions {
  onSwapIntent: (a: Coord, b: Coord) => void;
}

const NEIGHBOR_DIRS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export class BoardView {
  readonly container = new Container();

  private sprites = new Map<string, TileSprite>();
  private selected: Coord | null = null;
  private cols = 0;
  private rows = 0;
  private cellSize = 0;

  constructor(private options: BoardViewOptions) {}

  async preload(): Promise<void> {
    await Assets.load(Object.values(TILE_ASSET_MANIFEST));
  }

  resize(width: number, height: number, cols: number, rows: number): void {
    const dimensionsChanged = this.cols !== cols || this.rows !== rows;
    const newCellSize = cols > 0 && rows > 0 ? Math.floor(Math.min(width / cols, height / rows)) : 0;
    const sizeChanged = newCellSize !== this.cellSize;

    this.cols = cols;
    this.rows = rows;
    this.cellSize = newCellSize;
    this.container.x = (width - this.cellSize * cols) / 2;
    this.container.y = (height - this.cellSize * rows) / 2;

    if (dimensionsChanged || sizeChanged) {
      for (const sprite of this.sprites.values()) sprite.destroy();
      this.sprites.clear();
    }
  }

  sync(state: GameState): void {
    const seen = new Set<string>();

    for (let r = 0; r < state.board.length; r++) {
      for (let c = 0; c < state.board[r].length; c++) {
        const key = `${r},${c}`;
        const tile = state.board[r][c];

        if (!tile) {
          const stale = this.sprites.get(key);
          if (stale) {
            stale.destroy();
            this.sprites.delete(key);
          }
          continue;
        }

        seen.add(key);
        const texture = Assets.get(TILE_ASSET_MANIFEST[tile.kind]);
        let sprite = this.sprites.get(key);

        if (!sprite) {
          sprite = new TileSprite(texture);
          sprite.x = c * this.cellSize;
          sprite.y = r * this.cellSize;
          sprite.layout(this.cellSize);
          const coord: Coord = { row: r, col: c };
          sprite.on('pointertap', () => this.handleTap(coord));
          this.container.addChild(sprite);
          this.sprites.set(key, sprite);
        } else {
          sprite.setTexture(texture);
        }
      }
    }

    for (const [key, sprite] of this.sprites) {
      if (!seen.has(key)) {
        sprite.destroy();
        this.sprites.delete(key);
      }
    }

    this.refreshHighlights();
  }

  private handleTap(coord: Coord): void {
    if (!this.selected) {
      this.selected = coord;
    } else if (this.selected.row === coord.row && this.selected.col === coord.col) {
      this.selected = null;
    } else if (isAdjacent(this.selected, coord)) {
      const a = this.selected;
      this.selected = null;
      this.refreshHighlights();
      this.options.onSwapIntent(a, coord);
      return;
    } else {
      this.selected = coord;
    }
    this.refreshHighlights();
  }

  private refreshHighlights(): void {
    for (const sprite of this.sprites.values()) {
      sprite.setHighlight(this.cellSize, 'none');
    }
    if (!this.selected) return;

    const selKey = `${this.selected.row},${this.selected.col}`;
    this.sprites.get(selKey)?.setHighlight(this.cellSize, 'selected');

    for (const dir of NEIGHBOR_DIRS) {
      const key = `${this.selected.row + dir.row},${this.selected.col + dir.col}`;
      this.sprites.get(key)?.setHighlight(this.cellSize, 'target');
    }
  }
}
