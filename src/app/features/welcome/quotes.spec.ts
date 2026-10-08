import { describe, expect, it } from 'vitest';
import { QUOTES, localDayNumber, quoteFor } from './quotes';

describe('quoteFor', () => {
  it('is stable through a day and changes the next day', () => {
    const morning = new Date(2026, 9, 9, 6, 0);
    const night = new Date(2026, 9, 9, 23, 59);
    const tomorrow = new Date(2026, 9, 10, 0, 1);
    expect(quoteFor(morning)).toBe(quoteFor(night));
    expect(quoteFor(tomorrow)).not.toBe(quoteFor(morning));
  });

  it('steps forward with the offset and wraps round the list', () => {
    const day = new Date(2026, 9, 9);
    expect(quoteFor(day, 1)).toBe(quoteFor(new Date(2026, 9, 10)));
    expect(quoteFor(day, QUOTES.length)).toBe(quoteFor(day));
    expect(quoteFor(day, -1)).toBe(quoteFor(new Date(2026, 9, 8)));
  });

  it('counts consecutive local days, across a month end', () => {
    expect(localDayNumber(new Date(2026, 10, 1)) - localDayNumber(new Date(2026, 9, 31))).toBe(1);
  });
});

describe('QUOTES', () => {
  it('has complete, unique entries', () => {
    expect(QUOTES.every((q) => q.text.trim() && q.author.trim())).toBe(true);
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length);
  });
});
