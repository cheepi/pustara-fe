'use client';
import { useState, useEffect } from 'react';
import { fetchTrending, type TrendingBook } from '@/lib/api';
import type { PopularBook } from '@/components/shared/PopularCarousel';
import {
  batchFetchCovers,
  getCoverFromMap,
  coverBatchCache,
  type CoverRequest,
} from '@/lib/coverBatch';

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

  useEffect(() => {
    fetchTrending(limit)
      .then(async (trending: TrendingBook[]) => {
        if (trending.length === 0) {
          setBooks([]);
          return;
        }

        const coverRequests: CoverRequest[] = trending.map((b) => ({
          title: b.title,
          authors: b.authors,
          coverUrl: b.cover_url, // Already have URL? Skip fetch
        }));

        const coverMap = await coverBatchCache.fetch(coverRequests);
        const converted: PopularBook[] = trending.map((b, i) => {
          const cover = getCoverFromMap(coverMap, b.title, b.authors);
          const coverIdRaw = cover?.coverId;
          const coverId = coverIdRaw !== null && coverIdRaw !== undefined
            ? Number(coverIdRaw)
            : undefined;
          return {
            key: b.book_id,
            title: b.title,
            author: b.authors,
            coverId: Number.isFinite(coverId) ? coverId : undefined,
            coverUrl: cover?.coverUrl || b.cover_url,
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

        setBooks(converted);
      })
      .catch(() => {
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  return { books, loading };
}