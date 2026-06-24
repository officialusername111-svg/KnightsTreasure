import { createStorageAdapter } from './platform/storageAdapter.js';
import { loadSave, persistSave } from './core/save.js';
import { createGameState, recordLevelResult, nextPosition } from './core/state.js';
import { createEventBus } from './core/eventBus.js';
import { createSceneManager } from './ui/sceneManager.js';
import { createGameScene } from './ui/game.js';
import { createHomeScene, SECTION_TITLES } from './ui/home.js';
import { createPlaceholderScene } from './ui/placeholder.js';
import { createInnScene } from './ui/inn.js';
import { createBardScene } from './ui/bard.js';
import { createGamblerScene } from './ui/gambler.js';
import { createBlacksmithScene } from './ui/blacksmith.js';
import { createQuestsScene } from './ui/quests.js';
import { createGloryScene } from './ui/glory.js';
import { createLevelMapScene } from './ui/levelMap.js';
import { createSettingsScene } from './ui/settings.js';
import { createStoryLogScene, showStoryDialog } from './ui/story.js';
import { createNameEntryScene } from './ui/nameEntry.js';
import { NPC } from './data/npc.js';
import { STORY } from './data/story.js';
import * as stamina from './systems/stamina.js';
import { earn, stageMilestone } from './systems/economy.js';

async function boot() {
  const adapter = createStorageAdapter();
  const bus = createEventBus();
  const app = document.getElementById('app');
  const scenes = createSceneManager(app);
  let gameState = createGameState(stamina.refresh(await loadSave(adapter)));
  let playTarget = { stage: 1, level: 1 };

  function save() { return gameState.save; }
  function persist() { return persistSave(adapter, save()); }

  // ---- overlays (don't tear down the scene beneath) ----
  function openOverlay(buildEl) {
    const el = buildEl(() => el.remove());
    el.classList.add('kt-scene-overlay');
    app.appendChild(el);
  }
  const openSettings = () => openOverlay((close) => createSettingsScene({ gameState, adapter, onBack: close }));
  const openStoryLog = () => openOverlay((close) => createStoryLogScene({ gameState, onBack: close }));

  // ---- home + sections ----
  function showHome() {
    scenes.mount(createHomeScene({
      gameState,
      onPlay: () => showGameAt(save().currentStage, save().currentLevel),
      onSection: (key) => showSection(key),
      onMenu: () => openSettings(),
      onMap: () => openMap(),
    }));
  }

  function showSection(key) {
    if (key === 'inn') openInn();
    else if (key === 'daily') scenes.mount(createQuestsScene({ gameState, adapter, onBack: () => showHome() }));
    else if (key === 'glory' || key === 'rank') openGlory();
    else showPlaceholder(key);
  }

  function openGlory() { scenes.mount(createGloryScene({ gameState, onBack: () => showHome() })); }
  function openMap() {
    scenes.mount(createLevelMapScene({
      gameState, onBack: () => showHome(), onPlayStage: (n) => showGameAt(n, 1),
    }));
  }

  function openInn() {
    const scene = createInnScene({ gameState, adapter, onBack: () => showHome(), onHall: (k) => openHall(k) });
    scenes.mount(scene);
    maybeIntro(scene, 'inn');
  }
  function openHall(key) {
    if (key === 'blacksmith') {
      scenes.mount(createBlacksmithScene({ gameState, adapter, onBack: () => openInn() }));
      return;
    }
    const scene = key === 'bard'
      ? createBardScene({ gameState, adapter, onBack: () => openInn() })
      : createGamblerScene({ gameState, adapter, onBack: () => openInn() });
    scenes.mount(scene);
    maybeIntro(scene, key);
  }
  function maybeIntro(scene, key) {
    const seen = save().seenIntros || (save().seenIntros = {});
    if (seen[key]) return;
    const npc = NPC[key];
    showStoryDialog(scene, {
      beat: { speaker: npc.speaker, portrait: npc.introPortrait, text: npc.introLine },
      bg: npc.bg,
      onDone: () => { seen[key] = true; persist(); },
    });
  }

  // ---- play flow: stamina gate → encounter → level → results → advance ----
  const MOMENTS = ['opening', 'midpoint', 'boss'];
  function beforeBeat(level) { return level === 1 ? 0 : level === 13 ? 1 : -1; }

  function showGameAt(stage, level) {
    if (!stamina.consume(save(), 1)) { persist(); showHome(); return; }
    persist();
    playTarget = { stage, level };
    const m = beforeBeat(level);
    if (m >= 0 && STORY[stage]) {
      const key = `${stage}-${MOMENTS[m]}`;
      const sp = save().storyProgress || (save().storyProgress = {});
      if (!sp[key]) {
        const ov = showStoryDialog(app, {
          beat: STORY[stage].beats[m], stage,
          onDone: () => { sp[key] = true; persist(); mountGame(stage, level); },
        });
        ov.classList.add('kt-scene-overlay');
        return;
      }
    }
    mountGame(stage, level);
  }

  function mountGame(stage, level) {
    gameState = createGameState(save(), stage, level);
    scenes.mount(createGameScene({
      gameState, adapter, bus,
      onAdvance: (advanced) => onLevelCleared(advanced),
      onRetry: () => mountGame(stage, level),
      onHome: () => showHome(),
      onStory: () => openStoryLog(),
      onSettings: () => openSettings(),
    }));
  }

  function onLevelCleared(advanced) {
    gameState = advanced;                 // save now has updated stars + forward pointer
    const cleared = playTarget;
    const next = nextPosition(cleared.stage, cleared.level);

    if (cleared.level === 25) {
      earn(save(), stageMilestone(cleared.stage));
      persist();
      // Boss completion cutscene (the stage's 3rd beat), once.
      const key = `${cleared.stage}-boss`;
      const sp = save().storyProgress || (save().storyProgress = {});
      const done = () => { if (next) showGameAt(next.stage, next.level); else showHome(); };
      if (!sp[key] && STORY[cleared.stage]) {
        const ov = showStoryDialog(app, {
          beat: STORY[cleared.stage].beats[2], stage: cleared.stage,
          onDone: () => { sp[key] = true; persist(); done(); },
        });
        ov.classList.add('kt-scene-overlay');
        return;
      }
      done();
      return;
    }
    if (next) showGameAt(next.stage, next.level); else showHome();
  }

  function showPlaceholder(key) {
    scenes.mount(createPlaceholderScene({ title: SECTION_TITLES[key] || 'Coming soon', onBack: () => showHome() }));
  }

  function showNameEntry() {
    scenes.mount(createNameEntryScene({
      onConfirm: (name) => { save().displayName = name; persist(); showHome(); },
    }));
  }

  if (save().displayName) showHome();
  else showNameEntry();
}

boot();
