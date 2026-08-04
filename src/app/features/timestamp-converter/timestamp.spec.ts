import { describe, expect, it } from 'vitest';
import { parseInput } from './timestamp';

describe('parseInput', () => {
  it('reads a seconds epoch when told to', () => {
    expect(parseInput('1754308800', 'seconds').date?.toISOString()).toBe(
      '2025-08-04T12:00:00.000Z',
    );
  });

  it('reads a milliseconds epoch when told to', () => {
    expect(parseInput('1754308800000', 'milliseconds').date?.toISOString()).toBe(
      '2025-08-04T12:00:00.000Z',
    );
  });

  it('auto-detects seconds vs milliseconds', () => {
    const seconds = parseInput('1754308800', 'auto').date;
    const millis = parseInput('1754308800000', 'auto').date;
    expect(seconds?.toISOString()).toBe('2025-08-04T12:00:00.000Z');
    expect(millis?.toISOString()).toBe('2025-08-04T12:00:00.000Z');
  });

  it('parses an ISO string', () => {
    expect(parseInput('2026-08-04T12:00:00Z', 'auto').date?.getTime()).toBe(
      Date.UTC(2026, 7, 4, 12),
    );
  });

  it('returns an empty result for blank input, with no error', () => {
    expect(parseInput('   ', 'auto')).toEqual({ date: null, error: '' });
  });

  it('reports unparseable input', () => {
    const result = parseInput('not a date', 'auto');
    expect(result.date).toBeNull();
    expect(result.error).not.toBe('');
  });
});
