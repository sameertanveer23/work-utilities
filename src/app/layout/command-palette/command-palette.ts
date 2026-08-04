import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { FavoritesService } from '../../core/services/favorites.service';
import { UTILITIES, scoreUtility, type UtilityDef } from '../../core/utility-registry';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class CommandPalette {
  private readonly dialogRef = inject<MatDialogRef<CommandPalette>>(MatDialogRef);
  private readonly router = inject(Router);
  private readonly favorites = inject(FavoritesService);

  readonly query = signal('');
  readonly activeIndex = signal(0);

  /**
   * Ranked matches. With an empty query the palette shows recents first, then
   * favorites, then everything else - the fastest path to what you just used.
   */
  readonly results = computed<UtilityDef[]>(() => {
    const query = this.query();

    if (!query.trim()) {
      const seen = new Set<string>();
      const ordered: UtilityDef[] = [];
      for (const utility of [...this.favorites.recents(), ...this.favorites.favorites()]) {
        if (!seen.has(utility.id)) {
          seen.add(utility.id);
          ordered.push(utility);
        }
      }
      return [...ordered, ...UTILITIES.filter((u) => !seen.has(u.id))];
    }

    const favoriteIds = new Set(this.favorites.ids());
    return UTILITIES.map((utility) => ({
      utility,
      score: scoreUtility(utility, query) + (favoriteIds.has(utility.id) ? 5 : 0),
    }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.utility);
  });

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.activeIndex.set((this.activeIndex() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.activeIndex.set((this.activeIndex() - 1 + count) % count);
        break;
      case 'Enter': {
        event.preventDefault();
        const utility = this.results()[this.activeIndex()];
        if (utility) this.go(utility);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.dialogRef.close();
        break;
    }
  }

  go(utility: UtilityDef): void {
    this.dialogRef.close();
    void this.router.navigateByUrl('/' + utility.path);
  }

  isFavorite(id: string): boolean {
    return this.favorites.ids().includes(id);
  }
}
