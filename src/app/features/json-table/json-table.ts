export type Row = Record<string, unknown>;

export interface ParsedRows {
  readonly rows: readonly Row[];
  readonly error: string;
}

export type SortDirection = 'asc' | 'desc';

export type CellKind = 'text' | 'number' | 'boolean' | 'null' | 'json' | 'missing';

export interface CellView {
  readonly text: string;
  readonly kind: CellKind;
}

/** Column that holds the property name when the input is `{ "a": {...}, "b": {...} }`. */
export const KEY_COLUMN = '(key)';
/** Column used for array items that are not objects. */
export const VALUE_COLUMN = '(value)';

/**
 * Rows are built on null-prototype objects: a JSON key of `__proto__` must stay
 * an ordinary column, not rewrite the row's prototype.
 */
function newRow(): Row {
  return Object.create(null) as Row;
}

const has = (row: Row, key: string): boolean => Object.prototype.hasOwnProperty.call(row, key);

const isPlainObject = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Splits text into its top-level `{...}` / `[...]` values. That makes one array,
 * several objects pasted back to back, newline-delimited JSON and
 * comma-separated objects all work the same way, pretty-printed or not.
 */
export function splitTopLevelValues(text: string): { segments: string[]; error: string } {
  const segments: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      if (depth === 0) return { segments, error: `Unexpected text at ${where(text, i)}.` };
      inString = true;
    } else if (char === '{' || char === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}' || char === ']') {
      if (depth === 0) return { segments, error: `Unexpected "${char}" at ${where(text, i)}.` };
      depth--;
      if (depth === 0) segments.push(text.slice(start, i + 1));
    } else if (depth === 0 && !/[\s,]/.test(char)) {
      return { segments, error: `Expected an object or array at ${where(text, i)}.` };
    }
  }

  if (depth > 0) {
    return { segments, error: `Unclosed bracket opened at ${where(text, start)}.` };
  }
  return { segments, error: '' };
}

function where(text: string, offset: number): string {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - (before.lastIndexOf('\n') + 1) + 1;
  return `line ${line}, column ${column}`;
}

export function parseRows(text: string, flatten: boolean): ParsedRows {
  if (!text.trim()) return { rows: [], error: '' };

  const { segments, error } = splitTopLevelValues(text);
  if (error) return { rows: [], error };

  const values: unknown[] = [];
  for (let i = 0; i < segments.length; i++) {
    try {
      values.push(JSON.parse(segments[i]));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        rows: [],
        error: segments.length > 1 ? `JSON ${i + 1} of ${segments.length}: ${message}` : message,
      };
    }
  }

  const items = itemsOf(values);
  const rows = items.map((item) => {
    const row = isPlainObject(item) ? item : { [VALUE_COLUMN]: item };
    return flatten ? flattenRow(row) : copyRow(row);
  });
  return { rows, error: '' };
}

/** An array contributes its elements; a map of objects contributes one row per key. */
function itemsOf(values: unknown[]): unknown[] {
  if (values.length === 1 && isPlainObject(values[0])) {
    const entries = Object.entries(values[0]);
    if (entries.length > 0 && entries.every(([, v]) => isPlainObject(v))) {
      return entries.map(([key, v]) => {
        const row = newRow();
        row[KEY_COLUMN] = key;
        for (const [k, inner] of Object.entries(v as Row)) row[k] = inner;
        return row;
      });
    }
  }
  return values.flatMap((v) => (Array.isArray(v) ? v : [v]));
}

function copyRow(source: Row): Row {
  const row = newRow();
  for (const [key, value] of Object.entries(source)) row[key] = value;
  return row;
}

/** `{ a: { b: 1 } }` -> `{ 'a.b': 1 }`. Arrays and empty objects stay as values. */
export function flattenRow(source: Row): Row {
  const row = newRow();
  const visit = (value: unknown, path: string): void => {
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const [key, inner] of Object.entries(value)) visit(inner, path ? `${path}.${key}` : key);
    } else {
      row[path] = value;
    }
  };
  visit(source, '');
  return row;
}

/** Every key seen, in the order it first appears. */
export function columnsOf(rows: readonly Row[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

/** Key order must not matter when deciding whether two nested values match. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

/**
 * Columns where the rows don't all agree. A row that lacks the key counts as
 * different from one that has it, even if the value is null.
 */
export function differingColumns(columns: readonly string[], rows: readonly Row[]): Set<string> {
  const differing = new Set<string>();
  if (rows.length < 2) return differing;

  for (const column of columns) {
    const fingerprint = (row: Row) => (has(row, column) ? canonical(row[column]) : '\u0000missing');
    const first = fingerprint(rows[0]);
    if (rows.some((row) => fingerprint(row) !== first)) differing.add(column);
  }
  return differing;
}

export function cellView(row: Row, column: string): CellView {
  if (!has(row, column)) return { text: '', kind: 'missing' };
  const value = row[column];

  if (value === null) return { text: 'null', kind: 'null' };
  if (typeof value === 'string') return { text: value, kind: 'text' };
  if (typeof value === 'number') return { text: String(value), kind: 'number' };
  if (typeof value === 'boolean') return { text: String(value), kind: 'boolean' };
  return { text: JSON.stringify(value), kind: 'json' };
}

export function matchesFilter(row: Row, columns: readonly string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return columns.some((column) => cellView(row, column).text.toLowerCase().includes(q));
}

/** Missing and null sort last in either direction; numbers compare as numbers. */
export function sortRows(rows: readonly Row[], column: string, direction: SortDirection): Row[] {
  const sign = direction === 'asc' ? 1 : -1;
  const empty = (row: Row) => !has(row, column) || row[column] === null;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aEmpty = empty(a.row);
      const bEmpty = empty(b.row);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;

      const x = a.row[column];
      const y = b.row[column];
      const order =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : cellView(a.row, column).text.localeCompare(cellView(b.row, column).text, undefined, {
              numeric: true,
              sensitivity: 'base',
            });
      return order === 0 ? a.index - b.index : order * sign;
    })
    .map((entry) => entry.row);
}

/**
 * Header row plus data rows. `tsv` pastes straight into Excel (tabs and line
 * breaks inside a cell are flattened to spaces); `csv` quotes as needed.
 */
export function toDelimited(
  columns: readonly string[],
  rows: readonly Row[],
  format: 'csv' | 'tsv',
): string {
  const escape =
    format === 'tsv'
      ? (text: string) => text.replace(/[\t\r\n]+/g, ' ')
      : (text: string) => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const separator = format === 'tsv' ? '\t' : ',';

  const lines = [columns.map(escape).join(separator)];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(cellView(row, c).text)).join(separator));
  }
  return lines.join('\n');
}
