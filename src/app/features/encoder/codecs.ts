export type CodecId = 'base64' | 'base64url' | 'url' | 'url-component' | 'html';
export type Direction = 'encode' | 'decode';

export interface CodecResult {
  readonly output: string;
  readonly error: string;
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

const HTML_REVERSE: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#039': "'",
  apos: "'",
  nbsp: ' ',
};

/** UTF-8 safe base64 - `btoa` alone throws on anything outside Latin-1. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): string {
  const binary = atob(text);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function convert(input: string, codec: CodecId, direction: Direction): CodecResult {
  if (!input) return { output: '', error: '' };

  try {
    return { output: run(input, codec, direction), error: '' };
  } catch (err) {
    const what = direction === 'encode' ? 'encode' : 'decode';
    return {
      output: '',
      error: `Could not ${what} this input: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function run(input: string, codec: CodecId, direction: Direction): string {
  const encoding = direction === 'encode';

  switch (codec) {
    case 'base64':
      return encoding ? toBase64(input) : fromBase64(input);

    case 'base64url':
      if (encoding) {
        return toBase64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      return fromBase64(padBase64(input.replace(/-/g, '+').replace(/_/g, '/')));

    case 'url':
      return encoding ? encodeURI(input) : decodeURI(input);

    case 'url-component':
      return encoding ? encodeURIComponent(input) : decodeURIComponent(input);

    case 'html':
      return encoding
        ? input.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char])
        : input.replace(/&(#?\w+);/g, (match, entity: string) => HTML_REVERSE[entity] ?? match);
  }
}

function padBase64(text: string): string {
  const remainder = text.length % 4;
  return remainder === 0 ? text : text + '='.repeat(4 - remainder);
}
