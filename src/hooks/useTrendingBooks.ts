'use client';
import { useState, useEffect } from 'react';
import { fetchTrending, type TrendingBook } from '@/lib/api';
import type { PopularBook } from '@/components/shared/PopularCarousel';

/**
 * Fetch buku trending dari FastAPI dan convert ke format PopularBook
 * untuk dipakai oleh PopularCarousel.
 * 
 * OPTIMIZATION: Uses batch cover fetcher to avoid N+1 OpenLibrary requests.
 * All covers are fetched in parallel in a single batch.
 * 
 * Jika API kosong/error, return array kosong agar UI konsisten pakai data live.
 */
export function useTrendingBooks(limit = 6) {
  const [books, setBooks] = useState<PopularBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1️⃣ Reset state when limit changes
    setLoading(true);
    setError(null);
    setBooks([]);

    (async () => {
      try {
        // 2️⃣ Fetch trending books from API
        console.log(`[useTrendingBooks] 🔄 Fetching trending books with limit=${limit}`);
        const trending = await fetchTrending(limit);
        console.log(`[useTrendingBooks] 📊 Got ${trending.length} books from API`, trending);

        // 3️⃣ Handle empty results gracefully (still valid state)
        if (trending.length === 0) {
          console.log(`[useTrendingBooks] ⚠️ Empty trending books result`);
          setBooks([]);
          setLoading(false);
          return;
        }

        // 4️⃣ Convert to PopularBook format - generate covers from ISBN via OpenLibrary
        const converted: PopularBook[] = trending.map((b, i) => {
          // Priority for cover URL:
          // 1. cover_url from API (database direct URL)
          // 2. Generate from ISBN via OpenLibrary API
          // 3. Fallback to cover_id if exists
          
          let finalCoverUrl: string | undefined;
          let coverId: number | undefined;
          
          // Strategy 1: Use API's cover_url if it exists
          if (b.cover_url) {
            finalCoverUrl = b.cover_url;
            console.log(`[useTrendingBooks] "${b.title}": Using cover_url from API`);
          }
          // Strategy 2: Generate from ISBN via OpenLibrary
          else if (b.isbn && String(b.isbn).trim()) {
            finalCoverUrl = `https://covers.openlibrary.org/b/isbn/${String(b.isbn).trim()}-L.jpg`;
            console.log(
              `[useTrendingBooks] "${b.title}": Generated OpenLibrary URL from ISBN=${b.isbn}`
            );
          }
          // Strategy 3: Use cover_id if available
          else if (b.cover_id && Number.isFinite(b.cover_id)) {
            finalCoverUrl = `https://covers.openlibrary.org/b/id/${b.cover_id}-L.jpg`;
            coverId = b.cover_id;
            console.log(
              `[useTrendingBooks] "${b.title}": Generated OpenLibrary URL from cover_id=${b.cover_id}`
            );
          }
          
          console.log(
            `[useTrendingBooks] Book "${b.title}":`,
            { 
              'b.isbn': b.isbn,
              'b.cover_id': b.cover_id,
              'b.cover_url': b.cover_url,
              finalCoverUrl,
            }
          );

          return {
            key: b.book_id,
            title: b.title,
            author: b.authors,
            coverId,
            coverUrl: finalCoverUrl,
            genre: b.genres ?? [],
            desc:
              b.description ||
              b.reason_primary ||
              `Trending di Pustara — rating ${b.avg_rating?.toFixed(1) ?? '?'}/5`,
            year: b.year || '',
            pages: b.pages || 0,
            avgRating: b.avg_rating,
            rank: i + 1,
          };
        });

        console.log(`[useTrendingBooks] ✅ Successfully converted ${converted.length} books to PopularBook format`);
        setBooks(converted);
        setLoading(false);

      } catch (err) {
        // 6️⃣ Error handling with detailed logging
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[useTrendingBooks] ❌ Error fetching trending books:`, {
          limit,
          error: errorMsg,
          fullError: err,
        });
        setError(errorMsg);
        setBooks([]);
        setLoading(false);
      }
    })();
  }, [limit]);

  return { books, loading, error };
}