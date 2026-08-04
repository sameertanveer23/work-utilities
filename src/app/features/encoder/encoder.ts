import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CodeView } from '../../shared/code-view/code-view';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { convert, type CodecId, type Direction } from './codecs';

@Component({
  selector: 'app-encoder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CodeView,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './encoder.html',
  styleUrl: './encoder.scss',
})
export class Encoder {
  readonly form = inject(FormBuilder).nonNullable.group({
    input: '',
    codec: 'base64' as CodecId,
    direction: 'encode' as Direction,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly result = computed(() => {
    const v = this.value();
    return convert(v.input ?? '', v.codec ?? 'base64', v.direction ?? 'encode');
  });

  readonly stats = computed<Stat[]>(() => [
    { label: 'in', value: (this.value().input ?? '').length },
    { label: 'out', value: this.result().output.length },
  ]);

  /** Feeds the output back in with the direction flipped. */
  swap(): void {
    const { direction } = this.form.getRawValue();
    const output = this.result().output;
    if (!output) return;

    this.form.patchValue({
      input: output,
      direction: direction === 'encode' ? 'decode' : 'encode',
    });
  }

  clear(): void {
    this.form.patchValue({ input: '' });
  }
}
