import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import {
  ZONES,
  formatInZone,
  parseDateTime,
  zoneById,
  type ZoneId,
  type ZonedDateTime,
} from './datetime';

const COPY_ALL_KEY = 'datetime-all';

interface Row extends ZonedDateTime {
  readonly key: string;
  readonly isSource: boolean;
}

@Component({
  selector: 'app-datetime-converter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    CopyButton,
    Icon,
    Panel,
    UtilityPage,
  ],
  templateUrl: './datetime-converter.html',
  styleUrl: './datetime-converter.scss',
})
export class DatetimeConverter {
  private readonly clipboard = inject(ClipboardService);

  readonly zones = ZONES;
  readonly copyAllKey = COPY_ALL_KEY;

  readonly form = inject(FormBuilder).nonNullable.group({
    input: nowIn(zoneById('utc')),
    zone: 'utc' as ZoneId,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly parsed = computed(() =>
    parseDateTime(this.value().input ?? '', zoneById(this.value().zone ?? 'utc')),
  );

  readonly rows = computed<Row[]>(() => {
    const instant = this.parsed().instant;
    if (!instant) return [];

    const source = this.value().zone;
    const zoned = ZONES.map((zone) => ({
      ...formatInZone(instant, zone),
      key: zone.id,
      isSource: zone.id === source,
    }));
    return [
      ...zoned,
      { label: 'ISO 8601', fullName: 'ISO 8601 date-time format', value: instant.toISOString(), detail: 'UTC', key: 'iso', isSource: false },
    ];
  });

  readonly allText = computed(() =>
    this.rows()
      .map((r) => `${r.label}: ${r.value} (${r.detail})`)
      .join('\n'),
  );

  /** Ctrl+Enter copies every conversion at once. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.allText(), COPY_ALL_KEY);
    }
  }

  /** Fills the input with the current time, written in the selected zone. */
  useNow(): void {
    this.form.patchValue({ input: nowIn(zoneById(this.form.controls.zone.value)) });
  }
}

function nowIn(zone: (typeof ZONES)[number]): string {
  return formatInZone(new Date(), zone).value;
}
