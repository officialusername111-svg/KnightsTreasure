import { ASSETS } from '../data/config.js';

// Section buttons for the home hub. `built: false` ones open a themed placeholder.
const SECTIONS = [
  { key: 'daily', label: 'Quests', built: false },
  { key: 'inn',   label: 'The Inn', built: false },
  { key: 'glory', label: 'Glory',  built: false },
  { key: 'rank',  label: 'Ranks',  built: false },
];

export function createHomeScene({ gameState, onPlay, onSection }) {
  const save = gameState.save;
  const scene = document.createElement('div');
  scene.id = 'kt-home';
  scene.style.setProperty('--bg-cover', `url("${ASSETS.bgCover}")`);

  scene.innerHTML =
    `<div class="kt-home-embers" aria-hidden="true"></div>` +
    `<div class="kt-home-scrim"></div>` +
    `<div class="kt-home-top">` +
      `<div class="kt-crest"><img src="${ASSETS.badges}badge_apprentice.png" alt=""></div>` +
      `<div class="kt-crest-name"><b>${save.displayName || 'Knight'}</b><span>Apprentice Knight</span></div>` +
      `<div class="kt-home-coins"><img src="${ASSETS.ui}ui_coin.png" alt=""> ${save.coins || 0}</div>` +
    `</div>` +
    `<div class="kt-home-title"><h1>Knight's Treasure</h1><p>The Forest Path</p></div>` +
    `<div class="kt-home-actions">` +
      `<button type="button" class="kt-home-play">` +
        `<span class="lbl">Play</span><span class="sub">Continue · Level ${save.currentLevel}</span>` +
      `</button>` +
      `<div class="kt-home-nav"></div>` +
    `</div>`;

  const nav = scene.querySelector('.kt-home-nav');
  SECTIONS.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kt-nav-btn';
    b.innerHTML = `<span class="lbl">${s.label}</span>` + (s.built ? '' : `<span class="soon">soon</span>`);
    b.addEventListener('click', () => onSection(s.key));
    nav.appendChild(b);
  });
  scene.querySelector('.kt-home-play').addEventListener('click', onPlay);

  const embers = scene.querySelector('.kt-home-embers');
  for (let i = 0; i < 14; i++) {
    const e = document.createElement('div');
    e.className = 'kt-ember-rise';
    e.style.left = Math.random() * 100 + '%';
    e.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
    e.style.animationDuration = (5 + Math.random() * 5).toFixed(2) + 's';
    embers.appendChild(e);
  }
  return scene;
}

export const SECTION_TITLES = {
  daily: 'Daily Quests',
  inn: 'The Inn',
  glory: 'Hall of Glory',
  rank: 'Global Rank',
};
