import type { Coord, GameState } from '../logic/types';
import { swap } from '../logic/actions/swap';
import { guardianTurn } from '../logic/actions/guardianTurn';
import { descend } from '../logic/actions/descend';
import { createInitialState } from '../logic/state';
import { isGuardianDefeated, isFloorFullyCleared } from '../logic/selectors';
import type { BoardView } from '../render/BoardView';
import type { HudView } from '../render/HudView';

export class GameController {
  private state: GameState;
  private width = 0;
  private height = 0;

  constructor(
    private boardView: BoardView,
    private hudView: HudView,
    seed: number,
  ) {
    this.state = createInitialState(seed);
  }

  get currentState(): GameState {
    return this.state;
  }

  start(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.render();
  }

  handleResize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.render();
  }

  handleSwapIntent = (a: Coord, b: Coord): void => {
    let next = swap(this.state, a, b);
    if (next === this.state) return;

    next = guardianTurn(next);

    if (isFloorFullyCleared(next)) {
      next = descend(next);
    }

    this.state = next;
    this.render();
  };

  private render(): void {
    // Re-resize on every render (not just start/window-resize): descend() can change
    // the board's row count, and BoardView needs the current dimensions to lay sprites
    // out correctly on the new floor.
    const cols = this.state.board[0]?.length ?? 0;
    const rows = this.state.board.length;
    this.boardView.resize(this.width, this.height, cols, rows);
    this.boardView.sync(this.state);
    this.hudView.sync(this.state, isGuardianDefeated(this.state));
  }
}
