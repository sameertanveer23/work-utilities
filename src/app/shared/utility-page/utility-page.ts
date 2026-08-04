import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FavoritesService } from '../../core/services/favorites.service';
import { utilityById } from '../../core/utility-registry';
import { Icon } from '../icon/icon';

/** Page header + content wrapper shared by every utility. */
@Component({
  selector: 'app-utility-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, Icon],
  template: `
    <header>
      <app-icon class="lead" [name]="utility()?.icon ?? 'build'" />
      <div class="titles">
        <h1>{{ utility()?.title }}</h1>
        <p>{{ utility()?.description }}</p>
      </div>
      <button
        matIconButton
        type="button"
        [matTooltip]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
        [class.starred]="isFavorite()"
        (click)="toggleFavorite()"
      >
        <app-icon [name]="isFavorite() ? 'star' : 'star_border'" />
      </button>
      <ng-content select="[page-actions]" />
    </header>

    <div class="content">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: var(--wu-page-max);
      margin: 0 auto;
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 20px;
    }
    .lead {
      font-size: 30px;
      color: var(--mat-sys-primary);
      margin-top: 2px;
    }
    .titles {
      flex: 1;
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      line-height: 1.2;
    }
    p {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }
    .starred {
      color: var(--wu-warn);
    }
  `,
})
export class UtilityPage {
  private readonly favorites = inject(FavoritesService);

  readonly utilityId = input.required<string>();
  readonly utility = computed(() => utilityById(this.utilityId()));
  readonly isFavorite = computed(() => this.favorites.ids().includes(this.utilityId()));

  constructor() {
    effect(() => this.favorites.markVisited(this.utilityId()));
  }

  toggleFavorite(): void {
    this.favorites.toggle(this.utilityId());
  }
}
