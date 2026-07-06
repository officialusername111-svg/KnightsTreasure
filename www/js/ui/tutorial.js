import { ASSETS } from '../data/config.js';
import { fitPortrait } from './portraitFit.js';

// NPC-led tutorials (Plan 3). Three flavours:
//  - showInteractiveTutorial: live, event-driven basics on level 1-1 (the Forest Guard
//    reacts to the player's real taps; the board stays tappable beneath the dock).
//  - showMechanicTutorial: a stage-fitting NPC explains a new mechanic over a dimmed board.
//  - showTutorial: a narrated multi-step card (no board) for Settings → Replay tutorial.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Forest Guard mentors the basics; his portrait shifts with the emotional beat.
const GUIDE = 'Forest Guard';
const GUIDE_PORTRAIT = {
  friendly: 'forest_guard/forest_guard_friendly',
  neutral: 'forest_guard/forest_guard_neutral',
  alert: 'forest_guard/forest_guard_alert',
};

// Stage-fitting guides for each new mechanic / feature.
const MECH = {
  hidden:   { npc: 'Cave Spirit',     portrait: 'cave_spirit/cave_spirit_peaceful',               title: 'Hidden tiles',  body: 'In the dark, revealed tiles fade faster. Fix them in your memory the moment you see them.' },
  decoy:    { npc: 'Bandit Captain',  portrait: 'bandit_captain/bandit_captain_cocky',            title: 'Decoy tiles',   body: 'Heh — some tiles have no twin. Tap one and you waste a flip, but it costs you no mistake.' },
  moving:   { npc: 'Castle Guard',    portrait: 'castle_guard_captain/castle_guard_captain_alert', title: 'Moving tiles',  body: 'Stay sharp. Face-down tiles will shift their posts — keep your eyes on them as they move.' },
  locked:   { npc: 'Dungeon Prisoner', portrait: 'dungeon_prisoner/dungeon_prisoner_hopeful',     title: 'Chained tiles', body: 'These tiles are chained. Match other pairs to break them in time — or pour Holy Water to free them all at once.' },
  powerups: { npc: 'The Blacksmith',  portrait: 'blacksmith/blacksmith_proud',                    title: 'Power-ups',     body: 'Forged with care! Tap a power-up below during a level — a Raven to scout, a Torch to light the board, and more.' },
};

// Shared NPC dock: circular portrait + a parchment speech bubble.
function buildDock({ name, portrait, title, text, dismiss }) {
  return (
    `<div class="kt-tut-dock">` +
      `<div class="kt-tut-portrait"><img src="${ASSETS.characters}${portrait}.png" alt="" onerror="this.style.display='none'"></div>` +
      `<div class="kt-tut-bubble">` +
        `<div class="kt-tut-npc">${esc(name)}</div>` +
        (title ? `<div class="kt-tut-mtitle">${esc(title)}</div>` : '') +
        `<div class="kt-tut-line">${esc(text)}</div>` +
        (dismiss ? `<button type="button" class="kt-tut-dismiss">${esc(dismiss)}</button>` : '') +
      `</div>` +
    `</div>`
  );
}

// Frame the dock's portrait by figure (portraitFit) once the dock HTML is in the DOM.
function fitDock(root) {
  const p = root.querySelector('.kt-tut-portrait');
  if (p) fitPortrait(p.querySelector('img'), p, 'bust');
}

// ---- live, interactive basics (level 1-1) ----
const STEPS = [
  { mood: 'friendly', text: 'Welcome, knight. Tap any tile to reveal what it hides.' },          // until tile:flip
  { mood: 'neutral',  text: 'Good! Now reveal another and find its matching twin.' },            // until match/mismatch
  { mood: 'friendly', text: 'Well matched! Matched pairs stay face-up. Now clear them all to win.' }, // final
];
const MISMATCH_LINE = { mood: 'alert', text: 'Not a pair — they flip back down. Remember where they were!' };

