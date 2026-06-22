import { createStorageAdapter } from './platform/storageAdapter.js';
import { loadSave, persistSave } from './core/save.js';
import { createGameState } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';
import { createHomeScene, SECTION_TITLES } from './ui/home.js';
import { createPlaceholderScene } from './ui/placeholder.js';
import { createInnScene } from './ui/inn.js';
import { createBardScene } from './ui/bard.js';
import { createGamblerScene } from './ui/gambler.js';
import { createQuestsScene } from './ui/quests.js';
import { createSettingsScene } from './ui/settings.js';
import { createStoryLogScene, showStoryDialog } from './ui/story.js';
import { createNameEntryScene } from './ui/nameEntry.js';
import { NPC } from './data/npc.js';

async function boot() {
  const adapter = createStorageAdapter();
  const bus = createEventBus();
  const app = document.getElementById('app');
  const scenes = createSceneManager(app);
  let gameState = createGameState(await loadSave(adapter));

  // Open a scene as an overlay above the current one (so Settings / Story don't
  // tear down an in-progress game or reset the home scene). Back removes the overlay.
  function openOverlay(buildEl) {
    const el = buildEl(() => el.remove());
    el.classList.add('kt-scene-overlay');
    app.appendChild(el);
  }
  const openSettings = () =>
    openOverlay((close) => createSettingsScene({ gameState, adapter, onBack: close }));
  const openStoryLog = () =>
    openOverlay((close) => createStoryLogScene({ gameState, onBack: close }));

  function showHome() {
    scenes.mount(
      createHomeScene({
        gameState,
        onPlay: () => showGame(gameState),
        onSection: (key) => showSection(key),
        onMenu: () => openSettings(),
      })
    );
  }

  function showSection(key) {
    if (key === 'inn') {
      openInn();
    } else if (key === 'daily') {
      scenes.mount(createQuestsScene({ gameState, onBack: () => showHome() }));
    } else {
      showPlaceholder(key);
    }
  }

  function openInn() {
    const scene = createInnScene({ gameState, onBack: () => showHome(), onHall: (k) => openHall(k) });
    scenes.mount(scene);
    maybeIntro(scene, 'inn');
  }

  function openHall(key) {
    const scene = key === 'bard'
      ? createBardScene({ gameState, onBack: () => openInn() })
      : createGamblerScene({ gameState, onBack: () => openInn() });
    scenes.mount(scene);
    maybeIntro(scene, key);
  }

  // First open of a tavern hall greets the knight with a full-screen NPC dialog (once).
  function maybeIntro(scene, key) {
    const seen = gameState.save.seenIntros || (gameState.save.seenIntros = {});
    if (seen[key]) return;
    const npc = NPC[key];
    showStoryDialog(scene, {
      beat: { speaker: npc.speaker, portrait: npc.introPortrait, text: npc.introLine },
      bg: npc.bg,
      onDone: () => { seen[key] = true; persistSave(adapter, gameState.save); },
    });
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
        onStory: () => openStoryLog(),
        onSettings: () => openSettings(),
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
