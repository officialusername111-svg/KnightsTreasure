import { describe, it, expect } from 'vitest';
import { frameFor } from '../../archive/memory-match-www/js/ui/portraitFit.js';

// Story-dialog crop box at mobile (measured 375×812 viewport).
const BOX = { w: 120, h: 357 };

// Figure fills most of the canvas, head at the top, centered — the common shape
// of the bg-removed character renders.
const meta = (w, h) => ({ cTop: 0.03, bot: 0.97, left: 0.05, right: 0.95, headCx: 0.5 });

describe('portrait frameFor', () => {
  it('shows most of an already-bust (square) image', () => {
    // knight_ready-like: 198×210
    const f = frameFor(meta(), 198, 210, BOX.w, BOX.h, 'bust');
    const visibleFrac = BOX.h / f.h; // fraction of image height inside the box
    expect(visibleFrac).toBeGreaterThan(0.8);
  });

  it('crops a tall full-figure image to a bust (~half the figure)', () => {
    // dungeon_prisoner-like: 331×682
    const f = frameFor(meta(), 331, 682, BOX.w, BOX.h, 'bust');
    const visibleFrac = BOX.h / f.h;
    expect(visibleFrac).toBeLessThan(0.62);
    expect(visibleFrac).toBeGreaterThan(0.4);
  });

  it('renders heads at comparable size across differing canvas shapes', () => {
    // Head height ≈ a fixed share of figure height in this art style; the on-screen
    // head size is scale × figure height × that share — so compare v·figH scaling:
    // on-screen bust window = box height for both, so head share of the box differs
    // only by the v ramp. Square art v≈0.9, tall art v≈0.5 — but tall figures carry
    // proportionally smaller heads (head ≈ 1/5 of figure vs ≈ 1/2.2 of a bust), so
    // the rendered head heights land close. Assert the window heights (v·figH·s)
    // both equal the box, and the scales differ by the expected ratio, not ~3×.
    const square = frameFor(meta(), 198, 210, BOX.w, BOX.h, 'bust');
    const tall = frameFor(meta(), 207, 374, BOX.w, BOX.h, 'bust');
    const zoomRatio = (square.h / 210) / (tall.h / 374); // px-per-source-px ratio
    expect(zoomRatio).toBeGreaterThan(0.6);
    expect(zoomRatio).toBeLessThan(1.7); // was ~1.8–2.9 with object-fit:cover
  });

  it('centers the frame on the head, not the canvas', () => {
    const m = { cTop: 0.03, bot: 0.97, left: 0.05, right: 0.95, headCx: 0.4 };
    const f = frameFor(m, 300, 600, BOX.w, BOX.h, 'bust');
    // headCx (0.4 × 300 = 120 src px) should land at box center
    const headOnScreen = f.left + 0.4 * f.w;
    expect(Math.abs(headOnScreen - BOX.w / 2)).toBeLessThan(0.5);
  });

  it('face mode zooms tighter than bust mode', () => {
    const bust = frameFor(meta(), 274, 308, 60, 60, 'bust');
    const face = frameFor(meta(), 274, 308, 60, 60, 'face');
    expect(face.h).toBeGreaterThan(bust.h);
  });

  it('returns null for degenerate input', () => {
    expect(frameFor({ cTop: 0.5, bot: 0.5, left: 0.2, right: 0.8, headCx: 0.5 }, 100, 100, 60, 60)).toBeNull();
    expect(frameFor(meta(), 100, 100, 0, 0)).toBeNull();
  });
});
