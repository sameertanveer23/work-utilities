export type IdFormat = 'single-quote' | 'double-quote' | 'no-quote';

export interface InQueryOptions {
  readonly table: string;
  readonly column: string;
  readonly rawIds: string;
  readonly format: IdFormat;
  readonly dedupe: boolean;
}

/**
 * Splits pasted IDs. Newlines were the only separator in the original tool;
 * commas, tabs and semicolons are accepted too since pasted lists rarely
 * arrive one-per-line.
 */
export function parseIds(raw: string, dedupe: boolean): string[] {
  const ids = raw
    .split(/[\r\n,;\t]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  return dedupe ? [...new Set(ids)] : ids;
}

export function quoteId(id: string, format: IdFormat): string {
  switch (format) {
    case 'no-quote':
      return id;
    case 'double-quote':
      return `"${id.replace(/"/g, '""')}"`;
    case 'single-quote':
      return `'${id.replace(/'/g, "''")}'`;
  }
}

/** Produces the exact shape the original generator emitted. */
export function buildInQuery(options: InQueryOptions): string {
  const { table, column, rawIds, format, dedupe } = options;
  const ids = parseIds(rawIds, dedupe);
  if (!table || !column || ids.length === 0) return '';

  const inBlock = ids.map((id) => quoteId(id, format)).join(',\n');
  return `SELECT *\nFROM ${table}\nWHERE ${column} IN (\n  ${inBlock}\n);`;
}
