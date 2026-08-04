import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Read-only monospace block. Interpolation handles escaping, which the old
 * innerHTML card builder did only for the code body and not for the title.
 */
@Component({
  selector: 'app-code-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pre [style.max-height.px]="maxHeight()"><code>{{ code() }}</code></pre>`,
  styles: `
    pre {
      margin: 0;
      padding: 12px 14px;
      background: var(--wu-code-bg);
      color: var(--wu-code-fg);
      border-radius: var(--wu-radius-sm);
      border: 1px solid var(--mat-sys-outline-variant);
      font-family: var(--wu-mono);
      font-size: 12.5px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: auto;
    }
  `,
})
export class CodeView {
  readonly code = input.required<string>();
  readonly maxHeight = input(220);
}
