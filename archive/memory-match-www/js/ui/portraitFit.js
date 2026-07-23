// Portrait normalizer: frames every character portrait by the FIGURE, not the PNG
// canvas. Source art canvases vary wildly (aspect 0.48–0.98, per-mood size drift),
// so object-fit:cover renders characters at arbitrary zoom — a near-square render
// shows a giant cropped head while a tall one shows a tiny full figure. This module
// measures each image's alpha bounds once (downscaled canvas, cached per src) and
// positions the img so heads sit at a consistent height and size in the crop box.
// On any failure (tainted canvas, zero box) it leaves the CSS cover-fit fallback.

const cache = new Map(); // src -> measurement (fractions of natural size)

// Alpha-bound measurement. `cTop` is the top of the figure sampled over the CENTER
// third of columns only, so raised props at the edges (a sword, a bow) don't read
// as the head. `headCx` is the alpha midpoint over the head band, so the frame
// centers on the face rather than a prop-skewed bounding box.
function measure(img) {
  const W = 96;
  const H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const alpha = (xx, y) => d[(y * W + xx) * 4 + 3] > 16;

  let top = H, bot = 0, left = W, right = 0, cTop = H;
  for (let y = 0; y < H; y++) {
    for (let xx = 0; xx < W; xx++) {
      if (!alpha(xx, y)) continue;
      if (y < top) top = y;
      if (y > bot) bot = y;
      if (xx < left) left = xx;
      if (xx > right) right = xx;
      if (xx > W * 0.36 && xx < W * 0.64 && y < cTop) cTop = y;
    }
  }
  if (bot <= top || right <= left) return null; // fully transparent / unreadable

  const bandEnd = Math.min(H - 1, Math.round(cTop + 0.18 * (bot - cTop)));
  let sum = 0, n = 0;
  for (let y = cTop; y <= bandEnd; y++) {
    let l = -1, r = -1;
    for (let xx = 0; xx < W; xx++) if (alpha(xx, y)) { if (l < 0) l = xx; r = xx; }
    if (l >= 0) { sum += (l + r) / 2; n++; }
  }
  return {
    cTop: cTop / H, bot: bot / H, left: left / W, right: right / W,
    headCx: n ? sum / n / W : (left + right) / 2 / W,
  };
}

// Pure framing math (unit-tested). Given a measurement, natural size, box size and
// mode, return the img's absolute placement. `v` is the visible fraction of the
// figure: tall full-figure art shows the top ~half (a bust); square art that is
// already a bust shows nearly all of it — a continuous ramp on figure proportions.
export function frameFor(m, natW, natH, boxW, boxH, mode = 'bust') {
  const figH = (m.bot - m.cTop) * natH;
  const figW = (m.right - m.left) * natW;
  if (figH <= 0 || figW <= 0 || boxW <= 0 || boxH <= 0) return null;
  const ratio = figH / figW;
  const v = mode === 'face'
    ? Math.min(0.6, Math.max(0.26, 0.62 - 0.14 * ratio))
    : Math.min(1, Math.max(0.5, 1.28 - 0.34 * ratio));
  const headroom = mode === 'face' ? 0.08 : 0.05;
  const s = boxH / (v * figH);
  const winTop = m.cTop * natH - headroom * v * figH;
  return {
    w: natW * s,
    h: natH * s,
    left: boxW / 2 - m.headCx * natW * s,
    top: -winTop * s,
  };
}

function apply(img, box, mode) {
  try {
    const src = img.currentSrc || img.src;
    let m = cache.get(src);
    if (m === undefined) { m = measure(img); cache.set(src, m); }
    if (!m) return;
    const r = box.getBoundingClientRect();
    const f = frameFor(m, img.naturalWidth, img.naturalHeight, r.width, r.height, mode);
    if (!f) return;
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    img.style.position = 'absolute';
    img.style.maxWidth = 'none';
    img.style.width = `${f.w}px`;
    img.style.height = `${f.h}px`;
    img.style.left = `${f.left}px`;
    img.style.top = `${f.top}px`;
  } catch { /* tainted canvas or layout not ready — CSS cover-fit remains */ }
}

// Fit `img` inside `box` (the overflow-hidden crop element). Waits for load,
// then re-fits automatically whenever the img's src is swapped later (e.g. the
// gambler's win/lose taunt portraits).
export function fitPortrait(img, box, mode = 'bust') {
  if (!img || !box) return;
  const run = () => apply(img, box, mode);
  if (img.complete && img.naturalWidth) run();
  if (!img.dataset.ktFit) {
    img.dataset.ktFit = '1';
    img.addEventListener('load', run);
  }
}

// Convenience: fit the hero greeting card's circular avatar in a section scene.
export function fitHeroCard(scene) {
  const av = scene.querySelector('.kt-npc-hero .av');
  if (av) fitPortrait(av.querySelector('img'), av, 'face');
}
