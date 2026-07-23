export interface CoachMarkRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CoachMark {
  tag: string;
  html: string;
  /** Rect relative to the CoachMarkView's stage root (not the viewport) — callers resolve
   * DOM element or board-tile anchors into this before calling show(). */
  rect: CoachMarkRect;
}

const AUTO_DISMISS_MS = 4000;

/** Non-blocking, once-ever speech-bubble callouts pointing at a live board/HUD element.
 * Distinct from TutorialView (modal, paginated) — see pivot decisions doc D25. Positioned
 * absolutely within `stage` using rects the caller already resolved to stage-local
 * coordinates, so this view has no knowledge of Pixi/canvas geometry itself. */
export class CoachMarkView {
  private anchorEl: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private outsideClickHandler = (): void => this.dismiss();

  constructor(private stage: HTMLElement) {}

  show(mark: CoachMark): void {
    this.dismiss();

    const anchor = document.createElement('div');
    anchor.className = 'coach-anchor';
    anchor.style.left = `${mark.rect.left}px`;
    anchor.style.top = `${mark.rect.top}px`;
    anchor.style.width = `${mark.rect.width}px`;
    anchor.style.height = `${mark.rect.height}px`;

    const pulse = document.createElement('div');
    pulse.className = 'coach-pulse';
    anchor.appendChild(pulse);

    const bubble = document.createElement('div');
    bubble.className = 'coach-bubble';
    bubble.setAttribute('role', 'status');
    bubble.style.bottom = `${mark.rect.height + 12}px`;
    bubble.style.left = '50%';
    bubble.style.transform = 'translateX(-50%)';

    const pointer = document.createElement('div');
    pointer.className = 'coach-pointer from-bottom';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'coach-dismiss';
    dismissBtn.setAttribute('aria-label', 'Dismiss tip');
    dismissBtn.textContent = '✕';
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
    });

    const tagEl = document.createElement('div');
    tagEl.className = 'coach-tag';
    tagEl.textContent = mark.tag;

    const textEl = document.createElement('p');
    textEl.className = 'coach-text';
    textEl.innerHTML = mark.html;

    bubble.append(dismissBtn, tagEl, textEl, pointer);
    anchor.appendChild(bubble);
    this.stage.appendChild(anchor);
    this.anchorEl = anchor;

    this.dismissTimer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
    // Capture phase so a click on the bubble itself (stopPropagation above) doesn't also
    // trigger the outside-click dismiss.
    document.addEventListener('click', this.outsideClickHandler, { capture: true });
  }

  dismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    document.removeEventListener('click', this.outsideClickHandler, { capture: true });
    this.anchorEl?.remove();
    this.anchorEl = null;
  }
}
