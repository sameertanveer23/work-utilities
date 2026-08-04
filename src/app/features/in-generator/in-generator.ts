import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ClipboardService } from '../../core/services/clipboard.service';
import { FileDownloadService } from '../../core/services/file-download.service';
import { CodeView } from '../../shared/code-view/code-view';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { buildInQuery, parseIds, type IdFormat } from './in-query';

/** Shared by the copy button and the Ctrl+Enter shortcut so both light up. */
const COPY_KEY = 'in-generator-query';

@Component({
  selector: 'app-in-generator',
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
  templateUrl: './in-generator.html',
  styleUrl: './in-generator.scss',
})
export class InGenerator {
  private readonly download = inject(FileDownloadService);
  private readonly clipboard = inject(ClipboardService);

  protected readonly copyKey = COPY_KEY;

  readonly form = inject(FormBuilder).nonNullable.group({
    tableName: '',
    columnName: '',
    rawIds: '',
    format: 'single-quote' as IdFormat,
    dedupe: false,
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly ids = computed(() => {
    const v = this.value();
    return parseIds(v.rawIds ?? '', v.dedupe ?? false);
  });

  /** Recomputes as you type - the old version needed a button press. */
  readonly query = computed(() => {
    const v = this.value();
    return buildInQuery({
      table: (v.tableName ?? '').trim(),
      column: (v.columnName ?? '').trim(),
      rawIds: v.rawIds ?? '',
      format: v.format ?? 'single-quote',
      dedupe: v.dedupe ?? false,
    });
  });

  readonly stats = computed<Stat[]>(() => [
    { label: 'IDs', value: this.ids().length },
    { label: 'characters', value: this.query().length },
  ]);

  /** What is still missing, shown instead of the old `alert()` calls. */
  readonly hint = computed(() => {
    const v = this.value();
    const missing: string[] = [];
    if (!(v.tableName ?? '').trim()) missing.push('a table name');
    if (!(v.columnName ?? '').trim()) missing.push('a column name');
    if (this.ids().length === 0) missing.push('at least one ID');
    return missing.length ? `Enter ${missing.join(', ')} to build the query.` : '';
  });

  readonly filename = computed(() => {
    const table = (this.value().tableName ?? '').trim();
    return `${table || 'query'}-query.sql`;
  });

  /**
   * The query is now live, so Ctrl+Enter is repurposed from "generate" to
   * "copy" - the step you always took next anyway.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.query(), COPY_KEY);
    }
  }

  downloadQuery(): void {
    this.download.download(this.filename(), this.query(), 'application/sql');
  }

  clear(): void {
    this.form.reset({
      tableName: '',
      columnName: '',
      rawIds: '',
      format: 'single-quote',
      dedupe: false,
    });
  }
}
