// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { OnboardingController } from '../../src/app/onboarding/OnboardingController';
import { TutorialView } from '../../src/render/TutorialView';
import type { BoardView } from '../../src/render/BoardView';
import { makeState } from '../logic/helpers';
import type { MatchEvent } from '../../src/logic/types';
import { loadOnboardingProgress } from '../../src/app/onboarding/storage';

function buildDom(): { stage: HTMLElement; content: HTMLElement } {
  document.body.innerHTML = `
    <div id="stage">
      <div id="content">
        <div class="hud-row" data-hud="guardian-row"></div>
        <div class="hud-row" data-hud="rations-row"></div>
        <div class="gold-chip" data-hud="gold-chip"></div>
        <button data-hud="escape-btn">Escape</button>
      </div>
      <div id="tutorial-overlay" data-hud="tutorial-overlay" role="dialog" aria-modal="true" inert>
        <div class="tutorial-card">
          <button data-hud="tutorial-dismiss">x</button>
          <div data-hud="tutorial-content"></div>
          <div class="tutorial-dots" data-hud="tutorial-dots"></div>
          <button data-hud="tutorial-skip">Skip</button>
          <button data-hud="tutorial-back">Back</button>
          <button data-hud="tutorial-next">Next</button>
        </div>
      </div>
    </div>
  `;
  return {
    stage: document.getElementById('stage')!,
    content: document.getElementById('content')!,
  };
}

function makeBoardViewStub(): BoardView {
  return {
    getTileLocalRect: (row: number, col: number) => ({ x: col * 40, y: row * 40, size: 40 }),
  } as unknown as BoardView;
}

function readProgress() {
  return loadOnboardingProgress();
}

