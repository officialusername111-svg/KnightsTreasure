import { ASSETS } from '../data/config.js';

// Themed "coming soon" scene for sections not yet built. Returns home via onBack.
export function createPlaceholderScene({ title, onBack }) {
  const scene = document.createElement('div');
  scene.id = 'kt-placeholder';
  scene.style.backgroundImage = `url("${ASSETS.bgCover}")`;
  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    `<div class="kt-ph-card">` +
      `<div class="kt-ph-seal"><img src="${ASSETS.badges}badge_commander.png" alt=""></div>` +
      `<h2>${title}</h2>` +
      `<p>This hall awaits a later chapter of your quest, Sir Knight. Return soon.</p>` +
      `<button type="button" class="kt-btn kt-ph-back">Back to the keep</button>` +
    `</div>`;
  scene.querySelector('.kt-ph-back').addEventListener('click', onBack);
  return scene;
}
