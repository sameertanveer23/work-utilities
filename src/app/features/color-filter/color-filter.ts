import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CodeView } from '../../shared/code-view/code-view';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { Color, parseColor } from './color';
import { QUALITY_LABELS, solve, type FilterSolution } from './solver';

const DEFAULT_COLOR = '#00a3e0';

interface OutputRow {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
}

@Component({
  selector: 'app-color-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CodeView,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './color-filter.html',
  styleUrl: './color-filter.scss',
})
export class ColorFilter {
  readonly form = inject(FormBuilder).nonNullable.group({ color: DEFAULT_COLOR });

  /** Bumped by "Solve again" to re-run the stochastic search on the same colour. */
  private readonly nonce = signal(0);

  readonly solution = signal<FilterSolution | null>(null);

  private readonly colorText = toSignal(
    this.form.controls.color.valueChanges.pipe(startWith(DEFAULT_COLOR)),
    { initialValue: DEFAULT_COLOR },
  );

  /** Cheap - drives validation and the target swatch on every keystroke. */
  readonly target = computed(() => parseColor(this.colorText()));

  readonly invalid = computed(() => this.colorText().trim() !== '' && this.target() === null);

  /**
   * Solving costs a few milliseconds, so unlike the other utilities it runs off
   * a debounced stream rather than recomputing on every keystroke.
   */
  private readonly settledColor = toSignal(
    this.form.controls.color.valueChanges.pipe(
      startWith(DEFAULT_COLOR),
      debounceTime(250),
      map((text) => parseColor(text)),
      filter((color): color is Color => color !== null),
      distinctUntilChanged((a, b) => a.toHex() === b.toHex()),
    ),
    { initialValue: parseColor(DEFAULT_COLOR)! },
  );

  readonly qualityLabel = computed(() => {
    const solution = this.solution();
    return solution ? QUALITY_LABELS[solution.quality] : '';
  });

  readonly stats = computed<Stat[]>(() => {
    const solution = this.solution();
    return solution ? [{ label: 'loss', value: solution.loss.toFixed(2) }] : [];
  });

  /** Hex for the native colour swatch, which only accepts `#rrggbb`. */
  readonly swatch = computed(() => this.target()?.toHex() ?? '#000000');

  readonly outputs = computed<OutputRow[]>(() => {
    const solution = this.solution();
    if (!solution) return [];

    return [
      {
        key: 'css',
        label: 'CSS declaration',
        hint: 'Drop straight into a rule.',
        value: solution.css,
      },
      {
        key: 'raw',
        label: 'Filter value',
        hint: 'For a style binding or SCSS variable.',
        value: solution.raw,
      },
      {
        key: 'custom-property',
        label: 'Custom property',
        hint: 'Theme a whole icon set from one place.',
        value: solution.customProperty,
      },
      {
        key: 'tailwind',
        label: 'Tailwind',
        hint: 'Arbitrary value, underscores for spaces.',
        value: solution.tailwind,
      },
    ];
  });

  constructor() {
    effect(() => {
      const color = this.settledColor();
      this.nonce(); // re-run when "Solve again" is clicked
      this.solution.set(solve(color));
    });
  }

  onSwatchInput(event: Event): void {
    this.form.controls.color.setValue((event.target as HTMLInputElement).value);
  }

  solveAgain(): void {
    this.nonce.update((n) => n + 1);
  }
}
