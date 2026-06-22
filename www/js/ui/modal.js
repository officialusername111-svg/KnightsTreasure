import { ASSETS } from '../data/config.js';

// Lightweight themed info dialog, styled by the shared .kt-info classes in home.css.
// Reused by Inn / Quests for "coming soon" affordances and flavor pop-ups.
export function showInfo(parent, title, bodyHtml) {
  const o = document.createElement('div');
  o.className = 'kt-info';
  o.innerHTML =
    `<div class="kt-info-card"><h3>${title}</h3>${bodyHtml}` +
    `<button type="button" class="kt-btn kt-info-close">Close</button></div>`;
  const close = () => o.remove();
  o.addEventListener('click', (e) => { if (e.target === o) close(); });
  o.querySelector('.kt-info-close').addEventListener('click', close);
  parent.appendChild(o);
  return o;
}

// NPC greeting hero card (portrait + speech) shown at the top of a tavern hall.
export function npcHero(npc) {
  return (
    `<div class="kt-npc-hero">` +
      `<div class="av"><img src="${ASSETS.characters}${npc.heroPortrait}.png" alt="" onerror="this.style.display='none'"></div>` +
      `<p>“${npc.heroLine}”</p>` +
    `</div>`
  );
}

// Top bar shared by section scenes: back chevron, sub/title, optional coin balance.
// Pass coins=null to omit the coin pill (e.g. Settings).
export function sectionTop(sub, title, coins) {
  const coinPill = coins == null
    ? ''
    : `<div class="kt-sec-coin"><img src="${ASSETS.ui}ui_coin.png" alt="coins">${coins}</div>`;
  return (
    `<div class="kt-sec-top">` +
      `<button type="button" class="kt-sec-back" aria-label="Back to the keep">` +
        `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>` +
      `</button>` +
      `<div class="kt-sec-titles"><span>${sub}</span><h1>${title}</h1></div>` +
      coinPill +
    `</div>`
  );
}
