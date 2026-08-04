/**
 * TIFF rendering. Browsers can't display TIFF natively, so pages are decoded to
 * RGBA and painted onto a canvas.
 *
 * UTIF is imported dynamically so its ~30kB only loads when someone actually
 * pastes a TIFF - it never reaches the initial bundle.
 */

export interface TiffPageInfo {
  readonly width: number;
  readonly height: number;
}

export interface TiffInfo {
  readonly pages: readonly TiffPageInfo[];
}

type Utif = typeof import('utif2');

let utifPromise: Promise<Utif> | null = null;

function loadUtif(): Promise<Utif> {
  utifPromise ??= import('utif2');
  return utifPromise;
}

/** Copies into a standalone buffer - UTIF expects to own the whole ArrayBuffer. */
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function tagValue(ifd: Record<string, unknown>, tag: string): number | null {
  const raw = ifd[tag];
  if (Array.isArray(raw) && raw.length > 0) return Number(raw[0]);
  if (typeof raw === 'number') return raw;
  return null;
}

/**
 * Reads page count and dimensions from the image directories. This only parses
 * metadata, so it stays fast on large multi-page faxes.
 */
export async function readTiffInfo(bytes: Uint8Array): Promise<TiffInfo> {
  const UTIF = await loadUtif();
  const ifds = UTIF.decode(toBuffer(bytes)) as unknown as Record<string, unknown>[];

  return {
    pages: ifds.map((ifd) => ({
      width: tagValue(ifd, 't256') ?? 0,
      height: tagValue(ifd, 't257') ?? 0,
    })),
  };
}

/**
 * Decodes a single page to a data URL. Pages are rendered on demand rather than
 * all at once, so a 200-page document doesn't blow up memory.
 */
export async function renderTiffPage(bytes: Uint8Array, index: number): Promise<string> {
  const UTIF = await loadUtif();
  const buffer = toBuffer(bytes);
  const ifds = UTIF.decode(buffer);

  const ifd = ifds[index];
  if (!ifd) throw new Error(`This TIFF has no page ${index + 1}.`);

  UTIF.decodeImage(buffer, ifd);
  const rgba = UTIF.toRGBA8(ifd);

  const width = ifd.width;
  const height = ifd.height;
  if (!width || !height) throw new Error('This TIFF page has no usable image data.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get a canvas context to draw the TIFF.');

  const image = context.createImageData(width, height);
  image.data.set(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength));
  context.putImageData(image, 0, 0);

  return canvas.toDataURL('image/png');
}
