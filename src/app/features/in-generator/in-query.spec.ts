import { describe, expect, it } from 'vitest';
import { buildInQuery, parseIds, quoteId } from './in-query';

describe('parseIds', () => {
  it('splits on newlines and trims', () => {
    expect(parseIds(' a \n b \r\n c ', false)).toEqual(['a', 'b', 'c']);
  });

  it('also accepts commas, semicolons and tabs', () => {
    expect(parseIds('a,b;c\td', false)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops blank entries', () => {
    expect(parseIds('a\n\n\nb', false)).toEqual(['a', 'b']);
  });

  it('dedupes only when asked', () => {
    expect(parseIds('a\nb\na', false)).toEqual(['a', 'b', 'a']);
    expect(parseIds('a\nb\na', true)).toEqual(['a', 'b']);
  });
});

describe('quoteId', () => {
  it('quotes per format', () => {
    expect(quoteId('x', 'single-quote')).toBe("'x'");
    expect(quoteId('x', 'double-quote')).toBe('"x"');
    expect(quoteId('x', 'no-quote')).toBe('x');
  });

  it('escapes an embedded quote by doubling it', () => {
    expect(quoteId("O'Brien", 'single-quote')).toBe("'O''Brien'");
  });
});

describe('buildInQuery', () => {
  const base = { table: 'Users', column: 'UserId', dedupe: false } as const;

  it('matches the original output format exactly', () => {
    const query = buildInQuery({ ...base, rawIds: '1\n2\n3', format: 'single-quote' });
    expect(query).toBe("SELECT *\nFROM Users\nWHERE UserId IN (\n  '1',\n'2',\n'3'\n);");
  });

  it('honours the no-quote format', () => {
    const query = buildInQuery({ ...base, rawIds: '1\n2', format: 'no-quote' });
    expect(query).toBe('SELECT *\nFROM Users\nWHERE UserId IN (\n  1,\n2\n);');
  });

  it('returns nothing when a required field is missing', () => {
    expect(buildInQuery({ ...base, table: '', rawIds: '1', format: 'no-quote' })).toBe('');
    expect(buildInQuery({ ...base, column: '', rawIds: '1', format: 'no-quote' })).toBe('');
    expect(buildInQuery({ ...base, rawIds: '   ', format: 'no-quote' })).toBe('');
  });
});
