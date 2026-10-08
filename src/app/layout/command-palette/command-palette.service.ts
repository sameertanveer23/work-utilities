import { Injectable, Injector, inject } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import type { CommandPalette } from './command-palette';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly injector = inject(Injector);
  private ref: MatDialogRef<CommandPalette> | null = null;
  private opening = false;

  /**
   * Ctrl+K while the palette is open closes it again.
   *
   * The dialog module and the palette component are imported on first use, so
   * neither is in the initial bundle; every later call finds them cached.
   */
  async toggle(): Promise<void> {
    if (this.ref) {
      this.ref.close();
      return;
    }
    // A second Ctrl+K while the first import is still in flight would open two.
    if (this.opening) return;

    this.opening = true;
    try {
      const [{ MatDialog }, { CommandPalette }] = await Promise.all([
        import('@angular/material/dialog'),
        import('./command-palette'),
      ]);

      this.ref = this.injector.get(MatDialog).open(CommandPalette, {
        width: '620px',
        maxWidth: 'calc(100vw - 32px)',
        position: { top: '12vh' },
        autoFocus: 'input',
        restoreFocus: true,
        panelClass: 'wu-palette-panel',
      });
      this.ref.afterClosed().subscribe(() => (this.ref = null));
    } finally {
      this.opening = false;
    }
  }
}
