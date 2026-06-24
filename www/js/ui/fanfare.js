// Reusable celebration effects. All gated by settings.fanfare (defaults on).
// `small` = a confetti/spark burst (purchases, gambler wins, power-up casts).
// `page`  = a full-screen banner + confetti (achievements). Audio is attached in
// the audio phase via the optional `sfx` hook.
import { sfx } from '../systems/audio.js';

const COLORS = ['#f5c842', '#e8550a', '#f6d57a', '#caa45a', '#ffe9a8'];

function confettiBurst(parent, count, originY) {
  const layer = document.createElement('div');
  layer.className = 'kt-confetti-layer';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('i');
    b.className = 'kt-confetti';
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    b.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    b.style.setProperty('--dy', `${Math.sin(ang) * dist - 40}px`);
    b.style.setProperty('--rot', `${(Math.random() * 720 - 360)}deg`);
    b.style.left = '50%';
    b.style.top = (originY || 50) + '%';
    b.style.background = COLORS[i % COLORS.length];
    b.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
    layer.appendChild(b);
  }
  parent.appendChild(layer);
  setTimeout(() => layer.remove(), 1300);
}

export function fanfare(parent, { settings, kind = 'small', originY = 50 } = {}) {
  if (settings && settings.fanfare === false) return;
  confettiBurst(parent, kind === 'page' ? 40 : 16, originY);
  sfx('fanfare');
}

// Full-screen celebration for an achievement. Tap or auto-dismiss → onDone.
export function pageFanfare(parent, { settings, title, subtitle = '', onDone } = {}) {
  const ov = document.createElement('div');
  ov.className = 'kt-fanfare-page';
  ov.innerHTML =
    `<div class="kt-fanfare-card">` +
      `<div class="kt-fanfare-rays" aria-hidden="true"></div>` +
      `<div class="kt-fanfare-title">${title}</div>` +
      (subtitle ? `<div class="kt-fanfare-sub">${subtitle}</div>` : '') +
      `<button type="button" class="kt-btn kt-fanfare-go">Glorious!</button>` +
    `</div>`;
  const done = () => { ov.remove(); onDone && onDone(); };
  ov.querySelector('.kt-fanfare-go').addEventListener('click', done);
  parent.appendChild(ov);
  if (!(settings && settings.fanfare === false)) {
    confettiBurst(ov, 48, 38);
    sfx('fanfare');
  }
  return ov;
}
