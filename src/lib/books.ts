/**
 * lib/books.ts
 *
 * Lapisan API khusus untuk buku.
 * - Pertama coba ke BE Express (GET /books, GET /books/:id)
 * - Kalau gagal / 404 → fallback ke DUMMY_BOOKS
 * - Kalau response datanya ada tapi formatnya beda (misal dari Goodreads),
 *   kita normalize dulu ke shape BookDetail.
 */

import type { BookDetail } from '@/types/book';
import { DUMMY_BOOKS } from '@/data/dummyData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};

  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser || await new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 1500);

      const unsubscribe = auth.onAuthStateChanged((value) => {
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(value);
      });
    });
    if (!user) return {};

    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

// ── Normalize ─────────────────────────────────────────────────────────────────
function normalizeBook(raw: Record<string, unknown>): BookDetail {
  return {
    id:           String(raw.id ?? ''),
    title:        String(raw.title ?? ''),
    authors:      Array.isArray(raw.authors)
                    ? raw.authors.map(String)
                    : raw.author
                      ? [String(raw.author)]
                      : ['Unknown'],
    cover_url:    raw.cover_url != null ? String(raw.cover_url) : null,   // string | null
    genres:       Array.isArray(raw.genres)
                    ? raw.genres.map(String)
                    : typeof raw.genres === 'string'
                      ? [raw.genres]
                      : [],
    avg_rating:   Number(raw.avg_rating ?? raw.avgRating ?? 0),
    rating_count: Number(raw.rating_count ?? raw.ratingCount ?? 0),
    year:         raw.year != null ? Number(raw.year) : null,             // number | null
    pages:        raw.pages != null ? Number(raw.pages) : null,           // number | null
    available:    Number(raw.available ?? raw.availableStock ?? 0),
    total_stock:  Number(raw.total_stock ?? raw.totalStock ?? 0),
    queue:        Number(raw.queue ?? raw.queueCount ?? 0),
    description:  raw.description != null ? String(raw.description) : null, // string | null
    reviews:      Array.isArray(raw.reviews) ? (raw.reviews as BookDetail['reviews']) : [],
    // Additional fields from API
    isbn:         raw.isbn ? String(raw.isbn) : undefined,
    cover_id:     raw.cover_id ? Number(raw.cover_id) : undefined,
  } as BookDetail & { isbn?: string; cover_id?: number };
}

export interface GetBooksParams {
  search?: string;
  genre?: string;
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'avg_rating' | 'title' | 'year';
  order?: 'ASC' | 'DESC';
}

export interface BooksPaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface GetBooksResponse {
  data: BookDetail[];
  meta: BooksPaginationMeta;
}

function normalizeMeta(raw: Record<string, unknown> | undefined, fallbackLimit = 10): BooksPaginationMeta {
  const page = Number(raw?.page ?? 1) || 1;
  const limit = Number(raw?.limit ?? fallbackLimit) || fallbackLimit;
  const totalItems = Number(raw?.total_items ?? raw?.total ?? 0) || 0;
  const totalPages = Number(raw?.total_pages ?? raw?.pages ?? Math.ceil(totalItems / Math.max(limit, 1))) || 1;

  return {
    page,
    limit,
    total_items: totalItems,
    total_pages: Math.max(1, totalPages),
  };
}

async function parseBooksPayload(res: Response, fallbackLimit = 10): Promise<GetBooksResponse> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rawList = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];
  const books = rawList.map((item: Record<string, unknown>) => normalizeBook(item));
  const meta = normalizeMeta(json?.pagination, fallbackLimit);
  return { data: books, meta };
}

