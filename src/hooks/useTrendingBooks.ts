'use client';
import { useState, useEffect } from 'react';
import { fetchTrending, type TrendingBook } from '@/lib/api';
import { getBookById } from '@/lib/books';
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

        const toPositiveInt = (value: unknown): number | undefined => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed)) return undefined;
          const normalized = Math.round(parsed);
          return normalized > 0 ? normalized : undefined;
        };

        const toYearText = (value: unknown): string | undefined => {
          if (value === null || value === undefined) return undefined;
          const text = String(value).trim();
          if (!text || text === '0') return undefined;
          return text;
        };

        const missingMetaIds = trending
          .filter((b) => !toYearText(b.year) || !toPositiveInt(b.pages))
          .map((b) => String(b.book_id));

        const fallbackById = new Map<string, { year?: string; pages?: number }>();
        if (missingMetaIds.length > 0) {
          const fallbackRows = await Promise.all(
            missingMetaIds.map(async (id) => {
              try {
                const detail = await getBookById(id);
                return [id, {
                  year: toYearText(detail?.year),
                  pages: toPositiveInt(detail?.pages ?? detail?.total_pages),
                }] as const;
              } catch {
                return [id, {}] as const;
              }
            })
          );

          for (const [id, meta] of fallbackRows) {
            fallbackById.set(id, meta);
          }
        }

        const converted: PopularBook[] = trending.map((b, i) => {
          const cover = getCoverFromMap(coverMap, b.title, b.authors);
          const coverIdRaw = cover?.coverId;
          const coverId = coverIdRaw !== null && coverIdRaw !== undefined
            ? Number(coverIdRaw)
            : undefined;
          const fallbackMeta = fallbackById.get(String(b.book_id));
          const resolvedYear = toYearText(b.year) || fallbackMeta?.year || '';
          const resolvedPages = toPositiveInt(b.pages) || fallbackMeta?.pages;

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
            year: resolvedYear,
            pages: resolvedPages,
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