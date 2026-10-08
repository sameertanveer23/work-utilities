import { describe, expect, it } from 'vitest';
import {
  diffSequences,
  diffText,
  splitLines,
  toSplitRows,
  toUnifiedText,
  withContext,
} from './diff';

const STRICT = { ignoreWhitespace: false, ignoreCase: false };

/** Replays the edit script: eq/del consume `a`, eq/ins consume `b`. */
function apply(a: string[], b: string[]): string[] {
  const out: string[] = [];
  for (const op of diffSequences(a, b)) {
    if (op.type === 'eq') out.push(a[op.aIndex]);
    else if (op.type === 'ins') out.push(b[op.bIndex]);
  }
  return out;
}

describe('splitLines', () => {
  it('handles empty input, CRLF and a trailing newline', () => {
    expect(splitLines('')).toEqual([]);
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
  });
});

describe('diffSequences', () => {
  it('reconstructs the target sequence for a range of edits', () => {
    const cases: [string[], string[]][] = [
      [[], []],
      [[], ['a', 'b']],
      [['a', 'b'], []],
      [['a', 'b', 'c'], ['a', 'b', 'c']],
      [['a', 'b', 'c', 'a', 'b', 'b', 'a'], ['c', 'b', 'a', 'b', 'a', 'c']],
      [['x', 'a', 'y'], ['a']],
      [['a'], ['b']],
    ];
    for (const [a, b] of cases) expect(apply(a, b)).toEqual(b);
  });

  it('finds a minimal script (classic Myers example needs 5 edits)', () => {
    const ops = diffSequences(['a', 'b', 'c', 'a', 'b', 'b', 'a'], ['c', 'b', 'a', 'b', 'a', 'c']);
    expect(ops.filter((o) => o.type !== 'eq')).toHaveLength(5);
  });

  it('reconstructs random sequences', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const make = () => Array.from({ length: Math.floor(rand() * 30) }, () => 'abc'[Math.floor(rand() * 3)]);
    for (let i = 0; i < 200; i++) {
      const a = make();
      const b = make();
      expect(apply(a, b)).toEqual(b);
    }
  });
});

describe('diffText', () => {
  it('reports identical text', () => {
    const result = diffText('a\nb', 'a\nb', STRICT);
    expect(result.identical).toBe(true);
    expect(result.unchanged).toBe(2);
  });

  it('counts added, removed and unchanged lines with line numbers', () => {
    const result = diffText('one\ntwo\nthree', 'one\n2\nthree\nfour', STRICT);
    expect(result).toMatchObject({ added: 2, removed: 1, unchanged: 2, identical: false });
    expect(result.rows.find((r) => r.kind === 'remove')).toMatchObject({ text: 'two', oldLine: 2 });
    expect(result.rows.find((r) => r.text === 'four')).toMatchObject({ kind: 'add', newLine: 4 });
  });

  it('ignores whitespace and case on request', () => {
    expect(diffText('Hello   World', 'hello world', STRICT).identical).toBe(false);
    expect(
      diffText('Hello   World', 'hello world', { ignoreWhitespace: true, ignoreCase: true })
        .identical,
    ).toBe(true);
  });

  it('highlights only the changed words in a paired line', () => {
    const result = diffText('const a = 1;', 'const a = 2;', STRICT);
    const removed = result.rows.find((r) => r.kind === 'remove')!;
    const added = result.rows.find((r) => r.kind === 'add')!;
    expect(removed.segments?.filter((s) => s.changed).map((s) => s.text)).toEqual(['1']);
    expect(added.segments?.filter((s) => s.changed).map((s) => s.text)).toEqual(['2']);
    expect(added.segments?.map((s) => s.text).join('')).toBe('const a = 2;');
  });

  it('skips word highlighting when lines share nothing', () => {
    const result = diffText('alpha', 'beta', STRICT);
    expect(result.rows.every((r) => r.segments === undefined)).toBe(true);
  });
});

describe('withContext', () => {
  const rows = diffText(
    Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n'),
    Array.from({ length: 20 }, (_, i) => (i === 10 ? 'changed' : `line ${i}`)).join('\n'),
    STRICT,
  ).rows;

  it('keeps everything when context is null', () => {
    expect(withContext(rows, null)).toHaveLength(rows.length);
  });

  it('collapses distant unchanged lines into gaps', () => {
    const shown = withContext(rows, 2);
    expect(shown.filter((r) => r.kind === 'gap')).toEqual([
      { kind: 'gap', hidden: 8 },
      { kind: 'gap', hidden: 7 },
    ]);
  });
});

describe('toSplitRows', () => {
  it('puts equal lines on both sides and zips a change block', () => {
    const { rows } = diffText('a\nb\nc', 'a\nX\nY\nc', STRICT);
    const split = toSplitRows(rows);
    expect(split).toHaveLength(4);
    expect(split[0]).toMatchObject({ left: { text: 'a' }, right: { text: 'a' } });
    expect(split[1]).toMatchObject({ left: { text: 'b' }, right: { text: 'X' } });
    expect(split[2]).toMatchObject({ left: null, right: { text: 'Y' } });
  });

  it('leaves the other side empty for pure additions and removals', () => {
    expect(toSplitRows(diffText('', 'new', STRICT).rows)[0]).toMatchObject({
      left: null,
      right: { kind: 'add' },
    });
    expect(toSplitRows(diffText('old', '', STRICT).rows)[0]).toMatchObject({
      left: { kind: 'remove' },
      right: null,
    });
  });

  it('shows the original text on the left when ignoring case', () => {
    const { rows } = diffText('Hello', 'hello', { ignoreWhitespace: false, ignoreCase: true });
    const [row] = toSplitRows(rows);
    expect(row).toMatchObject({ left: { originalText: 'Hello' }, right: { text: 'hello' } });
  });
});

describe('toUnifiedText', () => {
  it('prefixes lines with their change marker', () => {
    const { rows } = diffText('a\nb', 'a\nc', STRICT);
    expect(toUnifiedText(rows)).toBe('  a\n- b\n+ c');
  });
});
