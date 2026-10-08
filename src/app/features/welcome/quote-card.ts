import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { readStored, writeStored } from '../../core/services/local-storage';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { QUOTES, pickQuoteIndex } from './quotes';

const LAST_QUOTE_KEY = 'wu.quote';

@Component({
  selector: 'app-quote-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, CopyButton, Icon, Panel],
  template: `
    <app-panel heading="Quote" icon="format_quote">
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
  /**
   * Picked at random on every load, and never the one shown last time, so a
   * refresh always changes the quote. It then stays put while you read it; the
   * shuffle button steps on from here.
   */
  private readonly index = signal(
    pickQuoteIndex(QUOTES.length, readStored<number | null>(LAST_QUOTE_KEY, null)),
  );

  readonly quote = computed(() => QUOTES[this.index()]);
  readonly asText = computed(() => `“${this.quote().text}” — ${this.quote().author}`);

  constructor() {
    // Remember what is on screen, so the next load can avoid repeating it.
    effect(() => writeStored(LAST_QUOTE_KEY, this.index()));
  }

  next(): void {
    this.index.update((i) => (i + 1) % QUOTES.length);
  }
}
