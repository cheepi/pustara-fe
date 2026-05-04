import { fetchAllBooks } from '@/lib/books';
import { TOP3_PUSTAKREW } from '@/data/dummyData';
import type { BrowseBook } from '@/types/browse';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CACHE: Record<string, BrowseBook[]> = {};

const CATEGORY_ALIASES: Record<string, string[]> = {
  fiksi: ['fiksi', 'fiction', 'novel'],
  sejarah: ['sejarah', 'history', 'historical'],
  sains: ['sains', 'science', 'ilmiah'],
  sastra: ['sastra', 'literature', 'literary', 'classic', 'klasik'],
  biografi: ['biografi', 'biography', 'memoir'],
  romance: ['romance', 'romansa', 'cinta'],
  misteri: ['misteri', 'mystery', 'thriller', 'crime', 'detektif'],
  teknologi: ['teknologi', 'technology', 'tech', 'computer', 'programming'],
};

function normalizeToken(value: string): string {
  return value.toLowerCase().trim();
}

function getCategoryTokens(subject: string): string[] {
  const raw = normalizeToken(subject);
  const tokens = CATEGORY_ALIASES[raw] ?? [raw];
  return Array.from(new Set(tokens.map(normalizeToken)));
}

function includesAnyToken(text: string, tokens: string[]): boolean {
  const normalized = normalizeToken(text);
  return tokens.some((token) => normalized.includes(token));
}

function mapToBrowseBook(raw: Record<string, unknown>): BrowseBook {
  const authors = Array.isArray(raw.authors) ? raw.authors.map(String).join(', ') : String(raw.author ?? raw.authors ?? 'Unknown');
  return {
    key: String(raw.id ?? raw.key ?? ''),
    title: String(raw.title ?? ''),
    author: authors,
    coverUrl: String(raw.cover_url ?? raw.coverUrl ?? ''),
    genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    rating: Number(raw.avg_rating ?? raw.rating ?? 0),
    year: Number(raw.year ?? 0) || undefined,
    pages: Number(raw.pages ?? 0) || undefined,
    desc: String(raw.description ?? raw.desc ?? ''),
    coverId: Number(raw.cover_i ?? raw.coverId ?? 0) || undefined,
  };
}

export async function fetchBrowseBooks(query: string, limit = 24): Promise<BrowseBook[]> {
  const key = `${query}_${limit}`;
  if (CACHE[key]) return CACHE[key];

  try {
    const allBooks = await fetchAllBooks();
    let formattedBooks: BrowseBook[] = allBooks.map((b) => ({
      key: b.id,
      title: b.title,
      author: b.authors?.join(', ') || 'Unknown',
      coverUrl: b.cover_url || undefined,
      genres: b.genres || [],
      rating: b.avg_rating || 0,
      year: b.year,
      pages: b.pages,
      desc: b.description,
    }));

    if (query) {
      const q = query.toLowerCase().trim();
      if (q.startsWith('subject:')) {
        const subject = q.replace('subject:', '').trim();
        const tokens = getCategoryTokens(subject);
        const byGenre = formattedBooks.filter((b) =>
          (b.genres ?? []).some((g) => includesAnyToken(g, tokens))
        );

        // Fallback: beberapa data tidak punya genre lengkap, jadi cek judul/author/deskripsi.
        formattedBooks = byGenre.length > 0
          ? byGenre
          : formattedBooks.filter((b) =>
              includesAnyToken(b.title, tokens) ||
              includesAnyToken(b.author, tokens) ||
              includesAnyToken(b.desc ?? '', tokens)
            );
      } else {
        formattedBooks = formattedBooks.filter((b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genres?.some((g) => g.toLowerCase().includes(q)) ||
          (b.desc ?? '').toLowerCase().includes(q)
        );
      }
    }

    const finalBooks = formattedBooks.slice(0, limit);
    CACHE[key] = finalBooks;
    return finalBooks;
  } catch {
    CACHE[key] = [];
    return [];
  }
}

export async function fetchPopularBooks(genre: string, limit = 40): Promise<BrowseBook[]> {
  const cacheKey = `popular_${genre}_${limit}`;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  try {
    const allBooks = await fetchAllBooks();
    const normalizedGenre = genre.toLowerCase();
    const filtered = genre === 'Semua'
      ? allBooks
      : allBooks.filter((b) => b.genres.some((g) => g.toLowerCase().includes(normalizedGenre)));

    const sorted = [...filtered].sort((a, b) => {
      const scoreA = a.avg_rating * Math.max(a.rating_count, 1);
      const scoreB = b.avg_rating * Math.max(b.rating_count, 1);
      return scoreB - scoreA;
    });

    const mapped = sorted.slice(0, limit).map((b) => ({
      key: b.id,
      title: b.title,
      author: b.authors.join(', '),
      coverUrl: b.cover_url,
      rating: b.avg_rating,
    }));

    if (mapped.length > 0) {
      CACHE[cacheKey] = mapped;
      return mapped;
    }
  } catch {
    // continue to OpenLibrary fallback
  }

  try {
    const q = genre === 'Semua' ? 'subject:fiction&sort=rating' : `subject:${genre.toLowerCase()}&sort=rating`;
    const res = await fetch(`https://openlibrary.org/search.json?${q}&limit=${limit}&fields=key,title,author_name,cover_i`);
    if (!res.ok) throw new Error('OpenLibrary failed');

    const data = await res.json();
    const books = (data.docs || []).map((item: Record<string, unknown>) => mapToBrowseBook(item)).filter((b: BrowseBook) => b.key && b.title);
    CACHE[cacheKey] = books;
    return books;
  } catch {
    CACHE[cacheKey] = [];
    return [];
  }
}

export async function fetchTopPustakrew(limit = 3): Promise<BrowseBook[]> {
  const cacheKey = `top_pustakrew_${limit}`;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const endpoints = ['/books/trending', '/recommendations/trending'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_URL}${endpoint}?limit=${limit}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      if (list.length > 0) {
        const mapped = list.map((item: Record<string, unknown>) => mapToBrowseBook(item)).slice(0, limit);
        CACHE[cacheKey] = mapped;
        return mapped;
      }
    } catch {
      // try next endpoint
    }
  }

  const fallback = TOP3_PUSTAKREW.slice(0, limit).map((b) => ({
    key: b.key,
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl,
    genres: b.genres,
    rating: b.rating,
    year: b.year,
    pages: b.pages,
    desc: b.desc,
  }));

  CACHE[cacheKey] = fallback;
  return fallback;
}

