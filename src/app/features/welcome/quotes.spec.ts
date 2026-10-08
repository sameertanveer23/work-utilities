import { describe, expect, it } from 'vitest';
import { QUOTES, pickQuoteIndex } from './quotes';

describe('pickQuoteIndex', () => {
  it('never returns the previous index, across the whole range of random values', () => {
    const n = 7;
    for (let previous = 0; previous < n; previous++) {
      for (let step = 0; step < 100; step++) {
        const index = pickQuoteIndex(n, previous, () => step / 100);
        expect(index).not.toBe(previous);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(n);
      }
    }
  });

  it('can reach every other index', () => {
    const n = 5;
    const seen = new Set<number>();
    for (let step = 0; step < 100; step++) seen.add(pickQuoteIndex(n, 2, () => step / 100));
    expect([...seen].sort()).toEqual([0, 1, 3, 4]);
  });

  it('picks anywhere when there is no valid previous index', () => {
    expect(pickQuoteIndex(4, null, () => 0.99)).toBe(3);
    expect(pickQuoteIndex(4, 9, () => 0)).toBe(0);
    expect(pickQuoteIndex(4, -1, () => 0)).toBe(0);
  });

  it('copes with a list of one', () => {
    expect(pickQuoteIndex(1, 0)).toBe(0);
    expect(pickQuoteIndex(0, null)).toBe(0);
  });
});

describe('QUOTES', () => {
  it('has complete, unique entries', () => {
    expect(QUOTES.every((q) => q.text.trim() && q.author.trim())).toBe(true);
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length);
  });
});
