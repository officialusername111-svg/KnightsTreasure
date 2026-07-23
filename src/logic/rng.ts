export interface Rng {
  next(): number;
}

export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0xffffffff;
    },
  };
}

export function advanceSeed(rng: Rng): number {
  return (Math.floor(rng.next() * 0xffffffff) >>> 0) || 1;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng.next() * items.length)];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
