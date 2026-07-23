import type { GameState, MatchEvent } from '../../logic/types';
import type { BoardView } from '../../render/BoardView';
import { CoachMarkView, type CoachMarkRect } from '../../render/CoachMarkView';
import type { TutorialView } from '../../render/TutorialView';
import { loadOnboardingProgress, saveOnboardingProgress, type OnboardingProgress } from './storage';

/** Guardian HP fraction below which the "you can always escape" reminder fires — an
 * arbitrary-but-reasonable threshold (not derived from any existing balance constant),
 * chosen to land once a run starts feeling risky. See pivot decisions doc D25. */
const ESCAPE_REMINDER_HP_FRACTION = 0.3;

export interface OnboardingControllerOptions {
  stage: HTMLElement;
  canvas: HTMLElement;
  boardView: BoardView;
  tutorialView: TutorialView;
  hudRoot: HTMLElement;
}

/** Orchestrates the two approved onboarding surfaces — the first-launch tutorial
 * (TutorialView) and the first-run live coach marks (CoachMarkView) — deciding *when*
 * each fires and persisting "seen" state, while the views themselves stay dumb renderers.
 * See pivot decisions doc D25. */
export class OnboardingController {
  private progress: OnboardingProgress;
  private coachMarkView: CoachMarkView;

  constructor(private options: OnboardingControllerOptions) {
    this.progress = loadOnboardingProgress();
    this.coachMarkView = new CoachMarkView(options.stage);
  }

  /** Call once after the board's first render. Opens the tutorial on first-ever launch;
   * otherwise goes straight to the first-move coach mark if that hasn't fired yet. */
  init(): void {
    if (!this.progress.tutorialSeen) {
      this.options.tutorialView.open();
    } else {
      this.maybeShowFirstMove();
    }
  }

  onTutorialDismissed(): void {
    if (!this.progress.tutorialSeen) {
      this.progress.tutorialSeen = true;
      saveOnboardingProgress(this.progress);
    }
    this.maybeShowFirstMove();
  }

  openTutorial(triggerEl?: HTMLElement): void {
    this.options.tutorialView.open(triggerEl);
  }

  /** Call after every resolved swap with the events reported by swap()/resolveMatches()
   * and the resulting state. Fires at most one new coach mark per turn — first unseen
   * trigger wins — since only one can be shown at a time. */
  handleTurnEvents(events: MatchEvent[], state: GameState): void {
    for (const event of events) {
      if (event.kind === 'match') {
        if (event.role === 'weapon' && !this.progress.coachSeen.weaponMatch) {
          this.fire('weaponMatch', {
            tag: 'Weapon match',
            html: 'That was a <b>weapon</b> match — the guardian just took damage. Different weapons hit differently.',
            rect: this.domRect(this.findHudEl('guardian-row')),
          });
          return;
        }
        if (event.role === 'food' && !this.progress.coachSeen.foodMatch) {
          this.fire('foodMatch', {
            tag: 'Food match',
            html: 'Food refilled your <b>Rations</b>. Watch this bar — it drains every turn, and running out hurts.',
            rect: this.domRect(this.findHudEl('rations-row')),
          });
          return;
        }
        if (event.role === 'hoard' && !this.progress.coachSeen.hoardMatch) {
          this.fire('hoardMatch', {
            tag: 'Hoard banked',
            html: "Hoard banked as <b>gold</b>. Careful — stealing also raises the guardian's Greed below.",
            rect: this.domRect(this.findHudEl('gold-chip')),
          });
          return;
        }
      } else if (event.kind === 'reveal' && !this.progress.coachSeen.fogReveal) {
        const cell = event.cells[0];
        const rect = this.boardTileRect(cell.row, cell.col);
        if (rect) {
          this.fire('fogReveal', {
            tag: 'Fog revealed',
            html: 'That tile was <b>fogged</b> until your last match uncovered it. Dig near the dark to reveal more.',
            rect,
          });
          return;
        }
      }
    }

    this.checkEscapeReminder(state);
  }

  private checkEscapeReminder(state: GameState): void {
    if (this.progress.coachSeen.escapeReminder) return;
    if (state.status !== 'playing' || state.guardian.maxHp <= 0) return;
    if (state.guardian.hp / state.guardian.maxHp >= ESCAPE_REMINDER_HP_FRACTION) return;

    this.fire('escapeReminder', {
      tag: 'Reminder',
      html: 'You can <b>escape with your loot</b> any time — you never have to clear the whole floor.',
      rect: this.domRect(this.findHudEl('escape-btn')),
    });
  }

  private maybeShowFirstMove(): void {
    if (this.progress.coachSeen.firstMove) return;

    const a = this.options.boardView.getTileLocalRect(0, 0);
    const b = this.options.boardView.getTileLocalRect(0, 1);
    if (!a || !b) return;

    const canvasRect = this.options.canvas.getBoundingClientRect();
    const stageRect = this.options.stage.getBoundingClientRect();
    const left = canvasRect.left - stageRect.left + Math.min(a.x, b.x);
    const top = canvasRect.top - stageRect.top + a.y;

    this.fire('firstMove', {
      tag: 'First move',
      html: 'Tap a tile, then tap the one next to it to swap. Match 3 or more of the same tile to clear them.',
      rect: { left, top, width: a.size + b.size, height: a.size },
    });
  }

  private fire(key: keyof OnboardingProgress['coachSeen'], mark: { tag: string; html: string; rect: CoachMarkRect }): void {
    this.progress.coachSeen[key] = true;
    saveOnboardingProgress(this.progress);
    this.coachMarkView.show(mark);
  }

  private boardTileRect(row: number, col: number): CoachMarkRect | null {
    const local = this.options.boardView.getTileLocalRect(row, col);
    if (!local) return null;
    const canvasRect = this.options.canvas.getBoundingClientRect();
    const stageRect = this.options.stage.getBoundingClientRect();
    return {
      left: canvasRect.left - stageRect.left + local.x,
      top: canvasRect.top - stageRect.top + local.y,
      width: local.size,
      height: local.size,
    };
  }

  private domRect(el: HTMLElement): CoachMarkRect {
    const r = el.getBoundingClientRect();
    const s = this.options.stage.getBoundingClientRect();
    return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
  }

  private findHudEl(dataHud: string): HTMLElement {
    const el = this.options.hudRoot.querySelector<HTMLElement>(`[data-hud="${dataHud}"]`);
    if (!el) throw new Error(`Onboarding anchor not found: [data-hud="${dataHud}"]`);
    return el;
  }
}
