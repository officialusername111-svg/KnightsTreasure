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
