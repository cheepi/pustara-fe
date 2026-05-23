import type { ShelfData } from '@/types/shelf';
import { formatDateID, formatRelativeTime } from '@/lib/reading';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { auth } from './firebase';

const EMPTY_SHELF_DATA: ShelfData = {
  pinjaman: [],
  dibaca: [],
  wishlist: [],
  riwayat: [],
};

const SHELF_MEMORY_CACHE_TTL_MS = 30_000;
let shelfMemoryCache: { data: ShelfData; fetchedAt: number } | null = null;

export function invalidateShelfCache(): void {
  shelfMemoryCache = null;
}

let shelfInFlight: Promise<ShelfData> | null = null;

function normalizeGenre(input: unknown): string {
  if (Array.isArray(input) && input.length > 0) return String(input[0]);
  if (typeof input === 'string' && input.trim()) return input.trim();
  return 'Umum';
}

interface BackendBook {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
  cover_url: string;
  avg_rating: number;
  year: number;
  pages: number;
}

interface BackendPinjaman extends BackendBook {
  loan_id: string;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  days_left: number | null;
  progress_percentage?: number;
}

interface BackendDibaca extends BackendBook {
  session_id: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  last_read_at: string | null;
  started_at: string | null;
}

interface BackendRiwayat extends BackendBook {
  loan_id: string | null;
  session_id: string | null;
  borrowed_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  finished_at: string | null;
  started_at: string | null;
  reading_time_minutes: number;
  progress_percentage: number;
  current_page: number;
  total_pages: number;
  days_read: number | null;
  status: 'finished' | 'unfinished' | 'overdue';
}

interface BackendWishlist extends BackendBook {
  wishlist_id: string;
  added_at: string | null;
  available?: number;
  total_stock?: number;
}

interface BackendShelfResponse {
  pinjaman: BackendPinjaman[];
  dibaca: BackendDibaca[];
  riwayat: BackendRiwayat[];
  wishlist: BackendWishlist[];
  stats?: {
    total_borrowed?: number;
    total_reading?: number;
    total_wishlist?: number;
    total_read?: number;
    total_overdue?: number;
  };
}

interface ShelfBookStatusResponse {
  borrowed: boolean;
  wishlisted: boolean;
  queued?: boolean;
  queue_position?: number | null;
  queue_count?: number;
  loan_id?: string | null;
  wishlist_id?: string | null;
}

interface ShelfActionResponse {
  borrowed?: boolean;
  wishlisted?: boolean;
  queued?: boolean;
  queue_position?: number | null;
  queue_count?: number;
}

async function tryApiGetWithFallback<T>(paths: string[]): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await apiGet<T>(path);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('API error: 404')) {
        throw error;
      }
    }
  }
  throw lastError || new Error('No valid endpoint found');
}

async function tryApiPostWithFallback<T>(paths: string[]): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await apiPost<T>(path, {});
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('API error: 404')) {
        throw error;
      }
    }
  }
  throw lastError || new Error('No valid endpoint found');
}

async function tryApiDeleteWithFallback<T>(paths: string[]): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await apiDelete<T>(path);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('API error: 404')) {
        throw error;
      }
    }
  }
  throw lastError || new Error('No valid endpoint found');
}

