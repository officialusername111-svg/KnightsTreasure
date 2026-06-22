export function computeStars({ mistakes, pairs, timeUsed, parTime }) {
  let stars = 3;
  const rate = pairs > 0 ? mistakes / pairs : 0;
  if (rate > 0.34) stars -= 1;
  if (rate > 1.0) stars -= 1;
  if (parTime > 0 && timeUsed > parTime) stars -= 1;
  return Math.max(1, Math.min(3, stars));
}

export function computeScore({ matches, timeRemaining, comboBonus, mistakes }) {
  const raw = matches * 100 + timeRemaining * 10 + comboBonus - mistakes * 50;
  return Math.max(0, raw);
}
