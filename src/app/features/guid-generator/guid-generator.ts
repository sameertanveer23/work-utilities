import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { UtilityPage } from '../../shared/utility-page/utility-page';

const MAX_COUNT = 500;

@Component({
  selector: 'app-guid-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    CopyButton,
    Icon,
    Panel,
    UtilityPage,
  ],
  templateUrl: './guid-generator.html',
  styleUrl: './guid-generator.scss',
})
export class GuidGenerator {
  /** Raw v4 GUIDs; casing and braces are applied as a view transform. */
  private readonly raw = signal<readonly string[]>([crypto.randomUUID()]);

  readonly form = inject(FormBuilder).nonNullable.group({
    count: 1,
    uppercase: false,
    braces: false,
    hyphens: true,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly guids = computed(() => {
    const v = this.value();
    return this.raw().map((guid) => {
      let out = v.hyphens === false ? guid.replace(/-/g, '') : guid;
      if (v.uppercase) out = out.toUpperCase();
      if (v.braces) out = `{${out}}`;
      return out;
    });
  });

  readonly allText = computed(() => this.guids().join('\n'));

  generate(): void {
    const requested = Number(this.value().count) || 1;
    const count = Math.min(Math.max(Math.trunc(requested), 1), MAX_COUNT);
    this.raw.set(Array.from({ length: count }, () => crypto.randomUUID()));
  }
}
