import { auth } from './firebase';
import type { AiRecommendation } from '@/types/ai';
import { apiCaches } from './cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuthHeader(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve({ Authorization: `Bearer ${token}` });
      } else {
        resolve({});
      }
    });
  });
}

async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

// ── Generic fetchers ──────────────────────────────────────────────────────────
function unwrapData<T>(json: unknown): T {
  const j = json as Record<string, unknown>;
  if (j && typeof j === 'object' && 'success' in j && 'data' in j) {
    return j.data as T;
  }
  return json as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return unwrapData<T>(json);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return unwrapData<T>(json);
}

export async function apiPostAllowAnonymous<T>(path: string, body: unknown): Promise<T> {
  const headers = await getOptionalAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return unwrapData<T>(json);
}

// ── User API ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  firebase_uid: string;
  username: string;
  email: string;
  display_name?: string;
}

/**
 * Get current user record from backend (requires Firebase token)
 * If user doesn't exist, backend will create it
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('🔴 getCurrentUser: No Firebase user found');
      return null;
    }

    console.log('🔵 getCurrentUser: Getting token for UID:', user.uid);
    const token = await user.getIdToken();
    
    console.log('🟡 getCurrentUser: Calling /auth/me endpoint...');
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('🟢 getCurrentUser: Response status:', res.status);
    if (!res.ok) {
      console.error('🔴 getCurrentUser: API error:', res.status, res.statusText);
      const errorText = await res.text();
      console.error('🔴 getCurrentUser: Error response:', errorText);
      return null;
    }
    
    const json = await res.json();
    console.log('🔵 getCurrentUser: FULL Response JSON:', JSON.stringify(json, null, 2));
    console.log('🔵 getCurrentUser: json.user =', json.user);
    console.log('🔵 getCurrentUser: json.data =', json.data);
    
    if (!json.user && !json.data) {
      console.error('🔴 getCurrentUser: No user or data in response:', json);
      return null;
    }
    
    return json.user || json.data || null;
  } catch (err) {
    console.error('🔴 getCurrentUser: Exception:', err);
    return null;
  }
}

// ── AI Recommendation API ─────────────────────────────────────────────────────

export interface ChatRecoResponse {
  response_text: string;
  intent: string;
  recommendations: AiRecommendation[];
  show_recommendations: boolean;
  parsed_query?: Record<string, unknown>;
}

export interface DirectRecoResponse {
  recommendations: AiRecommendation[];
}

export interface TrendingBook {
  book_id: string;
  title: string;
  authors: string;
  genres?: string[];
  description?: string;
  year?: string;
  pages?: number;
  avg_rating: number;
  cover_url?: string;
  trending_score?: number;
  reason_primary?: string;
}

export interface TrendingResponse {
  trending: TrendingBook[];
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value: unknown, fallback = 0): number {
  const n = toFiniteNumber(value, fallback);
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function normalizeAiRecommendation(raw: unknown): AiRecommendation {
  const rec = (raw ?? {}) as Record<string, unknown>;
  const rawSignalMap = (rec.signals_map ?? rec.signals ?? {}) as Record<string, unknown>;
  const rawSignalList = Array.isArray(rec.signals) ? rec.signals as Array<Record<string, unknown>> : [];
  const findSignalFromList = (token: string) => {
    const found = rawSignalList.find((s) => String(s?.label ?? '').toLowerCase().includes(token));
    return found ? clamp01(found.value, 0) : undefined;
  };
  const rawContent = (rawSignalMap.content ?? {}) as Record<string, unknown>;
  const rawCollab = (rawSignalMap.collab ?? {}) as Record<string, unknown>;
  const contentScore = clamp01(rawContent.score ?? findSignalFromList('konten') ?? findSignalFromList('content'), 0);
  const collabScore = clamp01(rawCollab.score ?? findSignalFromList('collab') ?? findSignalFromList('komunitas'), 0);
  const hybridScore = clamp01(rec.hybrid_score ?? rec.final_score, 0);
  const dominant = rec.dominant_signal === 'collab'
    ? 'collab'
    : rec.dominant_signal === 'content'
      ? 'content'
      : collabScore > contentScore
        ? 'collab'
        : 'content';

  return {
    book_id: String(rec.book_id ?? rec.id ?? ''),
    title: String(rec.title ?? 'Untitled'),
    authors: String(rec.authors ?? rec.author ?? 'Unknown Author'),
    cover_url: rec.cover_url ? String(rec.cover_url) : null,
    avg_rating: toFiniteNumber(rec.avg_rating, 0),
    reason_primary: String(rec.reason_primary ?? 'Rekomendasi dari PustarAI'),
    reason_secondary:
      rec.reason_secondary === null || rec.reason_secondary === undefined
        ? null
        : String(rec.reason_secondary),
    dominant_signal: dominant,
    hybrid_score: hybridScore,
    phase: typeof rec.phase === 'string' && rec.phase.length > 0
      ? (rec.phase as AiRecommendation['phase'])
      : '❄️ Cold',
    signals: {
      content: {
        score: contentScore,
        weight: clamp01(rawContent.weight, 1),
        label: String(rawContent.label ?? 'Kemiripan konten'),
      },
      collab: {
        score: collabScore,
        weight: clamp01(rawCollab.weight, 0),
        label: String(rawCollab.label ?? 'Sinyal komunitas'),
      },
    },
  };
}

function normalizeTrendingBook(raw: unknown): TrendingBook {
  const book = (raw ?? {}) as Record<string, unknown>;
  return {
    book_id: String(book.book_id ?? book.id ?? ''),
    title: String(book.title ?? 'Untitled'),
    authors: String(book.authors ?? book.author ?? 'Unknown Author'),
    genres: Array.isArray(book.genres)
      ? (book.genres as unknown[]).map((g) => String(g))
      : typeof book.genres === 'string'
        ? book.genres.split(',').map((g) => g.trim()).filter(Boolean)
        : [],
    description: typeof book.description === 'string' ? book.description : undefined,
    year: book.year ? String(book.year) : undefined,
    pages: toFiniteNumber(book.pages, 0),
    avg_rating: toFiniteNumber(book.avg_rating, 0),
    cover_url: book.cover_url ? String(book.cover_url) : undefined,
    trending_score: toFiniteNumber(book.trending_score ?? book.score, 0),
    reason_primary: book.reason_primary ? String(book.reason_primary) : undefined,
  };
}

export async function fetchChatRecommendations(
  query: string,
  topN = 10,
  attachedBookTitle?: string,
  attachedBookDesc?: string,
  userGender?: string,
  userAge?: string,
  chatHistory?: { role: string; content: string }[],
): Promise<ChatRecoResponse> {
  const raw = await apiPost<ChatRecoResponse>('/recommendations/chat', {
    query,
    top_n: topN,
    attached_book_title: attachedBookTitle,
    attached_book_desc:  attachedBookDesc,
    user_gender:         userGender,
    user_age:            userAge,
    chat_history:        chatHistory ?? [],
  });

  return {
    ...raw,
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(normalizeAiRecommendation)
      : [],
    show_recommendations:
      typeof raw.show_recommendations === 'boolean'
        ? raw.show_recommendations
        : Array.isArray(raw.recommendations) && raw.recommendations.length > 0,
  };
}

export async function fetchSimilarBooks(
  seedTitle: string,
  topN = 6,
): Promise<DirectRecoResponse> {
  const raw = await apiPostAllowAnonymous<DirectRecoResponse>('/recommendations/direct', {
    seed_title: seedTitle,
    top_n: topN,
  });

  return {
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(normalizeAiRecommendation)
      : [],
  };
}

export async function fetchColdStartRecommendations(
  genres: string[],
  topN = 10,
): Promise<{ genres: string[]; recommendations: AiRecommendation[] }> {
  const params = new URLSearchParams({ genres: genres.join(','), top_n: String(topN) });
  const raw = await apiGet<{ genres?: string[]; recommendations?: AiRecommendation[] }>(`/recommendations/cold-start?${params}`);
  return {
    genres: raw.genres ?? genres,
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map(normalizeAiRecommendation)
      : [],
  };
}

/**
 * Fetch trending books dari database backend
 * Primary: GET /books/trending (fast, database-based, Neon PostgreSQL)
 * Fallback: GET /recommendations/trending (slower, FastAPI/Redis-based)
 * 
 * CACHED: 60 seconds to prevent redundant API calls
 */
