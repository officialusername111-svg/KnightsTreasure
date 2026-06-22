import { ASSETS } from '../data/config.js';
import { NPC } from '../data/npc.js';
import { showInfo, sectionTop, npcHero } from './modal.js';

// Gambler's Den (GDD §Gambler's Den). 1 coin per roll, 45% win → +1 stamina, lose → −1 coin,
// 3 free rolls / hour. The coin & stamina economy is deferred, so the roll here is cosmetic.
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieFace = (v) =>
  Array.from({ length: 9 }, (_, i) => `<span${PIPS[v].includes(i) ? '' : ' style="visibility:hidden"'}></span>`).join('');

export function createGamblerScene({ gameState, onBack }) {
  const save = gameState.save;
  const coins = save.coins || 0;

  const scene = document.createElement('div');
  scene.id = 'kt-gambler';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgGamblers}")`;

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Dice of fortune', "Gambler's Den", coins) +
    `<div class="kt-sec-body">` +
      npcHero(NPC.gambler) +
      `<div class="kt-table">` +
        `<div class="kt-dice"><div class="kt-die" id="die-a">${dieFace(4)}</div><div class="kt-die" id="die-b">${dieFace(3)}</div></div>` +
        `<div class="kt-roll-res">Beat the dice — fortune favors the bold.</div>` +
      `</div>` +
      `<div class="kt-odds">` +
        `<div class="o"><div class="v">45%</div><div class="l">Win chance</div></div>` +
        `<div class="o"><div class="v">+1</div><div class="l">Stamina won</div></div>` +
        `<div class="o"><div class="v">−1</div><div class="l">Coin if lost</div></div>` +
      `</div>` +
      `<div class="kt-tries">Free rolls: <b>3 / 3</b> this hour</div>` +
      `<button type="button" class="kt-roll" id="kt-roll"><img src="${ASSETS.ui}ui_coin.png" alt="">Roll · 1 coin</button>` +
      `<button type="button" class="kt-inn-ad" id="kt-roll-ad">` +
        `<img src="${ASSETS.ui}ui_coin.png" alt="">` +
        `<span><b>Watch for +3 rolls</b><i>Once per cooldown</i></span>` +
        `<em class="soon">soon</em>` +
      `</button>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  const dieA = scene.querySelector('#die-a');
  const dieB = scene.querySelector('#die-b');
  const res = scene.querySelector('.kt-roll-res');
  let rolling = false;
  scene.querySelector('#kt-roll').addEventListener('click', () => {
    if (rolling) return;
    rolling = true;
    res.textContent = 'The dice tumble…';
    let ticks = 0;
    const spin = setInterval(() => {
      dieA.innerHTML = dieFace(1 + Math.floor(Math.random() * 6));
      dieB.innerHTML = dieFace(1 + Math.floor(Math.random() * 6));
      if (++ticks >= 8) {
        clearInterval(spin);
        rolling = false;
        res.innerHTML = `A fine throw, knight. <b>Real stakes — coins & stamina — arrive soon.</b>`;
      }
    }, 70);
  });

  scene.querySelector('#kt-roll-ad').addEventListener('click', () =>
    showInfo(scene, "Gambler's Den", `<p>Extra rolls from watching a tale arrive once the ad seam is wired in.</p>`)
  );

  return scene;
}
