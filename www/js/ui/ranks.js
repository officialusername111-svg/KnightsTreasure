import { ASSETS, STAGE_NAMES } from '../data/config.js';
import { persistSave } from '../core/save.js';
import {
  getLeaderboard, getStageLeaderboard, getMyPlacement, submitBroadcast,
} from '../services/social.js';
import { sectionTop } from './modal.js';

// Ranks (D16): local social leaderboards — Daily / Weekly / Monthly / All-Time +
// a per-Stage board, powered by services/social.js (a Firebase-shaped simulation).
// Rank-1-3 players may leave a short broadcast line that shows on their row.

const SCOPE_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'allTime', label: 'All-Time' },
  { id: 'stage', label: 'Stage' },
];
const SCOPE_BLURB = {
  daily: 'Today’s fastest minds',
  weekly: 'This week across the realm',
  monthly: 'This month’s finest',
  allTime: 'Legends of all time',
};
const TOP_SLICE = 10;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');

export function createRanksScene({ gameState, adapter, onBack }) {
  const save = gameState.save;

  const scene = document.createElement('div');
  scene.id = 'kt-ranks';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgMap}")`;

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Champions of the realm', 'Ranks', Math.round(save.coins || 0)) +
    `<div class="kt-sec-body">` +
      `<div class="kt-seg kt-ranks-seg" id="ranks-tabs">` +
        SCOPE_TABS.map((t, i) =>
          `<button type="button" data-scope="${t.id}"${i === 0 ? ' class="on"' : ''}>${t.label}</button>`
        ).join('') +
      `</div>` +
      `<div class="kt-ranks-stagesel" id="ranks-stagesel" hidden></div>` +
      `<div class="kt-ranks-blurb" id="ranks-blurb"></div>` +
      `<div class="kt-ranks-cast" id="ranks-cast"></div>` +
      `<div class="kt-panel kt-ranks-board" id="ranks-board"></div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  const tabsEl = scene.querySelector('#ranks-tabs');
  const stageSelEl = scene.querySelector('#ranks-stagesel');
  const blurbEl = scene.querySelector('#ranks-blurb');
  const castEl = scene.querySelector('#ranks-cast');
  const boardEl = scene.querySelector('#ranks-board');

  let scope = 'daily';
  let stage = save.currentStage || 1;
  let reqToken = 0;   // guards against out-of-order async renders

  // ----- stage selector (1..10), built once, shown only for the Stage tab -----
  stageSelEl.innerHTML = [...Array(10)].map((_, i) => {
    const n = i + 1;
    return `<button type="button" data-stage="${n}"${n === stage ? ' class="on"' : ''}>${n}</button>`;
  }).join('');
  stageSelEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-stage]');
    if (!btn) return;
    stage = Number(btn.dataset.stage);
    stageSelEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    render();
  });

  // ----- skeleton rows (no layout shift while the Promise resolves) -----
  function skeleton() {
    boardEl.innerHTML = [...Array(6)].map(() =>
      `<div class="kt-rk-row sk">` +
        `<span class="rk"><i class="sk-b" style="width:18px"></i></span>` +
        `<span class="who"><i class="sk-b" style="width:62%"></i><i class="sk-b sm" style="width:38%"></i></span>` +
        `<span class="sc"><i class="sk-b" style="width:46px"></i></span>` +
      `</div>`
    ).join('');
  }

  function rowHtml(r, topComment) {
    const showComment = topComment && r.comment && String(r.comment).trim();
    const place = r.rank <= 3 ? ` top p${r.rank}` : '';
    return `<div class="kt-rk-row${r.you ? ' me' : ''}${place}">` +
      `<span class="rk">${r.rank}</span>` +
      `<span class="who">` +
        `<b>${esc(r.name)}${r.you ? ' <em class="you-tag">You</em>' : ''}</b>` +
        `<span class="ti">${esc(r.title)}</span>` +
        (showComment ? `<span class="cm">“${esc(r.comment)}”</span>` : '') +
      `</span>` +
      `<span class="sc">${fmt(r.score)}</span>` +
    `</div>`;
  }

  // Ranks 1–3 render as a gold/silver/bronze podium; 4+ as the normal list.
  function podiumCol(r, cls, crown) {
    if (!r) return '';
    const cm = r.comment && String(r.comment).trim() ? `<div class="cm">“${esc(r.comment)}”</div>` : '';
    return `<div class="kt-podium-col ${cls}${r.you ? ' me' : ''}">` +
      (crown ? `<div class="crown">👑</div>` : '') +
      `<div class="medal">${r.rank}</div>` +
      `<div class="nm">${esc(r.name)}${r.you ? ' <em class="you-tag">You</em>' : ''}</div>` +
      `<div class="ti">${esc(r.title)}</div>` + cm +
      `<div class="bar"><span class="sc">${fmt(r.score)}</span></div>` +
    `</div>`;
  }
  function podiumHtml(podium) {
    const byRank = {};
    podium.forEach((r) => { byRank[r.rank] = r; });
    return `<div class="kt-podium">${podiumCol(byRank[2], 'p2')}${podiumCol(byRank[1], 'p1', true)}${podiumCol(byRank[3], 'p3')}</div>`;
  }

  function renderBoard(rows) {
    const top = rows.slice(0, TOP_SLICE);
    const podium = top.filter((r) => r.rank <= 3).sort((a, b) => a.rank - b.rank);
    const rest = top.filter((r) => r.rank > 3);
    let html = (podium.length ? podiumHtml(podium) : '') + rest.map((r) => rowHtml(r, false)).join('');
    // append the player's own row if it fell outside the visible slice
    if (!top.some((r) => r.you)) {
      const mine = rows.find((r) => r.you);
      if (mine) {
        html += `<div class="kt-rk-gap"><span>⋯</span></div>`;
        html += rowHtml(mine, false);
      }
    }
    boardEl.innerHTML = html || `<div class="kt-rk-empty">No champions yet.</div>`;
  }

  // ----- broadcast panel (rank 1-3 only); replaces #ranks-cast contents -----
  function renderBroadcast(placement) {
    const bc = save.broadcast || { text: '', locked: false };
    if (!placement || placement.rank > 3) { castEl.innerHTML = ''; return; }

    if (bc.locked) {
      castEl.innerHTML =
        `<div class="kt-rk-cast sealed">` +
          `<div class="hd">✨ You’re top-3 — your word stands</div>` +
          (bc.text ? `<p class="ln">“${esc(bc.text)}”</p>` : '') +
          `<div class="lk">Your message is sealed.</div>` +
        `</div>`;
      return;
    }

    castEl.innerHTML =
      `<div class="kt-rk-cast">` +
        `<div class="hd">✨ You’re top-3 — leave a word for the realm</div>` +
        `<div class="rowf">` +
          `<input type="text" id="rk-bc-input" maxlength="100" placeholder="A line every knight will see…" value="${esc(bc.text || '')}">` +
          `<button type="button" class="kt-buy" id="rk-bc-submit">Submit</button>` +
        `</div>` +
        `<div class="hint">One line, sealed once submitted.</div>` +
      `</div>`;

    const input = castEl.querySelector('#rk-bc-input');
    castEl.querySelector('#rk-bc-submit').addEventListener('click', () => {
      const text = (input.value || '').trim();
      if (!text) { input.focus(); return; }
      const res = submitBroadcast(save, text);
      if (res && res.ok) {
        persistSave(adapter, save);
      }
      render();   // re-render: line now shows on your row; panel becomes sealed
    });
  }

  // ----- main render: re-fetch board + placement for the active scope -----
  function render() {
    const isStage = scope === 'stage';
    stageSelEl.hidden = !isStage;

    blurbEl.textContent = isStage
      ? `Stage ${stage} — ${STAGE_NAMES[stage] || ''}`
      : (SCOPE_BLURB[scope] || '');

    skeleton();

    const token = ++reqToken;
    const boardP = isStage
      ? getStageLeaderboard(stage, save)
      : getLeaderboard(scope, save);

    boardP.then((rows) => {
      if (token !== reqToken) return;         // a newer request superseded this one
      renderBoard(rows || []);
    });

    // broadcast only applies to the time scopes (not per-stage boards)
    if (isStage) {
      castEl.innerHTML = '';
    } else {
      getMyPlacement(scope, save).then((placement) => {
        if (token !== reqToken) return;
        renderBroadcast(placement);
      });
    }
  }

  // ----- tab switching -----
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-scope]');
    if (!btn) return;
    scope = btn.dataset.scope;
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    render();
  });

  render();
  return scene;
}
