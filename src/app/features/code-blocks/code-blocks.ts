import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CodeView } from '../../shared/code-view/code-view';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { SNIPPETS } from './snippets.index';
import type { Snippet } from './snippet';

@Component({
  selector: 'app-code-blocks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, CodeView, CopyButton, Icon, UtilityPage],
  templateUrl: './code-blocks.html',
  styleUrl: './code-blocks.scss',
})
export class CodeBlocks {
  readonly search = signal('');
  readonly language = signal<string | null>(null);

  /** Distinct languages present, for the filter chips. */
  readonly languages = computed(() =>
    [...new Set(SNIPPETS.map((s) => s.language))].sort((a, b) => a.localeCompare(b)),
  );

  readonly snippets = computed<readonly Snippet[]>(() => {
    const query = this.search().trim().toLowerCase();
    const language = this.language();

    return SNIPPETS.filter((snippet) => {
      if (language && snippet.language !== language) return false;
      if (!query) return true;
      return (
        snippet.title.toLowerCase().includes(query) ||
        snippet.language.toLowerCase().includes(query) ||
        snippet.code.toLowerCase().includes(query) ||
        (snippet.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
      );
    });
  });

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  toggleLanguage(language: string): void {
    this.language.update((current) => (current === language ? null : language));
  }

  reset(): void {
    this.search.set('');
    this.language.set(null);
  }
}
