import { describe, expect, it } from 'vitest';
import { ZONES, formatInZone, parseDateTime, zoneById } from './datetime';

const utc = zoneById('utc');
const iso = (raw: string, zone = utc) => parseDateTime(raw, zone).instant?.toISOString();

describe('formatInZone', () => {
  const summer = new Date('2026-07-01T12:00:00Z');
  const winter = new Date('2026-01-15T12:00:00Z');

  it('uses fixed offsets for EST, CST and PST year-round', () => {
    for (const date of [summer, winter]) {
      expect(formatInZone(date, zoneById('est')).value).toMatch(/ 07:00:00$/);
      expect(formatInZone(date, zoneById('cst')).value).toMatch(/ 06:00:00$/);
      expect(formatInZone(date, zoneById('pst')).value).toMatch(/ 04:00:00$/);
    }
    expect(formatInZone(summer, zoneById('est')).detail).toBe('UTC-05:00');
  });

  it('shifts Pacific for daylight saving', () => {
    const pacific = zoneById('pacific');
    expect(formatInZone(summer, pacific)).toMatchObject({
      value: '2026-07-01 05:00:00',
      detail: 'UTC-07:00 · PDT',
    });
    expect(formatInZone(winter, pacific)).toMatchObject({
      value: '2026-01-15 04:00:00',
      detail: 'UTC-08:00 · PST',
    });
  });

  it('formats UTC and rolls the date across midnight', () => {
    expect(formatInZone(new Date('2026-07-01T03:00:00Z'), zoneById('pst')).value).toBe(
      '2026-06-30 19:00:00',
    );
    expect(formatInZone(summer, utc).value).toBe('2026-07-01 12:00:00');
  });

  it('has a zone entry for every id', () => {
    expect(ZONES.map((z) => z.id)).toEqual(['utc', 'est', 'cst', 'pst', 'pacific', 'local']);
  });
});

describe('parseDateTime', () => {
  it('reads wall-clock time in the chosen zone', () => {
    expect(iso('2026-07-01 12:00')).toBe('2026-07-01T12:00:00.000Z');
    expect(iso('2026-07-01 07:00', zoneById('est'))).toBe('2026-07-01T12:00:00.000Z');
    expect(iso('2026-07-01 06:00', zoneById('cst'))).toBe('2026-07-01T12:00:00.000Z');
    expect(iso('2026-01-15 04:00', zoneById('pst'))).toBe('2026-01-15T12:00:00.000Z');
  });

  it('applies the right Pacific offset on either side of daylight saving', () => {
    const pacific = zoneById('pacific');
    expect(iso('2026-07-01 05:00', pacific)).toBe('2026-07-01T12:00:00.000Z');
    expect(iso('2026-01-15 04:00', pacific)).toBe('2026-01-15T12:00:00.000Z');
  });

  it('resolves times around the spring-forward gap', () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 Pacific.
    const pacific = zoneById('pacific');
    expect(iso('2026-03-08 01:30', pacific)).toBe('2026-03-08T09:30:00.000Z');
    expect(iso('2026-03-08 03:30', pacific)).toBe('2026-03-08T10:30:00.000Z');
  });

  it('honours an explicit offset or Z over the selected zone', () => {
    expect(iso('2026-07-01T12:00:00-05:00', zoneById('pacific'))).toBe('2026-07-01T17:00:00.000Z');
    expect(iso('2026-07-01T12:00:00Z', zoneById('pst'))).toBe('2026-07-01T12:00:00.000Z');
  });

  it('accepts epochs in seconds or milliseconds', () => {
    expect(iso('1782907200')).toBe('2026-07-01T12:00:00.000Z');
    expect(iso('1782907200000')).toBe('2026-07-01T12:00:00.000Z');
  });

  it('accepts a date alone, seconds, milliseconds and AM/PM', () => {
    expect(iso('2026-07-01')).toBe('2026-07-01T00:00:00.000Z');
    expect(iso('2026-07-01 12:00:30.5')).toBe('2026-07-01T12:00:30.500Z');
    expect(iso('2026-07-01 1:30 PM')).toBe('2026-07-01T13:30:00.000Z');
    expect(iso('2026-07-01 12:15 AM')).toBe('2026-07-01T00:15:00.000Z');
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseDateTime('2026-02-30 10:00', utc).error).toMatch(/does not exist/);
    expect(parseDateTime('2026-13-01', utc).error).toMatch(/does not exist/);
    expect(parseDateTime('2026-07-01 25:00', utc).error).toMatch(/does not exist/);
    expect(parseDateTime('2026-07-01 13:00 PM', utc).error).toMatch(/1-12/);
  });

  it('returns no error for empty input and a hint for junk', () => {
    expect(parseDateTime('  ', utc)).toEqual({ instant: null, error: '' });
    expect(parseDateTime('next tuesday', utc).error).not.toBe('');
  });
});
