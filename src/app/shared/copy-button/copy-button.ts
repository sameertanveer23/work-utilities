import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardService } from '../../core/services/clipboard.service';
import { Icon } from '../icon/icon';

let nextKey = 0;

/**
 * Copy control that flips to a "Copied!" state for 2s. Renders as either an
 * icon button or a labelled button; both share the same feedback mechanism.
 */
@Component({
  selector: 'app-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, Icon],
  template: `
    @if (variant() === 'icon') {
      <button
        matIconButton
        type="button"
        [disabled]="disabled()"
        [matTooltip]="copied() ? 'Copied!' : tooltip()"
        [attr.aria-label]="tooltip()"
        (click)="copy()"
      >
        <app-icon [name]="copied() ? 'check' : 'content_copy'" [class.copied]="copied()" />
      </button>
    } @else {
      <button
        matButton="outlined"
        type="button"
        [disabled]="disabled()"
        [class.copied]="copied()"
        (click)="copy()"
      >
        <app-icon matButtonIcon [name]="copied() ? 'check' : 'content_copy'" />
        {{ copied() ? 'Copied!' : label() }}
      </button>
    }
  `,
  styles: `
    .copied {
      color: var(--wu-success);
    }
  `,
})
export class CopyButton {
  private readonly clipboard = inject(ClipboardService);
  private readonly fallbackKey = `copy-${nextKey++}`;

  readonly text = input.required<string>();
  readonly label = input('Copy');
  readonly tooltip = input('Copy to clipboard');
  readonly variant = input<'icon' | 'button'>('button');
  /** Distinguishes sibling buttons so only the clicked one shows feedback. */
  readonly key = input<string | undefined>(undefined);

  readonly disabled = computed(() => this.text().length === 0);
  readonly copied = computed(() => this.clipboard.copiedKey() === this.resolvedKey());

  private resolvedKey(): string {
    return this.key() ?? this.fallbackKey;
  }

  copy(): void {
    this.clipboard.copy(this.text(), this.resolvedKey());
  }
}
