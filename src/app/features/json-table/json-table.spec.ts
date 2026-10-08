import { describe, expect, it } from 'vitest';
import {
  KEY_COLUMN,
  VALUE_COLUMN,
  cellView,
  columnsOf,
  differingColumns,
  flattenRow,
  matchesFilter,
  parseRows,
  sortRows,
  splitTopLevelValues,
  toDelimited,
} from './json-table';

describe('splitTopLevelValues', () => {
  it('finds back-to-back, comma-separated and newline-delimited values', () => {
    expect(splitTopLevelValues('{"a":1}{"a":2}').segments).toEqual(['{"a":1}', '{"a":2}']);
    expect(splitTopLevelValues('{"a":1},\n{"a":2}').segments).toHaveLength(2);
    expect(splitTopLevelValues('{"a":1}\n{"a":2}\n').segments).toHaveLength(2);
  });

  it('is not fooled by brackets and quotes inside strings', () => {
    const text = '{"a":"}{ \\" ]"}{"b":"["}';
    expect(splitTopLevelValues(text).segments).toEqual(['{"a":"}{ \\" ]"}', '{"b":"["}']);
  });

  it('handles pretty-printed multi-line values', () => {
    expect(splitTopLevelValues('{\n  "a": [1, 2]\n}\n{\n  "a": []\n}').segments).toHaveLength(2);
  });

  it('reports stray text and unclosed brackets with a position', () => {
    expect(splitTopLevelValues('{"a":1} nope').error).toMatch(/line 1, column 9/);
    expect(splitTopLevelValues('{"a":1}}').error).toMatch(/Unexpected "}"/);
    expect(splitTopLevelValues('\n{"a":').error).toMatch(/Unclosed bracket.*line 2, column 1/);
  });
});

describe('parseRows', () => {
  it('returns nothing for empty input', () => {
    expect(parseRows('  ', false)).toEqual({ rows: [], error: '' });
  });

  it('reads an array of objects', () => {
    const { rows } = parseRows('[{"id":1},{"id":2}]', false);
    expect(rows.map((r) => r['id'])).toEqual([1, 2]);
  });

  it('reads several separate objects as rows, and concatenated arrays as one list', () => {
    expect(parseRows('{"id":1}\n{"id":2}\n{"id":3}', false).rows).toHaveLength(3);
    expect(parseRows('[{"id":1}][{"id":2},{"id":3}]', false).rows).toHaveLength(3);
  });

  it('turns an object of objects into keyed rows', () => {
    const { rows } = parseRows('{"dev":{"url":"a"},"prod":{"url":"b"}}', false);
    expect(columnsOf(rows)).toEqual([KEY_COLUMN, 'url']);
    expect(rows.map((r) => r[KEY_COLUMN])).toEqual(['dev', 'prod']);
  });

  it('treats a plain single object as one row', () => {
    expect(parseRows('{"a":1,"b":{"c":2}}', false).rows).toHaveLength(1);
  });

  it('wraps non-object array items in a value column', () => {
    const { rows } = parseRows('[1,"two",null]', false);
    expect(columnsOf(rows)).toEqual([VALUE_COLUMN]);
    expect(rows).toHaveLength(3);
  });

  it('names which JSON failed when there are several', () => {
    expect(parseRows('{"a":1}\n{"a":}', false).error).toMatch(/^JSON 2 of 2:/);
    expect(parseRows('{"a":}', false).error).not.toMatch(/of/);
  });

  it('keeps a __proto__ key as an ordinary column', () => {
    const { rows } = parseRows('[{"__proto__":{"x":1}}]', false);
    expect(columnsOf(rows)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>)['x']).toBeUndefined();
  });
});

describe('flatten', () => {
  it('joins nested keys with dots but leaves arrays and empty objects alone', () => {
    const row = flattenRow({ a: { b: 1, c: { d: 2 } }, list: [1, 2], empty: {} });
    expect({ ...row }).toEqual({ 'a.b': 1, 'a.c.d': 2, list: [1, 2], empty: {} });
  });

  it('applies when parsing', () => {
    expect(columnsOf(parseRows('[{"a":{"b":1}}]', true).rows)).toEqual(['a.b']);
    expect(columnsOf(parseRows('[{"a":{"b":1}}]', false).rows)).toEqual(['a']);
  });
});

