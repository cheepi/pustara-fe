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
    cover_url:    String(raw.cover_url ?? raw.coverUrl ?? ''),
    genres:       Array.isArray(raw.genres)
                    ? raw.genres.map(String)
                    : typeof raw.genres === 'string'
                      ? [raw.genres]
                      : [],
    avg_rating:   Number(raw.avg_rating ?? raw.avgRating ?? 0),
    rating_count: Number(raw.rating_count ?? raw.ratingCount ?? 0),
    year:         Number(raw.year ?? raw.publishedYear ?? 0),
    pages:        Number(raw.pages ?? 0),
    available:    Number(raw.available ?? raw.availableStock ?? 0),
    total_stock:  Number(raw.total_stock ?? raw.totalStock ?? 0),
    queue:        Number(raw.queue ?? raw.queueCount ?? 0),
    description:  String(raw.description ?? raw.synopsis ?? ''),
    reviews:      Array.isArray(raw.reviews) ? (raw.reviews as BookDetail['reviews']) : [],
    // Additional fields from API
    isbn:         raw.isbn ? String(raw.isbn) : undefined,
    cover_id:     raw.cover_id ? Number(raw.cover_id) : undefined,
  } as BookDetail & { isbn?: string; cover_id?: number };
}

// ── Fetch all books (untuk /browse) ──────────────────────────────────────────
export async function fetchAllBooks(): Promise<BookDetail[]> {
  try {
    const res = await fetch(`${API_URL}/books`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    // BE Express return: { success: true, data: [...] }
    const raw: unknown[] = json?.data ?? json;

    if (!Array.isArray(raw) || raw.length === 0) {
      // DB ada tapi kosong → pakai dummy sebagai seed
      return Object.values(DUMMY_BOOKS);
    }

    return (raw as Record<string, unknown>[]).map(normalizeBook);
  } catch (err) {
    console.warn('[books] fetchAllBooks gagal, pakai dummy:', err);
    return Object.values(DUMMY_BOOKS);
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

// ── Search books (client-side filter dari fetchAllBooks) ──────────────────────
export async function searchBooks(query: string): Promise<BookDetail[]> {
  const all = await fetchAllBooks();
  const q = query.toLowerCase().trim();
  if (!q) return all;

  return all.filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.authors.some(a => a.toLowerCase().includes(q)) ||
    b.genres.some(g => g.toLowerCase().includes(q)) ||
    b.description.toLowerCase().includes(q)
  );
}