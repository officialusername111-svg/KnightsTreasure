import { ASSETS } from '../data/config.js';
import { persistSave } from '../core/save.js';
import { getMail, submitBroadcast, assignRandomBroadcast } from '../services/social.js';
import { sectionTop, toast } from './modal.js';

// Inline glyph helper (matches Settings' SVG sizing/stroke). Gold stroke via currentColor.
const SVG = (p) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

// Type glyphs (placeholders): up/down chevron for rank, laurel-star for achievement, speech-scroll for comment.
const GLYPH = {
  'rank-up': SVG('<path d="M6 14l6-6 6 6"/><path d="M6 19l6-6 6 6"/>'),
  'rank-down': SVG('<path d="M6 10l6 6 6-6"/><path d="M6 5l6 6 6-6"/>'),
  achievement: SVG('<path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.5L12 17.7 7 18.4l1-5.5-4-3.9 5.5-.8z"/>'),
  comment: SVG('<path d="M5 6h11a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H9l-4 3v-3a3 3 0 0 1 0-6z"/><path d="M8 9h7"/>'),
};

// Relative date — "now", "2h", "Yesterday", "3d", or a short date for older mail.
function relDate(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createMailScene({ gameState, adapter, onBack }) {
  const save = gameState.save;
  const mail = getMail(save); // newest first, live array

  const scene = document.createElement('div');
  scene.id = 'kt-mail-scene';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgCover}")`;

  const rowHtml = (m) =>
    `<button type="button" class="kt-mail-row${m.read ? '' : ' unread'}" data-id="${esc(m.id)}">` +
      `<span class="ic">${GLYPH[m.type] || GLYPH.comment}</span>` +
      `<span class="bd">` +
        `<span class="ttl">${esc(m.title)}</span>` +
        `<span class="prev">${esc(m.body)}</span>` +
      `</span>` +
      `<span class="meta">` +
        `<span class="dt">${esc(relDate(m.date))}</span>` +
        `<span class="dot" aria-label="unread"></span>` +
      `</span>` +
    `</button>`;

  const listHtml = mail.length
    ? `<div class="kt-panel kt-mail-list">${mail.map(rowHtml).join('')}</div>`
    : `<div class="kt-mail-empty"><span class="q">${GLYPH.comment}</span>` +
      `<p>No ravens today, knight.</p></div>`;

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Ravens & tidings', 'Mail', save.coins || 0) +
    `<div class="kt-sec-body">${listHtml}</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  // ---- broadcast invite detail block ----
  function broadcastBlock(m) {
    const bc = save.broadcast || {};
    if (bc.locked) {
      return (
        `<div class="kt-bc">` +
          `<div class="kt-bc-sealed">` +
            `<span class="k">Your message to the realm</span>` +
            `<p>“${esc(bc.text || '')}”</p>` +
            `<span class="sealed-note">Sealed — other knights see this line.</span>` +
          `</div>` +
        `</div>`
      );
    }
    const assigned = bc.text ? `<p class="kt-bc-assigned">Assigned: “${esc(bc.text)}”${bc.changedOnce ? ' <i>· changeable once — now used</i>' : ''}</p>` : '';
    return (
      `<div class="kt-bc">` +
        `<div class="kt-bc-write">` +
          `<input type="text" class="kt-bc-input" maxlength="100" placeholder="Your message to the realm…" value="${esc(bc.text || '')}">` +
          `<div class="kt-bc-btns">` +
            `<button type="button" class="kt-bc-submit">Submit</button>` +
            `<button type="button" class="kt-bc-random sec">Surprise me</button>` +
          `</div>` +
          assigned +
        `</div>` +
      `</div>`
    );
  }

  // ---- open a mail: expand detail, mark read, persist ----
  function openMail(rowEl, m) {
    const already = rowEl.nextElementSibling;
    if (already && already.classList.contains('kt-mail-detail')) { // toggle closed
      already.remove();
      rowEl.classList.remove('open');
      return;
    }
    // close any other open detail
    scene.querySelectorAll('.kt-mail-detail').forEach((d) => d.remove());
    scene.querySelectorAll('.kt-mail-row.open').forEach((r) => r.classList.remove('open'));

    if (!m.read) {
      m.read = true;
      rowEl.classList.remove('unread');
      persistSave(adapter, save);
    }
    rowEl.classList.add('open');

    const detail = document.createElement('div');
    detail.className = 'kt-mail-detail';
    detail.innerHTML =
      `<p class="kt-mail-full">${esc(m.body)}</p>` +
      (m.broadcastInvite ? broadcastBlock(m) : '');
    rowEl.insertAdjacentElement('afterend', detail);

    if (m.broadcastInvite) wireBroadcast(detail, m);
  }

  function wireBroadcast(detail, m) {
    const submit = detail.querySelector('.kt-bc-submit');
    const random = detail.querySelector('.kt-bc-random');
    const input = detail.querySelector('.kt-bc-input');

    if (submit) submit.addEventListener('click', () => {
      const res = submitBroadcast(save, input ? input.value : '');
      if (res.ok) {
        persistSave(adapter, save);
        // re-render the detail as sealed
        const block = detail.querySelector('.kt-bc');
        if (block) block.outerHTML = broadcastBlock(m);
        toast(scene, 'Your message is sealed.');
      } else {
        toast(scene, 'Your line is already sealed.');
      }
    });

    if (random) random.addEventListener('click', () => {
      const res = assignRandomBroadcast(save);
      if (res.ok) {
        persistSave(adapter, save);
        const block = detail.querySelector('.kt-bc');
        if (block) { block.outerHTML = broadcastBlock(m); wireBroadcast(detail, m); }
        toast(scene, 'A line was chosen — changeable once.');
      } else {
        toast(scene, 'That line is already set.');
      }
    });
  }

  scene.querySelectorAll('.kt-mail-row').forEach((rowEl) => {
    rowEl.addEventListener('click', () => {
      const m = mail.find((x) => String(x.id) === rowEl.dataset.id);
      if (m) openMail(rowEl, m);
    });
  });

  return scene;
}
