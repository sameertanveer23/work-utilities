export type Parsed = { readonly value: number | null; readonly error: string };

const EMPTY: Parsed = { value: null, error: '' };

/** A plain decimal number, optionally signed. Empty input is not an error. */
export function parseMinutes(raw: string): Parsed {
  const text = raw.trim();
  if (!text) return EMPTY;
  const value = Number(text);
  return Number.isFinite(value) && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)
    ? { value, error: '' }
    : { value: null, error: 'Enter a number, e.g. 90 or 12.5.' };
}

/**
 * Hours as a decimal (`1.5`) or as a clock-style `h:mm` (`1:30`), which is how
 * durations tend to be written on timesheets.
 */
export function parseHours(raw: string): Parsed {
  const text = raw.trim();
  const clock = /^([+-]?)(\d+):(\d{1,2})$/.exec(text);
  if (clock) {
    const minutes = Number(clock[3]);
    if (minutes >= 60) return { value: null, error: 'Minutes after the colon must be under 60.' };
    const hours = Number(clock[2]) + minutes / 60;
    return { value: clock[1] === '-' ? -hours : hours, error: '' };
  }
  const parsed = parseMinutes(text);
  return parsed.error ? { value: null, error: 'Enter hours as 1.5 or 1:30.' } : parsed;
}

export const minutesToHours = (minutes: number): number => minutes / 60;
export const hoursToMinutes = (hours: number): number => hours * 60;

/** Six decimals is plenty and hides float noise such as 0.30000000000000004. */
export function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

/** `90` -> `1 h 30 min`. Fractions of a minute are kept: `90.5` -> `1 h 30.5 min`. */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = Number((total - hours * 60).toFixed(6));

  const parts: string[] = [];
  if (hours) parts.push(`${hours} h`);
  if (rest || !hours) parts.push(`${formatNumber(rest)} min`);
  return sign + parts.join(' ');
}

/** `90` -> `1:30`, or null when the minutes aren't whole. */
export function formatClock(minutes: number): string | null {
  if (!Number.isInteger(minutes)) return null;
  const abs = Math.abs(minutes);
  const mm = String(abs % 60).padStart(2, '0');
  return `${minutes < 0 ? '-' : ''}${Math.floor(abs / 60)}:${mm}`;
}
