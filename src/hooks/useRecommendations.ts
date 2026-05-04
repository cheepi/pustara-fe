'use client';
import { useEffect } from 'react';
import { useAiStore } from '@/store/aiStore';
import { fetchColdStartRecommendations, fetchTrending } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DUMMY_AI_RECOMMENDATIONS } from '@/data/dummyRecommendations';

const CACHE_TTL_MS = 5 * 60 * 1000;

function toAiRecommendationFallback(raw: {
  book_id: string;
  title: string;
  authors: string;
  cover_url?: string;
  avg_rating: number;
  reason_primary?: string;
}): AiRecommendation {
  return {
    book_id: raw.book_id,
    title: raw.title,
    authors: raw.authors,
    cover_url: raw.cover_url ?? null,
    avg_rating: Number.isFinite(raw.avg_rating) ? raw.avg_rating : 0,
    reason_primary: raw.reason_primary || 'Rekomendasi populer untuk kamu',
    reason_secondary: null,
    dominant_signal: 'content',
    hybrid_score: 0,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0,
        weight: 0,
        label: 'Sinyal komunitas',
      },
    },
  };
}

export function useRecommendations(forceRefresh = false) {
  const { user, loading: authLoading } = useAuthStore();
  const {
    homeRecommendations,
    homeLoading,
    homeError,
    homeFetchedAt,
    setHomeRecommendations,
    setHomeLoading,
    setHomeError,
    setHomeFetchedAt,
  } = useAiStore();

  useEffect(() => {
    // Tunggu auth selesai dulu — kalau masih loading jangan fetch
    if (authLoading) return;
    // Kalau user belum login, tetap boleh fetch (rekomendasi tanpa personalisasi)

    const isStale = !homeFetchedAt || Date.now() - homeFetchedAt > CACHE_TTL_MS;
    if (!forceRefresh && !isStale && homeRecommendations.length > 0) return;

    async function load() {
      setHomeLoading(true);
      setHomeError(null);
      try {
        // Ambil preferensi genre dari localStorage (disimpan waktu onboarding)
        let genres: string[] = [];
        try {
          const storedPrefs = localStorage.getItem('pustara_prefs');
          const prefs = storedPrefs ? JSON.parse(storedPrefs) : null;
          genres = Array.isArray(prefs?.genres) ? prefs.genres.slice(0, 3) : [];
        } catch {
          genres = [];
        }

        // IMPORTANT: jangan gunakan endpoint /recommendations/chat di auto-load.
        // Chat endpoint hanya dipakai saat user klik kirim di halaman chat.
        let recommendations: AiRecommendation[] = [];

        // Authenticated users should always go through backend cold-start proxy
        // so AI can switch to personalized mode based on interaction count.
        if (user?.uid) {
          const res = await fetchColdStartRecommendations(genres, 10);
          recommendations = res.recommendations ?? [];
        }

        // Guest mode only: use trending fallback.
        // For authenticated users, phase must stay personalized per-user.
        if (!user?.uid && recommendations.length === 0) {
          const trending = await fetchTrending(10);
          recommendations = trending.map(toAiRecommendationFallback);
        }

        setHomeRecommendations(recommendations);
        setHomeFetchedAt(Date.now());
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal memuat rekomendasi';
        console.warn('[Recommendations] Error:', errorMsg);
        
        // Fallback ke dummy recommendations saat error
        setHomeRecommendations(DUMMY_AI_RECOMMENDATIONS);
        setHomeError(null); // Don't show error to user — use fallback silently
      } finally {
        setHomeLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid, forceRefresh]);

  return {
    recommendations: homeRecommendations,
    loading: homeLoading,
    error: homeError,
  };
}
