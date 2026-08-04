import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { debounceTime, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FileDownloadService } from '../../core/services/file-download.service';
import { CopyButton } from '../../shared/copy-button/copy-button';
import { Icon } from '../../shared/icon/icon';
import { Panel } from '../../shared/panel/panel';
import { UtilityPage } from '../../shared/utility-page/utility-page';
import { bytesToBase64, formatBytes, parseBase64, toDataUri, wrapBase64 } from './base64-binary';
import { UNKNOWN_KIND, detectKind, readDimensions, type FileKind } from './file-signatures';
import { readTiffInfo, renderTiffPage } from './tiff-preview';

type Mode = 'decode' | 'encode';

/** Past this, the raw base64 is too big to put in the DOM without stalling. */
const PREVIEW_LIMIT = 100_000;

interface EncodedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly kind: FileKind;
  readonly base64: string;
}

@Component({
  selector: 'app-base64-file',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    CopyButton,
    Icon,
    Panel,
    UtilityPage,
  ],
  templateUrl: './base64-file.html',
  styleUrl: './base64-file.scss',
})
export class Base64File {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly downloader = inject(FileDownloadService);

  readonly mode = signal<Mode>('decode');

  // ---------------------------------------------------------------- decode

  readonly form = inject(FormBuilder).nonNullable.group({ input: '' });

