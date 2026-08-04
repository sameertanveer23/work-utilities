import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Stat {
  readonly label: string;
  readonly value: string | number;
}

/** The "12 IDs · 340 characters" row under a utility's output. */
@Component({
  selector: 'app-stat-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (stat of stats(); track stat.label) {
      <span class="chip">
        <span class="value">{{ stat.value }}</span>
        <span class="label">{{ stat.label }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-high);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .value {
      font-weight: 600;
      color: var(--mat-sys-primary);
      font-variant-numeric: tabular-nums;
    }
    .label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class StatChips {
  readonly stats = input.required<readonly Stat[]>();
}
