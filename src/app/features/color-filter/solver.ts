/**
 * Finds a CSS filter chain that turns black into a target colour.
 *
 * There is no closed-form inverse for a chain of CSS filter functions, so this
 * searches the 6-dimensional parameter space with SPSA (Simultaneous
 * Perturbation Stochastic Approximation): a wide exploratory pass followed by a
 * narrow refinement pass around the best point found.
 *
 * Ported from https://github.com/angel-rs/css-color-filter-generator (MIT),
 * originally https://stackoverflow.com/a/43960991 (CC BY-SA). Every constant
 * below is tuned - changing one changes the quality of every result.
 */
import { Color } from './color';

/** Indices into the values array, which the `fix` clamps depend on. */
const INVERT = 0;
const SEPIA = 1;
const SATURATE = 2;
const HUE_ROTATE = 3;
const BRIGHTNESS = 4;
const CONTRAST = 5;

export type SolutionQuality = 'perfect' | 'close' | 'off' | 'bad';

export interface FilterSolution {
  /** The six raw percentages, in the order the filter chain applies them. */
  readonly values: readonly number[];
  readonly loss: number;
  readonly quality: SolutionQuality;
  /** `brightness(0) saturate(100%) invert(...) ...` */
  readonly raw: string;
  /** `filter: brightness(0) ...;` */
  readonly css: string;
  /** `--icon-filter: brightness(0) ...;` */
  readonly customProperty: string;
  /** `filter-[brightness(0)_saturate(100%)_...]` */
  readonly tailwind: string;
}

export type Rng = () => number;

interface SpsaResult {
  readonly values: number[];
  readonly loss: number;
}

/**
 * Runs the full solve `attempts` times and keeps the best result.
 *
 * The reference implementation only retried while loss > 25, which regularly
 * left a visibly-off colour on the screen. Taking the best of several runs
 * costs a few milliseconds and lands on a near-perfect match almost every time.
 */
export function solve(target: Color, attempts = 8, rng: Rng = Math.random): FilterSolution {
  let best: SpsaResult | null = null;

  for (let i = 0; i < Math.max(1, attempts); i++) {
    const wide = solveWide(target, rng);
    const result = solveNarrow(target, wide, rng);
    if (best === null || result.loss < best.loss) best = result;

    // Already exact; more attempts cannot improve on this meaningfully.
    if (best.loss < 0.1) break;
  }

  return describe(best!);
}

function solveWide(target: Color, rng: Rng): SpsaResult {
  const A = 5;
  const c = 15;
  const a = [60, 180, 18000, 600, 1.2, 1.2];

  let best: SpsaResult = { values: [], loss: Infinity };
  for (let i = 0; best.loss > 25 && i < 3; i++) {
    const initial = [50, 20, 3750, 50, 100, 100];
    const result = spsa(target, A, a, c, initial, 1000, rng);
    if (result.loss < best.loss) best = result;
  }
  return best;
}

function solveNarrow(target: Color, wide: SpsaResult, rng: Rng): SpsaResult {
  const A = wide.loss;
  const A1 = A + 1;
  const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
  return spsa(target, A, a, 2, wide.values.slice(), 500, rng);
}

function spsa(
  target: Color,
  A: number,
  a: readonly number[],
  c: number,
  values: number[],
  iterations: number,
  rng: Rng,
): SpsaResult {
  const alpha = 1;
  const gamma = 1 / 6;

  // One scratch colour reused across every loss evaluation - this runs tens of
  // thousands of times per solve, so allocating per call is measurable.
  const scratch = new Color(0, 0, 0);
  const deltas = new Array<number>(6);
  const highArgs = new Array<number>(6);
  const lowArgs = new Array<number>(6);

  let best = values.slice();
  let bestLoss = Infinity;

  for (let k = 0; k < iterations; k++) {
    const ck = c / Math.pow(k + 1, gamma);

    for (let i = 0; i < 6; i++) {
      deltas[i] = rng() > 0.5 ? 1 : -1;
      highArgs[i] = values[i] + ck * deltas[i];
      lowArgs[i] = values[i] - ck * deltas[i];
    }

    const lossDiff = loss(target, highArgs, scratch) - loss(target, lowArgs, scratch);
    for (let i = 0; i < 6; i++) {
      const gradient = (lossDiff / (2 * ck)) * deltas[i];
      const ak = a[i] / Math.pow(A + k + 1, alpha);
      values[i] = fix(values[i] - ak * gradient, i);
    }

    const current = loss(target, values, scratch);
    if (current < bestLoss) {
      best = values.slice();
      bestLoss = current;
    }
  }

  return { values: best, loss: bestLoss };
}

