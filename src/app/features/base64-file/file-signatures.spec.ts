import { describe, expect, it } from 'vitest';
import { UNKNOWN_KIND, detectKind, readDimensions } from './file-signatures';

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Minimal PNG header: signature + IHDR length/type + 8-byte dimensions. */
function pngHeader(width: number, height: number): Uint8Array {
  const out = new Uint8Array(24);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(out.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return out;
}

describe('detectKind', () => {
  it('detects PDF', () => {
    expect(detectKind(ascii('%PDF-1.7\n...')).extension).toBe('pdf');
  });

  it('detects PNG', () => {
    const kind = detectKind(pngHeader(1, 1));
    expect(kind.extension).toBe('png');
    expect(kind.preview).toBe('image');
  });

  it('detects JPEG', () => {
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0)).extension).toBe('jpg');
  });

  it('detects little-endian TIFF', () => {
    const kind = detectKind(bytes(0x49, 0x49, 0x2a, 0x00, 0x08));
    expect(kind.extension).toBe('tif');
    expect(kind.preview).toBe('tiff');
  });

  it('detects big-endian TIFF', () => {
    expect(detectKind(bytes(0x4d, 0x4d, 0x00, 0x2a, 0x00)).extension).toBe('tif');
  });

  it('detects GIF and BMP', () => {
    expect(detectKind(ascii('GIF89a')).extension).toBe('gif');
    expect(detectKind(ascii('BM______')).extension).toBe('bmp');
  });

  it('detects WebP only when the RIFF container says WEBP', () => {
    expect(detectKind(concat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WEBP'))).extension).toBe(
      'webp',
    );
    expect(detectKind(concat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WAVE'))).extension).toBe(
      'bin',
    );
  });

  it('distinguishes Office documents from plain ZIPs', () => {
    const zipMagic = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(detectKind(concat(zipMagic, ascii('...word/document.xml'))).extension).toBe('docx');
    expect(detectKind(concat(zipMagic, ascii('...xl/workbook.xml'))).extension).toBe('xlsx');
    expect(detectKind(concat(zipMagic, ascii('...random/thing.txt'))).extension).toBe('zip');
  });

  it('detects text formats that have no magic bytes', () => {
    expect(detectKind(ascii('<svg viewBox="0 0 1 1"></svg>')).extension).toBe('svg');
    expect(detectKind(ascii('<?xml version="1.0"?><root/>')).extension).toBe('xml');
    expect(detectKind(ascii('{"a":1}')).extension).toBe('json');
    expect(detectKind(ascii('just some notes')).extension).toBe('txt');
  });

  it('treats an XML-declared SVG as SVG, not XML', () => {
    expect(detectKind(ascii('<?xml version="1.0"?><svg></svg>')).extension).toBe('svg');
  });

  it('falls back to unknown binary', () => {
    expect(detectKind(bytes(0x00, 0x01, 0x02, 0x00, 0xff))).toEqual(UNKNOWN_KIND);
  });

  it('handles an empty buffer', () => {
    expect(detectKind(new Uint8Array(0))).toEqual(UNKNOWN_KIND);
  });
});

describe('readDimensions', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    const header = pngHeader(1920, 1080);
    expect(readDimensions(header, detectKind(header))).toBe('1920 × 1080');
  });

  it('returns null for formats it cannot measure', () => {
    const pdf = ascii('%PDF-1.7');
    expect(readDimensions(pdf, detectKind(pdf))).toBeNull();
  });
});
