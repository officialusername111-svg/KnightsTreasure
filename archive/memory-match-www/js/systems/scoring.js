export function computeStars({ mistakes, pairs, timeUsed, parTime }) {
  let stars = 3;
  const rate = pairs > 0 ? mistakes / pairs : 0;
  if (rate > 0.34) stars -= 1;
  if (rate > 1.0) stars -= 1;
  if (parTime > 0 && timeUsed > parTime) stars -= 1;
  return Math.max(1, Math.min(3, stars));
}

// Mistake penalty is capped at the points earned so the score never goes negative
// (a level cleared should never read as a negative result).
export function mistakePenalty({ matches, timeRemaining, comboBonus, mistakes }) {
  const positive = matches * 100 + timeRemaining * 10 + comboBonus;
  return Math.min(mistakes * 50, positive);
}

export function computeScore({ matches, timeRemaining, comboBonus, mistakes }) {
  const positive = matches * 100 + timeRemaining * 10 + comboBonus;
  return positive - mistakePenalty({ matches, timeRemaining, comboBonus, mistakes });
}
