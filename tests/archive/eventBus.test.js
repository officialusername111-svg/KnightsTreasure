import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../../archive/memory-match-www/js/core/eventBus.js';

describe('eventBus', () => {
  it('calls subscribed handlers with payload', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.on('match', fn);
    bus.emit('match', { pair: 'A' });
    expect(fn).toHaveBeenCalledWith({ pair: 'A' });
  });

  it('unsubscribes via returned function', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const off = bus.on('x', fn);
    off();
    bus.emit('x', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('supports multiple handlers in order', () => {
    const bus = createEventBus();
    const calls = [];
    bus.on('e', () => calls.push(1));
    bus.on('e', () => calls.push(2));
    bus.emit('e');
    expect(calls).toEqual([1, 2]);
  });
});
