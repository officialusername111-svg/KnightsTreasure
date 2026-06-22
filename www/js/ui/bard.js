import { ASSETS, STAGE_NAMES } from '../data/config.js';
import { NPC } from '../data/npc.js';
import { showInfo, sectionTop, npcHero } from './modal.js';

// Bard's Corner (GDD §Bard's Corner). One song per stage, unlocked as stages are reached;
// optional lore tales reward coins on first listen.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TALES = [
  { name: 'The Lost Crown',  sub: "A tale of the realm's founding" },
  { name: 'The Knight of Old', sub: 'Why the treasure was hidden' },
];

export function createBardScene({ gameState, onBack }) {
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

  const tales = TALES.map((t) =>
    `<button type="button" class="kt-shop-row kt-tale">` +
      `<div class="kt-shop-info"><b>${t.name}</b><span>${t.sub}</span></div>` +
      `<span class="kt-buy" style="font-size:12px;"><img src="${ASSETS.ui}ui_coin.png" alt="">+5</span>` +
    `</button>`
  ).join('');

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
    b.addEventListener('click', () =>
      showInfo(scene, "A bard's tale", `<p>Settle in — full lore tales (and the coins for hearing them) arrive in a later chapter, knight.</p>`)
    )
  );

  return scene;
}
