import { describe, it, expect } from 'vitest';
import { getMail, deleteMail, clearReadMail } from '../../archive/memory-match-www/js/services/social.js';

describe('mail delete/clear (in place)', () => {
  const make = () => ({ mail: [
    { id: 'a', read: true }, { id: 'b', read: false }, { id: 'c', read: true },
  ] });

  it('deleteMail removes by id and keeps the same array reference', () => {
    const save = make();
    const ref = getMail(save);
    expect(deleteMail(save, 'b')).toBe(true);
    expect(ref).toBe(save.mail);                       // mutated in place (no reassignment)
    expect(save.mail.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('deleteMail matches ids loosely and reports misses', () => {
    const save = make();
    expect(deleteMail(save, 'nope')).toBe(false);
    expect(save.mail).toHaveLength(3);
  });

  it('clearReadMail removes only read mail, in place, returning the count', () => {
    const save = make();
    const ref = getMail(save);
    expect(clearReadMail(save)).toBe(2);
    expect(ref).toBe(save.mail);
    expect(save.mail.map((m) => m.id)).toEqual(['b']);
  });
});
