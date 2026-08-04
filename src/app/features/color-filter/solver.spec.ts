import { describe, expect, it } from 'vitest';
import { Color, parseColor } from './color';
import { QUALITY_LABELS, resultColor, solve } from './solver';

/**
 * SPSA is stochastic, so asserting exact filter values would be flaky and
 * meaningless. What matters is the property: feeding the emitted chain back
 * through the same filter maths must reproduce the requested colour.
 */
const TARGETS = ['#ff0000', '#00a3e0', '#333333', '#ffffff', '#000000', '#7b2ff7', '#f5a623'];

describe('solve', () => {
  for (const hex of TARGETS) {
    it(`reproduces ${hex} when the filter chain is replayed`, () => {
      const target = parseColor(hex)!;
      const solution = solve(target);
      const actual = resultColor(solution);

      // Tolerance is in 0-255 channel units. Measured worst case across 360
      // runs is under 2, so 4 leaves headroom without hiding a regression.
      // Asserting on `loss` here would be wrong: it carries HSL terms that read
      // high for near-greys even when the rendered colour is exact.
      expect(Math.abs(actual.r - target.r)).toBeLessThan(4);
      expect(Math.abs(actual.g - target.g)).toBeLessThan(4);
      expect(Math.abs(actual.b - target.b)).toBeLessThan(4);
      expect(solution.maxChannelDelta).toBeLessThan(4);
    });
  }

  it('lands on a good result without the caller retrying', () => {
    // The whole point of best-of-N: a single call should be usable.
    const solution = solve(parseColor('#00a3e0')!);
    expect(['perfect', 'close']).toContain(solution.quality);
  });

  it('rates quality by rendered colour error, not by the optimiser score', () => {
    // Near-greys carry a high HSL loss while still rendering exactly; the
    // rating must not punish them for that.
    const solution = solve(parseColor('#333333')!);
    expect(solution.maxChannelDelta).toBeLessThan(4);
    expect(['perfect', 'close']).toContain(solution.quality);
  });

  it('keeps every parameter inside its legal range', () => {
    const { values } = solve(parseColor('#7b2ff7')!);
    const [invert, sepia, saturate, hueRotate, brightness, contrast] = values;

    expect(invert).toBeGreaterThanOrEqual(0);
    expect(invert).toBeLessThanOrEqual(100);
    expect(sepia).toBeGreaterThanOrEqual(0);
    expect(sepia).toBeLessThanOrEqual(100);
    expect(saturate).toBeGreaterThanOrEqual(0);
    expect(saturate).toBeLessThanOrEqual(7500);
    expect(hueRotate).toBeGreaterThanOrEqual(0);
    expect(hueRotate).toBeLessThanOrEqual(100);
    expect(brightness).toBeGreaterThanOrEqual(0);
    expect(brightness).toBeLessThanOrEqual(200);
    expect(contrast).toBeGreaterThanOrEqual(0);
    expect(contrast).toBeLessThanOrEqual(200);
  });

  it('accepts an injected rng, making a run reproducible', () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const target = parseColor('#00a3e0')!;
    const first = solve(target, 4, () => rng());
    seed = 42;
    const second = solve(target, 4, () => rng());

    expect(first.values).toEqual(second.values);
  });

  it('honours a reduced attempt count', () => {
    const solution = solve(parseColor('#ff0000')!, 1);
    expect(solution.values).toHaveLength(6);
  });
});

describe('output formats', () => {
  const solution = solve(parseColor('#ff0000')!);

  it('always leads with the black-and-desaturate normalizer', () => {
    expect(solution.raw.startsWith('brightness(0) saturate(100%) ')).toBe(true);
  });

  it('wraps the same chain in every variant', () => {
    expect(solution.css).toBe(`filter: ${solution.raw};`);
    expect(solution.customProperty).toBe(`--icon-filter: ${solution.raw};`);
    expect(solution.tailwind).toBe(`filter-[${solution.raw.replace(/ /g, '_')}]`);
  });

  it('emits no spaces inside the Tailwind arbitrary value', () => {
    expect(solution.tailwind).not.toContain(' ');
  });

  it('emits integers only', () => {
    expect(solution.raw).not.toMatch(/\d\.\d/);
  });

  it('names every filter function in order', () => {
    expect(solution.raw).toMatch(
      /^brightness\(0\) saturate\(100%\) invert\(\d+%\) sepia\(\d+%\) saturate\(\d+%\) hue-rotate\(\d+deg\) brightness\(\d+%\) contrast\(\d+%\)$/,
    );
  });
});

describe('quality', () => {
  it('has a label for every level', () => {
    const solution = solve(parseColor('#333333')!);
    expect(QUALITY_LABELS[solution.quality]).toBeTruthy();
  });

  it('reports black as a perfect match', () => {
    // Black is trivially reachable - brightness(0) alone gets there.
    expect(solve(new Color(0, 0, 0)).quality).toBe('perfect');
  });
});
