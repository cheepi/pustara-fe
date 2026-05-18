import { fetchAllBooks, fetchBookById } from '@/lib/books';
import { TOP3_PUSTAKREW } from '@/data/dummyData';
import type { BrowseBook } from '@/types/browse';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CACHE: Record<string, BrowseBook[]> = {};
const GENRE_CACHE: { value: string[] | null } = { value: null };

const CATEGORY_ALIASES: Record<string, string[]> = {
  fiksi: ['fiksi', 'fiction', 'novel'],
  'fiksi ilmiah': ['fiksi ilmiah', 'sci-fi', 'science fiction', 'sf', 'scifi'],
  fantasi: ['fantasi', 'fantasy', 'magic', 'magical'],
  misteri: ['misteri', 'mystery', 'thriller', 'crime', 'detektif'],
  horor: ['horor', 'horror', 'ghost', 'gothic'],
  thriller: ['thriller', 'tegang', 'suspense'],
  petualangan: ['petualangan', 'adventure', 'journey'],
  sejarah: ['sejarah', 'history', 'historical'],
  sains: ['sains', 'science', 'ilmiah'],
  sastra: ['sastra', 'literature', 'literary', 'classic', 'klasik'],
  biografi: ['biografi', 'biography', 'memoir'],
  romance: ['romance', 'romansa', 'cinta'],
  romansa: ['romansa', 'romance', 'cinta'],
  nonfiksi: ['nonfiksi', 'non-fiksi', 'non fiction', 'nonfiction', 'informasi'],
  'self-help': ['self-help', 'self help', 'motivasi', 'pengembangan diri'],
  psikologi: ['psikologi', 'psychology', 'mental', 'mindset'],
  filsafat: ['filsafat', 'philosophy', 'pemikiran', 'renungan'],
  anak: ['anak', 'children', 'kids', 'juvenile'],
  'teenlit': ['teenlit', 'young adult', 'ya', 'remaja'],
  pendidikan: ['pendidikan', 'education', 'school', 'pelajaran'],
  humor: ['humor', 'comedy', 'lucu', 'satire'],
  teknologi: ['teknologi', 'technology', 'tech', 'computer', 'programming'],
};

const OPENLIBRARY_SUBJECT_ALIASES: Record<string, string> = {
  fiksi: 'fiction',
  'fiksi ilmiah': 'science fiction',
  fantasi: 'fantasy',
  misteri: 'mystery',
  horor: 'horror',
  thriller: 'thriller',
  petualangan: 'adventure',
  sejarah: 'history',
  sains: 'science',
  sastra: 'literature',
  biografi: 'biography',
  romance: 'romance',
  nonfiksi: 'nonfiction',
  'self-help': 'self help',
  psikologi: 'psychology',
  filsafat: 'philosophy',
  anak: 'children',
  'teenlit': 'young adult',
  pendidikan: 'education',
  humor: 'humor',
  teknologi: 'technology',
};

function normalizeToken(value: string): string {
  return value.toLowerCase().trim();
}

function getCategoryTokens(subject: string): string[] {
  const raw = normalizeToken(subject);
  const tokens = CATEGORY_ALIASES[raw] ?? [raw];
  return Array.from(new Set(tokens.map(normalizeToken)));
}

function getOpenLibrarySubject(subject: string): string {
  const raw = normalizeToken(subject);
  return OPENLIBRARY_SUBJECT_ALIASES[raw] ?? raw;
}