export async function fetchTrending(topN = 10): Promise<TrendingBook[]> {
  const cacheKey = `trending_${topN}`;

  // Check cache first
  const cached = apiCaches.trending.get(cacheKey) as TrendingBook[] | null;
  if (cached !== null) {
    return cached;
  }

  try {
    // Try new database endpoint first (faster)
    try {
      const res = await apiGet<{ data: TrendingBook[] }>(`/books/trending?limit=${topN}`);
      const result = Array.isArray(res.data) ? res.data.map(normalizeTrendingBook) : [];
      if (result.length > 0) {
        apiCaches.trending.set(cacheKey, result);
        return result;
      }
    } catch (dbError) {
      console.warn('[Trending] Database endpoint failed, trying recommendations endpoint:', dbError);
    }

    // Fallback to recommendations endpoint
    const res = await apiGet<TrendingResponse & { recommendations?: TrendingBook[] }>(`/recommendations/trending?top_n=${topN}`);
    const source = Array.isArray(res.trending)
      ? res.trending
      : Array.isArray(res.recommendations)
        ? res.recommendations
        : [];
    const result = source.map(normalizeTrendingBook);

    // Store in cache for 60 seconds
    apiCaches.trending.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('[Trending] All endpoints failed:', error);
    return [];
  }
}

// ── OpenLibrary cover fetch ───────────────────────────────────────────────────
const OL_COVER_CACHE: Record<string, string | null> = {};

export async function fetchOpenLibraryCoverId(
  title: string,
  author: string,
): Promise<string | null> {
  const key = `${title}__${author}`.toLowerCase();
  if (key in OL_COVER_CACHE) return OL_COVER_CACHE[key];

  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`);
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i ?? null;
    OL_COVER_CACHE[key] = coverId ? String(coverId) : null;
    return OL_COVER_CACHE[key];
  } catch {
    OL_COVER_CACHE[key] = null;
    return null;
  }
}