/** Keeps each parameter inside the range its filter function accepts. */
function fix(value: number, index: number): number {
  let max = 100;
  if (index === SATURATE) max = 7500;
  else if (index === BRIGHTNESS || index === CONTRAST) max = 200;

  if (index === HUE_ROTATE) {
    if (value > max) return value % max;
    if (value < 0) return max + (value % max);
    return value;
  }

  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

/**
 * Distance between the colour these filters produce from black and the target,
 * summed across both RGB and HSL so hue errors aren't hidden by a close RGB fit.
 */
function loss(target: Color, filters: readonly number[], scratch: Color): number {
  scratch.set(0, 0, 0);
  applyFilters(scratch, filters);

  const targetHsl = target.hsl();
  const hsl = scratch.hsl();

  return (
    Math.abs(scratch.r - target.r) +
    Math.abs(scratch.g - target.g) +
    Math.abs(scratch.b - target.b) +
    Math.abs(hsl.h - targetHsl.h) +
    Math.abs(hsl.s - targetHsl.s) +
    Math.abs(hsl.l - targetHsl.l)
  );
}

/**
 * Applies the solved chain in the same order the browser will. Exported so
 * tests can verify the emitted CSS actually produces the requested colour.
 */
export function applyFilters(color: Color, filters: readonly number[]): void {
  color.invert(filters[INVERT] / 100);
  color.sepia(filters[SEPIA] / 100);
  color.saturate(filters[SATURATE] / 100);
  color.hueRotate(filters[HUE_ROTATE] * 3.6);
  color.brightness(filters[BRIGHTNESS] / 100);
  color.contrast(filters[CONTRAST] / 100);
}

/**
 * The percentages as they appear in the emitted CSS. The solver works in
 * floats but we ship integers, so this is what the browser will actually run -
 * previews and tests should use these, not the raw values.
 */
export function effectiveValues(values: readonly number[]): number[] {
  const rounded = values.map((v) => Math.round(v));
  // hue-rotate is rounded in degrees, then converted back to the same units
  // `applyFilters` expects.
  rounded[HUE_ROTATE] = Math.round(values[HUE_ROTATE] * 3.6) / 3.6;
  return rounded;
}

/** The colour a solution actually renders, for verification and previews. */
export function resultColor(solution: FilterSolution): Color {
  const color = new Color(0, 0, 0);
  applyFilters(color, effectiveValues(solution.values));
  return color;
}

function describe(result: SpsaResult): FilterSolution {
  const raw = formatChain(result.values);

  return {
    values: result.values,
    loss: result.loss,
    quality: qualityOf(result.loss),
    raw,
    css: `filter: ${raw};`,
    customProperty: `--icon-filter: ${raw};`,
    tailwind: `filter-[${raw.replace(/ /g, '_')}]`,
  };
}

/**
 * Single formatter so the four output variants can never drift apart. The
 * leading `brightness(0) saturate(100%)` flattens whatever colour the source
 * element is to black, which is the state the solver assumed.
 */
function formatChain(values: readonly number[]): string {
  const percent = (index: number) => Math.round(values[index]);
  return (
    'brightness(0) saturate(100%) ' +
    `invert(${percent(INVERT)}%) ` +
    `sepia(${percent(SEPIA)}%) ` +
    `saturate(${percent(SATURATE)}%) ` +
    `hue-rotate(${Math.round(values[HUE_ROTATE] * 3.6)}deg) ` +
    `brightness(${percent(BRIGHTNESS)}%) ` +
    `contrast(${percent(CONTRAST)}%)`
  );
}

function qualityOf(loss: number): SolutionQuality {
  if (loss < 1) return 'perfect';
  if (loss < 5) return 'close';
  if (loss < 15) return 'off';
  return 'bad';
}

export const QUALITY_LABELS: Record<SolutionQuality, string> = {
  perfect: 'Perfect match',
  close: 'Close enough',
  off: 'Slightly off — try solving again',
  bad: 'Well off — solve again',
};
