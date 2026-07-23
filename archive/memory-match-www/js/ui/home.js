import { ASSETS, STAGE_BG, STAGE_NAMES } from '../data/config.js';
import { rankFor, totalStars } from '../systems/ranks.js';
import * as stamina from '../systems/stamina.js';
import { COIN_SOURCES } from '../systems/economy.js';

const MENU_ICON = 'M4 7h16M4 12h16M4 17h16';
// Dedicated nav art (2026-07-08): parchment-letter Mail and anvil Smith icons join the
// ui_nav_* family, replacing the placeholder SVG glyphs.
const MAIL_IMG = `<img class="kt-mail-ic" src="assets/images/ui/ui_nav_mail.png" alt="">`;

// Right rail = journey/economy; left rail = recognition. Mail lives in the top bar.
const RAIL_RIGHT = [
  { key: 'daily', label: 'Quests', icon: 'ui_nav_quests' },
  { key: 'inn', label: 'The Inn', icon: 'ui_nav_inn' },
  { key: 'blacksmith', label: 'Smith', icon: 'ui_nav_smith' },
];
const RAIL_LEFT = [
  { key: 'glory', label: 'Glory', icon: 'ui_nav_glory' },
  { key: 'rank', label: 'Ranks', icon: 'ui_nav_rank' },
];

export const SECTION_TITLES = {
  daily: 'Daily Quests',
  inn: 'The Inn',
  glory: 'Hall of Glory',
  rank: 'Leaderboards',
  blacksmith: 'Blacksmith',
};

export function createHomeScene({ gameState, onPlay, onSection, onMenu, onMap, onMail }) {
  const save = gameState.save;
  const stage = save.currentStage || 1;
  const pct = Math.round((save.currentLevel / 25) * 100);
  const name = save.displayName || 'Knight';
  const rank = rankFor(save);
  const stam = stamina.current(save);
  const canPlay = stam >= 1;
  const unread = (save.mail || []).filter((m) => !m.read).length;

  const scene = document.createElement('div');
  scene.id = 'kt-home';
  // Set the backdrop inline (resolves relative to the document, not the CSS file —
  // a relative url() inside a CSS custom property would resolve against /css/ and 404).
  scene.style.backgroundImage = `url("${STAGE_BG[stage] || ASSETS.bgForest}")`;

  scene.innerHTML =
    `<div class="kt-home-embers" aria-hidden="true"></div>` +
    `<div class="kt-home-scrim"></div>` +
    `<div class="kt-topbar">` +
      `<div class="kt-ident">` +
        `<div class="kt-crest"><img src="${ASSETS.badges}${rank.badge}.png" alt="" onerror="this.onerror=null;this.src='${ASSETS.badges}badge_apprentice.png'">` +
          `<span class="kt-crest-lvl">${save.currentLevel}</span></div>` +
        `<div class="kt-ident-txt"><b>${name}</b><span class="kt-rank">${rank.name}</span></div>` +
      `</div>` +
      `<div class="kt-topbtns">` +
        `<button type="button" class="kt-mail-btn" id="kt-mail" aria-label="Mail">${MAIL_IMG}${unread ? `<span class="kt-mail-badge">${unread > 9 ? '9+' : unread}</span>` : ''}</button>` +
        `<button type="button" class="kt-icon-btn" id="kt-settings" aria-label="Menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${MENU_ICON}"/></svg></button>` +
      `</div>` +
    `</div>` +
    `<div class="kt-res-stack">` +
      `<button type="button" class="kt-res" id="kt-res-stam"><img src="${ASSETS.ui}ui_stamina.png" alt="" onerror="this.onerror=null;this.src='${ASSETS.ui}ui_tankard_full.png'"><span id="kt-stam-val">${stam}/${stamina.MAX_STAMINA}</span></button>` +
      `<button type="button" class="kt-res kt-res-coin" id="kt-res-coins"><img src="${ASSETS.ui}ui_coin.png" alt=""><span id="kt-coins-val">${save.coins || 0}</span></button>` +
      `<button type="button" class="kt-res" id="kt-res-feats"><img src="${ASSETS.ui}ui_star_full.png" alt="" onerror="this.style.display='none'"><span>${totalStars(save)}</span></button>` +
    `</div>` +
    `<button type="button" class="kt-stage-head" id="kt-stage-head">` +
      `<div class="kt-stage-no">Stage ${stage}</div>` +
      `<h1 class="kt-stage-name">${STAGE_NAMES[stage] || 'The Forest Path'}</h1>` +
      `<div class="kt-stage-prog"><div class="kt-stage-bar"><span style="width:${pct}%"></span></div>` +
        `<div class="kt-stage-lvl">Level ${save.currentLevel} / 25 · view map</div></div>` +
    `</button>` +
    `<div class="kt-rail left" id="kt-rail-left"></div>` +
    `<div class="kt-rail" id="kt-rail-right"></div>` +
    `<div class="kt-home-bottom">` +
      `<button type="button" class="kt-home-play${canPlay ? '' : ' depleted'}"><span class="lbl">Play</span>` +
        `<span class="sub">${canPlay ? `Continue · Level ${save.currentLevel}` : 'Out of stamina — rest at the Inn'}</span></button>` +
    `</div>`;

  const buildRail = (railEl, items) => items.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kt-rail-btn';
    const icon = s.svg
      ? s.svg
      : `<img class="ic" src="${ASSETS.ui}${s.icon}.png" alt="" onerror="this.style.display='none'">`;
    b.innerHTML = `${icon}<span class="lbl">${s.label}</span>`;
    b.addEventListener('click', () => onSection(s.key));
    railEl.appendChild(b);
  });
  buildRail(scene.querySelector('#kt-rail-right'), RAIL_RIGHT);
  buildRail(scene.querySelector('#kt-rail-left'), RAIL_LEFT);

  scene.querySelector('#kt-mail').addEventListener('click', () => onMail && onMail());
  scene.querySelector('.kt-home-play').addEventListener('click', () => (canPlay ? onPlay() : onSection('inn')));
  scene.querySelector('#kt-stage-head').addEventListener('click', () => onMap && onMap());
  scene.querySelector('#kt-res-coins').addEventListener('click', () => showCoinInfo(scene));
  scene.querySelector('#kt-res-feats').addEventListener('click', () => onSection('glory'));
  scene.querySelector('#kt-res-stam').addEventListener('click', () =>
    showInfo(scene, 'Stamina',
      `<p>Each level costs <b>1 stamina</b>. It refills <b>1 every 30 min</b> (next in <b>${stamina.countdownText(save)}</b>), or rest and drink at <b>The Inn</b> to restore it.</p>`)
  );
  scene.querySelector('#kt-settings').addEventListener('click', () => onMenu && onMenu());

  // Keep the stamina pill live while the home is on screen; self-clears once detached.
  const stamEl = scene.querySelector('#kt-stam-val');
  const tick = setInterval(() => {
    if (!stamEl.isConnected) { clearInterval(tick); return; }
    stamEl.textContent = `${stamina.current(save)}/${stamina.MAX_STAMINA}`;
  }, 15000);

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
