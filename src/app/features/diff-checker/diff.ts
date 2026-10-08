export interface DiffOptions {
  readonly ignoreWhitespace: boolean;
  readonly ignoreCase: boolean;
}

/** A run of text within a changed line; `changed` marks the part that differs. */
export interface Segment {
  readonly text: string;
  readonly changed: boolean;
}

export interface DiffRow {
  readonly kind: 'equal' | 'add' | 'remove';
  readonly text: string;
  /** On equal rows only: the left-hand text, which can differ from `text` when ignoring case/space. */
  readonly originalText?: string;
  readonly oldLine: number | null;
  readonly newLine: number | null;
  /** Word-level breakdown, present only for lines paired with a counterpart. */
  readonly segments?: readonly Segment[];
}

export interface GapRow {
  readonly kind: 'gap';
  readonly hidden: number;
}

export type DisplayRow = DiffRow | GapRow;

/** One line of the side-by-side view; either side is null where nothing lines up. */
export interface SplitRow {
  readonly kind: 'split';
  readonly left: DiffRow | null;
  readonly right: DiffRow | null;
}

export type SplitDisplayRow = SplitRow | GapRow;

export interface DiffResult {
  readonly rows: readonly DiffRow[];
  readonly added: number;
  readonly removed: number;
  readonly unchanged: number;
  readonly identical: boolean;
}

type Op = { readonly type: 'eq' | 'del' | 'ins'; readonly aIndex: number; readonly bIndex: number };

/** Lines longer than this skip the word-level pass, which is quadratic-ish in tokens. */
const WORD_DIFF_MAX_LENGTH = 2000;

export function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r\n|\r|\n/);
  // A trailing newline terminates the last line rather than starting a new one.
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function comparisonKey(line: string, options: DiffOptions): string {
  let key = line;
  if (options.ignoreWhitespace) key = key.replace(/\s+/g, ' ').trim();
  if (options.ignoreCase) key = key.toLowerCase();
  return key;
}

