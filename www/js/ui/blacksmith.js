import { ASSETS } from '../data/config.js';
import { NPC, BROKE_LINE } from '../data/npc.js';
import { POWERUPS, unlockedPowerups } from '../data/items.js';
import { spend } from '../systems/economy.js';
import { persistSave } from '../core/save.js';
import { sfx } from '../systems/audio.js';
import { sectionTop, toast, showInfo } from './modal.js';
import { fitHeroCard } from './portraitFit.js';
import { fanfare } from './fanfare.js';

const BG_BLACKSMITH = 'assets/images/backgrounds/bg_blacksmith.png';
const PORTRAIT = 'assets/images/characters/blacksmith/blacksmith_happy.png';
const GREETING = 'Coin for steel, knight — every edge helps.';

// The Blacksmith (Forge & armory). Buy power-ups to stock your pack before battle.
// Sibling of the Inn shop scene; same header / rows / buy / refreshUI / toast shape.
export function createBlacksmithScene({ gameState, adapter, onBack }) {
  const save = gameState.save;

  const maxStageReached = save.currentStage;
  const allComplete = (save.completedLevels || []).includes('10-25');
  const unlocked = unlockedPowerups(maxStageReached, allComplete);
  const isUnlocked = (id) => unlocked.some((p) => p.id === id);

  const scene = document.createElement('div');
  scene.id = 'kt-blacksmith';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${BG_BLACKSMITH}")`;

  const lockNote = (stage) =>
    stage === 99 ? 'Unlocks when the realm is won' : `Unlocks Stage ${stage}`;

  const rows = POWERUPS.map((p) => {
    const owned = save.inventory && save.inventory[p.id] ? save.inventory[p.id] : 0;
    const open = isUnlocked(p.id);
    const action = open
      ? `<button type="button" class="kt-buy" data-id="${p.id}">` +
          `<img src="${ASSETS.ui}ui_coin.png" alt="">${p.cost}</button>`
      : `<span class="kt-bs-lock">${lockNote(p.unlockStage)}</span>`;
    return (
      `<div class="kt-shop-row kt-bs-row${open ? '' : ' is-locked'}" data-row="${p.id}">` +
        `<div class="kt-shop-ic kt-bs-ic" data-info="${p.id}">` +
          `<img src="${ASSETS.ui}${p.icon}.png" alt="" onerror="this.style.display='none'">` +
        `</div>` +
        `<div class="kt-shop-info kt-bs-info" data-info="${p.id}">` +
          `<b>${p.name}<span class="kt-bs-owned" data-owned="${p.id}">owned ×${owned}</span></b>` +
          `<span>${p.effect}</span>` +
        `</div>` +
        action +
      `</div>`
    );
  }).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Forge & armory', 'Blacksmith', save.coins || 0) +
    `<div class="kt-sec-body">` +
      `<div class="kt-npc-hero">` +
        `<div class="av"><img src="${PORTRAIT}" alt="" onerror="this.style.display='none'"></div>` +
        `<p>“${GREETING}”</p>` +
      `</div>` +
      `<div class="kt-panel">${rows}</div>` +
    `</div>`;

  fitHeroCard(scene);

  const refreshUI = () => {
    scene.querySelector('.kt-sec-coin-val').textContent = save.coins || 0;
    POWERUPS.forEach((p) => {
      const tag = scene.querySelector(`[data-owned="${p.id}"]`);
      if (tag) {
        const owned = save.inventory && save.inventory[p.id] ? save.inventory[p.id] : 0;
        tag.textContent = `owned ×${owned}`;
      }
    });
  };
  refreshUI();

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  scene.querySelectorAll('.kt-buy').forEach((b) =>
    b.addEventListener('click', () => {
      const item = POWERUPS.find((p) => p.id === b.dataset.id);
      if (!item) return;
      if (spend(save, item.cost)) {
        if (!save.inventory) save.inventory = {};
        save.inventory[item.id] = (save.inventory[item.id] || 0) + 1;
        persistSave(adapter, save);
        refreshUI();
        sfx('coin');
        fanfare(scene, { settings: save.settings, kind: 'small', originY: 40 });
        toast(scene, 'Forged! ' + item.name + ' added to your pack');
      } else {
        showInfo(scene, NPC.blacksmith.speaker, `<p>${BROKE_LINE.blacksmith}</p>`);
      }
    })
  );

  scene.querySelectorAll('[data-info]').forEach((el) =>
    el.addEventListener('click', () => {
      const item = POWERUPS.find((p) => p.id === el.dataset.info);
      if (item) showInfo(scene, item.name, '<p>' + item.effect + '</p>');
    })
  );

  return scene;
}
