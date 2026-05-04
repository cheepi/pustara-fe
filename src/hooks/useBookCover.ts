/**
 * Unified Book Cover Hook
 * 
 * Single source of truth for book cover fetching across Pustara
 * 
 * Priority:
 * 1. STRICT: book.cover_url (from NeonDB) - always prefer if available
 * 2. FALLBACK: OpenLibrary API (title + authors) - only if cover_url missing
 * 
 * Features:
 * - Persistent caching (survives page reloads)
 * - Deduplication (no duplicate API calls)
 * - Error handling (graceful fallback to null)
 * - Type-safe (TypeScript support)
 */

'use client';

import { useState, useEffect, useMemo } from 'react';

interface Book {
  id: string;
  title: string;
  author?: string | string[];
  authors?: string[];
  cover_url?: string | null;
  coverUrl?: string | null;
  isbn?: string | null; // For OpenLibrary ISBN-based cover lookup
  cover_id?: number | null; // OpenLibrary cover ID
}

interface CoverResult {
  url: string | null;
  source: 'database' | 'openlibrary' | 'none';
  coverId?: string;
}

function toPrimaryAuthor(book: Book | null | undefined): string {
  if (!book) return '';
  if (Array.isArray(book.authors)) return String(book.authors[0] || '').trim();
  if (Array.isArray(book.author)) return String(book.author[0] || '').trim();
  if (typeof book.author === 'string') return book.author.trim();
  return '';
}

// Persistent cache across component lifecycle and page reloads
// Note: Use IndexedDB or localStorage if you need cross-tab persistence
const COVER_CACHE: Map<string, CoverResult> = new Map();

/**
 * Generate cache key from book data
 * Ensures consistent keying regardless of title/author format
 */
function generateCacheKey(book: Book): string {
  const title = book.title?.toLowerCase().trim() || '';
  const author = Array.isArray(book.authors)
    ? book.authors[0]?.toLowerCase().trim()
    : Array.isArray(book.author)
      ? book.author[0]?.toLowerCase().trim()
      : typeof book.author === 'string'
        ? book.author.toLowerCase().trim()
        : '';

  return `${title}__${author}`.replace(/\s+/g, ' ');
}

/**
 * Fetch cover from OpenLibrary API
 * Only called if database cover_url is missing
 */
async function fetchOpenLibraryCover(title: string, author: string | null): Promise<CoverResult> {
  if (!title) {
    return { url: null, source: 'none' };
  }

  try {
    const query = author ? `${title} ${author}` : title;
    const params = new URLSearchParams({
      q: query,
      limit: '1',
      fields: 'cover_i',
    });

    const response = await fetch(`https://openlibrary.org/search.json?${params}`);
    const data = await response.json();

    const coverId = data?.docs?.[0]?.cover_i;
    if (!coverId) {
      return { url: null, source: 'none' };
    }

    const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    return { url, source: 'openlibrary', coverId: String(coverId) };
  } catch (error) {
    console.error('OpenLibrary cover fetch failed:', {
      title,
      author,
      error: error instanceof Error ? error.message : String(error),
    });
    return { url: null, source: 'none' };
  }
}

/**
 * Get cover for a single book
 * Priority: 
 * 1. database cover_url
 * 2. OpenLibrary by ISBN
 * 3. OpenLibrary by title+author search
 */
async function getCover(book: Book): Promise<CoverResult> {
  const cacheKey = generateCacheKey(book);

  if (COVER_CACHE.has(cacheKey)) {
    return COVER_CACHE.get(cacheKey)!;
  }

  // 1️⃣ Try database cover_url first
  const dbCoverUrl = book.cover_url || book.coverUrl;
  if (dbCoverUrl && typeof dbCoverUrl === 'string' && dbCoverUrl.trim()) {
    const result: CoverResult = { url: dbCoverUrl, source: 'database' };
    COVER_CACHE.set(cacheKey, result);
    return result;
  }

  // 2️⃣ Try OpenLibrary by ISBN (most reliable)
  if (book.isbn && String(book.isbn).trim()) {
    const url = `https://covers.openlibrary.org/b/isbn/${String(book.isbn).trim()}-M.jpg`;
    console.log(`[useBookCover] Using ISBN for cover: ${book.title} (ISBN: ${book.isbn})`);
    const result: CoverResult = { url, source: 'openlibrary', coverId: book.isbn };
    COVER_CACHE.set(cacheKey, result);
    return result;
  }

  // 3️⃣ Try OpenLibrary by cover_id
  if (book.cover_id && Number.isFinite(book.cover_id)) {
    const url = `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`;
    console.log(`[useBookCover] Using cover_id for cover: ${book.title} (ID: ${book.cover_id})`);
    const result: CoverResult = { url, source: 'openlibrary', coverId: String(book.cover_id) };
    COVER_CACHE.set(cacheKey, result);
    return result;
  }

  // 4️⃣ Fallback: OpenLibrary search by title+author
  const author = Array.isArray(book.authors)
    ? book.authors[0] || null
    : Array.isArray(book.author)
      ? book.author[0] || null
      : typeof book.author === 'string'
        ? book.author
        : null;

  const olResult = await fetchOpenLibraryCover(book.title, author);
  COVER_CACHE.set(cacheKey, olResult);
  return olResult;
}

