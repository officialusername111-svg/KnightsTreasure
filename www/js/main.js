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
import { createRanksScene } from './ui/ranks.js';
import { createMailScene } from './ui/mail.js';
import { createLevelMapScene } from './ui/levelMap.js';
import { createSettingsScene } from './ui/settings.js';
import { createStoryLogScene, showStoryDialog } from './ui/story.js';
import { createNameEntryScene } from './ui/nameEntry.js';
import { pageFanfare } from './ui/fanfare.js';
import { NPC } from './data/npc.js';
import { STORY } from './data/story.js';
import { ACH_BY_ID } from './data/achievements.js';
import { getLevel } from './data/levels.js';
import { TASKS, dailyModifier, markDailyLevelDone } from './systems/dailyDuty.js';
import * as stamina from './systems/stamina.js';
import { earn, stageMilestone } from './systems/economy.js';
import { syncMail } from './services/social.js';
import * as audio from './systems/audio.js';

async function boot() {
  const adapter = createStorageAdapter();
  const bus = createEventBus();
  const app = document.getElementById('app');
  const scenes = createSceneManager(app);
  let gameState = createGameState(stamina.refresh(await loadSave(adapter)));
  let playTarget = { stage: 1, level: 1 };

  audio.configure(gameState.save.settings);
  // Web Audio needs a user gesture to start on mobile; resume on first interaction.
  const wake = () => { audio.resume(); window.removeEventListener('pointerdown', wake); };
  window.addEventListener('pointerdown', wake, { once: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));

  function save() { return gameState.save; }
  function persist() { return persistSave(adapter, save()); }

  // Generate mail (rank/achievement/comment) + queue achievement fanfares from local triggers.
  function sync() { syncMail(save()); persist(); }

  // Show a full-page celebration for each achievement queued since last launch (once each).
  function drainFanfare(sceneEl) {
    const queue = save().pendingFanfare || [];
    if (!queue.length) return;
    const id = queue.shift();
    persist();
    const a = ACH_BY_ID[id];
    pageFanfare(sceneEl, {
      settings: save().settings,
      title: a ? a.name : 'Achievement unlocked!',
      subtitle: a ? a.desc : '',
      onDone: () => drainFanfare(sceneEl),     // chain through the rest
    });
  }

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
    const scene = createHomeScene({
      gameState,
      onPlay: () => showGameAt(save().currentStage, save().currentLevel),
      onSection: (key) => showSection(key),
      onMenu: () => openSettings(),
      onMap: () => openMap(),
      onMail: () => openMail(),
    });
    scenes.mount(scene);
    drainFanfare(scene);
  }

  function showSection(key) {
    if (key === 'inn') openInn();
    else if (key === 'daily') openQuests();
    else if (key === 'glory') openGlory();
    else if (key === 'rank') openRanks();
    else if (key === 'blacksmith') openBlacksmith();
    else showPlaceholder(key);
  }

  function openGlory() { scenes.mount(createGloryScene({ gameState, onBack: () => showHome() })); }
  function openRanks() { scenes.mount(createRanksScene({ gameState, adapter, onBack: () => showHome() })); }
  function openQuests() {
    scenes.mount(createQuestsScene({ gameState, adapter, onBack: () => showHome(), onPlayDaily: (id) => showDailyLevel(id) }));
  }

  // Daily duty levels (no stamina cost, GDD): a dedicated board + the day's modifier.
  function showDailyLevel(taskId) {
    const task = TASKS.find((t) => t.id === taskId);
    const mod = task && task.modifier ? dailyModifier().id : null;
    const base = getLevel(Math.min(save().currentStage, 10), 12) || getLevel(1, 12);
    const level = { ...base, id: `daily-${taskId}`, levelInStage: 12 };
    if (mod === 'speed' && level.timeLimit) level.timeLimit = Math.round(level.timeLimit * 0.7);
    if (mod === 'fast_flip') level.flipMemoryMs = Math.round(level.flipMemoryMs * 0.6);
    mountDailyGame(taskId, level, mod);
  }
  function mountDailyGame(taskId, level, mod) {
    gameState = { save: save(), current: level };
    scenes.mount(createGameScene({
      gameState, adapter, bus,
      daily: { id: taskId, modifier: mod,
        onDone: () => { markDailyLevelDone(save(), taskId); persist(); sync(); openQuests(); } },
      onRetry: () => mountDailyGame(taskId, level, mod),
      onHome: () => showHome(),
      onStory: () => openStoryLog(),
      onSettings: () => openSettings(),
    }));
  }
  function openMail() { scenes.mount(createMailScene({ gameState, adapter, onBack: () => showHome() })); }
  function openBlacksmith() {
    const scene = createBlacksmithScene({ gameState, adapter, onBack: () => showHome() });
    scenes.mount(scene);
    maybeIntro(scene, 'blacksmith');
  }
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
    sync();                               // queue any new achievements + ranking mail
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
      onConfirm: (name) => { save().displayName = name; persist(); sync(); showHome(); },
    }));
  }

  if (save().displayName) { sync(); showHome(); }
  else showNameEntry();
}

boot();
