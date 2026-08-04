export interface JsonResult {
  readonly output: string;
  readonly error: string;
  /** 1-based, derived from the parser's character offset. */
  readonly line: number | null;
  readonly column: number | null;
}

const EMPTY: JsonResult = { output: '', error: '', line: null, column: null };

export function formatJson(raw: string, indent: number, minify: boolean): JsonResult {
  if (!raw.trim()) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    return {
      output: minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent),
      error: '',
      line: null,
      column: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const position = positionOf(message, raw);
    return { output: '', error: message, line: position?.line ?? null, column: position?.column ?? null };
  }
}

/**
 * V8 reports "... at position 42"; translate that offset into line/column so
 * the error points somewhere useful in a large document.
 */
function positionOf(message: string, raw: string): { line: number; column: number } | null {
  const match = /at position (\d+)/.exec(message);
  if (!match) return null;

  const offset = Math.min(Number(match[1]), raw.length);
  const before = raw.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - (before.lastIndexOf('\n') + 1) + 1;
  return { line, column };
}