export async function getBooks(params: GetBooksParams = {}): Promise<GetBooksResponse> {
  const query = new URLSearchParams();
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;

  query.set('page', String(page));
  query.set('limit', String(limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.genre?.trim()) query.set('genre', params.genre.trim());
  if (params.sort) query.set('sort', params.sort);
  if (params.order) query.set('order', params.order);

  try {
    const headers = await getOptionalAuthHeader();
    const res = await fetch(`${API_URL}/books?${query.toString()}`, {
      cache: 'no-store',
      headers,
    });
    return await parseBooksPayload(res, limit);
  } catch (err) {
    console.warn('[books] getBooks gagal, pakai fallback dummy:', err);
    const dummy = Object.values(DUMMY_BOOKS);
    return {
      data: dummy.slice(0, limit),
      meta: {
        page,
        limit,
        total_items: dummy.length,
        total_pages: Math.max(1, Math.ceil(dummy.length / Math.max(limit, 1))),
      },
    };
  }
}

// ── Fetch single book by UUID ─────────────────────────────────────────────────
export async function fetchBookById(bookId: string): Promise<BookDetail | null> {
  try {
    console.log(`[Book] 🔄 Fetching book detail for: ${bookId}`);
    const headers = await getOptionalAuthHeader();
    const res = await fetch(`${API_URL}/books/${bookId}`, {
      cache: 'no-store',
      headers,
    });
    if (res.status === 404) {
      // Buku belum ada di DB → cek dummy
      console.warn(`[Book] ⚠️ Book ${bookId} not found (404)`);
      return DUMMY_BOOKS[bookId] ?? null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log(`[Book] 📊 Raw API response:`, json);
    const raw: Record<string, unknown> = json?.data ?? json;
    const normalized = normalizeBook(raw);
    console.log(`[Book] ✅ Normalized book detail:`, normalized);
    return normalized;
  } catch (err) {
    console.error(`[Book] ❌ Error fetching book ${bookId}:`, err);
    return null;
  }
}

export async function getSimilarBooks(bookId: string): Promise<BookDetail[]> {
  if (!bookId) return [];

  try {
    const headers = await getOptionalAuthHeader();
    const res = await fetch(`${API_URL}/books/${bookId}/similar`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((item: Record<string, unknown>) => normalizeBook(item));
  } catch (err) {
    console.warn(`[books] getSimilarBooks(${bookId}) gagal:`, err);
    return [];
  }
}

// ── Fetch all books (untuk /browse) ──────────────────────────────────────────
export async function fetchAllBooks(): Promise<BookDetail[]> {
  try {
    const firstPage = await getBooks({ page: 1, limit: 200 });
    const firstPageBooks = firstPage.data;
    const totalPages = firstPage.meta.total_pages;
    if (totalPages <= 1) {
      if (firstPageBooks.length === 0) {
        return Object.values(DUMMY_BOOKS);
      }
      return firstPageBooks;
    }

    const pagePromises: Promise<GetBooksResponse>[] = [];
    for (let page = 2; page <= totalPages; page += 1) {
      pagePromises.push(getBooks({ page, limit: 200 }));
    }

    const pageResults = await Promise.all(pagePromises);
    const pagedBooks = pageResults.flatMap((result) => result.data);

    const merged = [...firstPageBooks, ...pagedBooks];
    if (merged.length === 0) {
      return Object.values(DUMMY_BOOKS);
    }

    // Dedupe by id to avoid edge-case overlaps between pages.
    const uniqueMap = new Map<string, BookDetail>();
    for (const book of merged) {
      if (!book.id) continue;
      if (!uniqueMap.has(book.id)) uniqueMap.set(book.id, book);
    }

    if (uniqueMap.size === 0) {
      return Object.values(DUMMY_BOOKS);
    }

    return Array.from(uniqueMap.values());
  } catch (err) {
    console.warn('[books] fetchAllBooks gagal, pakai dummy:', err);
    return Object.values(DUMMY_BOOKS);
  }
}

// ── Fetch single book by UUID ─────────────────────────────────────────────────
export async function fetchBookById(bookId: string): Promise<BookDetail | null> {
  return getBookById(bookId);
}

// ── Search books (client-side filter dari fetchAllBooks) ──────────────────────
export async function searchBooks(query: string): Promise<BookDetail[]> {
  const all = await fetchAllBooks();
  const q = normalizeSearchText(query);
  if (!q) return all;

  const tokens = q.split(' ').filter(Boolean);

  return all
    .map((book) => ({
      book,
      score: scoreBookSearch(book, q, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.book);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const pair = a.slice(i, i + 2);
    bigrams.set(pair, (bigrams.get(pair) ?? 0) + 1);
  }

  let overlap = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const pair = b.slice(i, i + 2);
    const count = bigrams.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      bigrams.set(pair, count - 1);
    }
  }

  return (2 * overlap) / (a.length + b.length - 2);
}

function tokenMatchesField(token: string, field: string): boolean {
  if (!token || !field) return false;
  if (field.includes(token)) return true;

  const words = field.split(' ').filter(Boolean);
  if (token.length >= 4) {
    for (const word of words) {
      if (word.startsWith(token)) return true;
      if (diceCoefficient(token, word) >= 0.74) return true;
    }
  }

  return false;
}

function scoreBookSearch(book: BookDetail, query: string, tokens: string[]): number {
  const title = normalizeSearchText(book.title || '');
  const authors = normalizeSearchText((book.authors || []).join(' '));
  const genres = normalizeSearchText((book.genres || []).join(' '));
  const desc = normalizeSearchText(book.description || '');

  let score = 0;

  if (title.includes(query)) score += 120;
  if (authors.includes(query)) score += 95;
  if (genres.includes(query)) score += 75;
  if (desc.includes(query)) score += 40;

  let matchedTokens = 0;

  for (const token of tokens) {
    let tokenScore = 0;
    if (tokenMatchesField(token, title)) tokenScore = Math.max(tokenScore, 28);
    if (tokenMatchesField(token, authors)) tokenScore = Math.max(tokenScore, 22);
    if (tokenMatchesField(token, genres)) tokenScore = Math.max(tokenScore, 20);
    if (tokenMatchesField(token, desc)) tokenScore = Math.max(tokenScore, 10);

    if (tokenScore > 0) {
      matchedTokens += 1;
      score += tokenScore;
    }
  }

  if (tokens.length > 0 && matchedTokens === 0) return 0;

  if (tokens.length > 1 && matchedTokens === tokens.length) score += 24;

  return score;
}

export async function getGenres(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/books/genres`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const raw = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];

    const unique = new Map<string, string>();
    for (const item of raw) {
      const text = String(item || '').trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (!unique.has(key)) unique.set(key, text);
    }

    return Array.from(unique.values());
  } catch (err) {
    console.warn('[books] getGenres gagal:', err);
    return [];
  }
}