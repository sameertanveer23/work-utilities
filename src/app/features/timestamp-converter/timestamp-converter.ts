import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { formatLocal, formatRelative, parseInput, type TimestampUnit } from './timestamp';

interface Row {
  readonly label: string;
  readonly value: string;
  readonly key: string;
}

@Component({
  selector: 'app-timestamp-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CopyButton,
    Icon,
    Panel,
    UtilityPage,
  ],
  templateUrl: './timestamp-converter.html',
  styleUrl: './timestamp-converter.scss',
})
export class TimestampConverter {
  /** Ticks once a second so "now" and the relative label stay honest. */
  private readonly now = signal(Date.now());

  readonly form = inject(FormBuilder).nonNullable.group({
    input: String(Math.floor(Date.now() / 1000)),
    unit: 'auto' as TimestampUnit,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly parsed = computed(() =>
    parseInput(this.value().input ?? '', this.value().unit ?? 'auto'),
  );

  readonly nowSeconds = computed(() => Math.floor(this.now() / 1000));

  readonly rows = computed<Row[]>(() => {
    const date = this.parsed().date;
    if (!date) return [];

    return [
      { key: 'seconds', label: 'Unix (seconds)', value: String(Math.floor(date.getTime() / 1000)) },
      { key: 'millis', label: 'Unix (milliseconds)', value: String(date.getTime()) },
      { key: 'iso', label: 'ISO 8601 (UTC)', value: date.toISOString() },
      { key: 'utc', label: 'UTC', value: date.toUTCString() },
      { key: 'local', label: 'Local', value: formatLocal(date) },
      { key: 'relative', label: 'Relative', value: formatRelative(date, this.now()) },
    ];
  });

  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  useNow(): void {
    this.form.patchValue({ input: String(Math.floor(Date.now() / 1000)), unit: 'seconds' });
  }
}
