export interface RegexMatch {
  readonly index: number;
  readonly end: number;
  readonly text: string;
}

export interface RegexResult {
  readonly error: string;
  readonly matches: readonly RegexMatch[];
  /** True when the cap was hit and later matches were not collected. */
  readonly truncated: boolean;
}

export interface TextSegment {
  readonly text: string;
  readonly matched: boolean;
  /** Alternates so back-to-back matches stay visually distinct. */
  readonly odd: boolean;
}

/** Each match becomes a DOM node in the highlight, so keep it bounded. */
export const MAX_MATCHES = 1000;

export const FLAGS = [
  { flag: 'g', hint: 'global - find every match' },
  { flag: 'i', hint: 'ignore case' },
  { flag: 'm', hint: 'multiline - ^ and $ match at line breaks' },
  { flag: 's', hint: 'dotAll - . also matches line breaks' },
] as const;

export function runRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { error: '', matches: [], truncated: false };

  let regex: RegExp;
  try {
    // Iterate with `g` regardless; without the user's `g` we stop after one match.
    regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Drop the "Invalid regular expression: /(/:" prefix - the pattern is on screen already.
    return {
      error: message.replace(/^Invalid regular expression:\s*\/.*?\/[a-z]*:\s*/, ''),
      matches: [],
      truncated: false,
    };
  }

  const matches: RegexMatch[] = [];
  let truncated = false;

  for (let m = regex.exec(text); m; m = regex.exec(text)) {
    if (matches.length >= MAX_MATCHES) {
      truncated = true;
      break;
    }
    matches.push({ index: m.index, end: m.index + m[0].length, text: m[0] });

    // An empty match never advances lastIndex by itself; without this we loop forever.
    if (m[0] === '') regex.lastIndex++;
    if (!flags.includes('g')) break;
  }

  return { error: '', matches, truncated };
}

/** Splits the text into matched and unmatched runs for highlighting. */
export function toSegments(text: string, matches: readonly RegexMatch[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  let odd = false;

  for (const match of matches) {
    // Empty matches have nothing to highlight.
    if (match.end === match.index) continue;
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), matched: false, odd });
    }
    odd = !odd;
    segments.push({ text: match.text, matched: true, odd });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false, odd });
  return segments;
}
