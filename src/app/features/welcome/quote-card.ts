import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { quoteFor } from './quotes';

@Component({
  selector: 'app-quote-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, CopyButton, Icon, Panel],
  template: `
    <app-panel heading="Quote of the day" icon="format_quote">
      <div panel-actions class="actions">
        <app-copy-button variant="icon" key="quote" [text]="asText()" tooltip="Copy quote" />
        <button
          matIconButton
          type="button"
          matTooltip="Another quote"
          aria-label="Show another quote"
          (click)="next()"
        >
          <app-icon name="shuffle" />
        </button>
      </div>
      <figure>
        <blockquote>{{ quote().text }}</blockquote>
        <figcaption>{{ quote().author }}</figcaption>
      </figure>
    </app-panel>
  `,
  styles: `
    :host {
      display: block;
    }
    .actions {
      display: flex;
      color: var(--mat-sys-on-surface-variant);
    }
    figure {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    blockquote {
      margin: 0;
      padding-left: 14px;
      border-left: 3px solid var(--mat-sys-primary);
      font-size: 17px;
      line-height: 1.5;
    }
    figcaption {
      padding-left: 17px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);

      &::before {
        content: '— ';
      }
    }
  `,
})
export class QuoteCard {
  /** Chosen once per visit so the quote doesn't change under the reader. */
  private readonly today = new Date();
  private readonly offset = signal(0);

  readonly quote = computed(() => quoteFor(this.today, this.offset()));
  readonly asText = computed(() => `“${this.quote().text}” — ${this.quote().author}`);

  next(): void {
    this.offset.update((n) => n + 1);
  }
}
