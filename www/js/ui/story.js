import { ASSETS, STAGE_BG } from '../data/config.js';
import { STORY } from '../data/story.js';
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

// Full-screen parchment dialog. Steps through a beat's conversation (NPC ↔ knight). Skip or
// advancing past the last line dismisses it + calls onDone. `bg` overrides the backdrop.
export function showStoryDialog(parent, { beat, stage, bg, onDone }) {
  const lines = buildLines(beat);
  let i = 0;
  const ov = document.createElement('div');
  ov.className = 'kt-story';
  ov.style.backgroundImage = `url("${bg || STAGE_BG[stage] || ASSETS.bgForest}")`;
  ov.innerHTML =
    `<div class="kt-story-scrim"></div>` +
    `<div class="kt-story-lang"><button type="button" class="on" data-l="EN">EN</button><button type="button" data-l="HIL">HIL</button></div>` +
    `<button type="button" class="kt-story-skip">Skip ▸</button>` +
    `<div class="kt-story-portrait"><img alt="" onerror="this.style.display='none'"></div>` +
    `<div class="kt-story-box">` +
      `<div class="kt-story-name"></div>` +
      `<div class="kt-story-text"></div>` +
      `<div class="kt-story-hil" hidden>Hiligaynon translation coming soon.</div>` +
      `<button type="button" class="kt-story-next" aria-label="Continue">▼</button>` +
    `</div>`;

  const img = ov.querySelector('.kt-story-portrait img');
  const nameEl = ov.querySelector('.kt-story-name');
  const textEl = ov.querySelector('.kt-story-text');
  const render = () => {
    const ln = lines[i];
    const knight = ln.who === 'knight';
    img.src = `${ASSETS.characters}${knight ? (KNIGHT_PORTRAIT[beat.moment] || 'knight/knight_focused') : beat.portrait}.png`;
    img.style.display = '';
    ov.classList.toggle('knight-turn', knight);
    nameEl.textContent = knight ? 'Sir Knight' : beat.speaker;
    textEl.textContent = ln.text;
  };
  render();

  const close = () => { ov.remove(); onDone && onDone(); };
  const advance = () => { if (i < lines.length - 1) { i += 1; render(); } else close(); };
  ov.querySelector('.kt-story-skip').addEventListener('click', close);
  ov.querySelector('.kt-story-next').addEventListener('click', advance);

  const hil = ov.querySelector('.kt-story-hil');
  ov.querySelectorAll('.kt-story-lang button').forEach((b) =>
    b.addEventListener('click', () => {
      ov.querySelectorAll('.kt-story-lang button').forEach((x) => x.classList.toggle('on', x === b));
      hil.hidden = b.dataset.l !== 'HIL';
    })
  );

  parent.appendChild(ov);
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
