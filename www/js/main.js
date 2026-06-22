import { createStorageAdapter } from './platform/storageAdapter.js';
import { loadSave, persistSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';
import { createHomeScene, SECTION_TITLES } from './ui/home.js';
import { createPlaceholderScene } from './ui/placeholder.js';
import { createNameEntryScene } from './ui/nameEntry.js';

async function boot() {
  const adapter = createStorageAdapter();
  const bus = createEventBus();
  const scenes = createSceneManager(document.getElementById('app'));
  let gameState = createGameState(await loadSave(adapter));

  function showHome() {
    scenes.mount(
      createHomeScene({
        gameState,
        onPlay: () => showGame(gameState),
        onSection: (key) => showPlaceholder(key),
      })
    );
  }

  function showGame(gs) {
    gameState = gs;
    scenes.mount(
      createGameScene({
        gameState,
        adapter,
        bus,
        onAdvance: (next) => showGame(next),
        onHome: () => showHome(),
      })
    );
  }

  function showPlaceholder(key) {
    scenes.mount(
      createPlaceholderScene({
        title: SECTION_TITLES[key] || 'Coming soon',
        onBack: () => showHome(),
      })
    );
  }

  function showNameEntry() {
    scenes.mount(
      createNameEntryScene({
        onConfirm: (name) => {
          gameState.save.displayName = name;
          persistSave(adapter, gameState.save);
          showHome();
        },
      })
    );
  }

  if (gameState.save.displayName) showHome();
  else showNameEntry();
}

boot();
