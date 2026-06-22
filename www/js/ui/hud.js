import { TEXT, ASSETS } from '../data/config.js';

export function renderHud({ stage, level, timeLimit, coins, name, rank }) {
  const el = document.createElement('div');
  el.id = 'kt-hud';
  el.innerHTML =
    `<div class="kt-hud-top">` +
      `<div class="kt-badge"><img src="${ASSETS.badges}badge_apprentice.png" alt=""></div>` +
      `<div class="kt-name"><b>${name}</b><span>${rank}</span></div>` +
      `<div class="kt-coins"><img src="${ASSETS.ui}ui_coin.png" alt=""> <span id="kt-coins-val">${coins}</span></div>` +
    `</div>` +
    `<div class="kt-stats">` +
      `<div class="kt-stat"><div class="lbl">${TEXT.stageLabel}</div><div class="val">${stage}</div></div>` +
      `<div class="kt-stat"><div class="lbl">${TEXT.levelLabel}</div><div class="val">${level}</div></div>` +
      `<div class="kt-stat"><div class="lbl">${TEXT.timeLabel}</div><div class="val" id="kt-timer-val">${timeLimit == null ? TEXT.noTimer : timeLimit}</div></div>` +
    `</div>`;
  el.setTime = (s) => {
    const v = el.querySelector('#kt-timer-val');
    v.textContent = s == null ? TEXT.noTimer : s;
    v.classList.toggle('danger', s != null && s <= 10);
  };
  el.setCoins = (n) => { el.querySelector('#kt-coins-val').textContent = n; };
  return el;
}