/**
 * Batch fetch covers for multiple books
 * Deduplicates requests, returns results in same order
 */
async function getBatchCovers(books: Book[]): Promise<(CoverResult | null)[]> {
  const bookMap = new Map<string, (Book | CoverResult)[]>();

  books.forEach((book) => {
    const key = generateCacheKey(book);
    if (!bookMap.has(key)) {
      bookMap.set(key, []);
    }

    const cached = COVER_CACHE.get(key);
    if (cached) {
      bookMap.get(key)!.push(cached);
    } else {
      bookMap.get(key)!.push(book);
    }
  });

  const uncachedBooks = Array.from(bookMap.entries())
    .filter(([_, entries]) => entries.length > 0 && !(entries[0] instanceof Object && 'source' in entries[0]))
    .map(([_, entries]) => entries[0] as Book);

  if (uncachedBooks.length > 0) {
    const results = await Promise.all(uncachedBooks.map((book) => getCover(book)));
  }

  return books.map((book) => {
    const cached = COVER_CACHE.get(generateCacheKey(book));
    return cached || null;
  });
}

/**
 * React Hook: useBookCover
 * 
 * Usage:
 * ```tsx
 * const { url, loading, error } = useBookCover(book);
 * 
 * <img 
 *   src={url ?? '/fallback-cover.png'} 
 *   alt={book.title}
 * />
 * ```
 */
export function useBookCover(book: Book | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bookSignature = useMemo(() => {
    if (!book) return 'none';
    const id = String(book.id || '').trim();
    const title = String(book.title || '').trim().toLowerCase();
    const author = toPrimaryAuthor(book).toLowerCase();
    const cover = String(book.cover_url || book.coverUrl || '').trim();
    return `${id}__${title}__${author}__${cover}`;
  }, [book?.id, book?.title, book?.author, book?.authors, book?.cover_url, book?.coverUrl]);

  useEffect(() => {
    if (!book) {
      setUrl(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getCover(book).then((result) => {
      if (!controller.signal.aborted) {
        setUrl(result.url);
      }
    }).catch((err) => {
      if (!controller.signal.aborted) {
        const message = err instanceof Error ? err.message : 'Failed to fetch cover';
        setError(message);
        setUrl(null);
      }
    }).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [bookSignature]);

  return { url, loading, error };
}

/**
 * React Hook: useBookCovers (batch)
 * 
 * Usage:
 * ```tsx
 * const covers = useBookCovers(books);
 * 
 * books.forEach((book, i) => (
 *   <img src={covers[i]?.url ?? '/fallback.png'} />
 * ))
 * ```
 */
export function useBookCovers(books: (Book | null)[] | null) {
  const [covers, setCovers] = useState<(CoverResult | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const booksSignature = useMemo(() => {
    if (!books || books.length === 0) return 'none';
    return books
      .map((book) => {
        if (!book) return 'null';
        const id = String(book.id || '').trim();
        const title = String(book.title || '').trim().toLowerCase();
        const author = toPrimaryAuthor(book).toLowerCase();
        const cover = String(book.cover_url || book.coverUrl || '').trim();
        return `${id}__${title}__${author}__${cover}`;
      })
      .join('||');
  }, [books]);

  useEffect(() => {
    if (!books || books.length === 0) {
      setCovers([]);
      setLoading(false);
      return;
    }

    const validBooks = books.filter((b) => b !== null) as Book[];
    setLoading(true);

    getBatchCovers(validBooks).then((results) => {
      setCovers(results);
      setLoading(false);
    }).catch((err) => {
      console.error('Batch cover fetch failed:', err);
      setCovers(validBooks.map(() => null));
      setLoading(false);
    });
  }, [booksSignature]);

  return { covers, loading };
}

/**
 * Standalone function: Get cover URL synchronously or as promise
 * 
 * Usage:
 * ```tsx
 * // Async
 * const cover = await getBookCoverUrl(book);
 * 
 * // Sync (from cache)
 * const cover = getCoverfromCache(book);
 * ```
 */
export async function getBookCoverUrl(book: Book): Promise<string | null> {
  const result = await getCover(book);
  return result.url;
}

export function getBookCoverFromCache(book: Book): string | null {
  const cacheKey = generateCacheKey(book);
  const cached = COVER_CACHE.get(cacheKey);

  if (cached) {
    return cached.url;
  }

  const dbCoverUrl = book.cover_url || book.coverUrl;
  if (dbCoverUrl && typeof dbCoverUrl === 'string' && dbCoverUrl.trim()) {
    return dbCoverUrl;
  }

  return null;
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
export function clearCoverCache(): void {
  COVER_CACHE.clear();
  console.log('📖 Book cover cache cleared');
}

/**
 * Get cache stats (for debugging)
 */
export function getCoverCacheStats() {
  return {
    size: COVER_CACHE.size,
    entries: Array.from(COVER_CACHE.entries()).map(([key, result]) => ({
      key,
      source: result.source,
      hasUrl: !!result.url,
    })),
  };
}
