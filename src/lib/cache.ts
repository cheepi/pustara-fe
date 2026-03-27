/**
 * API Response Cache Layer
 * 
 * Implements LRU (Least Recently Used) cache with TTL (Time To Live)
 * for API responses to prevent redundant requests.
 * 
 * Supports stale-while-revalidate pattern: return stale data immediately
 * while revalidating in background.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Max entries in cache (LRU eviction)
  staleWhileRevalidate?: boolean; // Return stale data while revalidating
}

export class CacheWithTTL<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig) {
    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize ?? 50,
      staleWhileRevalidate: config.staleWhileRevalidate ?? false,
    };
  }

  /**
   * Check if cache entry exists and is not expired
   */
  has(key: string, allowStale = false): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > this.config.ttl;
    return allowStale || !isExpired;
  }

  /**
   * Get cached value if exists and not expired
   */
  get(key: string, allowStale = false): T | null {
    if (!this.has(key, allowStale)) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set cache value with current timestamp
   */
  set(key: string, data: T): void {
    this.cache.delete(key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });

    if (this.cache.size > this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats() {
    let totalHits = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      if (Date.now() - entry.timestamp > this.config.ttl) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      expiredCount,
      hitRate: totalHits / Math.max(this.cache.size, 1),
    };
  }
}

/**
 * Wraps an async fetch function with caching
 * 
 * Example:
 *   const cachedFetch = createCachedFn(fetchTrending, { ttl: 60000 });
 *   const data1 = await cachedFetch('books');
 *   const data2 = await cachedFetch('books'); // Returns cached
 */
export function createCachedFn<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  config: CacheConfig,
): (...args: Args) => Promise<R> {
  const cache = new CacheWithTTL<R>(config);

  return async (...args: Args): Promise<R> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    const stale = cache.get(key, true);
    const fetchPromise = fn(...args);
    if (stale !== null && config.staleWhileRevalidate) {
      fetchPromise
        .then((fresh) => cache.set(key, fresh))
        .catch(() => {
          // Keep stale on error
        });
      return stale;
    }

    const fresh = await fetchPromise;
    cache.set(key, fresh);
    return fresh;
  };
}

/**
 * Global API cache instances - one per endpoint
 * 
 * Usage:
 *   // In api.ts
 *   export const trendingCache = new CacheWithTTL({ ttl: 60000 });
 *   
 *   // In hooks
 *   if (!trendingCache.has('trending')) {
 *     const data = await fetchTrending();
 *     trendingCache.set('trending', data);
 *   }
 */

export const apiCaches = {
  trending: new CacheWithTTL({ ttl: 60 * 1000, maxSize: 10 }),
  popular: new CacheWithTTL({ ttl: 60 * 1000, maxSize: 10 }),
  recommendations: new CacheWithTTL({ ttl: 5 * 60 * 1000, maxSize: 20 }), 
  notifications: new CacheWithTTL({ ttl: 30 * 1000, maxSize: 5 }), 
  reviews: new CacheWithTTL({ ttl: 5 * 60 * 1000, maxSize: 50 }),
  bookDetails: new CacheWithTTL({ ttl: 30 * 60 * 1000, maxSize: 100 }), 
};

/**
 * Clear all API caches (useful on logout or manual invalidation)
 */
export function clearAllCaches(): void {
  Object.values(apiCaches).forEach((cache) => cache.clear());
}

/**
 * Get cache statistics across all endpoints
 */
export function getCacheStats() {
  return Object.entries(apiCaches).reduce(
    (acc, [name, cache]) => {
      acc[name] = cache.getStats();
      return acc;
    },
    {} as Record<string, ReturnType<CacheWithTTL<any>['getStats']>>,
  );
}
