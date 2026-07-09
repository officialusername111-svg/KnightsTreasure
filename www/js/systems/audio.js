// Audio system (GDD §Audio / Plan 3). Web Audio API. Ships now with SYNTHESIZED
// placeholder SFX (oscillator/noise) so the game has audio feedback immediately;
// real recorded SFX + 10 stage music loops are an asset to-do (see spec §10).
// Honors settings.sound (SFX) and settings.music (music).

let ctx = null;
let master = null;
const enabled = { sound: true, music: true };
let musicNode = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

// Sync enable flags from save.settings; call on boot + when settings change.
export function configure(settings) {
  if (!settings) return;
  enabled.sound = settings.sound !== false;
  enabled.music = settings.music !== false;
  if (!enabled.music) stopMusic();
}

export function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }

// Placeholder SFX voices: a short tone (optionally swept) per id.
const VOICES = {
  tap:      { type: 'sine',     f: 520, to: 600, d: 0.06, g: 0.18 },
  flip:     { type: 'sine',     f: 480, to: 560, d: 0.06, g: 0.16 },
  match:    { type: 'triangle', f: 660, to: 990, d: 0.16, g: 0.22 },
  mismatch: { type: 'sawtooth', f: 240, to: 160, d: 0.14, g: 0.18 },
  coin:     { type: 'square',   f: 880, to: 1320, d: 0.10, g: 0.16 },
  win:      { type: 'triangle', f: 660, to: 1320, d: 0.32, g: 0.24 },
  lose:     { type: 'sawtooth', f: 300, to: 120, d: 0.34, g: 0.20 },
  powerup:  { type: 'triangle', f: 740, to: 1180, d: 0.20, g: 0.20 },
  dice:     { type: 'square',   f: 420, to: 300, d: 0.09, g: 0.14 },
  fanfare:  { type: 'triangle', f: 784, to: 1568, d: 0.45, g: 0.26 },
  mail:     { type: 'sine',     f: 600, to: 880, d: 0.14, g: 0.16 },
  // impact-beat voices (AV-sync pass 2026-07-09): fired at the animation's impact frame
  boom:     { type: 'square',   f: 130, to: 36,  d: 0.48, g: 0.32 },  // bomb detonation
  thud:     { type: 'triangle', f: 220, to: 90,  d: 0.11, g: 0.24 },  // arrow/sword strike lands
  arm:      { type: 'sine',     f: 840, to: 980, d: 0.05, g: 0.12 },  // aim mode armed
};

export function sfx(id) {
  if (!enabled.sound) return;
  const v = VOICES[id];
  if (!v || !ensureCtx()) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = v.type;
  osc.frequency.setValueAtTime(v.f, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.to), now + v.d);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(v.g, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + v.d);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + v.d + 0.02);
}

// Music: real per-stage loops are not in the repo yet, so this is a no-op stub
// that records intent. Wiring real <audio>/buffer loops is a drop-in here later.
export function music(/* sceneOrStage */) {
  if (!enabled.music) return;
  // placeholder: intentionally silent until stage tracks ship.
}
export function stopMusic() {
  if (musicNode) { try { musicNode.stop(); } catch (e) { /* noop */ } musicNode = null; }
}
