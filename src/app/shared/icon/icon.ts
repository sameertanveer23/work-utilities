import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Thin wrapper over the self-hosted Material Symbols font. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="material-symbols-outlined" aria-hidden="true">{{ name() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      line-height: 1;
    }
    span {
      font-size: inherit;
    }
  `,
})
export class Icon {
  readonly name = input.required<string>();
}
