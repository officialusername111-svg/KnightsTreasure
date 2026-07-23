import type { GameState } from '../logic/types';
import { FOOD_BALANCE, GREED_BALANCE } from '../logic/data/balance';

export class HudView {
  private guardianBar: HTMLElement;
  private guardianValue: HTMLElement;
  private rationsBar: HTMLElement;
  private rationsValue: HTMLElement;
  private greedBar: HTMLElement;
  private greedValue: HTMLElement;
  private goldValue: HTMLElement;
  private floorChip: HTMLElement;
  private banner: HTMLElement;

  constructor(root: HTMLElement) {
    this.guardianBar = mustFind(root, '[data-hud="guardian-bar"]');
    this.guardianValue = mustFind(root, '[data-hud="guardian-value"]');
    this.rationsBar = mustFind(root, '[data-hud="rations-bar"]');
    this.rationsValue = mustFind(root, '[data-hud="rations-value"]');
    this.greedBar = mustFind(root, '[data-hud="greed-bar"]');
    this.greedValue = mustFind(root, '[data-hud="greed-value"]');
    this.goldValue = mustFind(root, '[data-hud="gold-value"]');
    this.floorChip = mustFind(root, '[data-hud="floor-chip"]');
    this.banner = mustFind(root, '[data-hud="banner"]');
  }

  sync(state: GameState, guardianDefeated: boolean): void {
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

    this.banner.classList.toggle('visible', guardianDefeated);
  }
}

function mustFind(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`HUD element not found: ${selector}`);
  return el;
}
