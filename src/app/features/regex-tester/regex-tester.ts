import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { FLAGS, runRegex, toSegments } from './regex-test';

const COPY_KEY = 'regex-matches';

@Component({
  selector: 'app-regex-tester',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './regex-tester.html',
  styleUrl: './regex-tester.scss',
})
export class RegexTester {
  private readonly clipboard = inject(ClipboardService);

  readonly flagDefs = FLAGS;
  readonly copyKey = COPY_KEY;

  readonly form = inject(FormBuilder).nonNullable.group({
    pattern: '',
    flags: [['g'] as string[]],
    text: '',
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly result = computed(() =>
    runRegex(this.value().pattern ?? '', (this.value().flags ?? []).join(''), this.value().text ?? ''),
  );

  readonly segments = computed(() => toSegments(this.value().text ?? '', this.result().matches));

  readonly matchesText = computed(() =>
    this.result()
      .matches.map((m) => m.text)
      .join('\n'),
  );

  readonly stats = computed<Stat[]>(() => {
    const { matches, truncated } = this.result();
    return [
      {
        label: matches.length === 1 ? 'match' : 'matches',
        value: truncated ? `${matches.length}+` : matches.length,
      },
    ];
  });

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.matchesText(), COPY_KEY);
    }
  }

  clear(): void {
    this.form.reset({ pattern: '', flags: ['g'], text: '' });
  }
}
