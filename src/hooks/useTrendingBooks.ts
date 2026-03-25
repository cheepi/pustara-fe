'use client';
import { useState, useEffect } from 'react';
import { fetchTrending, fetchOpenLibraryCoverId, type TrendingBook } from '@/lib/api';
import type { PopularBook } from '@/components/shared/PopularCarousel';

/**
 * Fetch buku trending dari FastAPI dan convert ke format PopularBook
 * untuk dipakai oleh PopularCarousel.
 * Jika API kosong/error, return array kosong agar UI konsisten pakai data live.
 */
export function useTrendingBooks(limit = 6) {
  const [books, setBooks]   = useState<PopularBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending(limit)
      .then(async (trending: TrendingBook[]) => {
        if (trending.length === 0) {
          setBooks([]);
          return;
        }

        // Convert TrendingBook → PopularBook
        // Resolve cover dari OpenLibrary kalau tidak ada cover_url
        const converted: PopularBook[] = await Promise.all(
          trending.map(async (b, i) => {
            let coverId: number | undefined;
            let coverUrl: string | undefined;

            if (b.cover_url) {
              coverUrl = b.cover_url;
            } else {
              const olId = await fetchOpenLibraryCoverId(b.title, b.authors).catch(() => null);
              if (olId) coverId = Number(olId);
            }

            return {
              key:      b.book_id,
              title:    b.title,
              author:   b.authors,
              coverId,
              coverUrl: b.cover_url || coverUrl,
              genre:    b.genres ?? [],
              desc:     b.description || b.reason_primary || `Trending di Pustara — rating ${b.avg_rating?.toFixed(1) ?? '?'}/5`,
              year:     b.year || '',
              pages:    b.pages || 0,
              avgRating: b.avg_rating,
              rank:     i + 1,
            };
          })
        );

        setBooks(converted);
      })
      .catch(() => {
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  return { books, loading };
}