import { ASSETS, STAGE_BG, STAGE_NAMES } from '../data/config.js';

const MENU_ICON = 'M4 7h16M4 12h16M4 17h16';

const SECTIONS = [
  { key: 'daily', label: 'Quests', icon: 'ui_nav_quests' },
  { key: 'inn', label: 'The Inn', icon: 'ui_nav_inn' },
  { key: 'glory', label: 'Glory', icon: 'ui_nav_glory' },
  { key: 'rank', label: 'Ranks', icon: 'ui_nav_rank' },
];

export const SECTION_TITLES = {
  daily: 'Daily Quests',
  inn: 'The Inn',
  glory: 'Hall of Glory',
  rank: 'Global Rank',
};

const COIN_SOURCES = [
  ['Complete any level', '+10'],
  ['1 / 2 / 3-star clear', '+5 / +15 / +30'],
  ['First time clearing a level', '+20'],
  ['No power-up used', '+15'],
  ['No mistakes', '+20'],
  ['Speedy clear', '+10'],
  ['Combo chains', '+3 to +20'],
  ['Daily login & quests', '+20 and up'],
];

export function createHomeScene({ gameState, onPlay, onSection }) {
  const save = gameState.save;
  const stage = save.currentStage || 1;
  const pct = Math.round((save.currentLevel / 25) * 100);
  const name = save.displayName || 'Knight';

  const scene = document.createElement('div');
  scene.id = 'kt-home';
  // Set the backdrop inline (resolves relative to the document, not the CSS file —
  // a relative url() inside a CSS custom property would resolve against /css/ and 404).
  scene.style.backgroundImage = `url("${STAGE_BG[stage] || ASSETS.bgForest}")`;

  scene.innerHTML =
    `<div class="kt-home-embers" aria-hidden="true"></div>` +
    `<div class="kt-home-scrim"></div>` +
    `<div class="kt-topbar">` +
      `<div class="kt-crest"><img src="${ASSETS.badges}badge_apprentice.png" alt=""></div>` +
      `<div class="kt-crest-info"><b>${name}</b><span>Apprentice Knight</span></div>` +
      `<button type="button" class="kt-icon-btn" id="kt-settings" aria-label="Menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${MENU_ICON}"/></svg></button>` +
    `</div>` +
    `<div class="kt-resbar">` +
      `<div class="kt-res"><img src="${ASSETS.badges}badge_apprentice.png" alt=""><span>Lv ${save.currentLevel}</span></div>` +
      `<button type="button" class="kt-res" id="kt-res-stam"><img src="${ASSETS.ui}ui_stamina.png" alt="" onerror="this.onerror=null;this.src='${ASSETS.ui}ui_tankard_full.png'"><span>5/5</span></button>` +
      `<button type="button" class="kt-res kt-res-coin" id="kt-res-coins"><img src="${ASSETS.ui}ui_coin.png" alt=""><span>${save.coins || 0}</span></button>` +
      `<button type="button" class="kt-res" id="kt-res-feats"><img src="${ASSETS.ui}ui_nav_glory.png" alt="" onerror="this.style.display='none'"><span>0</span></button>` +
    `</div>` +
    `<div class="kt-stage-head">` +
      `<div class="kt-stage-no">Stage ${stage}</div>` +
      `<h1 class="kt-stage-name">${STAGE_NAMES[stage] || 'The Forest Path'}</h1>` +
      `<div class="kt-stage-prog"><div class="kt-stage-bar"><span style="width:${pct}%"></span></div>` +
        `<div class="kt-stage-lvl">Level ${save.currentLevel} / 25</div></div>` +
    `</div>` +
    `<div class="kt-home-bottom">` +
      `<button type="button" class="kt-home-play"><span class="lbl">Play</span>` +
        `<span class="sub">Continue · Level ${save.currentLevel}</span></button>` +
      `<div class="kt-home-nav"></div>` +
    `</div>`;

  const nav = scene.querySelector('.kt-home-nav');
  SECTIONS.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kt-nav-btn';
    b.innerHTML =
      `<img class="ic" src="${ASSETS.ui}${s.icon}.png" alt="" onerror="this.style.display='none'">` +
      `<span class="lbl">${s.label}</span><span class="soon">soon</span>`;
    b.addEventListener('click', () => onSection(s.key));
    nav.appendChild(b);
  });

  scene.querySelector('.kt-home-play').addEventListener('click', onPlay);
  scene.querySelector('#kt-res-coins').addEventListener('click', () => showCoinInfo(scene));
  scene.querySelector('#kt-res-feats').addEventListener('click', () => onSection('glory'));
  scene.querySelector('#kt-res-stam').addEventListener('click', () =>
    showInfo(scene, 'Stamina', `<p>Each level costs <b>1 stamina</b>. It refills slowly over time, or rest and drink at <b>The Inn</b> to restore it.</p>`)
  );
  scene.querySelector('#kt-settings').addEventListener('click', () =>
    showInfo(scene, 'Settings', `<p>Sound, language and more options arrive in a later chapter, Sir Knight.</p>`)
  );

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

function showInfo(scene, title, bodyHtml) {
  const o = document.createElement('div');
  o.className = 'kt-info';
  o.innerHTML =
    `<div class="kt-info-card"><h3>${title}</h3>${bodyHtml}` +
    `<button type="button" class="kt-btn kt-info-close">Close</button></div>`;
  const close = () => o.remove();
  o.addEventListener('click', (e) => { if (e.target === o) close(); });
  o.querySelector('.kt-info-close').addEventListener('click', close);
  scene.appendChild(o);
}

function showCoinInfo(scene) {
  const rows = COIN_SOURCES.map(
    ([k, v]) => `<div class="kt-coin-row"><span>${k}</span><b>${v}</b></div>`
  ).join('');
  showInfo(
    scene,
    'How to earn coins',
    `<div class="kt-coin-pouch"><img src="${ASSETS.ui}ui_coin_pouch.png" alt=""></div>` +
      `<div class="kt-coin-list">${rows}</div>` +
      `<p class="kt-coin-foot">Spend coins at the Blacksmith on power-ups.</p>`
  );
}
