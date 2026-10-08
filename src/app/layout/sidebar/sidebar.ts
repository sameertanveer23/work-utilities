import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FavoritesService } from '../../core/services/favorites.service';
import { readStored, writeStored } from '../../core/services/local-storage';
import { CATEGORIES, type CategoryDef } from '../../core/categories';
import { UTILITIES, scoreUtility, type UtilityDef } from '../../core/utility-registry';
import { Icon } from '../../shared/icon/icon';

const FOLDED_GROUPS_KEY = 'wu.sidebar.folded';

interface CategoryGroup {
  readonly category: CategoryDef;
  readonly utilities: readonly UtilityDef[];
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatTooltipModule, Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class.collapsed]': 'collapsed()' },
})
export class Sidebar {
  private readonly favoritesService = inject(FavoritesService);

  /** Icons-only mode on desktop. The overlay drawer never collapses. */
  readonly collapsed = signal(false);
  readonly filter = signal('');

  /** Emitted when a link is followed, so the mobile drawer can close itself. */
  readonly navigated = output<void>();

  readonly favorites = this.favoritesService.favorites;

  /** Categories with at least one matching utility, in registry order. */
  readonly groups = computed<CategoryGroup[]>(() => {
    const query = this.filter();
    return CATEGORIES.map((category) => ({
      category,
      utilities: UTILITIES.filter(
        (u) => u.category === category.id && scoreUtility(u, query) > 0,
      ),
    })).filter((group) => group.utilities.length > 0);
  });

  readonly noMatches = computed(() => this.filter().length > 0 && this.groups().length === 0);

  /** Ids of the groups the user has folded away; 'favorites' covers the pinned section. */
  private readonly foldedGroups = signal<ReadonlySet<string>>(
    new Set(readStored<string[]>(FOLDED_GROUPS_KEY, [])),
  );

  constructor() {
    effect(() => writeStored(FOLDED_GROUPS_KEY, [...this.foldedGroups()]));
  }

  /**
   * A folded group still opens while filtering (so matches are never hidden)
   * and in icon-only mode, where there are no headers to fold with.
   */
  isOpen(groupId: string): boolean {
    return this.collapsed() || this.filter().length > 0 || !this.foldedGroups().has(groupId);
  }

  toggleGroup(groupId: string): void {
    this.foldedGroups.update((folded) => {
      const next = new Set(folded);
      if (!next.delete(groupId)) next.add(groupId);
      return next;
    });
  }

  toggleCollapsed(): void {
    this.collapsed.update((c) => !c);
    if (this.collapsed()) this.filter.set('');
  }

  onFilterInput(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  clearFilter(): void {
    this.filter.set('');
  }
}
