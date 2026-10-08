import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDuration,
  formatNumber,
  hoursToMinutes,
  minutesToHours,
  parseHours,
  parseMinutes,
} from './minutes-hours';

describe('conversion', () => {
  it('converts both ways', () => {
    expect(minutesToHours(60)).toBe(1);
    expect(minutesToHours(90)).toBe(1.5);
    expect(hoursToMinutes(1)).toBe(60);
    expect(hoursToMinutes(2.25)).toBe(135);
  });

  it('round-trips without visible float noise', () => {
    for (const minutes of [1, 7, 45, 59, 61, 100, 1234.5]) {
      expect(formatNumber(hoursToMinutes(minutesToHours(minutes)))).toBe(formatNumber(minutes));
    }
  });
});

describe('formatNumber', () => {
  it('trims noise and trailing zeros', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1 / 3)).toBe('0.333333');
    expect(formatNumber(60)).toBe('60');
    expect(formatNumber(-0)).toBe('0');
  });
});

describe('parseMinutes', () => {
  it('accepts decimals and signs', () => {
    expect(parseMinutes(' 90 ').value).toBe(90);
    expect(parseMinutes('12.5').value).toBe(12.5);
    expect(parseMinutes('-30').value).toBe(-30);
    expect(parseMinutes('.5').value).toBe(0.5);
  });

  it('treats empty as no value and junk as an error', () => {
    expect(parseMinutes('')).toEqual({ value: null, error: '' });
    expect(parseMinutes('abc').error).not.toBe('');
    expect(parseMinutes('1e3').error).not.toBe('');
    expect(parseMinutes('1,5').error).not.toBe('');
  });
});

describe('parseHours', () => {
  it('accepts decimals and h:mm', () => {
    expect(parseHours('1.5').value).toBe(1.5);
    expect(parseHours('1:30').value).toBe(1.5);
    expect(parseHours('0:45').value).toBe(0.75);
    expect(parseHours('-1:15').value).toBe(-1.25);
  });

  it('rejects minutes of 60 or more after the colon', () => {
    expect(parseHours('1:75').error).toMatch(/under 60/);
  });

  it('rejects junk', () => {
    expect(parseHours('one').error).not.toBe('');
    expect(parseHours('').error).toBe('');
  });
});

describe('formatDuration', () => {
  it('breaks minutes into hours and minutes', () => {
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(125)).toBe('2 h 5 min');
    expect(formatDuration(90.5)).toBe('1 h 30.5 min');
    expect(formatDuration(-90)).toBe('-1 h 30 min');
  });
});

describe('formatClock', () => {
  it('pads minutes and skips fractions', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(-90)).toBe('-1:30');
    expect(formatClock(90.5)).toBeNull();
  });
});
