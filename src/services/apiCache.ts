/**
 * API Cache & In-Flight Request Deduplication Layer
 * Implements deterministic cache keys, in-flight promise deduplication,
 * stale-while-revalidate (SWR), and targeted cache invalidation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inflight = new Map<string, Promise<any>>();
  private defaultTTL = 60 * 1000; // 60 seconds TTL

  /**
   * Deterministic cache key generator
   */
  public generateKey(prefix: string, params?: Record<string, any>): string {
    if (!params) return prefix;
    const sortedKeys = Object.keys(params).sort();
    const serialized = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(String(params[k] ?? ''))}`)
      .join('&');
    return `${prefix}:${serialized}`;
  }

  /**
   * Get cached data if available (even if stale) for Stale-While-Revalidate
   */
  public get<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.cache.get(key);
    if (!entry) return { data: null, isStale: true };
    const isStale = Date.now() > entry.expiresAt;
    return { data: entry.data as T, isStale };
  }

  /**
   * Set cached data with TTL
   */
  public set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Deduplicate concurrent in-flight asynchronous requests
   */
  public async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) {
      return this.inflight.get(key)!;
    }

    const promise = (async () => {
      try {
        const result = await requestFn();
        return result;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Invalidate exact cache key
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex pattern
   */
  public invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all product queries (e.g. after product or variant creation/mutation)
   */
  public invalidateProducts(productId?: string): void {
    this.invalidatePattern(/^products:/);
    this.invalidatePattern(/^kpi:/);
    if (productId) {
      this.invalidate(`product:${productId}`);
      this.invalidate(`variants:${productId}`);
    }
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

export const apiCache = new ApiCache();
