import './style.css';
import { createPixiApp } from './render/PixiApp';
import { BoardView } from './render/BoardView';
import { HudView } from './render/HudView';
import { TutorialView } from './render/TutorialView';
import { GameController } from './app/GameController';
import { OnboardingController } from './app/onboarding/OnboardingController';

async function bootstrap(): Promise<void> {
  const stage = document.querySelector<HTMLElement>('#stage');
  const boardWrap = document.querySelector<HTMLElement>('#board-wrap');
  const content = document.querySelector<HTMLElement>('#content');
  if (!stage || !boardWrap || !content) throw new Error('Missing root DOM elements');

  const app = await createPixiApp(boardWrap);

  const boardView = new BoardView({
    onSwapIntent: (a, b) => controller.handleSwapIntent(a, b),
  });
  await boardView.preload();
  app.stage.addChild(boardView.container);

  const tutorialView = new TutorialView(stage, {
    onDismiss: () => onboarding.onTutorialDismissed(),
  });

  const hudView = new HudView(content, {
    onEscapeIntent: () => controller.handleEscapeIntent(),
    onTutorialIntent: (triggerEl) => onboarding.openTutorial(triggerEl),
  });

  const onboarding = new OnboardingController({
    stage,
    canvas: app.canvas,
    boardView,
    tutorialView,
    hudRoot: content,
  });

  const controller = new GameController(boardView, hudView, Date.now(), onboarding);
  controller.start(boardWrap.clientWidth, boardWrap.clientHeight);
  onboarding.init();

  window.addEventListener('resize', () => {
    controller.handleResize(boardWrap.clientWidth, boardWrap.clientHeight);
  });
}

bootstrap().catch((err) => {
  console.error(err);
});
