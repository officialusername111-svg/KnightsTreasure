// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameScene } from '../www/js/ui/game.js';
import { createEventBus } from '../www/js/core/eventBus.js';
import { defaultSave } from '../www/js/core/save.js';
import { getLevel } from '../www/js/data/levels.js';
import { consume } from '../www/js/systems/stamina.js';
import { TEXT } from '../www/js/data/config.js';
import { createMemoryAdapter } from './helpers/memoryAdapter.js';

// Coverage (T5): the defeat/time-up path — timer reaches 0 → level failed,
// retry offered, no completion recorded, stamina spent at start is not refunded.
// jsdom has no ResizeObserver; the scene only uses it to refit the board on resize.
class ROStub { observe() {} unobserve() {} disconnect() {} }

describe('defeat (time-up) path', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ROStub);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  function mountTimedLevel({ onRetry } = {}) {
    const save = defaultSave();
    save.tutorialSeen = true; // past onboarding
    consume(save, 1);         // main.js showGameAt charges 1 stamina at level start
    const staminaAtStart = save.stamina;
    const level = getLevel(1, 6); // building block: 120s timer per difficulty.js
    const scene = createGameScene({
      gameState: { save, current: level },
      adapter: createMemoryAdapter(),
      bus: createEventBus(),
      onAdvance: () => {},
      onRetry,
      onHome: () => {},
      onStory: () => {},
      onSettings: () => {},
    });
    document.body.appendChild(scene);
    return { save, level, scene, staminaAtStart };
  }

  it('fails the level when the timer reaches zero', () => {
    const { scene, level } = mountTimedLevel();
    expect(level.timeLimit).toBe(120);
    vi.advanceTimersByTime(121_000);
    expect(scene.textContent).toContain(TEXT.lose);
  });

  it('offers retry on defeat and wires it to onRetry', () => {
    const onRetry = vi.fn();
    const { scene } = mountTimedLevel({ onRetry });
    vi.advanceTimersByTime(121_000);
    const retryBtn = [...scene.querySelectorAll('button')]
      .find((b) => b.textContent === TEXT.retry);
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('records no completion and refunds no stamina on defeat', () => {
    const { save, staminaAtStart } = mountTimedLevel();
    vi.advanceTimersByTime(121_000);
    expect(save.completedLevels).not.toContain('1-6');
    expect(save.stars['1-6']).toBeUndefined();
    expect(save.stamina).toBe(staminaAtStart); // spent at start, not given back
  });
});
