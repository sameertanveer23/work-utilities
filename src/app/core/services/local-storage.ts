/**
 * Small guarded wrapper - localStorage throws in private-mode / sandboxed
 * contexts, and none of this data is important enough to fail a page load over.
 */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore - persistence is best effort */
  }
}
