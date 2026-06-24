import { ASSETS, STAGE_NAMES } from '../data/config.js';
import { NPC } from '../data/npc.js';
import { persistSave } from '../core/save.js';
import { earn } from '../systems/economy.js';
import { showInfo, sectionTop, npcHero, toast } from './modal.js';

// Bard's Corner (GDD §Bard's Corner). One song per stage, unlocked as stages are reached;
// optional lore tales reward +5 coins on first listen.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TALES = [
  { id: 'lost_crown',  name: 'The Lost Crown',  sub: "A tale of the realm's founding",
    text: 'Long ago the realm wore a crown of light, until greed cracked it and scattered its gems across ten lands…' },
  { id: 'knight_of_old', name: 'The Knight of Old', sub: 'Why the treasure was hidden',
    text: 'The first knight hid the treasure not from thieves, but from kings — for some power is safest unfound…' },
];

export function createBardScene({ gameState, adapter, onBack }) {
  const save = gameState.save;
  const coins = save.coins || 0;
  const curStage = save.currentStage || 1;

  const scene = document.createElement('div');
  scene.id = 'kt-bard';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgBards}")`;

  const songs = Array.from({ length: 10 }, (_, i) => {
    const stage = i + 1;
    const unlocked = stage <= curStage;
    return `<button type="button" class="kt-song${unlocked ? '' : ' locked'}" data-stage="${stage}"${unlocked ? '' : ' disabled'}>` +
      `<span class="n">${ROMAN[stage]}</span>` +
      `<span class="t">${STAGE_NAMES[stage] || `Stage ${stage}`}</span>` +
      `<span class="pl">${unlocked ? '▶' : '🔒'}</span>` +
    `</button>`;
  }).join('');

  const tales = TALES.map((t) => {
    const heard = !!(save.talesHeard || {})[t.id];
    return `<button type="button" class="kt-shop-row kt-tale" data-id="${t.id}">` +
      `<div class="kt-shop-info"><b>${t.name}</b><span>${t.sub}</span></div>` +
      `<span class="kt-buy${heard ? ' heard' : ''}" style="font-size:12px;">` +
        (heard ? 'heard' : `<img src="${ASSETS.ui}ui_coin.png" alt="">+5`) + `</span>` +
    `</button>`;
  }).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Songs & tales', "Bard's Corner", coins) +
    `<div class="kt-sec-body">` +
      npcHero(NPC.bard) +
      `<div class="kt-now"><div class="pp">❚❚</div>` +
        `<div class="t"><div class="k">Now playing</div><b>${STAGE_NAMES[curStage] || 'A quiet tune'} — Theme ${ROMAN[curStage] || 'I'}</b></div>` +
        `<div class="kt-wave"><i style="height:8px"></i><i style="height:16px"></i><i style="height:11px"></i><i style="height:20px"></i><i style="height:7px"></i><i style="height:14px"></i></div>` +
      `</div>` +
      `<div class="kt-sub-head left">Songs of the realm</div>` +
      `<div class="kt-panel">${songs}</div>` +
      `<div class="kt-sub-head left">Bard's tales</div>` +
      `<div class="kt-panel">${tales}</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('.kt-song:not(.locked)').forEach((b) =>
    b.addEventListener('click', () =>
      showInfo(scene, 'The Bard', `<p>The lutes are still being strung — songs play once the audio system is wired in.</p>`)
    )
  );
  scene.querySelectorAll('.kt-tale').forEach((b) =>
    b.addEventListener('click', () => {
      const t = TALES.find((x) => x.id === b.dataset.id);
      const first = !(save.talesHeard || (save.talesHeard = {}))[t.id];
      if (first) {
        save.talesHeard[t.id] = true;
        earn(save, 5);
        persistSave(adapter, save);
        b.querySelector('.kt-buy').outerHTML = `<span class="kt-buy heard" style="font-size:12px;">heard</span>`;
        scene.querySelector('.kt-sec-coin-val').textContent = save.coins || 0;
      }
      showInfo(scene, t.name, `<p style="font-style:italic">${t.text}</p>` + (first ? `<p class="kt-coin-foot">The bard's tale earned you +5 coins.</p>` : ''));
    })
  );

  return scene;
}
