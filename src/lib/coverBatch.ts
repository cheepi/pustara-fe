/**
 * Batch Cover Fetcher
 * 
 * Solves N+1 problem by fetching all OpenLibrary covers in a single batch
 * instead of individual requests per component.
 * 
 * Usage:
 *   const covers = await batchFetchCovers([
 *     { title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald' },
 *     { title: 'To Kill a Mockingbird', authors: 'Harper Lee' },
 *   ]);
 *   // covers = { 'The Great Gatsby—F. Scott Fitzgerald': 'https://...jpg', ... }
 */

import { fetchOpenLibraryCoverId } from './api';

export interface CoverRequest {
  title: string;
  authors: string;
  coverUrl?: string; // Optional: if already have cover URL, skip fetch
}

export interface CoverResult {
  title: string;
  authors: string;
  coverUrl: string | null;
  coverId: string | null;
}

/**
 * Generates cache key from title + authors for deduplication
 */
function getCoverCacheKey(title: string, authors: string): string {
  return `${title}—${authors}`.toLowerCase();
}

/**
 * Batch fetch covers for multiple books using OpenLibrary API
 * Deduplicates requests by title+author combination
 * Respects existing coverUrl values (no refetch needed)
 * 
 * @param books Array of book objects with title, authors, optional coverUrl
 * @returns Promise resolving to Map<cacheKey, coverUrl>
 */
export async function batchFetchCovers(
  books: CoverRequest[],
): Promise<Map<string, CoverResult>> {
  const seen = new Set<string>();
  const toFetch: CoverRequest[] = [];

  for (const book of books) {
    const key = getCoverCacheKey(book.title, book.authors);
    if (!seen.has(key) && !book.coverUrl) {
      seen.add(key);
      toFetch.push(book);
    }
  }

  const results = await Promise.all(
    toFetch.map(async (book) => {
      try {
        const coverId = await fetchOpenLibraryCoverId(book.title, book.authors);
        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : null;

        return {
          key: getCoverCacheKey(book.title, book.authors),
          result: {
            title: book.title,
            authors: book.authors,
            coverUrl,
            coverId,
          },
        };
      } catch (error) {
        console.warn(
          `Failed to fetch cover for "${book.title}" by ${book.authors}:`,
          error,
        );
        return {
          key: getCoverCacheKey(book.title, book.authors),
          result: {
            title: book.title,
            authors: book.authors,
            coverUrl: null,
            coverId: null,
          },
        };
      }
    }),
  );

  const coverMap = new Map<string, CoverResult>();
  for (const { key, result } of results) {
    coverMap.set(key, result);
  }

  for (const book of books) {
    const key = getCoverCacheKey(book.title, book.authors);
    if (book.coverUrl && !coverMap.has(key)) {
      coverMap.set(key, {
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        coverId: null,
      });
    }
  }

  return coverMap;
}

/**
 * Retrieve a single cover result from the batch result map
 * 
 * @param coverMap Map returned from batchFetchCovers()
 * @param title Book title
 * @param authors Book authors
 * @returns CoverResult or null if not found
 */
export function getCoverFromMap(
  coverMap: Map<string, CoverResult>,
  title: string,
  authors: string,
): CoverResult | null {
  const key = getCoverCacheKey(title, authors);
  return coverMap.get(key) ?? null;
}

/**
 * Memoization helper: caches batch results by request signature
 * Useful for preventing duplicate batch fetches during rerenders
 */
export class CoverBatchCache {
  private cache = new Map<string, Map<string, CoverResult>>();
  private cacheTime = new Map<string, number>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  private getSignature(books: CoverRequest[]): string {
    // Create hash of all book titles + authors
    const sorted = [...books]
      .sort((a, b) => (a.title + a.authors).localeCompare(b.title + b.authors))
      .map(
        (b) =>
          `${getCoverCacheKey(b.title, b.authors)}|${b.coverUrl ? 'has-url' : 'no-url'}`,
      );
    return sorted.join(';');
  }

  async fetch(books: CoverRequest[]): Promise<Map<string, CoverResult>> {
    const sig = this.getSignature(books);
    const cached = this.cache.get(sig);
    const cacheAge = Date.now() - (this.cacheTime.get(sig) ?? 0);

    // Return cached result if fresh
    if (cached && cacheAge < this.ttl) {
      return cached;
    }

    // Fetch fresh
    const result = await batchFetchCovers(books);
    this.cache.set(sig, result);
    this.cacheTime.set(sig, Date.now());

    return result;
  }

  clear(): void {
    this.cache.clear();
    this.cacheTime.clear();
  }
}

// Singleton instance for reuse across components
export const coverBatchCache = new CoverBatchCache();
