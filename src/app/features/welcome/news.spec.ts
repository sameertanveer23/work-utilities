import { describe, expect, it } from 'vitest';
import { CACHE_TTL_MS, displayHost, isFresh, newsUrl, parseArticles } from './news';

const hit = (over: Record<string, unknown> = {}) => ({
  objectID: '42',
  title: 'Something new',
  url: 'https://www.example.com/post',
  points: 120,
  num_comments: 33,
  author: 'pg',
  ...over,
});

describe('newsUrl', () => {
  it('asks for the 3 top stories from the last 24 hours', () => {
    const now = Date.UTC(2026, 9, 9, 12, 0, 0);
    const url = new URL(newsUrl(now));
    expect(url.origin + url.pathname).toBe('https://hn.algolia.com/api/v1/search');
    expect(url.searchParams.get('tags')).toBe('story');
    expect(url.searchParams.get('hitsPerPage')).toBe('3');
    expect(url.searchParams.get('numericFilters')).toBe(`created_at_i>${now / 1000 - 86400}`);
  });
});

describe('parseArticles', () => {
  it('maps hits to articles', () => {
    expect(parseArticles({ hits: [hit()] })).toEqual([
      {
        id: '42',
        title: 'Something new',
        url: 'https://www.example.com/post',
        discussionUrl: 'https://news.ycombinator.com/item?id=42',
        points: 120,
        comments: 33,
        author: 'pg',
      },
    ]);
  });

  it('falls back to the HN thread when there is no link (Ask HN)', () => {
    const [a] = parseArticles({ hits: [hit({ url: null })] });
    expect(a.url).toBe(a.discussionUrl);
  });

  it('refuses non-web links', () => {
    const [a] = parseArticles({ hits: [hit({ url: 'javascript:alert(1)' })] });
    expect(a.url).toBe(a.discussionUrl);
    expect(parseArticles({ hits: [hit({ url: 'not a url' })] })[0].url).toBe(a.discussionUrl);
  });

  it('skips malformed hits and tolerates missing numbers', () => {
    const result = parseArticles({
      hits: [null, {}, hit({ title: '  ' }), hit({ objectID: 7 }), hit({ points: null, num_comments: undefined })],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ points: 0, comments: 0 });
  });

  it('returns nothing for an unexpected payload and caps at three', () => {
    expect(parseArticles(null)).toEqual([]);
    expect(parseArticles({ hits: 'nope' })).toEqual([]);
    expect(parseArticles({ hits: [hit(), hit(), hit(), hit()] })).toHaveLength(3);
  });
});

describe('isFresh', () => {
  const cache = { fetchedAt: 1_000_000, articles: parseArticles({ hits: [hit()] }) };

  it('is fresh inside the TTL and stale after it', () => {
    expect(isFresh(cache, 1_000_000 + CACHE_TTL_MS - 1)).toBe(true);
    expect(isFresh(cache, 1_000_000 + CACHE_TTL_MS)).toBe(false);
  });

  it('is never fresh when empty or missing', () => {
    expect(isFresh(null, 0)).toBe(false);
    expect(isFresh({ fetchedAt: 0, articles: [] }, 0)).toBe(false);
  });
});

describe('displayHost', () => {
  it('shows the site without www, or HN for text posts', () => {
    expect(displayHost(parseArticles({ hits: [hit()] })[0])).toBe('example.com');
    expect(displayHost(parseArticles({ hits: [hit({ url: null })] })[0])).toBe('news.ycombinator.com');
  });
});
