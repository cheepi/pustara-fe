// 'use client';
// import { useEffect } from 'react';
// import { useAiStore } from '@/store/aiStore';
// import { fetchChatRecommendations } from '@/lib/api';
// import { useAuthStore } from '@/store/authStore';

// const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

// /**
//  * Fetch rekomendasi personal untuk user yang sedang login.
//  * Pakai preferred_genres dari user jika ada, fallback ke query generik.
//  * Hasil di-cache di Zustand — gak refetch kalau belum 5 menit.
//  */
// export function useRecommendations(forceRefresh = false) {
//   const { user } = useAuthStore();
//   const {
//     homeRecommendations,
//     homeLoading,
//     homeError,
//     homeFetchedAt,
//     setHomeRecommendations,
//     setHomeLoading,
//     setHomeError,
//     setHomeFetchedAt,
//   } = useAiStore();

//   useEffect(() => {
//     if (!user) return;

//     const isStale = !homeFetchedAt || Date.now() - homeFetchedAt > CACHE_TTL_MS;
//     if (!forceRefresh && !isStale && homeRecommendations.length > 0) return;

//     async function load() {
//       setHomeLoading(true);
//       setHomeError(null);
//       try {
//         // Coba ambil preferensi genre dari localStorage (disimpan waktu onboarding)
//         const storedPrefs = localStorage.getItem('pustara_prefs');
//         const prefs = storedPrefs ? JSON.parse(storedPrefs) : null;
//         const genres: string[] = prefs?.genres ?? [];

//         // Bangun query: kalau ada genre pilihan, pakai itu. Kalau tidak, pakai fallback.
//         const query =
//           genres.length > 0
//             ? genres.slice(0, 3).join(' ').toLowerCase()
//             : 'buku populer sastra indonesia';

//         const res = await fetchChatRecommendations(query, 10);
//         setHomeRecommendations(res.recommendations);
//         setHomeFetchedAt(Date.now());
//       } catch (err) {
//         setHomeError(err instanceof Error ? err.message : 'Gagal memuat rekomendasi');
//       } finally {
//         setHomeLoading(false);
//       }
//     }

//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [user, forceRefresh]);

//   return {
//     recommendations: homeRecommendations,
//     loading: homeLoading,
//     error: homeError,
//   };
// }
'use client';
import { useEffect } from 'react';
import { useAiStore } from '@/store/aiStore';
import { fetchChatRecommendations } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DUMMY_AI_RECOMMENDATIONS } from '@/data/dummyRecommendations';

const CACHE_TTL_MS = 5 * 60 * 1000;

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
        let query = 'buku populer sastra indonesia';
        try {
          const storedPrefs = localStorage.getItem('pustara_prefs');
          const prefs = storedPrefs ? JSON.parse(storedPrefs) : null;
          const genres: string[] = prefs?.genres ?? [];
          if (genres.length > 0) {
            query = genres.slice(0, 3).join(' ').toLowerCase();
          }
        } catch {
          // localStorage error — pakai fallback query
        }

        const res = await fetchChatRecommendations(query, 10);
        // res sudah di-unwrap oleh api.ts — langsung akses .recommendations
        setHomeRecommendations(res.recommendations ?? []);
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
