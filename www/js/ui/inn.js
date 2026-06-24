import { ASSETS } from '../data/config.js';
import { NPC } from '../data/npc.js';
import { CONSUMABLES } from '../data/items.js';
import { persistSave } from '../core/save.js';
import { buyDrink } from '../systems/tavern.js';
import * as stamina from '../systems/stamina.js';
import { showInfo, sectionTop, npcHero, toast } from './modal.js';

// Tavern sub-areas (GDD §Tavern Sub-Areas). Daily Duty lives on the home nav as Quests.
const HALLS = [
  { key: 'bard',       name: "Bard's Corner", sub: 'Songs & tales',    portrait: 'bard/bard_playful' },
  { key: 'gambler',    name: "Gambler's Den", sub: 'Dice of fortune',  portrait: 'gambler/gambler_sly' },
  { key: 'blacksmith', name: 'Blacksmith',    sub: 'Forge power-ups',  portrait: 'blacksmith/blacksmith_happy' },
];

// The Inn (Tavern main room, GDD §Tavern). Buy drinks to refill stamina.
export function createInnScene({ gameState, adapter, onBack, onHall }) {
  const save = gameState.save;
  const MAX = stamina.MAX_STAMINA;

  const scene = document.createElement('div');
  scene.id = 'kt-inn';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgInn}")`;

  const rows = CONSUMABLES.map((d) =>
    `<div class="kt-shop-row${d.brewBonus ? ' feat' : ''}">` +
      `<div class="kt-shop-ic"><img src="${ASSETS.ui}${d.icon}.png" alt="" onerror="this.style.display='none'"></div>` +
      `<div class="kt-shop-info"><b>${d.name}</b><span>${d.effect}</span></div>` +
      `<button type="button" class="kt-buy" data-id="${d.id}"><img src="${ASSETS.ui}ui_coin.png" alt="">${d.cost}</button>` +
    `</div>`
  ).join('');

  const halls = HALLS.map((h) =>
    `<button type="button" class="kt-sub" data-key="${h.key}">` +
      `<span class="av"><img src="${ASSETS.characters}${h.portrait}.png" alt="" onerror="this.style.display='none'"></span>` +
      `<span class="t"><b>${h.name}</b><span>${h.sub}</span></span>` +
    `</button>`
  ).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Rest & refill', 'The Inn', save.coins || 0) +
    `<div class="kt-sec-body">` +
      `<div class="kt-inn-stamina">` +
        `<span class="lbl">Your stamina</span>` +
        `<span class="tankards"></span>` +
        `<span class="val"></span>` +
      `</div>` +
      npcHero(NPC.inn) +
      `<div class="kt-panel">${rows}</div>` +
      `<button type="button" class="kt-inn-ad">` +
        `<img src="${ASSETS.ui}ui_stamina.png" alt="">` +
        `<span><b>Hear a tavern tale</b><i>+1 stamina, free · ad reward</i></span>` +
        `<em class="soon">soon</em>` +
      `</button>` +
      `<div class="kt-sub-head">Tavern halls</div>` +
      `<div class="kt-sub-row">${halls}</div>` +
    `</div>`;

  const refreshUI = () => {
    const cur = stamina.current(save);
    scene.querySelector('.kt-inn-stamina .tankards').innerHTML = Array.from({ length: MAX }, (_, i) =>
      `<img src="${ASSETS.ui}ui_tankard_${i < cur ? 'full' : 'empty'}.png" alt="">`).join('');
    scene.querySelector('.kt-inn-stamina .val').textContent = `${cur} / ${MAX}`;
    scene.querySelector('.kt-sec-coin-val').textContent = save.coins || 0;
  };
  refreshUI();

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('.kt-buy').forEach((b) =>
    b.addEventListener('click', () => {
      const res = buyDrink(save, b.dataset.id);
      if (res.ok) {
        persistSave(adapter, save);
        refreshUI();
        toast(scene, `Drink poured — +${res.restored} stamina`);
      } else if (res.reason === 'full') {
        toast(scene, 'Your stamina is already full, knight.');
      } else {
        toast(scene, 'Not enough coins — earn more in battle.');
      }
    })
  );
  scene.querySelector('.kt-inn-ad').addEventListener('click', () =>
    showInfo(scene, 'Hear a tavern tale', `<p>Free stamina from a tavern tale arrives once the ad seam is wired in.</p>`)
  );
  scene.querySelectorAll('.kt-sub').forEach((b) =>
    b.addEventListener('click', () => onHall && onHall(b.dataset.key))
  );

  return scene;
}