describe('OnboardingController', () => {
  let stage: HTMLElement;
  let content: HTMLElement;
  let canvas: HTMLElement;
  let controller: OnboardingController;
  let tutorialView: TutorialView;

  function createController(): OnboardingController {
    tutorialView = new TutorialView(stage, { onDismiss: () => controller.onTutorialDismissed() });
    controller = new OnboardingController({
      stage,
      canvas,
      boardView: makeBoardViewStub(),
      tutorialView,
      hudRoot: content,
    });
    return controller;
  }

  beforeEach(() => {
    localStorage.clear();
    ({ stage, content } = buildDom());
    canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    createController();
  });

  it('opens the tutorial on first-ever launch, not the first-move coach mark', () => {
    controller.init();
    const overlay = document.querySelector('[data-hud="tutorial-overlay"]')!;
    expect(overlay.classList.contains('visible')).toBe(true);
    expect(overlay.hasAttribute('inert')).toBe(false);
    expect(stage.querySelector('.coach-anchor')).toBeNull();
  });

  it('skips straight to the first-move coach mark when the tutorial was already seen', () => {
    // Progress must be seeded before the controller is constructed — it loads once at
    // construction time, same as the real app (a single controller per page load).
    localStorage.setItem('kt.onboarding.v1', JSON.stringify({ tutorialSeen: true, coachSeen: {} }));
    createController();

    controller.init();
    const overlay = document.querySelector('[data-hud="tutorial-overlay"]')!;
    expect(overlay.classList.contains('visible')).toBe(false);
    expect(stage.querySelector('.coach-anchor')).not.toBeNull();
    expect(readProgress().coachSeen.firstMove).toBe(true);
  });

  it('dismissing the tutorial marks it seen and then shows the first-move coach mark', () => {
    controller.init();
    (document.querySelector('[data-hud="tutorial-dismiss"]') as HTMLButtonElement).click();

    const overlay = document.querySelector('[data-hud="tutorial-overlay"]')!;
    expect(overlay.classList.contains('visible')).toBe(false);
    expect(overlay.hasAttribute('inert')).toBe(true);
    expect(readProgress().tutorialSeen).toBe(true);
    expect(stage.querySelector('.coach-anchor')).not.toBeNull();
    expect(readProgress().coachSeen.firstMove).toBe(true);
  });

  it('fires the weapon-match coach mark once, anchored on the guardian row', () => {
    const events: MatchEvent[] = [{ kind: 'match', role: 'weapon', tileKind: 'sword', cells: [] }];
    controller.handleTurnEvents(events, makeState());

    expect(readProgress().coachSeen.weaponMatch).toBe(true);
    const bubble = stage.querySelector('.coach-bubble');
    expect(bubble?.textContent).toContain('weapon');

    // A second weapon match must not fire it again.
    stage.querySelectorAll('.coach-anchor').forEach((el) => el.remove());
    controller.handleTurnEvents(events, makeState());
    expect(stage.querySelector('.coach-anchor')).toBeNull();
  });

  it('fires only the first unseen trigger when multiple match events land in one turn', () => {
    const events: MatchEvent[] = [
      { kind: 'match', role: 'weapon', tileKind: 'sword', cells: [] },
      { kind: 'match', role: 'food', tileKind: 'bread', cells: [] },
    ];
    controller.handleTurnEvents(events, makeState());

    expect(readProgress().coachSeen.weaponMatch).toBe(true);
    expect(readProgress().coachSeen.foodMatch).toBe(false);
    expect(stage.querySelectorAll('.coach-anchor').length).toBe(1);
  });

  it('fires the fog-reveal coach mark anchored at the revealed tile', () => {
    const events: MatchEvent[] = [{ kind: 'reveal', cells: [{ row: 2, col: 3 }] }];
    controller.handleTurnEvents(events, makeState());

    expect(readProgress().coachSeen.fogReveal).toBe(true);
    const anchor = stage.querySelector('.coach-anchor') as HTMLElement;
    expect(anchor.style.left).toBe('120px'); // col 3 * 40
    expect(anchor.style.top).toBe('80px'); // row 2 * 40
  });

  it('fires the escape reminder once guardian HP drops under 30%, not before', () => {
    const healthyState = makeState({ guardian: { hp: 200, maxHp: 300, armor: 0, rage: 0, turnCounter: 0 } });
    controller.handleTurnEvents([], healthyState);
    expect(readProgress().coachSeen.escapeReminder).toBe(false);

    const lowState = makeState({ guardian: { hp: 80, maxHp: 300, armor: 0, rage: 0, turnCounter: 0 } });
    controller.handleTurnEvents([], lowState);
    expect(readProgress().coachSeen.escapeReminder).toBe(true);
    expect(stage.querySelector('.coach-bubble')?.textContent).toContain('escape');
  });

  it('never fires the escape reminder once the run is over', () => {
    const deadState = makeState({
      status: 'dead',
      guardian: { hp: 10, maxHp: 300, armor: 0, rage: 0, turnCounter: 0 },
    });
    controller.handleTurnEvents([], deadState);
    expect(readProgress().coachSeen.escapeReminder).toBe(false);
  });
});

describe('TutorialView', () => {
  let stage: HTMLElement;
  let dismissed = 0;

  beforeEach(() => {
    dismissed = 0;
    ({ stage } = buildDom());
  });

  it('paginates through all 6 pages and shows the final CTA', () => {
    const view = new TutorialView(stage, { onDismiss: () => dismissed++ });
    view.open();

    const next = document.querySelector('[data-hud="tutorial-next"]') as HTMLButtonElement;
    const back = document.querySelector('[data-hud="tutorial-back"]') as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    expect(document.querySelector('.tutorial-title')?.textContent).toBe('The Heist');

    for (let i = 0; i < 5; i++) next.click();

    expect(document.querySelector('.tutorial-title')?.textContent).toBe('Escape or Fall');
    expect(next.textContent).toBe("Let's dig in");
    expect((document.querySelector('[data-hud="tutorial-skip"]') as HTMLElement).style.display).toBe('none');

    next.click();
    expect(dismissed).toBe(1);
  });

  it('Escape key dismisses the open tutorial', () => {
    const view = new TutorialView(stage, { onDismiss: () => dismissed++ });
    view.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dismissed).toBe(1);
    expect(document.querySelector('[data-hud="tutorial-overlay"]')?.hasAttribute('inert')).toBe(true);
  });
});
