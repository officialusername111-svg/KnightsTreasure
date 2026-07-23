import type { GameState } from '../logic/types';
import { FOOD_BALANCE, GREED_BALANCE } from '../logic/data/balance';

export interface HudViewOptions {
  onEscapeIntent: () => void;
}

export class HudView {
  private knightBar: HTMLElement;
  private knightValue: HTMLElement;
  private guardianBar: HTMLElement;
  private guardianValue: HTMLElement;
  private rationsBar: HTMLElement;
  private rationsValue: HTMLElement;
  private greedBar: HTMLElement;
  private greedValue: HTMLElement;
  private goldValue: HTMLElement;
  private floorChip: HTMLElement;
  private banner: HTMLElement;
  private bannerTitle: HTMLElement;
  private bannerSub: HTMLElement;
  private escapeBtn: HTMLElement;

  constructor(root: HTMLElement, options: HudViewOptions) {
    this.knightBar = mustFind(root, '[data-hud="knight-bar"]');
    this.knightValue = mustFind(root, '[data-hud="knight-value"]');
    this.guardianBar = mustFind(root, '[data-hud="guardian-bar"]');
    this.guardianValue = mustFind(root, '[data-hud="guardian-value"]');
    this.rationsBar = mustFind(root, '[data-hud="rations-bar"]');
    this.rationsValue = mustFind(root, '[data-hud="rations-value"]');
    this.greedBar = mustFind(root, '[data-hud="greed-bar"]');
    this.greedValue = mustFind(root, '[data-hud="greed-value"]');
    this.goldValue = mustFind(root, '[data-hud="gold-value"]');
    this.floorChip = mustFind(root, '[data-hud="floor-chip"]');
    this.banner = mustFind(root, '[data-hud="banner"]');
    this.bannerTitle = mustFind(root, '[data-hud="banner-title"]');
    this.bannerSub = mustFind(root, '[data-hud="banner-sub"]');
    this.escapeBtn = mustFind(root, '[data-hud="escape-btn"]');
    this.escapeBtn.addEventListener('click', () => options.onEscapeIntent());
  }

  sync(state: GameState): void {
    const knightPct = state.knight.maxHp > 0 ? state.knight.hp / state.knight.maxHp : 0;
    this.knightBar.style.transform = `scaleX(${knightPct})`;
    this.knightValue.textContent = `${state.knight.hp}/${state.knight.maxHp}`;

    const guardianPct = state.guardian.maxHp > 0 ? state.guardian.hp / state.guardian.maxHp : 0;
    this.guardianBar.style.transform = `scaleX(${guardianPct})`;
    this.guardianValue.textContent = `${state.guardian.hp}/${state.guardian.maxHp}`;

    const rationsPct = state.meters.rations / FOOD_BALANCE.maxRations;
    this.rationsBar.style.transform = `scaleX(${rationsPct})`;
    this.rationsValue.textContent = `${state.meters.rations}/${FOOD_BALANCE.maxRations}`;

    const greedPct = Math.min(1, state.meters.greed / GREED_BALANCE.displayCap);
    this.greedBar.style.transform = `scaleX(${greedPct})`;
    this.greedValue.textContent = `${state.meters.greed}`;

    this.goldValue.textContent = `${state.gold}`;
    this.floorChip.textContent = `Floor ${state.floor} · Stratum ${state.stratum}`;

    const isOver = state.status !== 'playing';
    this.escapeBtn.style.display = isOver ? 'none' : '';

    this.banner.classList.toggle('visible', isOver);
    this.banner.classList.toggle('victory', state.status === 'escaped');
    this.banner.classList.toggle('defeat', state.status === 'dead');
    if (state.status === 'escaped') {
      this.bannerTitle.textContent = 'Escaped with the hoard!';
      this.bannerSub.textContent = `${state.gold} gold banked · reached floor ${state.floor}`;
    } else if (state.status === 'dead') {
      this.bannerTitle.textContent = 'The knight has fallen';
      this.bannerSub.textContent = `${state.gold} gold lost to the vault · reached floor ${state.floor}`;
    }
  }
}

function mustFind(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`HUD element not found: ${selector}`);
  return el;
}
