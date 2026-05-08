import { auth } from './firebase';
import type { User } from 'firebase/auth';
import type { AiRecommendation } from '@/types/ai';
import { apiCaches } from './cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAuthHeader: Record<string, string> | null = null;
let cachedAuthUid: string | null = null;
let cachedAuthAt = 0;

function clearAuthCache() {
  cachedAuthHeader = null;
  cachedAuthUid = null;
  cachedAuthAt = 0;
}

async function resolveCurrentUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;

  return new Promise<User | null>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuthHeader(): Promise<Record<string, string>> {
  const user = await resolveCurrentUser();
  if (!user) {
    clearAuthCache();
    return {};
  }

  const now = Date.now();
  if (cachedAuthHeader && cachedAuthUid === user.uid && (now - cachedAuthAt) < TOKEN_CACHE_TTL_MS) {
    return cachedAuthHeader;
  }

  try {
    const token = await user.getIdToken();
    cachedAuthHeader = { Authorization: `Bearer ${token}` };
    cachedAuthUid = user.uid;
    cachedAuthAt = now;
    return cachedAuthHeader;
  } catch {
    clearAuthCache();
    return {};
  }
}

async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  const now = Date.now();
  if (cachedAuthHeader && cachedAuthUid === user.uid && (now - cachedAuthAt) < TOKEN_CACHE_TTL_MS) {
    return cachedAuthHeader;
  }

  try {
    const token = await user.getIdToken();
    cachedAuthHeader = { Authorization: `Bearer ${token}` };
    cachedAuthUid = user.uid;
    cachedAuthAt = now;
    return cachedAuthHeader;
  } catch {
    clearAuthCache();
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
  if (!res.ok) throw new Error(`API error: ${res.status} (${path})`);
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
  if (!res.ok) throw new Error(`API error: ${res.status} (${path})`);
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
  if (!res.ok) throw new Error(`API error: ${res.status} (${path})`);
  const json = await res.json();
  return unwrapData<T>(json);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} (${path})`);
  const json = await res.json();
  return unwrapData<T>(json);
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

function normalizeTrendingPages(raw: Record<string, unknown>): number {
  return Math.max(
    0,
    toFiniteNumber(
      raw.pages
      ?? raw.page_count
      ?? raw.num_pages
      ?? raw.number_of_pages,
      0,
    ),
  );
}

function normalizeTrendingScore(raw: Record<string, unknown>): number {
  const score = toFiniteNumber(
    raw.trending_score
    ?? raw.trendingScore
    ?? raw.score
    ?? raw.trend_score,
    0,
  );

  if (score > 0 && score <= 1) return score * 100;
  return Math.max(0, score);
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
  const contentScoreRaw = rawContent.score ?? findSignalFromList('konten') ?? findSignalFromList('content');
  const collabScoreRaw = rawCollab.score ?? findSignalFromList('collab') ?? findSignalFromList('komunitas');
  const hasExplicitSignals = contentScoreRaw !== undefined || collabScoreRaw !== undefined;
  const hybridScore = clamp01(rec.hybrid_score ?? rec.final_score, 0);
  const fallbackDominant = rec.dominant_signal === 'collab' ? 'collab' : 'content';
  const contentScore = clamp01(
    contentScoreRaw,
    hasExplicitSignals ? 0 : (fallbackDominant === 'content' ? hybridScore : 0),
  );
  const collabScore = clamp01(
    collabScoreRaw,
    hasExplicitSignals ? 0 : (fallbackDominant === 'collab' ? hybridScore : 0),
  );
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
        weight: clamp01(rawContent.weight, hasExplicitSignals ? 1 : (dominant === 'content' ? 1 : 0)),
        label: String(rawContent.label ?? 'Kemiripan konten'),
      },
      collab: {
        score: collabScore,
        weight: clamp01(rawCollab.weight, hasExplicitSignals ? 0 : (dominant === 'collab' ? 1 : 0)),
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
    pages: normalizeTrendingPages(book),
    avg_rating: toFiniteNumber(book.avg_rating, 0),
    cover_url: book.cover_url ? String(book.cover_url) : undefined,
    trending_score: normalizeTrendingScore(book),
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
 * Fetch trending books dari FastAPI (Redis sorted set).
 * Dipakai oleh feed/page.tsx untuk replace hardcoded trending items.
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
  } catch {
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