import { ASSETS } from '../data/config.js';
import { NPC } from '../data/npc.js';
import { showInfo, sectionTop, npcHero } from './modal.js';

// Tavern sub-areas (GDD §Tavern Sub-Areas). Daily Duty lives on the home nav as Quests.
const HALLS = [
  { key: 'bard',    name: "Bard's Corner", sub: 'Songs & tales',   portrait: 'bard/bard_playful' },
  { key: 'gambler', name: "Gambler's Den", sub: 'Dice of fortune', portrait: 'gambler/gambler_sly' },
];

// The Inn (Tavern main room, GDD §Tavern). Buy drinks to refill stamina.
const DRINKS = [
  { id: 'ale',   name: 'Ale',            img: 'ui_item_ale',          effect: '+1 stamina',  cost: 15 },
  { id: 'wine',  name: 'Wine',           img: 'ui_item_wine',         effect: '+2 stamina',  cost: 25 },
  { id: 'mead',  name: 'Mead',           img: 'ui_item_mead',         effect: '+3 stamina',  cost: 35 },
  { id: 'feast', name: 'Feast',          img: 'ui_item_feast',        effect: 'Full restore', cost: 60 },
  { id: 'brew',  name: "Knight's Brew",  img: 'ui_item_knights_brew', effect: 'Full restore · next level starts 2★', cost: 90, feature: true },
];

const MAX_STAMINA = 5;

export function createInnScene({ gameState, onBack, onHall }) {
  const save = gameState.save;
  const coins = save.coins || 0;
  const stamina = Math.max(0, Math.min(MAX_STAMINA, save.stamina ?? MAX_STAMINA));

  const scene = document.createElement('div');
  scene.id = 'kt-inn';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgInn}")`;

  const tankards = Array.from({ length: MAX_STAMINA }, (_, i) =>
    `<img src="${ASSETS.ui}ui_tankard_${i < stamina ? 'full' : 'empty'}.png" alt="">`
  ).join('');

  const rows = DRINKS.map((d) =>
    `<div class="kt-shop-row${d.feature ? ' feat' : ''}">` +
      `<div class="kt-shop-ic"><img src="${ASSETS.ui}${d.img}.png" alt="" onerror="this.style.display='none'"></div>` +
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
    sectionTop('Rest & refill', 'The Inn', coins) +
    `<div class="kt-sec-body">` +
      `<div class="kt-inn-stamina">` +
        `<span class="lbl">Your stamina</span>` +
        `<span class="tankards">${tankards}</span>` +
        `<span class="val">${stamina} / ${MAX_STAMINA}</span>` +
      `</div>` +
      npcHero(NPC.inn) +
      `<div class="kt-panel">${rows}</div>` +
      `<button type="button" class="kt-inn-ad">` +
        `<img src="${ASSETS.ui}ui_stamina.png" alt="">` +
        `<span><b>Hear a tavern tale</b><i>+1 stamina, free · 3 left this hour</i></span>` +
        `<em class="soon">soon</em>` +
      `</button>` +
      `<div class="kt-sub-head">Tavern halls</div>` +
      `<div class="kt-sub-row">${halls}</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('.kt-buy').forEach((b) =>
    b.addEventListener('click', () =>
      showInfo(scene, 'The Innkeeper',
        `<p>The coin pouch and stamina barrels open for business in a later chapter, knight. Your brew will keep.</p>`)
    )
  );
  scene.querySelector('.kt-inn-ad').addEventListener('click', () =>
    showInfo(scene, 'Hear a tavern tale',
      `<p>Free stamina from the bard's tales arrives once the ad seam is wired in.</p>`)
  );
  scene.querySelectorAll('.kt-sub').forEach((b) =>
    b.addEventListener('click', () => onHall && onHall(b.dataset.key))
  );

  return scene;
}
