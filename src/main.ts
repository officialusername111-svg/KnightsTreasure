import './style.css';
import { createPixiApp } from './render/PixiApp';
import { BoardView } from './render/BoardView';
import { HudView } from './render/HudView';
import { GameController } from './app/GameController';

async function bootstrap(): Promise<void> {
  const boardWrap = document.querySelector<HTMLElement>('#board-wrap');
  const content = document.querySelector<HTMLElement>('#content');
  if (!boardWrap || !content) throw new Error('Missing root DOM elements');

  const app = await createPixiApp(boardWrap);

  const boardView = new BoardView({
    onSwapIntent: (a, b) => controller.handleSwapIntent(a, b),
  });
  await boardView.preload();
  app.stage.addChild(boardView.container);

  const hudView = new HudView(content, {
    onEscapeIntent: () => controller.handleEscapeIntent(),
  });

  const controller = new GameController(boardView, hudView, Date.now());
  controller.start(boardWrap.clientWidth, boardWrap.clientHeight);

  window.addEventListener('resize', () => {
    controller.handleResize(boardWrap.clientWidth, boardWrap.clientHeight);
  });
}

bootstrap().catch((err) => {
  console.error(err);
});