  private readonly rawInput = toSignal(
    this.form.controls.input.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  /** Decoding megabytes on every keystroke would stall the page. */
  private readonly settledInput = toSignal(
    this.form.controls.input.valueChanges.pipe(startWith(''), debounceTime(200)),
    { initialValue: '' },
  );

  /** True between a keystroke and the debounced decode catching up. */
  readonly decodePending = computed(
    () => this.rawInput().trim().length > 0 && this.rawInput() !== this.settledInput(),
  );

  readonly decoded = computed(() => {
    const text = this.settledInput();
    if (!text.trim()) return null;
    return parseBase64(text);
  });

  readonly decodeError = computed(() => {
    const result = this.decoded();
    return result && !result.ok ? result.error : '';
  });

  private readonly bytes = computed(() => {
    const result = this.decoded();
    return result?.ok ? result.value.bytes : null;
  });

  readonly bytesReady = computed(() => this.bytes() !== null);

  readonly kind = computed<FileKind>(() => {
    const bytes = this.bytes();
    return bytes ? detectKind(bytes) : UNKNOWN_KIND;
  });

  readonly dimensions = computed(() => {
    const bytes = this.bytes();
    return bytes ? readDimensions(bytes, this.kind()) : null;
  });

  readonly sizeLabel = computed(() => {
    const bytes = this.bytes();
    return bytes ? formatBytes(bytes.length) : '';
  });

  readonly declaredMime = computed(() => {
    const result = this.decoded();
    return result?.ok ? result.value.declaredMime : null;
  });

  /** Warn when the data URI's claimed type disagrees with the actual bytes. */
  readonly mimeMismatch = computed(() => {
    const declared = this.declaredMime();
    if (!declared) return null;
    const actual = this.kind().mime;
    return declared !== actual && actual !== UNKNOWN_KIND.mime ? declared : null;
  });

  readonly filename = signal('download');

  readonly fullFilename = computed(() => {
    const base = this.filename().trim() || 'download';
    const extension = this.kind().extension;
    return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
  });

  private readonly objectUrl = signal<string | null>(null);

  readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.objectUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /** Plain string for <img>, which doesn't need the resource-URL bypass. */
  readonly imageUrl = computed(() => this.objectUrl());

  readonly textPreview = computed(() => {
    const bytes = this.bytes();
    if (!bytes || this.kind().preview !== 'text') return '';
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 20_000));
  });

  // TIFF is decoded asynchronously, one page at a time.
  readonly tiffPageCount = signal(0);
  readonly tiffPage = signal(0);
  readonly tiffImage = signal<string | null>(null);
  readonly tiffLoading = signal(false);
  readonly tiffError = signal('');

  // ---------------------------------------------------------------- encode

  readonly encoded = signal<EncodedFile | null>(null);
  readonly encoding = signal(false);
  readonly encodeError = signal('');
  readonly dragging = signal(false);
  readonly asDataUri = signal(false);
  readonly wrapLines = signal(false);

  readonly encodedOutput = computed(() => {
    const file = this.encoded();
    if (!file) return '';
    let output = file.base64;
    if (this.wrapLines()) output = wrapBase64(output);
    return this.asDataUri() ? toDataUri(output, file.kind.mime) : output;
  });

  /** The textarea shows a truncated view; copy and download use the full string. */
  readonly displayOutput = computed(() => {
    const output = this.encodedOutput();
    return output.length > PREVIEW_LIMIT ? output.slice(0, PREVIEW_LIMIT) : output;
  });

  readonly truncated = computed(() => this.encodedOutput().length > PREVIEW_LIMIT);

  readonly encodedLength = computed(() => this.encodedOutput().length);

  constructor() {
    // One object URL per decoded payload, revoked as soon as it's replaced.
    effect((onCleanup) => {
      const bytes = this.bytes();
      const kind = this.kind();

      if (!bytes) {
        this.objectUrl.set(null);
        return;
      }

      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: kind.mime }));
      this.objectUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });

    // Reset and kick off TIFF decoding whenever the payload changes.
    effect(() => {
      const bytes = this.bytes();
      const isTiff = this.kind().preview === 'tiff';

      this.tiffImage.set(null);
      this.tiffError.set('');
      this.tiffPage.set(0);
      this.tiffPageCount.set(0);

      if (bytes && isTiff) void this.loadTiff(bytes);
    });

    inject(DestroyRef).onDestroy(() => {
      const url = this.objectUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  private async loadTiff(bytes: Uint8Array): Promise<void> {
    this.tiffLoading.set(true);
    try {
      const info = await readTiffInfo(bytes);
      // Guard against a newer payload having landed while we awaited.
      if (this.bytes() !== bytes) return;

      this.tiffPageCount.set(info.pages.length);
      const image = await renderTiffPage(bytes, 0);
      if (this.bytes() !== bytes) return;
      this.tiffImage.set(image);
    } catch (err) {
      if (this.bytes() !== bytes) return;
      this.tiffError.set(err instanceof Error ? err.message : 'Could not decode this TIFF.');
    } finally {
      this.tiffLoading.set(false);
    }
  }

  async goToPage(index: number): Promise<void> {
    const bytes = this.bytes();
    if (!bytes || index < 0 || index >= this.tiffPageCount()) return;

    this.tiffPage.set(index);
    this.tiffLoading.set(true);
    try {
      this.tiffImage.set(await renderTiffPage(bytes, index));
    } catch (err) {
      this.tiffError.set(err instanceof Error ? err.message : 'Could not decode this page.');
    } finally {
      this.tiffLoading.set(false);
    }
  }

  download(): void {
    const bytes = this.bytes();
    if (!bytes) return;

    const blob = new Blob([bytes as BlobPart], { type: this.kind().mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.fullFilename();
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  clearDecode(): void {
    this.form.controls.input.setValue('');
    this.filename.set('download');
  }

  onFilenameInput(event: Event): void {
    this.filename.set((event.target as HTMLInputElement).value);
  }

  // ---------------------------------------------------------------- encode

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.encodeFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.encodeFile(file);
    input.value = ''; // let the same file be picked twice in a row
  }

  private async encodeFile(file: File): Promise<void> {
    this.encoding.set(true);
    this.encodeError.set('');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detected = detectKind(bytes);
      this.encoded.set({
        name: file.name,
        bytes,
        // Trust the sniffed type, but keep the browser's if we couldn't tell.
        kind: detected === UNKNOWN_KIND && file.type ? { ...detected, mime: file.type } : detected,
        base64: bytesToBase64(bytes),
      });
    } catch {
      this.encodeError.set('Could not read that file.');
      this.encoded.set(null);
    } finally {
      this.encoding.set(false);
    }
  }

  downloadBase64(): void {
    const file = this.encoded();
    if (!file) return;
    this.downloader.download(`${file.name}.base64.txt`, this.encodedOutput(), 'text/plain');
  }

  clearEncode(): void {
    this.encoded.set(null);
    this.encodeError.set('');
  }

  protected readonly formatBytes = formatBytes;
}
