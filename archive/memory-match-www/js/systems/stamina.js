// Stamina (GDD §Stamina System + D-schema v3). 1 regen / 30 min, max 5. Time-based
// from saved timestamps so it counts in the background; guarded against clock rollback.
export const MAX_STAMINA = 5;
export const REGEN_MS = 30 * 60 * 1000;

// Monotonic "now": never let a backward system clock grant or stall regen unfairly.
function effNow(save, now) {
  return Math.max(now, save.staminaMaxSeen || 0);
}

// Apply elapsed-time regen into the save (call on load + before any read/use).
export function refresh(save, now = Date.now()) {
  if (typeof save.stamina !== 'number') save.stamina = MAX_STAMINA;
  const en = effNow(save, now);
  save.staminaMaxSeen = en;
  if (save.stamina >= MAX_STAMINA) {
    save.staminaLastUpdated = en;            // full → no pending timer
    return save;
  }
  const last = save.staminaLastUpdated || en;
  const gained = Math.floor((en - last) / REGEN_MS);
  if (gained > 0) {
    save.stamina = Math.min(MAX_STAMINA, save.stamina + gained);
    // keep the remainder so regen doesn't drift
    save.staminaLastUpdated = save.stamina >= MAX_STAMINA ? en : last + gained * REGEN_MS;
  }
  return save;
}

export function current(save, now = Date.now()) {
  refresh(save, now);
  return save.stamina;
}

// ms until the next stamina point (0 if already full).
export function msUntilNext(save, now = Date.now()) {
  refresh(save, now);
  if (save.stamina >= MAX_STAMINA) return 0;
  const en = effNow(save, now);
  return REGEN_MS - ((en - save.staminaLastUpdated) % REGEN_MS);
}

export function countdownText(save, now = Date.now()) {
  const ms = msUntilNext(save, now);
  if (ms <= 0) return 'Full';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Spend n stamina for a level. Returns true if it was affordable.
export function consume(save, n = 1, now = Date.now()) {
  refresh(save, now);
  if (save.stamina < n) return false;
  const wasFull = save.stamina >= MAX_STAMINA;
  save.stamina -= n;
  if (wasFull) save.staminaLastUpdated = effNow(save, now); // start the regen clock
  return true;
}

// Restore n stamina (number or 'full'); from drinks / dice wins.
export function restore(save, n, now = Date.now()) {
  refresh(save, now);
  save.stamina = n === 'full' ? MAX_STAMINA : Math.min(MAX_STAMINA, save.stamina + n);
  if (save.stamina < MAX_STAMINA && !save.staminaLastUpdated) save.staminaLastUpdated = effNow(save, now);
  return save.stamina;
}
