import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/icon/icon';

/** Signature bar pinned below the routed content. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span class="sig">
      Crafted by
      <a href="https://sameer-dev-sigma.vercel.app/" target="_blank" rel="noopener noreferrer">
        Sameer Tanveer
        <app-icon name="open_in_new" />
      </a>
    </span>

    <span class="spacer"></span>

    <span class="year">&copy; {{ year }}</span>
  `,
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly year = 2025;
}
