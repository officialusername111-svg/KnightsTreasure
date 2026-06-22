import { createStorageAdapter } from './platform/storageAdapter.js';
import { loadSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';

async function boot() {
  const adapter = createStorageAdapter();
  const bus = createEventBus();
  const scenes = createSceneManager(document.getElementById('app'));
  let gameState = createGameState(await loadSave(adapter));

  function showGame(gs) {
    gameState = gs;
    scenes.mount(
      createGameScene({
        gameState,
        adapter,
        bus,
        onAdvance: (next) => showGame(next),
      })
    );
  }

  showGame(gameState);
}

boot();
