import { describe, expect, it } from 'vitest';
import { Color, clamp, parseColor } from './color';

describe('parseColor', () => {
  it('reads six-digit hex, with or without the hash', () => {
    expect(parseColor('#ff8800')).toMatchObject({ r: 255, g: 136, b: 0 });
    expect(parseColor('ff8800')).toMatchObject({ r: 255, g: 136, b: 0 });
  });

  it('expands three-digit hex', () => {
    expect(parseColor('#f80')).toMatchObject({ r: 255, g: 136, b: 0 });
  });

  it('is case insensitive', () => {
    expect(parseColor('#FF8800')?.toHex()).toBe('#ff8800');
  });

  it('reads rgb() with assorted whitespace', () => {
    expect(parseColor('rgb(255, 136, 0)')).toMatchObject({ r: 255, g: 136, b: 0 });
    expect(parseColor('rgb(255,136,0)')).toMatchObject({ r: 255, g: 136, b: 0 });
    expect(parseColor('RGB( 255 , 136 , 0 )')).toMatchObject({ r: 255, g: 136, b: 0 });
  });

  it('reads a bare triplet', () => {
    expect(parseColor('255, 136, 0')).toMatchObject({ r: 255, g: 136, b: 0 });
  });

  it('rejects unbalanced rgb parentheses', () => {
    expect(parseColor('rgb(255, 136, 0')).toBeNull();
    expect(parseColor('255, 136, 0)')).toBeNull();
  });

  it('rejects out-of-range channels', () => {
    expect(parseColor('rgb(300, 0, 0)')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('   ')).toBeNull();
    expect(parseColor('#gg0000')).toBeNull();
    expect(parseColor('#ff00')).toBeNull();
    expect(parseColor('not a color')).toBeNull();
  });
});

describe('Color output', () => {
  it('pads single-digit hex channels', () => {
    expect(new Color(0, 1, 255).toHex()).toBe('#0001ff');
  });

  it('rounds when stringifying', () => {
    expect(new Color(0.4, 127.6, 254.5).toRgbString()).toBe('rgb(0, 128, 255)');
  });
});

describe('clamp', () => {
  it('bounds to 0..255', () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(300)).toBe(255);
    expect(clamp(128)).toBe(128);
  });
});

describe('filter operations', () => {
  it('inverts black to white and back', () => {
    const color = new Color(0, 0, 0);
    color.invert(1);
    expect(color.toHex()).toBe('#ffffff');
    color.invert(1);
    expect(color.toHex()).toBe('#000000');
  });

  it('brightness(0) collapses any colour to black', () => {
    const color = new Color(200, 100, 50);
    color.brightness(0);
    expect(color.toHex()).toBe('#000000');
  });

  it('leaves colours untouched at identity values', () => {
    const color = new Color(120, 60, 200);
    color.hueRotate(0);
    color.saturate(1);
    color.sepia(0);
    color.brightness(1);
    color.contrast(1);
    expect(color.r).toBeCloseTo(120, 4);
    expect(color.g).toBeCloseTo(60, 4);
    expect(color.b).toBeCloseTo(200, 4);
  });

  it('a full hue rotation returns to the starting colour', () => {
    const color = new Color(200, 40, 40);
    color.hueRotate(360);
    expect(color.r).toBeCloseTo(200, 3);
    expect(color.g).toBeCloseTo(40, 3);
    expect(color.b).toBeCloseTo(40, 3);
  });

  it('saturate(0) produces a grey', () => {
    const color = new Color(200, 40, 40);
    color.saturate(0);
    expect(color.r).toBeCloseTo(color.g, 4);
    expect(color.g).toBeCloseTo(color.b, 4);
  });

  it('clamps rather than overflowing', () => {
    const color = new Color(200, 200, 200);
    color.brightness(10);
    expect(color.toHex()).toBe('#ffffff');
  });
});

describe('hsl', () => {
  it('reports zero saturation for greys', () => {
    expect(new Color(128, 128, 128).hsl().s).toBe(0);
  });

  it('reports lightness at the extremes', () => {
    expect(new Color(0, 0, 0).hsl().l).toBe(0);
    expect(new Color(255, 255, 255).hsl().l).toBe(100);
  });
});
