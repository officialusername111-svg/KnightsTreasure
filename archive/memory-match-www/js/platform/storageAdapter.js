// Storage adapter matching the { get, set } shape used by save.js.
// Uses native Capacitor Preferences (injected as a global on device) when present;
// falls back to localStorage in a plain browser. No bare-specifier import, so it
// works when served as plain ES modules without a bundler.
export function createStorageAdapter() {
  const prefs =
    typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins
      ? window.Capacitor.Plugins.Preferences
      : null;

  if (prefs) {
    return {
      async get(key) {
        const { value } = await prefs.get({ key });
        return value ?? null;
      },
      async set(key, value) {
        await prefs.set({ key, value });
      },
    };
  }

  return {
    async get(key) {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    },
    async set(key, value) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    },
  };
}
