// Juicy feedback effects for the game scene. Pure helpers + DOM effects.
// Honors prefers-reduced-motion. No dependencies; GPU-friendly (transform/opacity).

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pure: combo chain length -> celebration text (null below 3). Unit-tested.
export function comboTier(combo) {
  if (combo >= 6) return 'Legendary!';
  if (combo === 5) return 'Heroic!';
  if (combo === 4) return 'Valiant!';
  if (combo === 3) return 'Well struck!';
  return null;
}

// Lazily ensure a pointer-transparent effects layer inside a (positioned) host.
function fxLayer(host) {
  let layer = host.querySelector(':scope > .kt-fx');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'kt-fx';
    host.appendChild(layer);
  }
  return layer;
}

// Emit `count` particles from (x,y) within host, radiating outward, then self-remove.
export function burst(host, x, y, count = 10, kind = 'spark') {
  if (reduced()) return;
  const layer = fxLayer(host);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'kt-' + kind;
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 26 + Math.random() * 40;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    p.style.animationDelay = Math.round(Math.random() * 70) + 'ms';
    p.addEventListener('animationend', () => p.remove(), { once: true });
    layer.appendChild(p);
  }
}

// Burst centered on an element, with coordinates relative to host.
export function burstAtEl(host, el, count = 10, kind = 'spark') {
  if (!el || reduced()) return;
  const hr = host.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  burst(host, r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2, count, kind);
}

// Scale-pop + glow a set of matched tile elements (restartable).
export function popMatch(els) {
  els.forEach((el) => {
    if (!el) return;
    el.classList.remove('kt-pop');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('kt-pop');
    el.addEventListener('animationend', () => el.classList.remove('kt-pop'), { once: true });
  });
}

// Stagger tiles in (center-out) on level start.
export function staggerIn(tileEls, cols) {
  if (reduced()) return;
  const rows = Math.ceil(tileEls.length / cols);
  const cr = (rows - 1) / 2;
  const cc = (cols - 1) / 2;
  tileEls.forEach((el, i) => {
    if (!el) return;
    const dist = Math.hypot(Math.floor(i / cols) - cr, (i % cols) - cc);
    el.style.setProperty('--in-delay', Math.round(dist * 45) + 'ms');
    el.classList.add('kt-in');
    el.addEventListener(
      'animationend',
      () => {
        el.classList.remove('kt-in');
        el.style.removeProperty('--in-delay');
      },
      { once: true }
    );
  });
}

