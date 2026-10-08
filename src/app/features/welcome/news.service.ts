import { Injectable, signal } from '@angular/core';
import { readStored, writeStored } from '../../core/services/local-storage';
import { isFresh, newsUrl, parseArticles, type Article, type NewsCache } from './news';

const CACHE_KEY = 'wu.news';
const REQUEST_TIMEOUT_MS = 8000;

export type NewsState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  /** `stale` means the fetch failed and these are the last stories we managed to load. */
  | { readonly status: 'ready'; readonly articles: readonly Article[]; readonly stale: boolean };

/**
 * The one place the app talks to the network. Failure is routine (offline, rate
 * limited, blocked), so the dashboard treats the feed as optional: it falls back
 * to the last good list, and to a quiet error row if there never was one.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly _state = signal<NewsState>({ status: 'loading' });
  private readonly _refreshing = signal(false);

  readonly state = this._state.asReadonly();
  readonly refreshing = this._refreshing.asReadonly();

  /** Uses the cache while it is fresh; `force` always asks the network. */
  async load(force = false): Promise<void> {
    if (this._refreshing()) return;

    const cache = readCache();
    if (!force && isFresh(cache, Date.now())) {
      this._state.set({ status: 'ready', articles: cache.articles, stale: false });
      return;
    }

    this._refreshing.set(true);
    try {
      const response = await fetch(newsUrl(Date.now()), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const articles = parseArticles(await response.json());
      if (articles.length === 0) throw new Error('No stories in the response');

      writeStored(CACHE_KEY, { fetchedAt: Date.now(), articles } satisfies NewsCache);
      this._state.set({ status: 'ready', articles, stale: false });
    } catch {
      this._state.set(
        cache && cache.articles.length > 0
          ? { status: 'ready', articles: cache.articles, stale: true }
          : { status: 'error' },
      );
    } finally {
      this._refreshing.set(false);
    }
  }
}

/** localStorage is user-editable and may predate this shape, so check before trusting it. */
function readCache(): NewsCache | null {
  const raw = readStored<Partial<NewsCache> | null>(CACHE_KEY, null);
  return raw && typeof raw.fetchedAt === 'number' && Array.isArray(raw.articles)
    ? (raw as NewsCache)
    : null;
}
