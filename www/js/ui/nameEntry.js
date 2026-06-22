import { ASSETS } from '../data/config.js';

// First-launch: ask the knight's name. Calls onConfirm(name) with a trimmed,
// capped name (falls back to "Knight" if left blank).
export function createNameEntryScene({ onConfirm }) {
  const scene = document.createElement('div');
  scene.id = 'kt-name';
  scene.style.setProperty('--bg-stage', `url("${ASSETS.bgCover}")`);
  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    `<div class="kt-name-card">` +
      `<div class="kt-name-seal"><img src="${ASSETS.badges}badge_apprentice.png" alt=""></div>` +
      `<h2>What name shall the bards sing?</h2>` +
      `<p>Speak it true, brave knight — your legend begins here.</p>` +
      `<input id="kt-name-input" type="text" maxlength="16" placeholder="Thy name…" autocomplete="off" spellcheck="false" />` +
      `<button type="button" class="kt-btn kt-name-go">Begin the quest</button>` +
    `</div>`;

  const input = scene.querySelector('#kt-name-input');
  const go = () => onConfirm((input.value.trim() || 'Knight').slice(0, 16));
  scene.querySelector('.kt-name-go').addEventListener('click', go);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });
  setTimeout(() => input.focus(), 60);
  return scene;
}
