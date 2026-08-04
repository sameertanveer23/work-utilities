import { Injectable, computed, effect, signal } from '@angular/core';
import { UTILITIES, utilityById, type UtilityDef } from '../utility-registry';
import { readStored, writeStored } from './local-storage';

const FAVORITES_KEY = 'wu.favorites';
const RECENTS_KEY = 'wu.recents';
const MAX_RECENTS = 5;

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _ids = signal<readonly string[]>(
    readStored<string[]>(FAVORITES_KEY, []).filter((id) => utilityById(id) !== undefined),
  );
  private readonly _recentIds = signal<readonly string[]>(
    readStored<string[]>(RECENTS_KEY, []).filter((id) => utilityById(id) !== undefined),
  );

  readonly ids = this._ids.asReadonly();

  /** Favorited utilities in registry order, for the pinned sidebar section. */
  readonly favorites = computed<UtilityDef[]>(() => {
    const ids = new Set(this._ids());
    return UTILITIES.filter((u) => ids.has(u.id));
  });

  /** Most recently visited first. */
  readonly recents = computed<UtilityDef[]>(() =>
    this._recentIds()
      .map((id) => utilityById(id))
      .filter((u): u is UtilityDef => u !== undefined),
  );

  constructor() {
    effect(() => writeStored(FAVORITES_KEY, this._ids()));
    effect(() => writeStored(RECENTS_KEY, this._recentIds()));
  }

  isFavorite(id: string): boolean {
    return this._ids().includes(id);
  }

  toggle(id: string): void {
    this._ids.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  markVisited(id: string): void {
    this._recentIds.update((ids) => [id, ...ids.filter((x) => x !== id)].slice(0, MAX_RECENTS));
  }
}
