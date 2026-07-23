export interface TutorialViewOptions {
  onDismiss: () => void;
}

interface StatRow {
  label: string;
  cls: 'knight' | 'guardian' | 'rations' | 'greed';
  pct: number;
  note: string;
}

interface StrataRow {
  name: string;
  desc: string;
}

interface TutorialPage {
  title: string;
  visual?: string;
  body?: string;
  list?: string[];
  stats?: StatRow[];
  strata?: StrataRow[];
  footnote?: string;
}

const PAGES: TutorialPage[] = [
  {
    title: 'The Heist',
    visual: '🏰',
    body: `You're a knight who has broken into a dungeon to steal a guardian's hoard —
      then <b>escape alive</b> with everything you've grabbed. Fighting the guardian is
      optional. Stealing is the point: this is a heist, not a duel.`,
  },
  {
    title: 'Swap & Dig',
    body: `Tap a tile, then tap a neighbor to swap them. Match <b>3 or more</b> of the
      same tile in a row or column to clear them. Cleared tiles don't refill — each
      floor slowly empties out as you play, so every match is one step toward digging
      through to what's underneath.`,
  },
  {
    title: 'Tools of the Trade',
    list: [
      '<b>Weapons</b> (dagger, sword, axe, bow) — matching strikes the guardian; each swings differently (the axe cleaves an extra tile, the bow ignores armor).',
      "<b>Food</b> — refills Rations, not health; bigger matches, bigger refill.",
      "<b>Hoard</b> — the treasure itself; matching it banks Gold and raises the guardian's Greed.",
      '<b>Emblems</b> — heraldic charms that build toward banner powers (coming in a future update).',
      '<b>Candle</b> — matching it widens your torchlight, revealing more of the dark.',
    ],
  },
  {
    title: 'Your Vitals',
    stats: [
      { label: 'Knight', cls: 'knight', pct: 78, note: 'Your health. Empty and the run ends.' },
      { label: 'Guardian', cls: 'guardian', pct: 62, note: 'Empty it and you auto-escape with the full hoard.' },
      {
        label: 'Rations',
        cls: 'rations',
        pct: 40,
        note: "Drains each turn. Hit empty and you're Exhausted — the guardian's counters hit 50% harder.",
      },
      {
        label: 'Greed',
        cls: 'greed',
        pct: 25,
        note: 'Never resets. The more hoard you\'ve stolen, the angrier and tougher the guardian gets.',
      },
    ],
  },
  {
    title: 'Strata & Descending',
    body: `Every floor is stacked in three bands. Clear a floor's tiles entirely and you
      <b>descend</b> — a bigger board, a tougher guardian, richer loot. Your gold,
      Greed, and Rations all carry down with you.`,
    strata: [
      { name: 'Surface', desc: 'Starts lit. Common gear, modest hoard.' },
      { name: 'Relic', desc: 'Starts fogged. Better loot, more danger.' },
      { name: 'Vault', desc: 'Starts fogged, no food tiles at all. Best hoard, highest risk.' },
    ],
    footnote: `Fogged tiles are face-down until a match next to them reveals it — a
      candle match reveals a full ring instead of just the four sides.`,
  },
  {
    title: 'Escape or Fall',
    visual: '🏃💰',
    body: `Hit <b>Escape with loot</b> at any time to bank your gold and end the run
      safely — you never have to fight the whole dungeon. Break the guardian's HP and
      you auto-escape with everything. But if <b>your</b> HP hits zero first, the
      knight falls and the run is over.`,
  },
];

const FOCUSABLE_SELECTOR = 'button:not([disabled])';

export class TutorialView {
  private overlay: HTMLElement;
  private content: HTMLElement;
  private dots: HTMLElement;
  private skipBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private dismissBtn: HTMLButtonElement;
  private card: HTMLElement;

  private page = 0;
  private returnFocusTo: HTMLElement | null = null;
  private keydownHandler = (e: KeyboardEvent): void => this.handleKeydown(e);

