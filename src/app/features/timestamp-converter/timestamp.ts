export type TimestampUnit = 'seconds' | 'milliseconds' | 'auto';

export interface ParsedTimestamp {
  readonly date: Date | null;
  readonly error: string;
}

/**
 * Accepts a Unix epoch (seconds or milliseconds) or anything `Date` can parse -
 * ISO 8601, RFC 2822, `2026-08-04 13:45`, and so on.
 */
export function parseInput(raw: string, unit: TimestampUnit): ParsedTimestamp {
  const text = raw.trim();
  if (!text) return { date: null, error: '' };

  if (/^-?\d+$/.test(text)) {
    const numeric = Number(text);
    const ms = unit === 'seconds' ? numeric * 1000 : unit === 'milliseconds' ? numeric : autoMs(numeric);
    const date = new Date(ms);
    return isNaN(date.getTime())
      ? { date: null, error: 'That epoch value is out of range.' }
      : { date, error: '' };
  }

  const date = new Date(text);
  return isNaN(date.getTime())
    ? { date: null, error: 'Not a recognisable date, ISO string or epoch number.' }
    : { date, error: '' };
}

/**
 * Ten digits is a seconds-epoch well into the 2200s, so anything longer is
 * milliseconds. Good enough for every timestamp you'll paste in practice.
 */
function autoMs(value: number): number {
  return Math.abs(value) >= 1e11 ? value : value * 1000;
}

export function formatLocal(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date);
}

/** "3 hours ago" / "in 2 days", relative to now. */
export function formatRelative(date: Date, now: number): string {
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return format.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return format.format(diffSeconds, 'second');
}
