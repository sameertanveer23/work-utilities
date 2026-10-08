export interface Article {
  readonly id: string;
  readonly title: string;
  /** The story's own link, or its Hacker News thread for text posts such as Ask HN. */
  readonly url: string;
  readonly discussionUrl: string;
  readonly points: number;
  readonly comments: number;
  readonly author: string;
}

export interface NewsCache {
  readonly fetchedAt: number;
  readonly articles: readonly Article[];
}

export const ARTICLE_COUNT = 3;

/** How long a fetched list is reused before the next visit refetches. */
export const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Hacker News's own search index (Algolia). With no query it ranks by points, so
 * "stories from the last 24 hours" comes back most-upvoted first.
 */
export function newsUrl(now: number): string {
  const since = Math.floor(now / 1000) - 24 * 60 * 60;
  const params = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>${since}`,
    hitsPerPage: String(ARTICLE_COUNT),
  });
  return `https://hn.algolia.com/api/v1/search?${params}`;
}

export function isFresh(cache: NewsCache | null, now: number): cache is NewsCache {
  return cache !== null && cache.articles.length > 0 && now - cache.fetchedAt < CACHE_TTL_MS;
}

/** Only web links are followed: anything else (javascript:, data:) falls back to the HN thread. */
function safeUrl(candidate: unknown, fallback: string): string {
  if (typeof candidate !== 'string') return fallback;
  try {
    const { protocol } = new URL(candidate);
    return protocol === 'https:' || protocol === 'http:' ? candidate : fallback;
  } catch {
    return fallback;
  }
}

export function parseArticles(json: unknown): Article[] {
  const hits = (json as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(hits)) return [];

  const articles: Article[] = [];
  for (const hit of hits) {
    const id = hit?.objectID;
    const title = hit?.title;
    if (typeof id !== 'string' || typeof title !== 'string' || !title.trim()) continue;

    const discussionUrl = `https://news.ycombinator.com/item?id=${encodeURIComponent(id)}`;
    articles.push({
      id,
      title: title.trim(),
      url: safeUrl(hit.url, discussionUrl),
      discussionUrl,
      points: Number(hit.points) || 0,
      comments: Number(hit.num_comments) || 0,
      author: typeof hit.author === 'string' ? hit.author : '',
    });
  }
  return articles.slice(0, ARTICLE_COUNT);
}

/** The host to show beside a title, e.g. `github.com`; empty for HN-only posts. */
export function displayHost(article: Article): string {
  if (article.url === article.discussionUrl) return 'news.ycombinator.com';
  try {
    return new URL(article.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
