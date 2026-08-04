import { Injectable, inject } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';
import { CommandPalette } from './command-palette';

@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly dialog = inject(MatDialog);
  private ref: MatDialogRef<CommandPalette> | null = null;

  /** Ctrl+K while the palette is open closes it again. */
  toggle(): void {
    if (this.ref) {
      this.ref.close();
      return;
    }

    this.ref = this.dialog.open(CommandPalette, {
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      position: { top: '12vh' },
      autoFocus: 'input',
      restoreFocus: true,
      panelClass: 'wu-palette-panel',
    });

    this.ref.afterClosed().subscribe(() => (this.ref = null));
  }
}
