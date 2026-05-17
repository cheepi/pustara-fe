'use client';
import { useState, useEffect } from 'react';
import { fetchPopularBooks } from '@/lib/browse';
import { fetchBookById } from '@/lib/books';
import type { PopularBook } from '@/components/shared/PopularCarousel';

/**
 * Fetch buku populer dari endpoint DB-backed dan convert ke format PopularBook
 * untuk dipakai oleh PopularCarousel.
 *
 * Jika API kosong/error, return array kosong agar UI konsisten pakai data live.
 */
export function useTrendingBooks(limit = 6) {
  const [books, setBooks] = useState<PopularBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularBooks('Semua', limit)
      .then((popular) => {
        if (popular.length === 0) {
          setBooks([]);
          return;
        }

        const converted: PopularBook[] = popular.map((book, index) => ({
          key: book.key,
          title: book.title,
          author: book.author,
          coverId: book.coverId,
          coverUrl: book.coverUrl,
          genre: book.genres ?? [],
          desc: book.desc || `Populer di Pustara — rating ${book.rating?.toFixed(1) ?? '?'} / 5`,
          year: book.year ? String(book.year) : '',
          pages: book.pages,
          avgRating: book.rating,
          ratingCount: book.ratingCount,
          reviewCount: book.reviewCount,
          readerCount: book.readerCount,
          borrowCount: book.borrowCount,
          readingSessionCount: book.readingSessionCount,
          rank: index + 1,
        }));

        setBooks(converted);

        // Enrich items missing rating/review counts by fetching full book detail
        (async () => {
          try {
            const needs = converted.filter(b => (
              (b.avgRating == null || !Number.isFinite(b.avgRating) || b.avgRating === 0) ||
              (b.ratingCount == null || b.ratingCount === 0) ||
              (b.reviewCount == null || b.reviewCount === 0)
            ));

            if (needs.length === 0) return;

            const updates = await Promise.all(needs.map(async (nb) => {
              try {
                const detail = await fetchBookById(String(nb.key));
                if (!detail) return null;
                return {
                  key: nb.key,
                  avgRating: Number(detail.avg_rating ?? nb.avgRating ?? 0),
                  ratingCount: Number(detail.rating_count ?? nb.ratingCount ?? 0),
                  reviewCount: Number(detail.reviews?.length ?? nb.reviewCount ?? 0),
                };
              } catch {
                return null;
              }
            }));

            const updMap = new Map(updates.filter(Boolean).map(u => [u!.key, u] as [string, any]));
            if (updMap.size === 0) return;

            setBooks(prev => prev.map(b => {
              const u = updMap.get(b.key as string);
              if (!u) return b;
              return {
                ...b,
                avgRating: (u.avgRating ?? b.avgRating) as number,
                ratingCount: (u.ratingCount ?? b.ratingCount) as number | undefined,
                reviewCount: (u.reviewCount ?? b.reviewCount) as number | undefined,
              };
            }));
          } catch {
            // ignore enrichment errors
          }
        })();
      })
      .catch(() => {
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  return { books, loading };
}