// ---- power-up casts ----
// Fly a power-up icon from a scene-relative point `from` {x,y} to a target element, then run
// onImpact. Honors reduced-motion (skips the flight, reveals immediately). A timeout fallback
// guarantees onImpact even if the WAAPI finish event is throttled (headless / background).
export function castProjectile(scene, from, toEl, { icon, ms = 440, arc = 80, spin = 0, stickMs = 0, onImpact } = {}) {
  const fire = onImpact || (() => {});
  if (reduced() || !toEl || !from) { fire(); return; }
  const sr = scene.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x0 = from.x, y0 = from.y;
  const dx = (b.left - sr.left + b.width / 2) - x0;
  const dy = (b.top - sr.top + b.height / 2) - y0;
  const layer = fxLayer(scene);
  const p = document.createElement('div');
  p.className = 'kt-cast';
  const im = document.createElement('img');
  im.src = icon;
  im.addEventListener('error', () => { im.style.display = 'none'; });
  p.appendChild(im);
  p.style.left = x0 + 'px';
  p.style.top = y0 + 'px';
  layer.appendChild(p);
  // comet trail: drop a fading dot at the projectile's live position
  const trail = setInterval(() => {
    const pr = p.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'kt-cast-trail';
    d.style.left = (pr.left - sr.left + pr.width / 2) + 'px';
    d.style.top = (pr.top - sr.top + pr.height / 2) + 'px';
    d.addEventListener('animationend', () => d.remove(), { once: true });
    layer.appendChild(d);
  }, 32);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(trail);
    fire();
    if (stickMs > 0) {                       // leave the projectile embedded for a beat, then fade
      p.classList.add('stuck');
      setTimeout(() => { p.classList.add('out'); setTimeout(() => p.remove(), 220); }, stickMs);
    } else {
      p.remove();
    }
  };
  const anim = p.animate([
    { transform: 'translate(-50%,-50%) scale(.5) rotate(0deg)', opacity: 0, offset: 0 },
    { opacity: 1, offset: 0.1 },
    { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - arc}px)) scale(1.35) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${spin}deg)`, opacity: 1, offset: 1 },
  ], { duration: ms, easing: 'cubic-bezier(.3,0,.4,1)', fill: 'forwards' });
  anim.onfinish = finish;
  setTimeout(finish, ms + 160);
}

// Big impact at a tile: shake + particle burst + a shockwave ring + a white flash. Visual
// only (caller performs the actual reveal); skipped under reduced-motion.
export function castImpact(scene, el, { kind = 'spark', count = 16 } = {}) {
  if (!el || reduced()) return;
  tileShake(el);
  burstAtEl(scene, el, count, kind);
  const sr = scene.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'kt-impact-ring';
  ring.style.left = (r.left - sr.left + r.width / 2) + 'px';
  ring.style.top = (r.top - sr.top + r.height / 2) + 'px';
  ring.addEventListener('animationend', () => ring.remove(), { once: true });
  fxLayer(scene).appendChild(ring);
  el.classList.remove('kt-cast-flash');
  void el.offsetWidth;
  el.classList.add('kt-cast-flash');
  el.addEventListener('animationend', () => el.classList.remove('kt-cast-flash'), { once: true });
}

// Quick horizontal shake on a tile (impact reaction).
export function tileShake(el) {
  if (!el || reduced()) return;
  el.classList.remove('kt-cast-shake');
  void el.offsetWidth;
  el.classList.add('kt-cast-shake');
  el.addEventListener('animationend', () => el.classList.remove('kt-cast-shake'), { once: true });
}

// Expanding rings from a scene-relative point (Torch/Eagle Eye/Decree/War Horn area casts).
export function boardWave(scene, from, { color = 'rgba(245,200,66,.55)', rings = 3 } = {}) {
  if (reduced() || !from) return;
  const layer = fxLayer(scene);
  for (let i = 0; i < rings; i++) {
    const ring = document.createElement('div');
    ring.className = 'kt-wave';
    ring.style.left = from.x + 'px';
    ring.style.top = from.y + 'px';
    ring.style.borderColor = color;
    ring.style.animationDelay = (i * 130) + 'ms';
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    layer.appendChild(ring);
  }
}

// Bright slash sweeping across a set of tiles (Sword) + a glint on each.
export function slashAcross(scene, els, { color = 'rgba(255,255,255,.95)' } = {}) {
  if (reduced() || !els.length) return;
  const sr = scene.getBoundingClientRect();
  const rects = els.map((e) => e.getBoundingClientRect());
  const a = rects[0], b = rects[rects.length - 1];
  const x0 = a.left - sr.left + a.width / 2, y0 = a.top - sr.top + a.height / 2;
  const x1 = b.left - sr.left + b.width / 2, y1 = b.top - sr.top + b.height / 2;
  const len = Math.hypot(x1 - x0, y1 - y0) + a.width;
  const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
  const s = document.createElement('div');
  s.className = 'kt-slash';
  s.style.left = x0 + 'px';
  s.style.top = y0 + 'px';
  s.style.width = len + 'px';
  s.style.transform = `translateY(-50%) rotate(${ang}deg)`;
  s.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
  s.addEventListener('animationend', () => s.remove(), { once: true });
  fxLayer(scene).appendChild(s);
}

// Quick full-board flash overlay (Bomb detonation / Shield slam).
export function boardFlash(scene, { color = 'rgba(255,245,220,.7)' } = {}) {
  if (reduced()) return;
  const o = document.createElement('div');
  o.className = 'kt-flash';
  o.style.background = `radial-gradient(circle at 50% 50%, ${color}, transparent 70%)`;
  o.addEventListener('animationend', () => o.remove(), { once: true });
  fxLayer(scene).appendChild(o);
}

// An "eye" iris opening at the board centre (Eagle Eye).
export function irisBloom(scene, boardEl) {
  if (reduced()) return;
  const sr = scene.getBoundingClientRect(), br = boardEl.getBoundingClientRect();
  const o = document.createElement('div');
  o.className = 'kt-iris';
  o.style.left = (br.left - sr.left + br.width / 2) + 'px';
  o.style.top = (br.top - sr.top + br.height / 2) + 'px';
  o.addEventListener('animationend', () => o.remove(), { once: true });
  fxLayer(scene).appendChild(o);
}

// Horizontal streak sweeping left→right across a row, revealing tiles in its wake (Spear).
export function streakReveal(scene, { tiles, reveal, hide, holdMs = 2800 } = {}) {
  if (!tiles || !tiles.length) return;
  if (reduced()) { tiles.forEach((t) => reveal && reveal(t)); setTimeout(() => tiles.forEach((t) => hide && hide(t)), holdMs); return; }
  const sr = scene.getBoundingClientRect();
  const rs = tiles.map((t) => t.el.getBoundingClientRect());
  const minX = Math.min(...rs.map((r) => r.left)), maxX = Math.max(...rs.map((r) => r.right));
  const yTop = Math.min(...rs.map((r) => r.top)), yBot = Math.max(...rs.map((r) => r.bottom));
  const bar = document.createElement('div');
  bar.className = 'kt-streak';
  bar.style.left = (minX - sr.left) + 'px';
  bar.style.top = (yTop - sr.top) + 'px';
  bar.style.height = (yBot - yTop) + 'px';
  bar.style.setProperty('--travel', (maxX - minX) + 'px');
  bar.addEventListener('animationend', () => bar.remove(), { once: true });
  fxLayer(scene).appendChild(bar);
  const span = Math.max(1, maxX - minX);
  tiles.forEach((t) => {
    const r = t.el.getBoundingClientRect();
    const delay = ((r.left - minX) / span) * 360;
    setTimeout(() => { reveal && reveal(t); setTimeout(() => hide && hide(t), holdMs); }, delay);
  });
}

// Pulsing gold inset vignette on a (positioned) host for `ms` (War Horn duration).
export function edgePulse(host, ms = 10000) {
  if (!host || reduced()) return;
  const o = document.createElement('div');
  o.className = 'kt-edge-pulse';
  host.appendChild(o);
  setTimeout(() => { o.classList.add('out'); setTimeout(() => o.remove(), 300); }, Math.max(0, ms - 300));
}

// Torch-style reveal: a faint fire-light blooms from the board centre and, as it reaches
// each tile, that tile flickers alight and flips. `reveal`/`hide` toggle a tile's face;
// tiles ignite center-out by on-screen distance. Reduced-motion reveals all at once.
export function igniteReveal(scene, boardEl, { tiles, holdMs = 1900, tone = 'fire', reveal, hide } = {}) {
  if (!tiles || !tiles.length) return;
  if (reduced()) {
    tiles.forEach((t) => reveal && reveal(t));
    setTimeout(() => tiles.forEach((t) => hide && hide(t)), holdMs);
    return;
  }
  const goldTone = tone === 'gold';
  // Mount the scaling glow inside the board itself (overflow:hidden clips it) so it can
  // never extend a scroll container and spill scrollbars onto the screen.
  const fire = document.createElement('div');
  fire.className = 'kt-fire-spread' + (goldTone ? ' gold' : '');
  boardEl.appendChild(fire);
  fire.addEventListener('animationend', () => fire.remove(), { once: true });

  const br = boardEl.getBoundingClientRect();
  const cx = br.left + br.width / 2;
  const cy = br.top + br.height / 2;
  const withDist = tiles.map((t) => {
    const r = t.el.getBoundingClientRect();
    return { t, d: Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) };
  });
  const maxD = Math.max(1, ...withDist.map((x) => x.d));
  withDist.forEach(({ t, d }) => {
    setTimeout(() => {
      const el = t.el;
      if (el) {
        el.classList.remove('kt-ignite', 'gold');
        void el.offsetWidth;
        el.classList.add('kt-ignite');
        if (goldTone) el.classList.add('gold');
        el.addEventListener('animationend', () => el.classList.remove('kt-ignite', 'gold'), { once: true });
      }
      reveal && reveal(t);
      setTimeout(() => hide && hide(t), holdMs);
    }, (d / maxD) * 450);
  });
}

// Shimmering protective bubble over a (positioned) host for `ms` (Shield).
export function shieldBubble(host, ms = 10000) {
  if (!host) return;
  const b = document.createElement('div');
  b.className = 'kt-shield-bubble';
  host.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300); }, Math.max(0, ms - 300));
}

// Show an escalating combo banner in a host (no-op below combo 3).
export function comboBanner(host, combo) {
  const text = comboTier(combo);
  if (!text) return;
  const b = document.createElement('div');
  b.className = 'kt-banner';
  b.textContent = text;
  fxLayer(host).appendChild(b);
  b.addEventListener('animationend', () => b.remove(), { once: true });
}

// Count a number element from 0 up to `value`.
export function countUp(el, value, ms = 650) {
  if (!el) return;
  if (reduced() || value <= 0) {
    el.textContent = value.toLocaleString();
    return;
  }
  const start = performance.now();
  (function step(now) {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(value * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  })(performance.now());
}

// Fill a container with `total` stars; the earned ones slam in one-by-one.
export function starSlam(container, stars, total = 3) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const s = document.createElement('span');
    const on = i < stars;
    s.className = 'kt-star' + (on ? ' on' : ' off');
    s.textContent = on ? '★' : '☆'; // ★ / ☆ (basic glyphs, not emoji)
    if (on && !reduced()) s.style.animationDelay = 150 + i * 180 + 'ms';
    container.appendChild(s);
  }
}
