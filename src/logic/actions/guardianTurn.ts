import type { GameState } from '../types';
import { GUARDIAN_BALANCE } from '../data/balance';
import { isGuardianDefeated } from '../selectors';

/** Runs once per resolved swap (a "turn", D13), after weaponEffects has already applied
 * this turn's damage. See pivot decisions doc D17-D19. */
export function guardianTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  if (isGuardianDefeated(state)) {
    return { ...state, status: 'escaped' };
  }

  const rage = Math.min(GUARDIAN_BALANCE.maxRage, Math.floor(state.meters.greed / GUARDIAN_BALANCE.rageDivisor));
  const armor = Math.min(GUARDIAN_BALANCE.maxArmor, rage * GUARDIAN_BALANCE.armorPerRage);

  if (state.guardian.turnCounter < GUARDIAN_BALANCE.attackInterval) {
    return { ...state, guardian: { ...state.guardian, rage, armor } };
  }

  const turnCounter = state.guardian.turnCounter - GUARDIAN_BALANCE.attackInterval;
  const rawDamage = GUARDIAN_BALANCE.baseCounterDamage + rage * GUARDIAN_BALANCE.rageDamagePerLevel;
  const damage = Math.round(rawDamage * (state.meters.exhausted ? GUARDIAN_BALANCE.exhaustedDamageMultiplier : 1));
  const hp = Math.max(0, state.knight.hp - damage);

  return {
    ...state,
    guardian: { ...state.guardian, rage, armor, turnCounter },
    knight: { ...state.knight, hp },
    status: hp <= 0 ? 'dead' : state.status,
  };
}
