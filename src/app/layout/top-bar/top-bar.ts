import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { ThemeService } from '../../core/services/theme.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, Icon],
  template: `
    @if (showMenu()) {
      <button matIconButton type="button" aria-label="Open navigation" (click)="menuClick.emit()">
        <app-icon name="menu" />
      </button>
    }

    <button type="button" class="palette-trigger" (click)="palette.toggle()">
      <app-icon name="search" />
      <span class="hint">Jump to a utility</span>
      <kbd>{{ shortcutLabel }}</kbd>
    </button>

    <span class="spacer"></span>

    <button
      matIconButton
      type="button"
      [matTooltip]="theme.resolved() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      (click)="theme.toggle()"
    >
      <app-icon [name]="theme.resolved() === 'dark' ? 'light_mode' : 'dark_mode'" />
    </button>
  `,
  styleUrl: './top-bar.scss',
})
export class TopBar {
  protected readonly palette = inject(CommandPaletteService);
  protected readonly theme = inject(ThemeService);

  readonly showMenu = input(false);
  readonly menuClick = output<void>();

  protected readonly shortcutLabel =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
      ? '⌘K'
      : 'Ctrl K';
}
