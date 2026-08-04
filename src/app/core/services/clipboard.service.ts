import { Injectable, inject, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

const FEEDBACK_MS = 2000;

/**
 * Copies text and exposes which "key" was most recently copied, so copy buttons
 * can show a transient "Copied!" state without each owning a timer.
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly clipboard = inject(Clipboard);
  private readonly _copiedKey = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** The key passed to the most recent successful `copy`, cleared after 2s. */
  readonly copiedKey = this._copiedKey.asReadonly();

  copy(text: string, key = 'default'): boolean {
    if (!text) return false;

    // The CDK's PendingCopy falls back to execCommand where the async
    // Clipboard API is unavailable (non-secure origins, older browsers).
    const ok = this.clipboard.copy(text);
    if (!ok) return false;

    this._copiedKey.set(key);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this._copiedKey.set(null);
      this.timer = null;
    }, FEEDBACK_MS);

    return true;
  }

  isCopied(key: string): boolean {
    return this._copiedKey() === key;
  }
}