export function diffText(original: string, modified: string, options: DiffOptions): DiffResult {
  const a = splitLines(original);
  const b = splitLines(modified);
  const ops = diffSequences(
    a.map((l) => comparisonKey(l, options)),
    b.map((l) => comparisonKey(l, options)),
  );

  const rows: DiffRow[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (let i = 0; i < ops.length; ) {
    if (ops[i].type === 'eq') {
      // Show the modified side so ignored differences (case, spacing) reflect the new text.
      rows.push({
        kind: 'equal',
        text: b[ops[i].bIndex],
        originalText: a[ops[i].aIndex],
        oldLine: ops[i].aIndex + 1,
        newLine: ops[i].bIndex + 1,
      });
      unchanged++;
      i++;
      continue;
    }

    // Gather the whole change block so deletions can be paired with insertions.
    const dels: Op[] = [];
    const inss: Op[] = [];
    while (i < ops.length && ops[i].type !== 'eq') {
      (ops[i].type === 'del' ? dels : inss).push(ops[i]);
      i++;
    }

    const paired = Math.min(dels.length, inss.length);
    const removedRows: DiffRow[] = dels.map((op) => ({
      kind: 'remove',
      text: a[op.aIndex],
      oldLine: op.aIndex + 1,
      newLine: null,
    }));
    const addedRows: DiffRow[] = inss.map((op) => ({
      kind: 'add',
      text: b[op.bIndex],
      oldLine: null,
      newLine: op.bIndex + 1,
    }));

    for (let p = 0; p < paired; p++) {
      const words = diffWords(removedRows[p].text, addedRows[p].text);
      if (words) {
        removedRows[p] = { ...removedRows[p], segments: words.old };
        addedRows[p] = { ...addedRows[p], segments: words.new };
      }
    }

    rows.push(...removedRows, ...addedRows);
    removed += dels.length;
    added += inss.length;
  }

  return { rows, added, removed, unchanged, identical: added === 0 && removed === 0 };
}

/**
 * Collapses long unchanged stretches into a gap marker, keeping `context` lines
 * around each change. Pass `null` to keep everything.
 */
export function withContext(rows: readonly DiffRow[], context: number | null): DisplayRow[] {
  if (context === null) return [...rows];

  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((row, i) => {
    if (row.kind === 'equal') return;
    for (let j = Math.max(0, i - context); j <= Math.min(rows.length - 1, i + context); j++) {
      keep[j] = true;
    }
  });

  const out: DisplayRow[] = [];
  let hidden = 0;
  rows.forEach((row, i) => {
    if (keep[i]) {
      if (hidden) out.push({ kind: 'gap', hidden });
      hidden = 0;
      out.push(row);
    } else {
      hidden++;
    }
  });
  if (hidden) out.push({ kind: 'gap', hidden });
  return out;
}

/**
 * Lays rows out for the side-by-side view: equal lines appear on both sides,
 * and each block of removals is zipped against the additions that follow it.
 */
export function toSplitRows(rows: readonly DisplayRow[]): SplitDisplayRow[] {
  const out: SplitDisplayRow[] = [];
  for (let i = 0; i < rows.length; ) {
    const row = rows[i];
    if (row.kind === 'gap') {
      out.push(row);
      i++;
    } else if (row.kind === 'equal') {
      out.push({ kind: 'split', left: row, right: row });
      i++;
    } else {
      const removes: DiffRow[] = [];
      const adds: DiffRow[] = [];
      while (i < rows.length && rows[i].kind === 'remove') removes.push(rows[i++] as DiffRow);
      while (i < rows.length && rows[i].kind === 'add') adds.push(rows[i++] as DiffRow);
      for (let n = 0; n < Math.max(removes.length, adds.length); n++) {
        out.push({ kind: 'split', left: removes[n] ?? null, right: adds[n] ?? null });
      }
    }
  }
  return out;
}

/** Plain unified-style text (`+`, `-`, two-space prefixes) for copying. */
export function toUnifiedText(rows: readonly DiffRow[]): string {
  return rows
    .map((r) => (r.kind === 'add' ? '+ ' : r.kind === 'remove' ? '- ' : '  ') + r.text)
    .join('\n');
}

function diffWords(
  oldText: string,
  newText: string,
): { old: Segment[]; new: Segment[] } | null {
  if (oldText.length > WORD_DIFF_MAX_LENGTH || newText.length > WORD_DIFF_MAX_LENGTH) return null;

  const a = tokenize(oldText);
  const b = tokenize(newText);
  const ops = diffSequences(a, b);

  const oldSegments: Segment[] = [];
  const newSegments: Segment[] = [];
  for (const op of ops) {
    if (op.type === 'eq') {
      pushSegment(oldSegments, a[op.aIndex], false);
      pushSegment(newSegments, b[op.bIndex], false);
    } else if (op.type === 'del') {
      pushSegment(oldSegments, a[op.aIndex], true);
    } else {
      pushSegment(newSegments, b[op.bIndex], true);
    }
  }

  // Nothing in common worth highlighting: the whole line is simply different.
  const sharesWords = ops.some((op) => op.type === 'eq' && a[op.aIndex].trim() !== '');
  return sharesWords ? { old: oldSegments, new: newSegments } : null;
}

function tokenize(text: string): string[] {
  return text.match(/\s+|\w+|[^\w\s]/g) ?? [];
}

function pushSegment(segments: Segment[], text: string, changed: boolean): void {
  const last = segments[segments.length - 1];
  if (last && last.changed === changed) {
    segments[segments.length - 1] = { text: last.text + text, changed };
  } else {
    segments.push({ text, changed });
  }
}

/**
 * Myers' O(ND) shortest-edit-script diff. A shared prefix and suffix are
 * stripped first, which makes the common case (a few edits in a large file)
 * nearly free.
 */
export function diffSequences(a: readonly string[], b: readonly string[]): Op[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const ops: Op[] = [];
  for (let i = 0; i < start; i++) ops.push({ type: 'eq', aIndex: i, bIndex: i });

  for (const op of myers(a.slice(start, endA), b.slice(start, endB))) {
    ops.push({ type: op.type, aIndex: op.aIndex + start, bIndex: op.bIndex + start });
  }

  for (let i = 0; i < a.length - endA; i++) {
    ops.push({ type: 'eq', aIndex: endA + i, bIndex: endB + i });
  }
  return ops;
}

function myers(a: readonly string[], b: readonly string[]): Op[] {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];

  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  // trace[d] holds v for diagonals -d..d as they stood before round d.
  const trace: Int32Array[] = [];

  search: for (let d = 0; d <= max; d++) {
    trace.push(v.slice(offset - d, offset + d + 1));
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) break search;
    }
  }

  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    if (d === 0) {
      while (x > 0 && y > 0) {
        x--;
        y--;
        ops.push({ type: 'eq', aIndex: x, bIndex: y });
      }
      break;
    }

    const vd = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && vd[k - 1 + d] < vd[k + 1 + d]) ? k + 1 : k - 1;
    const prevX = vd[prevK + d];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.push({ type: 'eq', aIndex: x, bIndex: y });
    }
    if (x === prevX) {
      ops.push({ type: 'ins', aIndex: x, bIndex: prevY });
    } else {
      ops.push({ type: 'del', aIndex: prevX, bIndex: y });
    }
    x = prevX;
    y = prevY;
  }

  return ops.reverse();
}
