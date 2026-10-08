import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { displayHost } from './news';
import { NewsService } from './news.service';

@Component({
  selector: 'app-news-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, Icon, Panel],
  templateUrl: './news-card.html',
  styleUrl: './news-card.scss',
})
export class NewsCard {
  protected readonly news = inject(NewsService);
  protected readonly displayHost = displayHost;

  readonly placeholders = [0, 1, 2];

  constructor() {
    void this.news.load();
  }

  refresh(): void {
    void this.news.load(true);
  }
}
