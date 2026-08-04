/**
 * Identifies a file from its leading bytes. Far more reliable than trusting a
 * declared MIME type, and it means the user never has to pick a format.
 */

export type PreviewKind = 'image' | 'pdf' | 'tiff' | 'text' | 'none';

export interface FileKind {
  readonly label: string;
  readonly mime: string;
  readonly extension: string;
  readonly preview: PreviewKind;
}

export const UNKNOWN_KIND: FileKind = {
  label: 'Unknown binary',
  mime: 'application/octet-stream',
  extension: 'bin',
  preview: 'none',
};

interface Signature {
  readonly kind: FileKind;
  /** Byte values to match; `null` means "any byte" at that position. */
  readonly magic: readonly (number | null)[];
  readonly offset?: number;
  /** Extra check for containers whose magic bytes are ambiguous. */
  readonly confirm?: (bytes: Uint8Array) => boolean;
}

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

const SIGNATURES: readonly Signature[] = [
  {
    kind: { label: 'PDF', mime: 'application/pdf', extension: 'pdf', preview: 'pdf' },
    magic: ascii('%PDF'),
  },
  {
    kind: { label: 'PNG image', mime: 'image/png', extension: 'png', preview: 'image' },
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    kind: { label: 'JPEG image', mime: 'image/jpeg', extension: 'jpg', preview: 'image' },
    magic: [0xff, 0xd8, 0xff],
  },
  {
    kind: { label: 'TIFF image', mime: 'image/tiff', extension: 'tif', preview: 'tiff' },
    magic: [0x49, 0x49, 0x2a, 0x00], // little-endian, "II*\0"
  },
  {
    kind: { label: 'TIFF image', mime: 'image/tiff', extension: 'tif', preview: 'tiff' },
    magic: [0x4d, 0x4d, 0x00, 0x2a], // big-endian, "MM\0*"
  },
  {
    kind: { label: 'GIF image', mime: 'image/gif', extension: 'gif', preview: 'image' },
    magic: ascii('GIF8'),
  },
  {
    kind: { label: 'BMP image', mime: 'image/bmp', extension: 'bmp', preview: 'image' },
    magic: ascii('BM'),
  },
  {
    kind: { label: 'WebP image', mime: 'image/webp', extension: 'webp', preview: 'image' },
    magic: ascii('RIFF'),
    confirm: (b) => matches(b, ascii('WEBP'), 8),
  },
  {
    kind: { label: 'ICO icon', mime: 'image/x-icon', extension: 'ico', preview: 'image' },
    magic: [0x00, 0x00, 0x01, 0x00],
  },
  {
    kind: { label: 'Word document', mime: WORD_MIME(), extension: 'docx', preview: 'none' },
    magic: [0x50, 0x4b, 0x03, 0x04],
    confirm: (b) => containsAscii(b, 'word/', 4000),
  },
  {
    kind: { label: 'Excel workbook', mime: EXCEL_MIME(), extension: 'xlsx', preview: 'none' },
    magic: [0x50, 0x4b, 0x03, 0x04],
    confirm: (b) => containsAscii(b, 'xl/', 4000),
  },
  {
    kind: {
      label: 'PowerPoint deck',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
      preview: 'none',
    },
    magic: [0x50, 0x4b, 0x03, 0x04],
    confirm: (b) => containsAscii(b, 'ppt/', 4000),
  },
  {
    kind: { label: 'ZIP archive', mime: 'application/zip', extension: 'zip', preview: 'none' },
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  {
    kind: { label: 'GZIP archive', mime: 'application/gzip', extension: 'gz', preview: 'none' },
    magic: [0x1f, 0x8b],
  },
  {
    kind: { label: 'RTF document', mime: 'application/rtf', extension: 'rtf', preview: 'text' },
    magic: ascii('{\\rtf'),
  },
];

function WORD_MIME(): string {
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function EXCEL_MIME(): string {
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function matches(bytes: Uint8Array, magic: readonly (number | null)[], offset: number): boolean {
  if (bytes.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    const expected = magic[i];
    if (expected !== null && bytes[offset + i] !== expected) return false;
  }
  return true;
}

function containsAscii(bytes: Uint8Array, needle: string, searchLimit: number): boolean {
  const target = ascii(needle);
  const limit = Math.min(bytes.length - target.length, searchLimit);
  for (let i = 0; i <= limit; i++) {
    if (matches(bytes, target, i)) return true;
  }
  return false;
}

export function detectKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) return UNKNOWN_KIND;

  for (const signature of SIGNATURES) {
    if (!matches(bytes, signature.magic, signature.offset ?? 0)) continue;
    if (signature.confirm && !signature.confirm(bytes)) continue;
    return signature.kind;
  }

  // No binary signature matched. Text formats have no magic bytes, so sniff.
  const text = sniffText(bytes);
  if (text) return text;

  return UNKNOWN_KIND;
}

/**
 * SVG, JSON and XML are just text, so they're identified by shape rather than
 * a signature. Only the head of the buffer is examined.
 */
function sniffText(bytes: Uint8Array): FileKind | null {
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^﻿/, '')
    .trim();

  if (!head) return null;

  if (/^<svg[\s>]/i.test(head) || (/^<\?xml/i.test(head) && /<svg[\s>]/i.test(head))) {
    return { label: 'SVG image', mime: 'image/svg+xml', extension: 'svg', preview: 'image' };
  }
  if (/^<\?xml/i.test(head)) {
    return { label: 'XML', mime: 'application/xml', extension: 'xml', preview: 'text' };
  }
  if (/^[[{]/.test(head)) {
    return { label: 'JSON', mime: 'application/json', extension: 'json', preview: 'text' };
  }
  if (isProbablyText(bytes)) {
    return { label: 'Plain text', mime: 'text/plain', extension: 'txt', preview: 'text' };
  }
  return null;
}

/** Treats the buffer as text if its first KB has no NULs and few control bytes. */
function isProbablyText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 1024);
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    const isPrintable = byte >= 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
    if (!isPrintable) suspicious++;
  }
  return suspicious / sample.length < 0.1;
}

/** Reads width/height straight from the header, no decoding required. */
export function readDimensions(bytes: Uint8Array, kind: FileKind): string | null {
  if (kind.extension === 'png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    return `${view.getUint32(16)} × ${view.getUint32(20)}`;
  }
  if (kind.extension === 'gif' && bytes.length >= 10) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    return `${view.getUint16(6, true)} × ${view.getUint16(8, true)}`;
  }
  if (kind.extension === 'bmp' && bytes.length >= 26) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    return `${view.getInt32(18, true)} × ${Math.abs(view.getInt32(22, true))}`;
  }
  return null;
}
