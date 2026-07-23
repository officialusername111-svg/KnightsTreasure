export interface OnboardingProgress {
  tutorialSeen: boolean;
  coachSeen: {
    firstMove: boolean;
    weaponMatch: boolean;
    foodMatch: boolean;
    hoardMatch: boolean;
    fogReveal: boolean;
    escapeReminder: boolean;
  };
}

const STORAGE_KEY = 'kt.onboarding.v1';

function defaults(): OnboardingProgress {
  return {
    tutorialSeen: false,
    coachSeen: {
      firstMove: false,
      weaponMatch: false,
      foodMatch: false,
      hoardMatch: false,
      fogReveal: false,
      escapeReminder: false,
    },
  };
}

/** localStorage only — this is UI onboarding state, unrelated to run/save state (which
 * isn't persisted at all yet, see GameController). Guarded because localStorage can throw
 * (private-mode Safari, disabled storage) — onboarding degrading to "always show" on a
 * read/write failure is an acceptable fallback, not a crash. See pivot decisions doc D25. */
export function loadOnboardingProgress(): OnboardingProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return {
      tutorialSeen: !!parsed?.tutorialSeen,
      coachSeen: { ...defaults().coachSeen, ...parsed?.coachSeen },
    };
  } catch {
    return defaults();
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Best-effort persistence — a failed write just means these prompts may reappear.
  }
}
