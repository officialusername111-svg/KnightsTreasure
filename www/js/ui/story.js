import { ASSETS, STAGE_BG } from '../data/config.js';
import { STORY } from '../data/story.js';
import { sfx } from '../systems/audio.js';
import { sectionTop } from './modal.js';

// Knight's side of an encounter (when a beat doesn't hand-author its `lines`).
const KNIGHT_PORTRAIT = { Opening: 'knight/knight_ready', Midpoint: 'knight/knight_thinking', Boss: 'knight/knight_confident' };
const KNIGHT_REPLIES = {
  Opening: ['Then I accept. Lead on — the treasure won\'t claim itself.', 'Say no more. My blade and wits are ready.', 'A worthy cause. I will see it through.'],
  Midpoint: ['Noted. I will keep my wits about me.', 'Forewarned is forearmed. Onward.', 'I won\'t be caught off guard.'],
  Boss: ['Stand aside — my quest continues.', 'The way is mine now. Farewell.', 'One step closer to the treasure.'],
};
function knightReply(moment) { const a = KNIGHT_REPLIES[moment] || ['Onward.']; return a[Math.floor(Math.random() * a.length)]; }

// Build the conversation lines. Hand-authored `beat.lines` win; otherwise a stage encounter
// (a beat with a `moment`) becomes a 2-line NPC↔knight exchange; a plain intro stays single.
function buildLines(beat) {
  if (beat.lines && beat.lines.length) return beat.lines;
  if (beat.moment) return [{ who: 'npc', text: beat.text }, { who: 'knight', text: knightReply(beat.moment) }];
  return [{ who: 'npc', text: beat.text }];
}

// Cinematic VN-style dialogue. Both speakers stay on screen — the active one is lit and the
// listener is dimmed; a gold name-plate names the speaker; text types out; Auto-Play advances
// on its own. Tap to skip the typing / advance; ✕ or the last line dismisses + calls onDone.
const TYPE_MS = 24;
const AUTO_DELAY = 1500;
export function showStoryDialog(parent, { beat, stage, bg, onDone }) {
  const lines = buildLines(beat);
  const hasKnight = lines.some((l) => l.who === 'knight');
  let i = 0, typing = false, autoplay = false, typer = null, autoTimer = null;

  const ov = document.createElement('div');
  ov.className = 'kt-story cine';
  const sceneBg = bg || STAGE_BG[stage] || ASSETS.bgForest;
  ov.innerHTML =
    `<div class="kt-story-bg" style="background-image:url('${sceneBg}')"></div>` +
    `<div class="kt-story-bar top"></div><div class="kt-story-bar bottom"></div>` +
    `<div class="kt-story-lang"><button type="button" class="on" data-l="EN">EN</button><button type="button" data-l="HIL">HIL</button></div>` +
    `<button type="button" class="kt-story-close" aria-label="Skip">✕</button>` +
    (hasKnight ? `<div class="kt-story-char left" id="kt-ch-knight"><div class="crop"><img alt="" onerror="this.style.display='none'"></div></div>` : '') +
    `<div class="kt-story-char right" id="kt-ch-npc"><div class="crop"><img alt="" onerror="this.style.display='none'"></div></div>` +
    `<div class="kt-story-box">` +
      `<div class="kt-story-name"></div>` +
      `<div class="kt-story-text"></div>` +
      `<div class="kt-story-hil" hidden>Hiligaynon translation coming soon.</div>` +
      `<span class="kt-story-caret">▶</span>` +
    `</div>` +
    `<button type="button" class="kt-story-autoplay"><span class="box"></span>Auto-Play</button>`;

  const npcEl = ov.querySelector('#kt-ch-npc');
  const knightEl = ov.querySelector('#kt-ch-knight');
  const nameEl = ov.querySelector('.kt-story-name');
  const textEl = ov.querySelector('.kt-story-text');
  const caret = ov.querySelector('.kt-story-caret');
  npcEl.querySelector('img').src = `${ASSETS.characters}${beat.portrait}.png`;
  if (knightEl) knightEl.querySelector('img').src = `${ASSETS.characters}${KNIGHT_PORTRAIT[beat.moment] || 'knight/knight_focused'}.png`;

  const close = () => { clearInterval(typer); clearTimeout(autoTimer); ov.remove(); onDone && onDone(); };
  const maybeAuto = () => { clearTimeout(autoTimer); if (autoplay) autoTimer = setTimeout(advance, AUTO_DELAY); };
  function typeLine(text) {
    typing = true; caret.classList.remove('show'); textEl.textContent = '';
    let j = 0; clearInterval(typer);
    typer = setInterval(() => {
      textEl.textContent = text.slice(0, ++j);
      if (j >= text.length) { clearInterval(typer); typing = false; caret.classList.add('show'); maybeAuto(); }
    }, TYPE_MS);
  }
  function render() {
    const ln = lines[i];
    const knight = ln.who === 'knight';
    nameEl.textContent = knight ? 'Sir Knight' : beat.speaker;
    npcEl.classList.toggle('speaking', !knight); npcEl.classList.toggle('dim', knight);
    if (knightEl) { knightEl.classList.toggle('speaking', knight); knightEl.classList.toggle('dim', !knight); }
    sfx('flip');
    typeLine(ln.text);
  }
  function advance() {
    if (typing) { clearInterval(typer); textEl.textContent = lines[i].text; typing = false; caret.classList.add('show'); maybeAuto(); return; }
    if (i < lines.length - 1) { i += 1; render(); } else close();
  }

  ov.addEventListener('click', advance);
  const stop = (el, fn) => el && el.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
  stop(ov.querySelector('.kt-story-close'), close);
  stop(ov.querySelector('.kt-story-autoplay'), (e) => {
    autoplay = !autoplay; e.currentTarget.classList.toggle('on', autoplay);
    if (autoplay && !typing) maybeAuto(); else clearTimeout(autoTimer);
  });
  const hil = ov.querySelector('.kt-story-hil');
  ov.querySelectorAll('.kt-story-lang button').forEach((b) =>
    stop(b, () => {
      ov.querySelectorAll('.kt-story-lang button').forEach((x) => x.classList.toggle('on', x === b));
      hil.hidden = b.dataset.l !== 'HIL';
    }));

  parent.appendChild(ov);
  render();
  return ov;
}

