import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ClipboardService } from '../../core/services/clipboard.service';
import { FileDownloadService } from '../../core/services/file-download.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import {
  cellView,
  columnsOf,
  differingColumns,
  matchesFilter,
  parseRows,
  sortRows,
  toDelimited,
  type SortDirection,
} from './json-table';

const COPY_KEY = 'json-table-tsv';
/** Rendering every row of a huge paste would stall the page; copy and CSV still include all. */
const MAX_ROWS = 500;

interface Sort {
  readonly column: string;
  readonly direction: SortDirection;
}

@Component({
  selector: 'app-json-table-viewer',
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
    StatChips,
    UtilityPage,
  ],
  templateUrl: './json-table-viewer.html',
  styleUrl: './json-table-viewer.scss',
})
export class JsonTableViewer {
  private readonly clipboard = inject(ClipboardService);
  private readonly download = inject(FileDownloadService);

  readonly copyKey = COPY_KEY;
  readonly maxRows = MAX_ROWS;

  readonly form = inject(FormBuilder).nonNullable.group({
    raw: '',
    flatten: false,
    onlyDiffering: false,
    filter: '',
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly sort = signal<Sort | null>(null);

  readonly parsed = computed(() => parseRows(this.value().raw ?? '', this.value().flatten ?? false));

  private readonly allColumns = computed(() => columnsOf(this.parsed().rows));

  readonly differing = computed(() => differingColumns(this.allColumns(), this.parsed().rows));

  readonly columns = computed(() =>
    this.value().onlyDiffering && this.parsed().rows.length > 1
      ? this.allColumns().filter((c) => this.differing().has(c))
      : this.allColumns(),
  );

  private readonly matching = computed(() => {
    const columns = this.columns();
    const filter = this.value().filter ?? '';
    const rows = this.parsed().rows.filter((row) => matchesFilter(row, columns, filter));

    const sort = this.sort();
    return sort && columns.includes(sort.column) ? sortRows(rows, sort.column, sort.direction) : rows;
  });

  /** What is drawn: the matching rows, capped, as ready-to-render cells. */
  readonly views = computed(() => {
    const columns = this.columns();
    return this.matching()
      .slice(0, MAX_ROWS)
      .map((row) => columns.map((column) => cellView(row, column)));
  });

  readonly hiddenRows = computed(() => Math.max(0, this.matching().length - MAX_ROWS));

  /** Exports cover everything matching, not just the rows that are drawn. */
  readonly tsv = computed(() =>
    this.matching().length ? toDelimited(this.columns(), this.matching(), 'tsv') : '',
  );
  private readonly csv = computed(() => toDelimited(this.columns(), this.matching(), 'csv'));

  readonly stats = computed<Stat[]>(() => {
    const total = this.parsed().rows.length;
    const shown = this.matching().length;
    const stats: Stat[] = [{ label: shown === total ? 'rows' : `of ${total} rows`, value: shown }];

    const columns = this.columns().length;
    stats.push({
      label: columns === this.allColumns().length ? 'columns' : `of ${this.allColumns().length} columns`,
      value: columns,
    });
    if (total > 1) stats.push({ label: 'differ', value: this.differing().size });
    return stats;
  });

  /** Click cycles ascending, descending, then back to the original order. */
  toggleSort(column: string): void {
    this.sort.update((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      return current.direction === 'asc' ? { column, direction: 'desc' } : null;
    });
  }

  ariaSort(column: string): 'ascending' | 'descending' | 'none' {
    const sort = this.sort();
    if (sort?.column !== column) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  sortIcon(column: string): string | null {
    const sort = this.sort();
    if (sort?.column !== column) return null;
    return sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  /** Ctrl+Enter copies the table in a form Excel pastes into cells. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.tsv(), COPY_KEY);
    }
  }

  downloadCsv(): void {
    this.download.download('table.csv', this.csv(), 'text/csv');
  }

  clear(): void {
    this.form.reset({ raw: '', flatten: false, onlyDiffering: false, filter: '' });
    this.sort.set(null);
  }
}
