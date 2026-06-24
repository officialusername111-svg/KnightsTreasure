// First-launch tutorial (Plan 3). A self-contained stepped dialog — reused on the very
// first level and from Settings → Replay tutorial. Styled with the shared .kt-info classes.
const STEPS = [
  { title: 'Welcome, knight!', body: 'Your quest: recover the realm’s lost treasures by matching pairs of enchanted tiles.' },
  { title: 'Reveal & match', body: 'Tap a tile to flip it, then find its twin. A matching pair stays face-up — a mismatch flips back, so commit it to memory.' },
  { title: 'Clear the board', body: 'Match every pair to win. Timed levels show a countdown; calmer levels let you take your time. Fewer mistakes earn more stars.' },
  { title: 'Power-ups & rest', body: 'Earn coins to forge power-ups at the Blacksmith, and rest at the Inn to restore stamina. Now — to the treasure!' },
];

export function showTutorial(parent, { onDone } = {}) {
  const o = document.createElement('div');
  o.className = 'kt-info kt-tut';
  let i = 0;
  const render = () => {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    o.innerHTML =
      `<div class="kt-info-card">` +
        `<div class="kt-tut-dots">${STEPS.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>` +
        `<h3>${s.title}</h3><p>${s.body}</p>` +
        `<button type="button" class="kt-btn kt-tut-next">${last ? 'Begin' : 'Next'}</button>` +
      `</div>`;
    o.querySelector('.kt-tut-next').addEventListener('click', () => {
      if (last) { o.remove(); onDone && onDone(); }
      else { i += 1; render(); }
    });
  };
  render();
  parent.appendChild(o);
  return o;
}
