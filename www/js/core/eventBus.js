export function createEventBus() {
  const handlers = new Map(); // type -> Set<fn>

  function on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
  }

  function off(type, fn) {
    handlers.get(type)?.delete(fn);
  }

  function emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  return { on, off, emit };
}
