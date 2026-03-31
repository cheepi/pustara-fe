import type { ShelfData } from '@/types/shelf';
import { formatDateID, formatRelativeTime } from '@/lib/reading';
import { apiDelete, apiGet, apiPost } from '@/lib/api';

const EMPTY_SHELF_DATA: ShelfData = {
  pinjaman: [],
  dibaca: [],
  wishlist: [],
  riwayat: [],
};

const SHELF_MEMORY_CACHE_TTL_MS = 30_000;
let shelfMemoryCache: { data: ShelfData; fetchedAt: number } | null = null;
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
  session_id: string;
  finished_at: string | null;
  started_at: string | null;
  reading_time_minutes: number;
  days_read: number | null;
}

interface BackendWishlist extends BackendBook {
  wishlist_id: string;
  added_at: string | null;
}

interface BackendShelfResponse {
  pinjaman: BackendPinjaman[];
  dibaca: BackendDibaca[];
  riwayat: BackendRiwayat[];
  wishlist: BackendWishlist[];
}

interface ShelfBookStatusResponse {
  borrowed: boolean;
  wishlisted: boolean;
  loan_id?: string | null;
  wishlist_id?: string | null;
}

interface ShelfActionResponse {
  borrowed?: boolean;
  wishlisted?: boolean;
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

    const dibaca = response.dibaca
      .map((session) => {
        const progress = Math.max(0, Math.min(100, Math.round(Number(session.progress_percentage ?? 0))));
        return {
          key: session.id,
          title: session.title,
          author: Array.isArray(session.authors) ? session.authors.join(', ') : String(session.authors),
          coverUrl: session.cover_url,
          genre: 'Sedang dibaca',
          progress,
          lastRead: formatRelativeTime(session.last_read_at || session.started_at || undefined),
          totalPages: Number(session.total_pages ?? 0),
          currentPage: Number(session.current_page ?? 0),
        };
      })
      .filter((session) => session.progress > 0);

    const pinjaman = response.pinjaman.map((loan) => ({
      key: loan.id,
      title: loan.title,
      author: Array.isArray(loan.authors) ? loan.authors.join(', ') : String(loan.authors),
      coverUrl: loan.cover_url,
      genre: 'Pinjaman aktif',
      borrowedAt: formatDateID(loan.borrowed_at || undefined),
      dueDate: formatDateID(loan.due_date || undefined),
      daysLeft: loan.days_left ?? 0,
      progress: 0,
    }));

    const riwayat = response.riwayat.map((session) => ({
      key: session.id,
      title: session.title,
      author: Array.isArray(session.authors) ? session.authors.join(', ') : String(session.authors),
      coverUrl: session.cover_url,
      genre: 'Selesai',
      returnedAt: formatDateID(session.finished_at || undefined),
      readDays: session.days_read ?? 1,
      userRating: undefined,
    }));

    const wishlist = response.wishlist.map((book) => ({
      key: book.id,
      title: book.title,
      author: Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors),
      coverUrl: book.cover_url || undefined,
      genre: normalizeGenre(book.genres),
      addedAt: formatDateID(book.added_at ?? undefined),
      available: true,
      rating: Number(book.avg_rating ?? 0),
    }));

    const nextData: ShelfData = {
      pinjaman,
      dibaca,
      wishlist,
      riwayat,
      stats: {
        total_borrowed: pinjaman.length,
        total_reading: dibaca.length,
        total_wishlist: wishlist.length,
        total_read: riwayat.length,
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
  if (!bookId) return { borrowed: false, wishlisted: false };

  const paths = [
    `/shelf/me/status/${bookId}`,
    `/api/shelf/me/status/${bookId}`,
  ];

  try {
    const data = await tryApiGetWithFallback<ShelfBookStatusResponse>(paths);
    return {
      borrowed: Boolean(data?.borrowed),
      wishlisted: Boolean(data?.wishlisted),
      loan_id: data?.loan_id ?? null,
      wishlist_id: data?.wishlist_id ?? null,
    };
  } catch {
    return { borrowed: false, wishlisted: false };
  }
}

export async function borrowBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const paths = [
    `/shelf/me/borrow/${bookId}`,
    `/api/shelf/me/borrow/${bookId}`,
  ];
  const data = await tryApiPostWithFallback<ShelfActionResponse>(paths);
  return { borrowed: Boolean(data?.borrowed ?? true) };
}

export async function returnBorrowedBookForMe(bookId: string): Promise<ShelfActionResponse> {
  const paths = [
    `/shelf/me/return/${bookId}`,
    `/api/shelf/me/return/${bookId}`,
  ];
  const data = await tryApiPostWithFallback<ShelfActionResponse>(paths);
  return { borrowed: Boolean(data?.borrowed ?? false) };
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
