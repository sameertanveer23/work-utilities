import { describe, expect, it } from 'vitest';
import { MAX_MATCHES, runRegex, toSegments } from './regex-test';

describe('runRegex', () => {
  it('returns nothing for an empty pattern', () => {
    expect(runRegex('', 'g', 'abc')).toEqual({ error: '', matches: [], truncated: false });
  });

  it('finds every match with positions when global', () => {
    const { matches } = runRegex('\\d+', 'g', 'a1 b22 c333');
    expect(matches.map((m) => [m.text, m.index, m.end])).toEqual([
      ['1', 1, 2],
      ['22', 4, 6],
      ['333', 8, 11],
    ]);
  });

  it('stops after the first match without the g flag', () => {
    expect(runRegex('\\d+', '', 'a1 b22').matches).toHaveLength(1);
  });

  it('honours the i, m and s flags', () => {
    expect(runRegex('ABC', 'gi', 'abc').matches).toHaveLength(1);
    expect(runRegex('^b', 'gm', 'a\nb').matches).toHaveLength(1);
    expect(runRegex('^b', 'g', 'a\nb').matches).toHaveLength(0);
    expect(runRegex('a.b', 'gs', 'a\nb').matches).toHaveLength(1);
  });

  it('terminates on patterns that match the empty string', () => {
    const { matches } = runRegex('x*', 'g', 'abc');
    expect(matches).toHaveLength(4);
    expect(matches.every((m) => m.text === '')).toBe(true);
  });

  it('caps the number of matches and says so', () => {
    const result = runRegex('a', 'g', 'a'.repeat(MAX_MATCHES + 50));
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(true);
  });

  it('reports invalid patterns without throwing', () => {
    const result = runRegex('(', 'g', 'abc');
    expect(result.error).not.toBe('');
    expect(result.error).not.toMatch(/^Invalid regular expression/);
    expect(result.matches).toEqual([]);
  });
});

describe('toSegments', () => {
  it('splits text into matched and unmatched runs that rebuild the input', () => {
    const text = 'a1b22c';
    const segments = toSegments(text, runRegex('\\d+', 'g', text).matches);
    expect(segments.map((s) => [s.text, s.matched])).toEqual([
      ['a', false],
      ['1', true],
      ['b', false],
      ['22', true],
      ['c', false],
    ]);
    expect(segments.map((s) => s.text).join('')).toBe(text);
  });

  it('alternates the odd flag so adjacent matches differ', () => {
    const text = '1234';
    const segments = toSegments(text, runRegex('\\d\\d', 'g', text).matches);
    expect(segments.map((s) => s.odd)).toEqual([true, false]);
  });

  it('skips empty matches', () => {
    const text = 'abc';
    expect(toSegments(text, runRegex('x*', 'g', text).matches)).toEqual([
      { text: 'abc', matched: false, odd: false },
    ]);
  });
});