describe('columnsOf', () => {
  it('unions keys in first-seen order', () => {
    const { rows } = parseRows('[{"a":1,"b":2},{"c":3,"a":4}]', false);
    expect(columnsOf(rows)).toEqual(['a', 'b', 'c']);
  });
});

describe('differingColumns', () => {
  it('flags only the columns where rows disagree', () => {
    const { rows } = parseRows('[{"a":1,"b":"x"},{"a":1,"b":"y"}]', false);
    expect([...differingColumns(columnsOf(rows), rows)]).toEqual(['b']);
  });

  it('ignores key order inside nested values', () => {
    const { rows } = parseRows('[{"o":{"x":1,"y":2}},{"o":{"y":2,"x":1}}]', false);
    expect(differingColumns(columnsOf(rows), rows).size).toBe(0);
  });

  it('treats a missing key as different from null', () => {
    const { rows } = parseRows('[{"a":1,"n":null},{"a":1}]', false);
    expect([...differingColumns(columnsOf(rows), rows)]).toEqual(['n']);
  });

  it('flags nothing for a single row', () => {
    const { rows } = parseRows('[{"a":1}]', false);
    expect(differingColumns(columnsOf(rows), rows).size).toBe(0);
  });
});

describe('cellView', () => {
  const { rows } = parseRows('[{"s":"hi","n":1.5,"t":true,"z":null,"o":{"a":[1]}}]', false);
  it('describes each kind of value', () => {
    expect(cellView(rows[0], 's')).toEqual({ text: 'hi', kind: 'text' });
    expect(cellView(rows[0], 'n')).toEqual({ text: '1.5', kind: 'number' });
    expect(cellView(rows[0], 't')).toEqual({ text: 'true', kind: 'boolean' });
    expect(cellView(rows[0], 'z')).toEqual({ text: 'null', kind: 'null' });
    expect(cellView(rows[0], 'o')).toEqual({ text: '{"a":[1]}', kind: 'json' });
    expect(cellView(rows[0], 'nope')).toEqual({ text: '', kind: 'missing' });
  });
});

describe('matchesFilter', () => {
  const { rows } = parseRows('[{"name":"Alice","age":30},{"name":"Bob","age":41}]', false);
  it('matches any cell, ignoring case', () => {
    expect(rows.filter((r) => matchesFilter(r, ['name', 'age'], 'ALI'))).toHaveLength(1);
    expect(rows.filter((r) => matchesFilter(r, ['name', 'age'], '4'))).toHaveLength(1);
    expect(rows.filter((r) => matchesFilter(r, ['name', 'age'], ' '))).toHaveLength(2);
  });

  it('only looks at the columns it is given', () => {
    expect(rows.filter((r) => matchesFilter(r, ['age'], 'alice'))).toHaveLength(0);
  });
});

describe('sortRows', () => {
  const { rows } = parseRows(
    '[{"n":10,"s":"b10"},{"n":9,"s":"b9"},{"n":null,"s":"a"},{"s":"c"}]',
    false,
  );

  it('compares numbers as numbers, not text', () => {
    expect(sortRows(rows, 'n', 'asc').map((r) => r['n'])).toEqual([9, 10, null, undefined]);
    expect(sortRows(rows, 'n', 'desc').map((r) => r['n'])).toEqual([10, 9, null, undefined]);
  });

  it('puts missing and null last in both directions', () => {
    expect(sortRows(rows, 'n', 'desc').slice(-2).map((r) => r['s'])).toEqual(['a', 'c']);
  });

  it('sorts text naturally and does not mutate the input', () => {
    expect(sortRows(rows, 's', 'asc').map((r) => r['s'])).toEqual(['a', 'b9', 'b10', 'c']);
    expect(rows.map((r) => r['s'])).toEqual(['b10', 'b9', 'a', 'c']);
  });
});

describe('toDelimited', () => {
  const { rows } = parseRows('[{"a":"x,y","b":"say \\"hi\\""},{"a":"1\\t2\\n3"}]', false);

  it('quotes CSV fields that need it and leaves missing cells empty', () => {
    expect(toDelimited(['a', 'b'], rows, 'csv')).toBe('a,b\n"x,y","say ""hi"""\n"1\t2\n3",');
  });

  it('flattens tabs and line breaks for TSV', () => {
    expect(toDelimited(['a', 'b'], rows, 'tsv')).toBe('a\tb\nx,y\tsay "hi"\n1 2 3\t');
  });
});
