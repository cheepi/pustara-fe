'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBooks, getGenres } from '@/lib/books';
import type { BrowseBook } from '@/types/browse';

export type GenreShelf = {
  id: string;
  label: string;
  books: BrowseBook[];
};

type UseGenreShelvesParams = {
  limit?: number;
  booksLimit?: number;
  targetGenres?: string[];
};

type UseGenreShelvesResult = {
  shelves: GenreShelf[];
  loading: boolean;
  error: string | null;
};

function normalizeCategoryId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapToBrowseBook(book: Record<string, unknown>): BrowseBook {
  const authors = Array.isArray(book.authors)
    ? book.authors.map(String).join(', ')
    : String(book.author ?? book.authors ?? 'Unknown');
  const availableRaw = Number(book.available ?? book.available_count ?? NaN);
  const totalStockRaw = Number(book.total_stock ?? book.totalStock ?? NaN);
  const hasAvailable = Number.isFinite(availableRaw);
  const hasStock = Number.isFinite(totalStockRaw);

  return {
    key: String(book.id ?? ''),
    title: String(book.title ?? ''),
    author: authors,
    coverUrl: String(book.cover_url ?? ''),
    available: hasAvailable ? availableRaw > 0 : true,
    availableCount: hasAvailable ? availableRaw : undefined,
    totalStock: hasStock ? totalStockRaw : undefined,
    genres: Array.isArray(book.genres) ? book.genres.map(String) : [],
    rating: Number(book.avg_rating ?? 0),
    year: Number(book.year ?? 0) || undefined,
    pages: Number(book.pages ?? 0) || undefined,
    desc: String(book.description ?? ''),
  };
}

export function useGenreShelves({
  limit = 4,
  booksLimit = 8,
  targetGenres = [],
}: UseGenreShelvesParams = {}): UseGenreShelvesResult {
  const [shelves, setShelves] = useState<GenreShelf[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetGenresKey = useMemo(() => {
    return targetGenres
      .map((genre) => String(genre || '').trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join('|');
  }, [targetGenres]);

  useEffect(() => {
    let active = true;

    async function loadShelves() {
      setLoading(true);
      setError(null);

      try {
        const allGenres = await getGenres();
        const targetSet = new Set(targetGenresKey ? targetGenresKey.split('|') : []);
        
        let selectedGenres: string[];

        if (targetSet.size > 0) {
          selectedGenres = allGenres.filter((g) => targetSet.has(String(g || '').trim().toLowerCase()));
        } else {
          selectedGenres = allGenres
            .map((label) => String(label || '').trim())
            .filter(Boolean)
            .slice(0, Math.max(1, limit));
        }

        const results = await Promise.all(
          selectedGenres.map(async (label) => {
            const res = await getBooks({
              genre: label,
              page: 1,
              limit: Math.max(1, booksLimit),
            });

            return {
              id: normalizeCategoryId(label),
              label,
              books: res.data.map((item) => mapToBrowseBook(item as unknown as Record<string, unknown>)),
            } as GenreShelf;
          })
        );

        if (!active) return;
        setShelves(results.filter((shelf) => shelf.books.length > 0));
      } catch (err) {
        if (!active) return;
        setShelves([]);
        setError(err instanceof Error ? err.message : 'Gagal memuat kurasi genre.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    loadShelves();

    return () => {
      active = false;
    };
  }, [limit, booksLimit, targetGenresKey]);

  return { shelves, loading, error };
}
