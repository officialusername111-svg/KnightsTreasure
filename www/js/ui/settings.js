import { persistSave } from '../core/save.js';
import { showInfo, sectionTop } from './modal.js';

const SVG = (p, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}${extra}</svg>`;
const ICON = {
  sound: SVG('<path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M17 8a5 5 0 0 1 0 8"/>'),
  music: SVG('<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M8.5 18V6l11-2v12"/>'),
  lang: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  help: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 0 1 5.3 1.2c0 1.8-2.7 2.3-2.7 4"/><path d="M12 17.5h.01"/>'),
  cloud: SVG('<path d="M7 18a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 18 10.5a3.5 3.5 0 0 1-1 7H7z"/>'),
  credits: SVG('<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z"/>'),
  privacy: SVG('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'),
};

export function createSettingsScene({ gameState, adapter, onBack, onReplayTutorial }) {
  const save = gameState.save;
  const st = save.settings || (save.settings = { sound: true, music: true, language: 'EN' });

  const scene = document.createElement('div');
  scene.id = 'kt-settings-scene';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${'assets/images/backgrounds/bg_cover.png'}")`;

  const sw = (on) => `<span class="kt-sw${on ? '' : ' off'}"><i></i></span>`;

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('The keep', 'Settings', null) +
    `<div class="kt-sec-body kt-set-body">` +
      `<div class="kt-set-group">` +
        `<div class="kt-set-gtitle">Audio</div>` +
        `<button type="button" class="kt-set-row" id="set-sound"><span class="ic">${ICON.sound}</span><span class="t">Sound effects</span>${sw(st.sound)}</button>` +
        `<button type="button" class="kt-set-row" id="set-music"><span class="ic">${ICON.music}</span><span class="t">Music</span>${sw(st.music)}</button>` +
      `</div>` +
      `<div class="kt-set-group">` +
        `<div class="kt-set-gtitle">Game</div>` +
        `<div class="kt-set-row"><span class="ic">${ICON.lang}</span><span class="t">Language</span>` +
          `<span class="kt-seg" id="set-lang"><button type="button" data-l="EN"${st.language === 'EN' ? ' class="on"' : ''}>EN</button>` +
          `<button type="button" data-l="HIL"${st.language === 'HIL' ? ' class="on"' : ''}>HIL</button></span></div>` +
        `<button type="button" class="kt-set-link" id="set-tutorial"><span class="ic">${ICON.help}</span>Replay tutorial<span class="ch">›</span></button>` +
      `</div>` +
      `<div class="kt-set-group">` +
        `<div class="kt-set-gtitle">Account</div>` +
        `<div class="kt-set-row"><span class="ic">${ICON.cloud}</span><span class="t">Cloud save<small>Sign in to sync progress</small></span><span class="kt-soon-tag">soon</span></div>` +
        `<button type="button" class="kt-set-link" id="set-credits"><span class="ic">${ICON.credits}</span>Credits<span class="ch">›</span></button>` +
        `<button type="button" class="kt-set-link" id="set-privacy"><span class="ic">${ICON.privacy}</span>Privacy policy<span class="ch">›</span></button>` +
      `</div>` +
      `<div class="kt-set-ver">Knight's Treasure · v0.1.0</div>` +
    `</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);

  const persist = () => persistSave(adapter, save);
  const bindToggle = (id, key) => {
    const row = scene.querySelector(id);
    row.addEventListener('click', () => {
      st[key] = !st[key];
      row.querySelector('.kt-sw').classList.toggle('off', !st[key]);
      persist();
    });
  };
  bindToggle('#set-sound', 'sound');
  bindToggle('#set-music', 'music');

  const seg = scene.querySelector('#set-lang');
  seg.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      const l = b.dataset.l;
      st.language = l;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      persist();
      if (l === 'HIL') showInfo(scene, 'Hiligaynon', `<p>Hiligaynon translations arrive in a later chapter. For now the tale is told in English, knight.</p>`);
    })
  );

  scene.querySelector('#set-tutorial').addEventListener('click', () =>
    onReplayTutorial ? onReplayTutorial() : showInfo(scene, 'Tutorial', `<p>The training grounds reopen in a later chapter, Sir Knight.</p>`)
  );
  scene.querySelector('#set-credits').addEventListener('click', () =>
    showInfo(scene, 'Credits', `<p>Knight's Treasure — a medieval memory quest.</p><p style="margin-top:8px;color:#9a7a3a;">Crafted with care. Full credits roll arrives nearer launch.</p>`)
  );
  scene.querySelector('#set-privacy').addEventListener('click', () =>
    showInfo(scene, 'Privacy', `<p>Your progress is stored on this device. No personal data leaves your keep until cloud save is enabled.</p>`)
  );

  return scene;
}
