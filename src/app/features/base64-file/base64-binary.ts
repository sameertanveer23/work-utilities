/**
 * Base64 <-> binary conversion, tolerant of the forms base64 actually arrives
 * in: data URIs, newline-wrapped blocks from XML/JSON, URL-safe alphabets and
 * missing padding.
 */

export interface ParsedBase64 {
  readonly bytes: Uint8Array;
  /** MIME declared by a `data:` prefix, if the input had one. */
  readonly declaredMime: string | null;
  /** True when the input was a full data URI rather than bare base64. */
  readonly wasDataUri: boolean;
}

export type ParseResult = { ok: true; value: ParsedBase64 } | { ok: false; error: string };

const DATA_URI = /^data:([^;,]*)((?:;[^;,]*)*),/i;

/** btoa/atob choke past ~100k args, so binary strings are built in chunks. */
const CHUNK = 0x8000;

export function parseBase64(input: string): ParseResult {
  let text = input.trim();
  if (!text) return { ok: false, error: 'Paste some base64 to decode.' };

  let declaredMime: string | null = null;
  let wasDataUri = false;

  const dataUri = DATA_URI.exec(text);
  if (dataUri) {
    wasDataUri = true;
    declaredMime = dataUri[1] || null;
    if (!/;base64/i.test(dataUri[2] ?? '')) {
      return { ok: false, error: 'That data URI is not base64-encoded.' };
    }
    text = text.slice(dataUri[0].length);
  }

  // Strip every kind of whitespace - wrapped base64 is the norm, not the exception.
  let clean = text.replace(/\s+/g, '');
  // Accept the URL-safe alphabet as well as the standard one.
  clean = clean.replace(/-/g, '+').replace(/_/g, '/');
  // Padding is frequently dropped; restore it.
  const remainder = clean.length % 4;
  if (remainder === 1) {
    return { ok: false, error: 'This is not valid base64 - the length is impossible.' };
  }
  if (remainder !== 0) clean += '='.repeat(4 - remainder);

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    return { ok: false, error: 'This contains characters that are not valid base64.' };
  }

  try {
    return { ok: true, value: { bytes: base64ToBytes(clean), declaredMime, wasDataUri } };
  } catch {
    return { ok: false, error: 'This is not valid base64 and could not be decoded.' };
  }
}

export function base64ToBytes(clean: string): Uint8Array {
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    // `apply` over a subarray keeps the argument count under the engine limit.
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

export function toDataUri(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}

/** Wraps a base64 string at `width` characters, as MIME and XML payloads do. */
export function wrapBase64(base64: string, width = 76): string {
  if (width <= 0) return base64;
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += width) {
    lines.push(base64.slice(i, i + width));
  }
  return lines.join('\n');
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
