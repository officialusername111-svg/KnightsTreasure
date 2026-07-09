// Haptic feedback (owner-approved 2026-07-09, extracted from the animation-research
// prompt). navigator.vibrate on Android WebView; silent no-op where unsupported.
// Gated by the settings toggle (save.settings.haptics, default ON) and reduced-motion.

let enabled = true;

export function setHaptics(on) { enabled = !!on; }
export function hapticsEnabled() { return enabled; }

// Pattern per event, intensity matched to the moment: light ticks for routine taps,
// rhythmic pulses for celebrations, one heavy hit for the bomb.
const PATTERNS = {
  flip: 8,
  match: [12, 40, 18],
  mismatch: [30, 30, 30],
  win: [16, 60, 16, 60, 40],
  lose: 60,
  power: 18,
  arm: 10,
  bomb: [12, 30, 55],
  combo: [10, 20, 10, 20, 25],
};

export function haptic(kind) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { navigator.vibrate(PATTERNS[kind] || 10); } catch { /* unsupported: ignore */ }
}
