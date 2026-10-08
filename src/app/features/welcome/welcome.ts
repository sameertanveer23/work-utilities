import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FavoritesService } from '../../core/services/favorites.service';
import { CommandPaletteService } from '../../layout/command-palette/command-palette.service';
import { CATEGORIES } from '../../core/categories';
import { UTILITIES } from '../../core/utility-registry';
import { Icon } from '../../shared/icon/icon';
import { NewsCard } from './news-card';
import { QuoteCard } from './quote-card';

function greetingFor(hour: number): string {
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, Icon, NewsCard, QuoteCard],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  private readonly favoritesService = inject(FavoritesService);
  protected readonly palette = inject(CommandPaletteService);

  readonly favorites = this.favoritesService.favorites;
  readonly recents = this.favoritesService.recents;

  private readonly now = new Date();
  readonly greeting = greetingFor(this.now.getHours());
  readonly today = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(this.now);

  readonly groups = computed(() =>
    CATEGORIES.map((category) => ({
      category,
      utilities: UTILITIES.filter((u) => u.category === category.id),
    })).filter((group) => group.utilities.length > 0),
  );
}
