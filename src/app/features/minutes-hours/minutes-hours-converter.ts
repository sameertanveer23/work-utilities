import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import {
  formatClock,
  formatDuration,
  formatNumber,
  hoursToMinutes,
  minutesToHours,
  parseHours,
  parseMinutes,
  type Parsed,
} from './minutes-hours';

type Field = 'minutes' | 'hours';

const HOURS_KEY = 'mh-hours';
const MINUTES_KEY = 'mh-minutes';

@Component({
  selector: 'app-minutes-hours-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './minutes-hours-converter.html',
  styleUrl: './minutes-hours-converter.scss',
})
export class MinutesHoursConverter {
  private readonly clipboard = inject(ClipboardService);

  readonly hoursKey = HOURS_KEY;
  readonly minutesKey = MINUTES_KEY;
  readonly presets = [15, 30, 45, 60, 90, 120, 480];

  readonly minutes = new FormControl('60', { nonNullable: true });
  readonly hours = new FormControl('1', { nonNullable: true });

  /** The canonical value, in minutes. Null while a field is empty or invalid. */
  private readonly total = signal<number | null>(60);
  /** The field the user last typed in; the other one is the result. */
  private readonly source = signal<Field>('minutes');

  readonly minutesError = signal('');
  readonly hoursError = signal('');

  readonly minutesText = computed(() => {
    const total = this.total();
    return total === null ? '' : formatNumber(total);
  });

  readonly hoursText = computed(() => {
    const total = this.total();
    return total === null ? '' : formatNumber(minutesToHours(total));
  });

  readonly stats = computed<Stat[]>(() => {
    const total = this.total();
    if (total === null) return [];
    const stats: Stat[] = [{ label: 'duration', value: formatDuration(total) }];
    const clock = formatClock(total);
    if (clock) stats.push({ label: 'h:mm', value: clock });
    return stats;
  });

  constructor() {
    this.minutes.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((text) => this.update('minutes', text));
    this.hours.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((text) => this.update('hours', text));
  }

  private update(field: Field, text: string): void {
    const parsed: Parsed = field === 'minutes' ? parseMinutes(text) : parseHours(text);
    const other = field === 'minutes' ? this.hours : this.minutes;

    this.source.set(field);
    this.minutesError.set(field === 'minutes' ? parsed.error : '');
    this.hoursError.set(field === 'hours' ? parsed.error : '');

    if (parsed.value === null) {
      this.total.set(null);
      // Leave the other field alone while the input is merely incomplete ("1:").
      if (!parsed.error) other.setValue('', { emitEvent: false });
      return;
    }

    const minutes = field === 'minutes' ? parsed.value : hoursToMinutes(parsed.value);
    this.total.set(minutes);
    other.setValue(
      formatNumber(field === 'minutes' ? minutesToHours(minutes) : minutes),
      { emitEvent: false },
    );
  }

  /** Ctrl+Enter copies the converted value, i.e. the field you did not type in. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.source() === 'minutes') this.clipboard.copy(this.hoursText(), HOURS_KEY);
      else this.clipboard.copy(this.minutesText(), MINUTES_KEY);
    }
  }

  usePreset(minutes: number): void {
    this.minutes.setValue(String(minutes));
  }

  clear(): void {
    this.minutes.setValue('');
  }
}
