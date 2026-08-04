import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FileDownloadService } from '../../core/services/file-download.service';
import { CodeView } from '../../shared/code-view/code-view';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { formatJson } from './json-format';

@Component({
  selector: 'app-json-formatter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    CodeView,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './json-formatter.html',
  styleUrl: './json-formatter.scss',
})
export class JsonFormatter {
  private readonly download = inject(FileDownloadService);

  readonly form = inject(FormBuilder).nonNullable.group({
    raw: '',
    indent: 2,
    minify: false,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  constructor() {
    // Indent is meaningless while minifying. Disable the control itself rather
    // than binding [disabled], which reactive forms warns about.
    this.form.controls.minify.valueChanges.pipe(takeUntilDestroyed()).subscribe((minify) => {
      const indent = this.form.controls.indent;
      if (minify) indent.disable({ emitEvent: false });
      else indent.enable({ emitEvent: false });
    });
  }

  readonly result = computed(() => {
    const v = this.value();
    return formatJson(v.raw ?? '', v.indent ?? 2, v.minify ?? false);
  });

  readonly stats = computed<Stat[]>(() => {
    const output = this.result().output;
    return [
      { label: 'lines', value: output ? output.split('\n').length : 0 },
      { label: 'characters', value: output.length },
    ];
  });

  downloadJson(): void {
    this.download.download('formatted.json', this.result().output, 'application/json');
  }

  clear(): void {
    this.form.reset({ raw: '', indent: 2, minify: false });
  }
}
