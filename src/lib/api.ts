import { auth } from './firebase';
import type { AiRecommendation } from '@/store/aiStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// ── Generic fetchers ──────────────────────────────────────────────────────────
// Express wraps semua response dalam { success: true, data: {...} }
// unwrapData handles kedua format: wrapped dan bare (dari FastAPI langsung)

function unwrapData<T>(json: unknown): T {
  const j = json as Record<string, unknown>;
  // Format Express: { success: true, data: { ... } }
  if (j && typeof j === 'object' && 'success' in j && 'data' in j) {
    return j.data as T;
  }
  // Format bare (FastAPI langsung / endpoint lain)
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

// ── AI Recommendation API ─────────────────────────────────────────────────────

export interface ChatRecoResponse {
  query: string;
  intent: Record<string, unknown>;
  phase: string;
  weights: { alpha: number; beta: number; phase: string };
  recommendations: AiRecommendation[];
}

export interface DirectRecoResponse {
  seed_title: string;
  phase: string;
  weights: { alpha: number; beta: number; phase: string };
  recommendations: AiRecommendation[];
}

export async function fetchChatRecommendations(
  query: string,
  topN = 10,
): Promise<ChatRecoResponse> {
  return apiPost<ChatRecoResponse>('/recommendations/chat', {
    query,
    user_id: auth.currentUser?.uid ?? null,
    top_n: topN,
  });
}

export async function fetchSimilarBooks(
  seedTitle: string,
  topN = 6,
): Promise<DirectRecoResponse> {
  return apiPost<DirectRecoResponse>('/recommendations/direct', {
    seed_title: seedTitle,
    user_id: auth.currentUser?.uid ?? null,
    top_n: topN,
  });
}

export async function fetchColdStartRecommendations(
  genres: string[],
  topN = 10,
): Promise<{ genres: string[]; phase: string; recommendations: AiRecommendation[] }> {
  const params = new URLSearchParams({
    genres: genres.join(','),
    top_n: String(topN),
  });
  return apiGet(`/recommendations/cold-start?${params}`);
}

// ── OpenLibrary cover fetch by title+author ───────────────────────────────────
// Dipanggil oleh AiRecoCard untuk resolve cover_id dari judul buku

const OL_COVER_CACHE: Record<string, string | null> = {};

export async function fetchOpenLibraryCoverId(
  title: string,
  author: string,
): Promise<string | null> {
  const key = `${title}__${author}`.toLowerCase();
  if (key in OL_COVER_CACHE) return OL_COVER_CACHE[key];

  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`,
    );
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i ?? null;
    OL_COVER_CACHE[key] = coverId ? String(coverId) : null;
    return OL_COVER_CACHE[key];
  } catch {
    OL_COVER_CACHE[key] = null;
    return null;
  }
}