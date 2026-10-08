export type ZoneId = 'utc' | 'est' | 'cst' | 'pst' | 'pacific' | 'local';

export interface ZoneDef {
  readonly id: ZoneId;
  readonly label: string;
  /** Spelled-out name, shown as a tooltip. */
  readonly fullName: string;
  /** IANA zone name handed to Intl. */
  readonly tz: string;
  /** Shows the zone's own abbreviation (PST/PDT) alongside the offset. */
  readonly showAbbreviation: boolean;
}

/**
 * EST, CST and PST are the fixed standard-time offsets (UTC-5/-6/-8) - they do
 * not shift for daylight saving. `Etc/GMT+5` is UTC-5; the sign is inverted by
 * the tz database's convention. "Pacific" is the DST-aware zone, so it reads
 * PST in winter and PDT in summer.
 */
export const ZONES: readonly ZoneDef[] = [
  { id: 'utc', label: 'UTC', fullName: 'Coordinated Universal Time', tz: 'UTC', showAbbreviation: false },
  { id: 'est', label: 'EST', fullName: 'Eastern Standard Time', tz: 'Etc/GMT+5', showAbbreviation: false },
  { id: 'cst', label: 'CST', fullName: 'Central Standard Time', tz: 'Etc/GMT+6', showAbbreviation: false },
  { id: 'pst', label: 'PST', fullName: 'Pacific Standard Time', tz: 'Etc/GMT+8', showAbbreviation: false },
  { id: 'pacific', label: 'Pacific', fullName: 'Pacific Time (Standard or Daylight)', tz: 'America/Los_Angeles', showAbbreviation: true },
  {
    id: 'local',
    label: 'Local',
    fullName: 'Your local time zone',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    showAbbreviation: true,
  },
];

export function zoneById(id: ZoneId): ZoneDef {
  return ZONES.find((z) => z.id === id)!;
}

export interface ParsedDateTime {
  readonly instant: Date | null;
  readonly error: string;
}

export interface ZonedDateTime {
  readonly label: string;
  readonly fullName: string;
  /** `YYYY-MM-DD HH:mm:ss` wall-clock time in the zone. */
  readonly value: string;
  /** `UTC-07:00`, plus the abbreviation where the zone has a meaningful one. */
  readonly detail: string;
}

const WALL_CLOCK =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?\s*(am|pm)?)?$/i;

/** Text such as `Z`, `GMT` or `+05:30` at the end means the string carries its own zone. */
const HAS_ZONE = /(z|gmt|utc|[+-]\d{2}:?\d{2})$/i;

/**
 * Reads an epoch, or a date-time. A date-time with no zone of its own
 * (`2026-07-01 14:30`) is taken as wall-clock time in `zone`; one with `Z` or an
 * offset keeps it.
 */
export function parseDateTime(raw: string, zone: ZoneDef): ParsedDateTime {
  const text = raw.trim();
  if (!text) return { instant: null, error: '' };

  if (/^-?\d+$/.test(text)) {
    const n = Number(text);
    const instant = new Date(Math.abs(n) >= 1e11 ? n : n * 1000);
    return isNaN(instant.getTime())
      ? { instant: null, error: 'That epoch value is out of range.' }
      : { instant, error: '' };
  }

  const match = WALL_CLOCK.exec(text);
  if (match) return parseWallClock(match, zone);

  if (HAS_ZONE.test(text)) {
    const instant = new Date(text);
    if (!isNaN(instant.getTime())) return { instant, error: '' };
  }

  return {
    instant: null,
    error: 'Use YYYY-MM-DD HH:mm[:ss] (or an epoch, or a date with Z / an offset).',
  };
}

function parseWallClock(match: RegExpExecArray, zone: ZoneDef): ParsedDateTime {
  const [, y, mo, d, h, mi, s, ms, meridiem] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  let hour = Number(h ?? 0);
  const minute = Number(mi ?? 0);
  const second = Number(s ?? 0);
  const milli = ms ? Number(ms.padEnd(3, '0')) : 0;

  if (meridiem) {
    if (hour < 1 || hour > 12) return { instant: null, error: 'Hours must be 1-12 with AM/PM.' };
    hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
  }

  // Date.UTC silently rolls 2026-02-30 over to March, so check it survived.
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second, milli));
  const valid =
    wall.getUTCFullYear() === year &&
    wall.getUTCMonth() === month - 1 &&
    wall.getUTCDate() === day &&
    wall.getUTCHours() === hour &&
    wall.getUTCMinutes() === minute &&
    wall.getUTCSeconds() === second;
  if (!valid) return { instant: null, error: 'That date or time does not exist.' };

  return { instant: new Date(wallClockToInstant(wall.getTime(), zone.tz)), error: '' };
}

/**
 * `wallMs` is the wall-clock reading expressed as if it were UTC. Subtract the
 * zone's offset to get the real instant; the offset is re-checked at the result
 * so times just either side of a DST change resolve correctly.
 */
function wallClockToInstant(wallMs: number, tz: string): number {
  const first = offsetMinutes(wallMs, tz);
  const guess = wallMs - first * 60_000;
  const second = offsetMinutes(guess, tz);
  return second === first ? guess : wallMs - second * 60_000;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

function partsOf(ms: number, tz: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(new Date(ms))) parts[p.type] = p.value;
  return parts;
}

/** Minutes the zone is ahead of UTC at the given instant (negative for the Americas). */
export function offsetMinutes(ms: number, tz: string): number {
  const p = partsOf(ms, tz);
  const asUtc = Date.UTC(+p['year'], +p['month'] - 1, +p['day'], +p['hour'], +p['minute'], +p['second']);
  // Intl drops the milliseconds, so compare against the whole-second instant.
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

export function formatInZone(instant: Date, zone: ZoneDef): ZonedDateTime {
  const ms = instant.getTime();
  const p = partsOf(ms, zone.tz);
  const value = `${p['year']}-${p['month']}-${p['day']} ${p['hour']}:${p['minute']}:${p['second']}`;
  const offset = formatOffset(offsetMinutes(ms, zone.tz));
  const detail = zone.showAbbreviation ? `${offset} · ${p['timeZoneName']}` : offset;
  return { label: zone.label, fullName: zone.fullName, value, detail };
}
