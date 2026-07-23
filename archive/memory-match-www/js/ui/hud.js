import { TEXT, ASSETS } from '../data/config.js';

export function renderHud({ stage, level, timeLimit, coins, name, rank, badge = 'badge_apprentice' }) {
  const el = document.createElement('div');
  el.id = 'kt-hud';
  el.innerHTML =
    `<div class="kt-hud-top">` +
      `<div class="kt-badge"><img src="${ASSETS.badges}${badge}.png" alt="" onerror="this.onerror=null;this.src='${ASSETS.badges}badge_apprentice.png'"></div>` +
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
    if (el.dataset.frozen) return;               // Shield holds the display; game restores after
    v.textContent = s == null ? TEXT.noTimer : s;
    v.classList.toggle('danger', s != null && s <= 10);
  };
  // Shield power-up: swap the timer value for a blinking shield while the countdown is frozen.
  el.setFrozen = (on) => {
    const v = el.querySelector('#kt-timer-val');
    if (on) {
      el.dataset.frozen = '1';
      v.innerHTML = `<img class="kt-timer-shield" src="${ASSETS.ui}ui_power_shield.png" alt="Timer frozen">`;
    } else {
      delete el.dataset.frozen;
      v.textContent = '';                         // caller follows with setTime(timeLeft)
    }
  };
  el.setCoins = (n) => { el.querySelector('#kt-coins-val').textContent = n; };
  return el;
}