export async function fetchShelfData(options?: { force?: boolean }): Promise<ShelfData> {
  const force = Boolean(options?.force);
  if (!force && shelfMemoryCache && Date.now() - shelfMemoryCache.fetchedAt < SHELF_MEMORY_CACHE_TTL_MS) {
    return shelfMemoryCache.data;
  }

  if (!force && shelfInFlight) {
    return shelfInFlight;
  }

  const candidatePaths = ['/shelf/me', '/api/shelf/me', '/users/me/shelf'];

  shelfInFlight = (async () => {
    try {
      let response: BackendShelfResponse | null = null;
      let lastError: unknown = null;

      for (const path of candidatePaths) {
        try {
          response = await apiGet<BackendShelfResponse>(path);
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const isNotFound = message.includes('API error: 404');
          if (!isNotFound) {
            throw error;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('Shelf endpoint not found');
      }

      // Some backends wrap payload in { success, data } — normalize that
      // @ts-ignore
      if (response && typeof response === 'object' && 'data' in response && response.data) {
        // @ts-ignore
        response = response.data as BackendShelfResponse;
      }

      const dibaca = response.dibaca
        .map((session) => {
          const rawProgress = Number(session.progress_percentage ?? 0);
          const currentPage = Number(session.current_page ?? 0);
          const totalPages = Number(session.total_pages ?? 0);
          // Fallback: if backend stored 0% but we have page data, compute it ourselves
          const computedProgress = rawProgress === 0 && currentPage > 0 && totalPages > 0
            ? Math.round((currentPage / totalPages) * 100)
            : rawProgress;
          const progress = Math.max(0, Math.min(100, Math.round(computedProgress)));
          return {
            key: session.id,
            title: session.title,
            author: Array.isArray(session.authors) ? session.authors.join(', ') : String(session.authors),
            coverUrl: session.cover_url,
            genre: 'Sedang dibaca',
            progress,
            lastRead: formatRelativeTime(session.last_read_at || session.started_at || undefined),
            totalPages,
            currentPage,
          };
        })
        .filter((session) => session.currentPage > 1 || session.progress > 0);

      const pinjaman = response.pinjaman.map((loan) => ({
        key: loan.id,
        title: loan.title,
        author: Array.isArray(loan.authors) ? loan.authors.join(', ') : String(loan.authors),
        coverUrl: loan.cover_url,
        genre: 'Pinjaman aktif',
        borrowedAt: formatDateID(loan.borrowed_at || undefined),
        dueDate: formatDateID(loan.due_date || undefined),
        daysLeft: loan.days_left ?? 0,
        progress: Math.round(Number(loan.progress_percentage ?? 0)),  // ← pakai dari backend
      }));

      const riwayat = response.riwayat.map((session, index) => {
        // IMPORTANT: history links must point to /book/:bookId, not loan/session ids.
        const historyKey = String(session.id || '').trim() || `${session.id}-${index}`;
        const historyStatus = session.status || 'finished';
        const returnedAt = session.returned_at || session.finished_at || undefined;

        return {
          key: historyKey,
          title: session.title,
          author: Array.isArray(session.authors) ? session.authors.join(', ') : String(session.authors),
          coverUrl: session.cover_url,
          genre: historyStatus === 'overdue' ? 'Terlambat' : historyStatus === 'unfinished' ? 'Belum selesai' : 'Selesai',
          returnedAt: formatDateID(returnedAt),
          readDays: session.days_read ?? 1,
          userRating: undefined,
          status: historyStatus,
        };
      });

      const wishlist = response.wishlist.map((book) => ({
        key: book.id,
        title: book.title,
        author: Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors),
        coverUrl: book.cover_url || undefined,
        genre: normalizeGenre(book.genres),
        addedAt: formatDateID(book.added_at ?? undefined),
        available: Number(book.available ?? 0) > 0,
        total_stock: Number(book.total_stock ?? 0),
        rating: Number(book.avg_rating ?? 0),
      }));

      const nextData: ShelfData = {
        pinjaman,
        dibaca,
        wishlist,
        riwayat,
        stats: {
          total_borrowed: Number(response.stats?.total_borrowed ?? pinjaman.length),
          total_reading: Number(response.stats?.total_reading ?? dibaca.length),
          total_wishlist: Number(response.stats?.total_wishlist ?? wishlist.length),
          total_read: Number(response.stats?.total_read ?? riwayat.length),
          total_overdue: Number(response.stats?.total_overdue ?? riwayat.filter((book) => book.status === 'overdue').length),
        },
      };
      shelfMemoryCache = { data: nextData, fetchedAt: Date.now() };
      return nextData;
    } catch (error) {
      console.warn('Error fetching shelf data:', error);
      return EMPTY_SHELF_DATA;
    } finally {
      shelfInFlight = null;
    }
  })();

  return shelfInFlight;
}

export async function fetchMyBookShelfStatus(bookId: string): Promise<ShelfBookStatusResponse> {
  if (!bookId) return { borrowed: false, wishlisted: false, queued: false, queue_position: null, queue_count: 0 };

  const paths = [
    `/shelf/me/status/${bookId}`,
    `/api/shelf/me/status/${bookId}`,
  ];

  try {
    const data = await tryApiGetWithFallback<ShelfBookStatusResponse>(paths);
    return {
      borrowed: Boolean(data?.borrowed),
      wishlisted: Boolean(data?.wishlisted),
      queued: Boolean(data?.queued),
      queue_position: data?.queue_position ?? null,
      queue_count: Number(data?.queue_count ?? 0),
      loan_id: data?.loan_id ?? null,
      wishlist_id: data?.wishlist_id ?? null,
    };
  } catch {
    return { borrowed: false, wishlisted: false, queued: false, queue_position: null, queue_count: 0 };
  }
}

/**
 * Borrow one book for current user.
 * Throws on auth/backend errors so caller can show the correct UI state.
 */
export async function borrowBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('HTTP 401: Missing auth token');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Ensure user row exists/synced in backend before hitting shelf endpoints.
  await fetch('/api/auth/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {
    // Best effort sync only. Borrow endpoint still returns authoritative status.
  });

  const response = await fetch(`${apiUrl}/shelf/me/borrow/${bookId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || 'Borrow request failed');
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  const borrowed = Boolean(payload?.data?.borrowed ?? payload?.borrowed ?? true);
  return { borrowed };
}

export async function returnBorrowedBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const paths = [
    `/shelf/me/return/${bookId}`,
    `/api/shelf/me/return/${bookId}`,
  ];
  const data = await tryApiPostWithFallback<ShelfActionResponse>(paths);
  return { borrowed: Boolean(data?.borrowed ?? false) };
}

export async function joinQueueForMe(bookId: string): Promise<ShelfActionResponse> {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('HTTP 401: Missing auth token');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  await fetch('/api/auth/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {
    // Best effort sync only. Queue endpoint remains authoritative.
  });

  const response = await fetch(`${apiUrl}/shelf/me/queue/${bookId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || 'Queue request failed');
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  const data = (payload?.data ?? payload) as ShelfActionResponse;
  return {
    queued: Boolean(data?.queued ?? true),
    queue_position: data?.queue_position ?? null,
    queue_count: Number(data?.queue_count ?? 0),
  };
}

export async function saveBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const paths = [
    `/shelf/me/wishlist/${bookId}`,
    `/api/shelf/me/wishlist/${bookId}`,
  ];
  const data = await tryApiPostWithFallback<ShelfActionResponse>(paths);
  return { wishlisted: Boolean(data?.wishlisted ?? true) };
}

export async function removeSavedBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const paths = [
    `/shelf/me/wishlist/${bookId}`,
    `/api/shelf/me/wishlist/${bookId}`,
  ];
  const data = await tryApiDeleteWithFallback<ShelfActionResponse>(paths);
  return { wishlisted: Boolean(data?.wishlisted ?? false) };
}
