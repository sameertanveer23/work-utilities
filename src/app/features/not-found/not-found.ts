import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, Icon],
  template: `
    <app-icon name="explore_off" />
    <h1>Nothing here</h1>
    <p>That URL doesn't match any utility.</p>
    <a matFlatButton routerLink="/">Back to all utilities</a>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 80px 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    app-icon {
      font-size: 48px;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      color: var(--mat-sys-on-surface);
    }
    p {
      margin: 0 0 10px;
      font-size: 13.5px;
    }
  `,
})
export class NotFound {}
