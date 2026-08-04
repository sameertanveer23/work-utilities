import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  formatBytes,
  parseBase64,
  toDataUri,
  wrapBase64,
} from './base64-binary';

const bytesOf = (result: ReturnType<typeof parseBase64>) => {
  if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
  return result.value.bytes;
};

describe('parseBase64', () => {
  it('decodes plain base64', () => {
    expect([...bytesOf(parseBase64('aGVsbG8='))]).toEqual([...new TextEncoder().encode('hello')]);
  });

  it('strips a data URI prefix and reports the declared MIME', () => {
    const result = parseBase64('data:application/pdf;base64,aGVsbG8=');
    if (!result.ok) throw new Error(result.error);
    expect(result.value.declaredMime).toBe('application/pdf');
    expect(result.value.wasDataUri).toBe(true);
  });

  it('tolerates newline-wrapped input, as XML and JSON payloads produce', () => {
    const wrapped = 'aGVs\nbG8=\r\n';
    expect([...bytesOf(parseBase64(wrapped))]).toEqual([...new TextEncoder().encode('hello')]);
  });

  it('accepts the URL-safe alphabet', () => {
    const standard = bytesOf(parseBase64('++//'));
    const urlSafe = bytesOf(parseBase64('--__'));
    expect([...urlSafe]).toEqual([...standard]);
  });

  it('restores missing padding', () => {
    expect([...bytesOf(parseBase64('aGVsbG8'))]).toEqual([...new TextEncoder().encode('hello')]);
  });

  it('rejects a length that cannot be valid base64', () => {
    const result = parseBase64('aGVsbG8=A');
    expect(result.ok).toBe(false);
  });

  it('rejects characters outside the alphabet', () => {
    const result = parseBase64('not valid!!');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('not valid base64');
  });

  it('rejects a non-base64 data URI', () => {
    const result = parseBase64('data:text/plain,hello');
    expect(result.ok).toBe(false);
  });

  it('rejects empty input with a helpful message', () => {
    const result = parseBase64('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Paste some base64');
  });
});

describe('round trip', () => {
  it('survives arbitrary binary, including NUL and high bytes', () => {
    const original = new Uint8Array([0, 1, 127, 128, 200, 255, 0, 42]);
    expect([...base64ToBytes(bytesToBase64(original))]).toEqual([...original]);
  });

  it('handles a payload larger than the chunk size', () => {
    const original = new Uint8Array(0x8000 * 2 + 5);
    for (let i = 0; i < original.length; i++) original[i] = i % 256;
    const restored = base64ToBytes(bytesToBase64(original));
    expect(restored.length).toBe(original.length);
    expect(restored[original.length - 1]).toBe(original[original.length - 1]);
  });

  it('survives a data URI round trip', () => {
    const original = new Uint8Array([1, 2, 3]);
    const uri = toDataUri(bytesToBase64(original), 'image/png');
    expect([...bytesOf(parseBase64(uri))]).toEqual([...original]);
  });
});

describe('wrapBase64', () => {
  it('wraps at the requested width', () => {
    expect(wrapBase64('a'.repeat(10), 4)).toBe('aaaa\naaaa\naa');
  });

  it('leaves short input alone', () => {
    expect(wrapBase64('abc', 76)).toBe('abc');
  });
});

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
