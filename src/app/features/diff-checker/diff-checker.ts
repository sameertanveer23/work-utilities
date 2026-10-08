import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { diffText, toSplitRows, toUnifiedText, withContext } from './diff';

const COPY_KEY = 'diff-unified';

@Component({
  selector: 'app-diff-checker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgTemplateOutlet,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './diff-checker.html',
  styleUrl: './diff-checker.scss',
})
export class DiffChecker {
  private readonly clipboard = inject(ClipboardService);

  readonly copyKey = COPY_KEY;

  readonly form = inject(FormBuilder).nonNullable.group({
    original: '',
    modified: '',
    ignoreWhitespace: false,
    ignoreCase: false,
    context: 'all',
    view: 'split',
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly diff = computed(() => {
    const v = this.value();
    return diffText(v.original ?? '', v.modified ?? '', {
      ignoreWhitespace: v.ignoreWhitespace ?? false,
      ignoreCase: v.ignoreCase ?? false,
    });
  });

  readonly isSplit = computed(() => this.value().view !== 'unified');

  readonly hasInput = computed(() => {
    const v = this.value();
    return !!(v.original || v.modified);
  });

  readonly displayRows = computed(() => {
    const context = this.value().context;
    return withContext(this.diff().rows, context === 'all' ? null : Number(context));
  });

  readonly splitRows = computed(() => toSplitRows(this.displayRows()));

  readonly unifiedText =computed(() => toUnifiedText(this.diff().rows));

  readonly stats = computed<Stat[]>(() => {
    const { added, removed, unchanged } = this.diff();
    return [
      { label: 'added', value: added },
      { label: 'removed', value: removed },
      { label: 'unchanged', value: unchanged },
    ];
  });

  /** Ctrl+Enter copies the diff, matching the other live utilities. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.unifiedText(), COPY_KEY);
    }
  }

  swap(): void {
    const { original, modified } = this.form.getRawValue();
    this.form.patchValue({ original: modified, modified: original });
  }

  clear(): void {
    this.form.reset({
      original: '',
      modified: '',
      ignoreWhitespace: false,
      ignoreCase: false,
      context: 'all',
      view: this.form.controls.view.value,
    });
  }
}