// Story-log scene: browse the 3 beats of each stage, locked until reached.
export function createStoryLogScene({ gameState, onBack }) {
  const save = gameState.save;
  const curStage = save.currentStage || 1;
  const curLevel = save.currentLevel || 1;

  const beatUnlocked = (stage, i) => {
    if (stage < curStage) return true;
    if (stage > curStage) return false;
    return i === 0 || (i === 1 && curLevel >= 13) || (i === 2 && curLevel >= 25);
  };

  const scene = document.createElement('div');
  scene.id = 'kt-storylog';
  scene.className = 'kt-sec';
  scene.style.backgroundImage = `url("${ASSETS.bgMap}")`;

  const stagesHtml = Object.keys(STORY).map((k) => {
    const stage = +k;
    const data = STORY[stage];
    const locked = stage > curStage;
    const unlockedCount = data.beats.filter((_, i) => beatUnlocked(stage, i)).length;
    const dots = data.beats.map((_, i) => `<span class="kt-log-dot${beatUnlocked(stage, i) ? ' on' : ''}"></span>`).join('');
    const badge = `assets/images/badges/badge_stage${stage}_${stageSlug(stage)}.png`;

    let inner;
    if (locked) {
      inner = `<div class="kt-log-lockmsg">🔒 Reach Stage ${stage} to unlock this chapter</div>`;
    } else {
      inner = `<div class="kt-log-beats">` + data.beats.map((b, i) => {
        const open = beatUnlocked(stage, i);
        return `<button type="button" class="kt-log-beat${open ? '' : ' locked'}" data-stage="${stage}" data-beat="${i}"${open ? '' : ' disabled'}>` +
          `<span class="k">${b.moment}</span>` +
          `<span class="x">${open ? b.text : 'Locked — play on to reveal this beat.'}</span>` +
          `</button>`;
      }).join('') + `</div>`;
    }

    return (
      `<div class="kt-log-stage${locked ? ' locked' : ''}">` +
        `<div class="kt-log-shead">` +
          `<div class="kt-log-badge"><img src="${badge}" alt="" onerror="this.style.display='none'"></div>` +
          `<div class="kt-log-sname"><b>Stage ${stage} · ${data.name}</b>` +
            `<span>${locked ? 'Locked' : `${unlockedCount} of ${data.beats.length} beats unlocked`}</span></div>` +
          `<div class="kt-log-dots">${dots}</div>` +
        `</div>` + inner +
      `</div>`
    );
  }).join('');

  scene.innerHTML =
    `<div class="kt-home-scrim"></div>` +
    sectionTop('Chronicle', "The Knight's Tale", null) +
    `<div class="kt-sec-body kt-log-body">${stagesHtml}</div>`;

  scene.querySelector('.kt-sec-back').addEventListener('click', onBack);
  scene.querySelectorAll('.kt-log-beat:not(.locked)').forEach((b) =>
    b.addEventListener('click', () => {
      const stage = +b.dataset.stage;
      const beat = STORY[stage].beats[+b.dataset.beat];
      showStoryDialog(scene, { beat, stage, onDone: null });
    })
  );

  return scene;
}

// Badge filenames use a per-stage slug; mirror the backgrounds' naming.
function stageSlug(stage) {
  return ({ 1: 'forest', 2: 'village', 3: 'river', 4: 'cave', 5: 'camp',
    6: 'gates', 7: 'dungeon', 8: 'throne', 9: 'lair', 10: 'vault' })[stage] || 'forest';
}