// ── GENRE API FUNCTIONS ────────────────────────────────────────────────────────
/**
 * Fetch available genres from backend API
 */
export async function fetchGenres(): Promise<string[]> {
  const cacheKey = 'genres_list';
  if (CACHE[cacheKey]) {
    const cachedData = CACHE[cacheKey];
    if (Array.isArray(cachedData) && cachedData.length > 0) {
      return cachedData.map(b => b.title); // Reuse cache structure
    }
  }

  try {
    const res = await fetch(`${API_URL}/genres`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    const genres = Array.isArray(json?.data) ? json.data : [];
    
    if (genres.length > 0) {
      // Cache as dummy BrowseBooks to reuse existing cache
      const cached = genres.map((g: string) => ({ ...({} as BrowseBook), title: g }));
      CACHE[cacheKey] = cached;
      return genres;
    }
  } catch (err) {
    console.warn('[browse] fetchGenres failed:', err);
  }
  
  // Fallback to predefined genres
  return [
    'Fiksi', 'Sastra', 'Sejarah', 'Sains', 'Biografi', 'Romansa', 
    'Misteri', 'Teknologi', 'Pendidikan', 'Filsafat', 'Psikologi', 'Seni'
  ];
}

/**
 * Fetch books filtered by genre from backend API
 */
export async function fetchBooksByGenre(genre: string, limit = 24): Promise<BrowseBook[]> {
  const cacheKey = `genre_${genre}_${limit}`;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  try {
    const params = new URLSearchParams({ genre, limit: String(limit) });
    const res = await fetch(`${API_URL}/books?${params}`, { cache: 'no-store' });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    const books = Array.isArray(json?.data) ? json.data : [];
    
    const mapped = books.map((b: Record<string, unknown>) => mapToBrowseBook(b));
    CACHE[cacheKey] = mapped;
    return mapped;
  } catch (err) {
    console.warn(`[browse] fetchBooksByGenre('${genre}') failed:`, err);
    
    // Fallback to local filtering
    try {
      const allBooks = await fetchAllBooks();
      const filtered = allBooks.filter(b => 
        b.genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
      );
      
      const mapped = filtered.slice(0, limit).map(b => ({
        key: b.id,
        title: b.title,
        author: b.authors?.join(', ') || 'Unknown',
        coverUrl: b.cover_url || undefined,
        genres: b.genres || [],
        rating: b.avg_rating || 0,
        year: b.year,
        pages: b.pages,
        desc: b.description,
      }));
      
      CACHE[cacheKey] = mapped;
      return mapped;
    } catch {
      CACHE[cacheKey] = [];
      return [];
    }
  }
}
