import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** The card used for every utility's input / output column. */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <header>
      @if (icon(); as name) {
        <app-icon [name]="name" />
      }
      <h2>{{ heading() }}</h2>
      <span class="spacer"></span>
      <ng-content select="[panel-actions]" />
    </header>
    <div class="body">
      <ng-content />
    </div>
    @if (hasFooter()) {
      <footer>
        <ng-content select="[panel-footer]" />
      </footer>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--wu-radius);
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface-variant);
      font-size: 20px;
    }
    h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }
    .spacer {
      flex: 1;
    }
    .body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    footer {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      padding: 14px 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
    }
  `,
})
export class Panel {
  readonly heading = input.required<string>();
  readonly icon = input<string | undefined>(undefined);
  readonly hasFooter = input(false);
}
