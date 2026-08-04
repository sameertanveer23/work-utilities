import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import { readStored, writeStored } from './local-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'wu.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemPrefersDark = signal(false);

  readonly mode = signal<ThemeMode>(readStored<ThemeMode>(STORAGE_KEY, 'dark'));

  /** The theme actually in effect once `system` is resolved. */
  readonly resolved = computed<'dark' | 'light'>(() => {
    const mode = this.mode();
    if (mode === 'system') return this.systemPrefersDark() ? 'dark' : 'light';
    return mode;
  });

  constructor() {
    const query = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
    if (query) {
      this.systemPrefersDark.set(query.matches);
      query.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));
    }

    effect(() => {
      const dark = this.resolved() === 'dark';
      const root = this.document.documentElement;
      root.classList.toggle('theme-dark', dark);
      root.classList.toggle('theme-light', !dark);
      writeStored(STORAGE_KEY, this.mode());
    });
  }

  toggle(): void {
    this.mode.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}
