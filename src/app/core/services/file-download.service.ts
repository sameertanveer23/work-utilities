import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/core';

/** Wraps the Blob + object URL + synthetic anchor dance for text downloads. */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly document = inject(DOCUMENT);

  download(filename: string, text: string, mime = 'text/plain'): void {
    if (!text) return;

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    this.document.body.appendChild(anchor);
    anchor.click();
    this.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
