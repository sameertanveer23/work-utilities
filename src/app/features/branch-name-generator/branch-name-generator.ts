import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { StatChips, type Stat } from '../../shared/stat-chips/stat-chips';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { buildBranchName, slugifyBranchTitle } from './branch-name';

const BRANCH_KEY = 'branch-name';
const CHECKOUT_KEY = 'branch-checkout';

@Component({
  selector: 'app-branch-name-generator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CopyButton,
    Icon,
    Panel,
    StatChips,
    UtilityPage,
  ],
  templateUrl: './branch-name-generator.html',
  styleUrl: './branch-name-generator.scss',
})
export class BranchNameGenerator {
  private readonly clipboard = inject(ClipboardService);

  protected readonly branchKey = BRANCH_KEY;
  protected readonly checkoutKey = CHECKOUT_KEY;

  readonly form = inject(FormBuilder).nonNullable.group({
    prefix: '',
    cardNumber: '',
    cardTitle: '',
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly branchName = computed(() => {
    const v = this.value();
    return buildBranchName(v.prefix ?? '', v.cardNumber ?? '', v.cardTitle ?? '');
  });

  readonly checkoutCommand = computed(() =>
    this.branchName() ? `git checkout -b ${this.branchName()}` : '',
  );

  readonly stats = computed<Stat[]>(() => {
    const slug = slugifyBranchTitle((this.value().cardTitle ?? '').trim());
    return [
      { label: 'words', value: slug ? slug.split('-').length : 0 },
      { label: 'characters', value: this.branchName().length },
    ];
  });

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.clipboard.copy(this.branchName(), BRANCH_KEY);
    }
  }

  clear(): void {
    this.form.reset({ prefix: '', cardNumber: '', cardTitle: '' });
  }
}
