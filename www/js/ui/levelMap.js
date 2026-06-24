import { ASSETS, STAGE_NAMES } from '../data/config.js';
import { sectionTop } from './modal.js';
import { stageComplete } from '../systems/ranks.js';

// Quest Map (D-map): the long road through all 10 stages. A vertical trail of
// stage nodes — completed / current / locked — sitting on a golden journey path.
// Stage 10 sits at the top so the road reads bottom-up (start at the foot, climb).

const STAGE_SLUG = {
  1: 'forest', 2: 'village', 3: 'river', 4: 'cave', 5: 'camp',
  6: 'gates', 7: 'dungeon', 8: 'throne', 9: 'lair', 10: 'vault',
};

const STARS_PER_STAGE = 75; // 25 levels × 3★
const TOTAL_LEVELS = 250;   // 10 stages × 25 levels

// Sum the stars earned across every level of stage n (save.stars keys like "3-12").
function starsInStage(save, n) {
  const stars = save.stars || {};
  const prefix = `${n}-`;
  let sum = 0;
  for (const key in stars) {
    if (key.indexOf(prefix) === 0) sum += stars[key] || 0;
  }
  return sum;
}

export function createLevelMapScene({ gameState, onBack, onPlayStage }) {
  const save = gameState.save;
  const coins = Math.round(save.coins || 0);
  const current = save.currentStage || 1;
  const clearedLevels = (save.completedLevels || []).length;

  const scene = document.createElement('div');
  scene.id = 'kt-map';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgMap}")`;

  // Render stage 10 → 1 (top to bottom) so the trail climbs upward.
  const nodes = [];
  for (let n = 10; n >= 1; n--) {
    const done = stageComplete(save, n);
    const isCurrent = n === current;
    const locked = n > current && !done;
    const state = locked ? 'locked' : isCurrent ? 'current' : 'done';

    const earned = Math.round(starsInStage(save, n));
    const slug = STAGE_SLUG[n];
    const badge = `${ASSETS.badges}badge_stage${n}_${slug}.png`;

    const stateTag =
      state === 'done'
        ? `<span class="kt-map-state cleared">Cleared <em>✓</em></span>`
        : state === 'current'
        ? `<button type="button" class="kt-map-go" data-stage="${n}">Continue</button>`
        : `<span class="kt-map-state locked"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> Locked</span>`;

    const tappable = state === 'done' || state === 'current';

    nodes.push(
      `<div class="kt-map-node ${state}"${tappable ? ` data-stage="${n}" role="button" tabindex="0"` : ''}>` +
        `<div class="kt-map-marker"><span class="kt-map-num">${n}</span></div>` +
        `<div class="kt-map-card">` +
          `<div class="kt-map-badge"><img src="${badge}" alt="" onerror="this.style.display='none'"></div>` +
          `<div class="kt-map-info">` +
            `<b>Stage ${n} · ${STAGE_NAMES[n] || ''}</b>` +
            `<span class="kt-map-stars"><img src="${ASSETS.ui}ui_star_full.png" alt="" onerror="this.style.display='none'">${earned} / ${STARS_PER_STAGE}</span>` +
          `</div>` +
          stateTag +
        `</div>` +
      `</div>`
    );
  }

  const pct = Math.min(100, Math.round((clearedLevels / TOTAL_LEVELS) * 100));

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('The long road', 'Quest Map', coins) +
    `<div class="kt-sec-body">` +
      `<div class="kt-map-overall">` +
        `<div class="kt-map-overall-head">` +
          `<span>Levels cleared</span>` +
          `<b>${clearedLevels} / ${TOTAL_LEVELS}</b>` +
        `</div>` +
        `<div class="kt-stage-bar"><span style="width:${pct}%"></span></div>` +
      `</div>` +
      `<div class="kt-map-trail">${nodes.join('')}</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  const play = (stage) => {
    const n = Number(stage);
    if (n && onPlayStage) onPlayStage(n);
  };

  scene.querySelectorAll('.kt-map-node[data-stage]').forEach((node) => {
    node.addEventListener('click', () => play(node.dataset.stage));
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        play(node.dataset.stage);
      }
    });
  });
  // Continue button (within current node) — stop double-firing via the node handler.
  scene.querySelectorAll('.kt-map-go').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      play(btn.dataset.stage);
    });
  });

  return scene;
}