function includesAnyToken(text: string, tokens: string[]): boolean {
  const normalized = normalizeToken(text);
  return tokens.some((token) => normalized.includes(token));
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapToBrowseBook(raw: Record<string, unknown>): BrowseBook {
  const authors = Array.isArray(raw.authors) ? raw.authors.map(String).join(', ') : String(raw.author ?? raw.authors ?? 'Unknown');
  const availableRaw = Number(raw.available ?? raw.available_count ?? NaN);
  const totalStockRaw = Number(raw.total_stock ?? raw.totalStock ?? NaN);
  const hasAvailable = Number.isFinite(availableRaw);
  const hasStock = Number.isFinite(totalStockRaw);

  return {
    key: String(raw.id ?? raw.key ?? ''),
    title: String(raw.title ?? ''),
    author: authors,
    coverUrl: String(raw.cover_url ?? raw.coverUrl ?? ''),
    available: hasAvailable ? availableRaw > 0 : true,
    availableCount: hasAvailable ? availableRaw : undefined,
    totalStock: hasStock ? totalStockRaw : undefined,
    genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    rating: Number(raw.avg_rating ?? raw.rating ?? 0),
    year: Number(raw.year ?? 0) || undefined,
    pages: Number(raw.pages ?? 0) || undefined,
    desc: String(raw.description ?? raw.desc ?? ''),
    coverId: Number(raw.cover_i ?? raw.coverId ?? 0) || undefined,
    ratingCount: Number(raw.rating_count ?? raw.ratingCount ?? 0) || undefined,
    reviewCount: Number(raw.review_count ?? raw.reviewCount ?? 0) || undefined,
    readerCount: Number(raw.reader_count ?? raw.readerCount ?? 0) || undefined,
    borrowCount: Number(raw.borrow_count ?? raw.borrowCount ?? 0) || undefined,
    readingSessionCount: Number(raw.reading_session_count ?? raw.readingSessionCount ?? 0) || undefined,
    totalReadingMinutes: Number(raw.total_reading_minutes ?? raw.totalReadingMinutes ?? 0) || undefined,
    popularityScore: Number(raw.popularity_score ?? raw.popularityScore ?? 0) || undefined,
    lastActivityAt: raw.last_activity_at != null ? String(raw.last_activity_at) : (raw.lastActivityAt != null ? String(raw.lastActivityAt) : undefined),
  };
}

function filterBooksByGenre(books: BrowseBook[], genre: string, limit: number): BrowseBook[] {
  if (genre === 'Semua') return books.slice(0, limit);

  const tokens = getCategoryTokens(genre);
  const byGenre = books.filter((book) =>
    (book.genres ?? []).some((value) => includesAnyToken(value, tokens))
  );

  if (byGenre.length > 0) {
    return byGenre.slice(0, limit);
  }

  return books.filter((book) =>
    includesAnyToken(book.title, tokens) ||
    includesAnyToken(book.author, tokens) ||
    includesAnyToken(book.desc ?? '', tokens)
  ).slice(0, limit);
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
      coverUrl: b.cover_url ?? undefined,
      genres: b.genres || [],
      rating: b.avg_rating || 0,
      year: b.year ?? undefined, 
      pages: b.pages ?? undefined,
      desc: b.description ?? undefined,
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

export async function fetchGenres(forceRefresh = false): Promise<string[]> {
  if (!forceRefresh && GENRE_CACHE.value) {
    return GENRE_CACHE.value;
  }

  try {
    const allBooks = await fetchAllBooks();
    const genreSet = new Set<string>(['Semua']);

    for (const book of allBooks) {
      for (const genre of book.genres ?? []) {
        const normalized = genre.trim();
        if (!normalized) continue;
        genreSet.add(toTitleCase(normalized));
      }
    }

    for (const genre of Object.keys(CATEGORY_ALIASES)) {
      genreSet.add(toTitleCase(genre));
    }

    const genres = Array.from(genreSet).sort((left, right) => {
      if (left === 'Semua') return -1;
      if (right === 'Semua') return 1;
      return left.localeCompare(right, 'id');
    });

    GENRE_CACHE.value = genres;
    return genres;
  } catch {
    return ['Semua'];
  }
}

export async function fetchBooksByGenre(genre: string, limit = 48, forceRefresh = false): Promise<BrowseBook[]> {
  return fetchPopularBooks(genre, limit, forceRefresh);
}

export async function fetchPopularBooks(genre: string, limit = 40, forceRefresh = false): Promise<BrowseBook[]> {
  const requestLimit = Math.max(limit * 4, 80);
  const cacheKey = `popular_db_${requestLimit}`;
  if (!forceRefresh && CACHE[cacheKey]) return filterBooksByGenre(CACHE[cacheKey], genre, limit);

  try {
    const res = await fetch(`${API_URL}/stats/popular-books?limit=${requestLimit}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped = rawList.map((item: Record<string, unknown>) => mapToBrowseBook(item));
      CACHE[cacheKey] = mapped;
      return filterBooksByGenre(mapped, genre, limit);
    }
  } catch {
    // fall back below
  }

  try {
    const allBooks = await fetchAllBooks();
    const fallback = [...allBooks]
      .sort((a, b) => {
        const scoreA = (a.avg_rating || 0) * Math.max(a.rating_count || 0, 1);
        const scoreB = (b.avg_rating || 0) * Math.max(b.rating_count || 0, 1);
        return scoreB - scoreA;
      })
      .map((book) => ({
        key: book.id,
        title: book.title,
        author: book.authors.join(', '),
        coverUrl: book.cover_url ?? undefined,
        genres: book.genres || [],
        rating: book.avg_rating,
        ratingCount: book.rating_count,
      }));

    CACHE[cacheKey] = fallback;
    return filterBooksByGenre(fallback, genre, limit);
  } catch {
    CACHE[cacheKey] = [];
    return [];
  }
}

export async function fetchTopPustakrew(limit = 3): Promise<BrowseBook[]> {
  const cacheKey = `top_pustakrew_${limit}`;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const endpoints = ['/books/top-picks', '/books/pustakrew-top', '/catalog/top-picks'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_URL}${endpoint}?limit=${limit}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      if (list.length > 0) {
        let mapped = list.map((item: Record<string, unknown>) => mapToBrowseBook(item)).slice(0, limit);

        // Try to enrich mapped picks with up-to-date rating/review counts
        try {
          const enriched = await Promise.all(mapped.map(async (m: BrowseBook) => {
            try {
              const detail = await fetchBookById(String(m.key));
              if (!detail) return m;
              return {
                ...m,
                rating: Number(detail.avg_rating ?? m.rating ?? 0),
                ratingCount: Number(detail.rating_count ?? m.ratingCount ?? 0) || undefined,
                reviewCount: Number(detail.reviews?.length ?? m.reviewCount ?? 0) || undefined,
              } as BrowseBook;
            } catch {
              return m;
            }
          }));
          mapped = enriched.slice(0, limit);
        } catch {
          // ignore enrichment errors
        }

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

export function clearTopPicksCache() {
  Object.keys(CACHE)
    .filter(k => k.startsWith('top_pustakrew_'))
    .forEach(k => delete CACHE[k]);
}
