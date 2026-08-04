import { describe, expect, it } from 'vitest';
import { convert } from './codecs';

describe('base64', () => {
  it('round-trips ASCII', () => {
    const encoded = convert('hello', 'base64', 'encode');
    expect(encoded.output).toBe('aGVsbG8=');
    expect(convert(encoded.output, 'base64', 'decode').output).toBe('hello');
  });

  it('round-trips multi-byte characters that plain btoa would reject', () => {
    const encoded = convert('héllo — 世界', 'base64', 'encode');
    expect(encoded.error).toBe('');
    expect(convert(encoded.output, 'base64', 'decode').output).toBe('héllo — 世界');
  });

  it('reports an error instead of throwing on malformed input', () => {
    const result = convert('!!!not base64!!!', 'base64', 'decode');
    expect(result.output).toBe('');
    expect(result.error).toContain('Could not decode');
  });
});

describe('base64url', () => {
  it('uses the URL-safe alphabet and strips padding', () => {
    const encoded = convert('~~~?>>>', 'base64url', 'encode');
    expect(encoded.output).not.toContain('+');
    expect(encoded.output).not.toContain('/');
    expect(encoded.output).not.toContain('=');
    expect(convert(encoded.output, 'base64url', 'decode').output).toBe('~~~?>>>');
  });
});

describe('url', () => {
  it('encodes a component including reserved characters', () => {
    expect(convert('a b&c=d', 'url-component', 'encode').output).toBe('a%20b%26c%3Dd');
  });

  it('leaves reserved characters alone in full-URL mode', () => {
    expect(convert('https://x.dev/a b?q=1', 'url', 'encode').output).toBe(
      'https://x.dev/a%20b?q=1',
    );
  });
});

describe('html', () => {
  it('escapes the five significant characters', () => {
    expect(convert(`<a href="x">&'</a>`, 'html', 'encode').output).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;',
    );
  });

  it('round-trips', () => {
    const source = `<b>"a" & 'b'</b>`;
    const encoded = convert(source, 'html', 'encode').output;
    expect(convert(encoded, 'html', 'decode').output).toBe(source);
  });
});

it('passes empty input straight through', () => {
  expect(convert('', 'base64', 'encode')).toEqual({ output: '', error: '' });
});
