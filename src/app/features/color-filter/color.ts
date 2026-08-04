/**
 * Colour-matrix maths matching the CSS filter functions.
 *
 * Ported from https://github.com/angel-rs/css-color-filter-generator (MIT,
 * Angel Rodriguez and contributors), which in turn implements Barrett Sonntag's
 * / MultiplyByZer0's Stack Overflow answer (https://stackoverflow.com/a/43960991,
 * CC BY-SA). The matrix coefficients mirror the filter definitions in the
 * Filter Effects spec - do not "tidy" the numbers, the solver depends on them.
 */

export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export class Color {
  r = 0;
  g = 0;
  b = 0;

  constructor(r: number, g: number, b: number) {
    this.set(r, g, b);
  }

  set(r: number, g: number, b: number): void {
    this.r = clamp(r);
    this.g = clamp(g);
    this.b = clamp(b);
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b);
  }

  toRgbString(): string {
    return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
  }

  toHex(): string {
    const part = (value: number) => Math.round(value).toString(16).padStart(2, '0');
    return `#${part(this.r)}${part(this.g)}${part(this.b)}`;
  }

  multiply(matrix: readonly number[]): void {
    const r = clamp(this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2]);
    const g = clamp(this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5]);
    const b = clamp(this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8]);
    this.r = r;
    this.g = g;
    this.b = b;
  }

  hueRotate(angle = 0): void {
    const radians = (angle / 180) * Math.PI;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    this.multiply([
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.14,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ]);
  }

  sepia(value = 1): void {
    const inverse = 1 - value;
    this.multiply([
      0.393 + 0.607 * inverse,
      0.769 - 0.769 * inverse,
      0.189 - 0.189 * inverse,
      0.349 - 0.349 * inverse,
      0.686 + 0.314 * inverse,
      0.168 - 0.168 * inverse,
      0.272 - 0.272 * inverse,
      0.534 - 0.534 * inverse,
      0.131 + 0.869 * inverse,
    ]);
  }

  saturate(value = 1): void {
    this.multiply([
      0.213 + 0.787 * value,
      0.715 - 0.715 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 + 0.285 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 - 0.715 * value,
      0.072 + 0.928 * value,
    ]);
  }

  linear(slope = 1, intercept = 0): void {
    this.r = clamp(this.r * slope + intercept * 255);
    this.g = clamp(this.g * slope + intercept * 255);
    this.b = clamp(this.b * slope + intercept * 255);
  }

  brightness(value = 1): void {
    this.linear(value);
  }

  contrast(value = 1): void {
    this.linear(value, -(0.5 * value) + 0.5);
  }

  invert(value = 1): void {
    this.r = clamp((value + (this.r / 255) * (1 - 2 * value)) * 255);
    this.g = clamp((value + (this.g / 255) * (1 - 2 * value)) * 255);
    this.b = clamp((value + (this.b / 255) * (1 - 2 * value)) * 255);
  }

  /**
   * Note the `* 100` scaling on hue rather than the conventional `* 360`. That
   * is intentional: it is how the upstream loss function weights hue against
   * the RGB terms, and changing it changes every result.
   */
  hsl(): Hsl {
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 100, s: s * 100, l: l * 100 };
  }
}

export function clamp(value: number): number {
  if (value > 255) return 255;
  if (value < 0) return 0;
  return value;
}

/** Expands `#03F` to `03ff00`-style six-digit form. */
function expandHex(hex: string): string | null {
  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (short) return `${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;

  const full = /^#?([a-f\d]{6})$/i.exec(hex);
  return full ? full[1] : null;
}

/**
 * Accepts `#abc`, `#aabbcc`, `rgb(r, g, b)` and a bare `r, g, b` triplet.
 * Returns null for anything else - callers surface that as inline validation.
 */
export function parseColor(input: string): Color | null {
  const text = input.trim();
  if (!text) return null;

  const hex = expandHex(text);
  if (hex) {
    return new Color(
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    );
  }

  const rgb = /^(?:rgb\s*\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i.exec(text);
  if (!rgb) return null;

  // Reject a half-open form like "rgb(1, 2, 3" or a stray trailing paren.
  const opened = /^rgb/i.test(text);
  const closed = text.endsWith(')');
  if (opened !== closed) return null;

  const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  if (channels.some((c) => c > 255)) return null;

  return new Color(channels[0], channels[1], channels[2]);
}