  constructor(
    root: HTMLElement,
    private options: TutorialViewOptions,
  ) {
    this.overlay = mustFind(root, '[data-hud="tutorial-overlay"]');
    this.content = mustFind(root, '[data-hud="tutorial-content"]');
    this.dots = mustFind(root, '[data-hud="tutorial-dots"]');
    this.skipBtn = mustFind(root, '[data-hud="tutorial-skip"]') as HTMLButtonElement;
    this.backBtn = mustFind(root, '[data-hud="tutorial-back"]') as HTMLButtonElement;
    this.nextBtn = mustFind(root, '[data-hud="tutorial-next"]') as HTMLButtonElement;
    this.dismissBtn = mustFind(root, '[data-hud="tutorial-dismiss"]') as HTMLButtonElement;
    this.card = mustFind(root, '.tutorial-card');

    this.skipBtn.addEventListener('click', () => this.dismiss());
    this.dismissBtn.addEventListener('click', () => this.dismiss());
    this.backBtn.addEventListener('click', () => {
      if (this.page > 0) {
        this.page--;
        this.render();
      }
    });
    this.nextBtn.addEventListener('click', () => {
      if (this.page < PAGES.length - 1) {
        this.page++;
        this.render();
      } else {
        this.dismiss();
      }
    });
  }

  open(triggerEl?: HTMLElement): void {
    this.returnFocusTo = triggerEl ?? (document.activeElement as HTMLElement | null);
    this.page = 0;
    this.render();
    this.overlay.classList.add('visible');
    this.overlay.removeAttribute('inert');
    document.addEventListener('keydown', this.keydownHandler);
    this.nextBtn.focus();
  }

  private dismiss(): void {
    this.overlay.classList.remove('visible');
    this.overlay.setAttribute('inert', '');
    document.removeEventListener('keydown', this.keydownHandler);
    this.returnFocusTo?.focus();
    this.options.onDismiss();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.dismiss();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(this.card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private render(): void {
    const page = PAGES[this.page];
    const isLast = this.page === PAGES.length - 1;

    this.content.innerHTML = `
      <div class="tutorial-eyebrow">Page ${this.page + 1} of ${PAGES.length}</div>
      <h2 class="tutorial-title" id="tutorial-title">${page.title}</h2>
      <div class="tutorial-visual">${page.visual ?? ''}</div>
      <p class="tutorial-body">${page.body ?? ''}</p>
      ${renderList(page.list)}
      ${renderStats(page.stats)}
      ${renderStrata(page.strata, page.footnote)}
    `;

    this.dots.innerHTML = PAGES.map((_, i) => `<div class="tutorial-dot ${i === this.page ? 'active' : ''}"></div>`).join(
      '',
    );

    this.skipBtn.style.display = isLast ? 'none' : '';
    this.backBtn.disabled = this.page === 0;
    this.nextBtn.textContent = isLast ? "Let's dig in" : 'Next';
  }
}

function renderList(list?: string[]): string {
  if (!list) return '';
  return `<div class="tutorial-list">${list
    .map((html) => `<div class="tutorial-list-item"><div class="tutorial-swatch"></div><div>${html}</div></div>`)
    .join('')}</div>`;
}

function renderStats(stats?: StatRow[]): string {
  if (!stats) return '';
  return `<div class="tutorial-stats">${stats
    .map(
      (s) => `
      <div class="tutorial-stat-line">
        <div class="tutorial-stat-label">${s.label}</div>
        <div class="bar-track"><div class="bar-fill ${s.cls}" style="transform: scaleX(${s.pct / 100})"></div></div>
      </div>
      <p class="tutorial-stat-note">${s.note}</p>`,
    )
    .join('')}</div>`;
}

function renderStrata(strata?: StrataRow[], footnote?: string): string {
  if (!strata) return '';
  const bands = strata
    .map((s) => `<div class="tutorial-strata-band"><div class="name">${s.name}</div><div class="desc">${s.desc}</div></div>`)
    .join('');
  const note = footnote ? `<p class="tutorial-body" style="margin-top: 6px;">${footnote}</p>` : '';
  return `<div class="tutorial-stats">${bands}</div>${note}`;
}

function mustFind(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Tutorial element not found: ${selector}`);
  return el;
}