export function showInteractiveTutorial(parent, { bus, boardWrap, onDone } = {}) {
  const ov = document.createElement('div');
  ov.className = 'kt-tut-live';
  parent.appendChild(ov);

  let step = -1;
  let matched = false;
  let mismatchShown = false;

  const setDock = (mood, text, final) => {
    ov.innerHTML = buildDock({ name: GUIDE, portrait: GUIDE_PORTRAIT[mood], text, dismiss: final ? 'Got it' : '' });
    fitDock(ov);
    const dock = ov.querySelector('.kt-tut-dock');
    if (dock) { dock.classList.remove('in'); void dock.offsetWidth; dock.classList.add('in'); }
    if (final) ov.querySelector('.kt-tut-dismiss').addEventListener('click', finish);
  };
  const goStep = (i) => { step = i; setDock(STEPS[i].mood, STEPS[i].text, i === STEPS.length - 1); };

  if (boardWrap) boardWrap.classList.add('kt-coach');   // gentle "tap a tile" board pulse
  goStep(0);

  const onFlip = () => { if (step === 0) { if (boardWrap) boardWrap.classList.remove('kt-coach'); goStep(1); } };
  const onMismatch = () => { if (step === 1 && !matched && !mismatchShown) { mismatchShown = true; setDock(MISMATCH_LINE.mood, MISMATCH_LINE.text, false); } };
  const onMatch = () => { if (!matched) { matched = true; goStep(2); } };

  const offs = [
    bus.on('tile:flip', onFlip),
    bus.on('tile:mismatch', onMismatch),
    bus.on('tile:match', onMatch),
    bus.on('tile:win', () => finish()),
  ];

  function finish() {
    offs.forEach((off) => off && off());
    if (boardWrap) boardWrap.classList.remove('kt-coach');
    ov.remove();
    onDone && onDone();
  }
  return ov;
}

// ---- per-mechanic NPC lesson (dims the board, one "Got it" to begin) ----
export function showMechanicTutorial(parent, key, { onDone } = {}) {
  const d = MECH[key];
  if (!d) { onDone && onDone(); return null; }
  const o = document.createElement('div');
  o.className = 'kt-tut-mech';
  o.innerHTML = `<div class="kt-tut-scrim"></div>` +
    buildDock({ name: d.npc, portrait: d.portrait, title: d.title, text: d.body, dismiss: 'Got it' });
  fitDock(o);
  o.querySelector('.kt-tut-dismiss').addEventListener('click', () => { o.remove(); onDone && onDone(); });
  parent.appendChild(o);
  return o;
}

// ---- narrated walkthrough for Settings → Replay (no live board) ----
const REPLAY = [
  { mood: 'friendly', text: 'Welcome, knight. Your quest: recover the realm’s lost treasures by matching pairs of enchanted tiles.' },
  { mood: 'neutral',  text: 'Tap a tile to flip it, then find its twin. A matching pair stays face-up — a mismatch flips back, so commit it to memory.' },
  { mood: 'neutral',  text: 'Match every pair to clear a level. Fewer mistakes and a quicker clear earn more stars.' },
  { mood: 'friendly', text: 'Earn coins to forge power-ups at the Blacksmith, and rest at the Inn to restore stamina. Now — to the treasure!' },
];

export function showTutorial(parent, { onDone } = {}) {
  const o = document.createElement('div');
  o.className = 'kt-tut-mech kt-tut-replay';
  let i = 0;
  const render = () => {
    const s = REPLAY[i];
    const last = i === REPLAY.length - 1;
    o.innerHTML = `<div class="kt-tut-scrim"></div>` +
      `<div class="kt-tut-dots">${REPLAY.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>` +
      buildDock({ name: GUIDE, portrait: GUIDE_PORTRAIT[s.mood], text: s.text, dismiss: last ? 'Begin' : 'Next' });
    fitDock(o);
    o.querySelector('.kt-tut-dismiss').addEventListener('click', () => {
      if (last) { o.remove(); onDone && onDone(); } else { i += 1; render(); }
    });
  };
  render();
  parent.appendChild(o);
  return o;
}
