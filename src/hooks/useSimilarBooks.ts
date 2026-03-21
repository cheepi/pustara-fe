// 'use client';
// import { useEffect } from 'react';
// import { useAiStore } from '@/store/aiStore';
// import { fetchSimilarBooks } from '@/lib/api';

// /**
//  * Fetch buku serupa berdasarkan judul buku yang sedang dibuka.
//  * Hasil di-cache per judul di Zustand.
//  */
// export function useSimilarBooks(bookTitle: string, topN = 6) {
//   const {
//     similarBooks,
//     similarLoading,
//     setSimilarBooks,
//     setSimilarLoading,
//   } = useAiStore();

//   const cacheKey = bookTitle.toLowerCase().trim();
//   const books = similarBooks[cacheKey] ?? [];
//   const loading = similarLoading[cacheKey] ?? false;

//   useEffect(() => {
//     if (!bookTitle || books.length > 0) return;

//     async function load() {
//       setSimilarLoading(cacheKey, true);
//       try {
//         const res = await fetchSimilarBooks(bookTitle, topN);
//         setSimilarBooks(cacheKey, res.recommendations);
//       } catch {
//         // Kalau gagal, biarkan kosong — komponen akan fallback ke data statis
//       } finally {
//         setSimilarLoading(cacheKey, false);
//       }
//     }

//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [bookTitle]);

//   return { books, loading };
// }
'use client';
import { useEffect } from 'react';
import { useAiStore } from '@/store/aiStore';
import { fetchSimilarBooks } from '@/lib/api';

export function useSimilarBooks(bookTitle: string, topN = 6) {
  const {
    similarBooks,
    similarLoading,
    setSimilarBooks,
    setSimilarLoading,
  } = useAiStore();

  const cacheKey = bookTitle.toLowerCase().trim();
  const books = similarBooks[cacheKey] ?? [];
  const loading = similarLoading[cacheKey] ?? false;

  useEffect(() => {
    if (!bookTitle || books.length > 0 || loading) return;

    async function load() {
      setSimilarLoading(cacheKey, true);
      try {
        const res = await fetchSimilarBooks(bookTitle, topN);
        setSimilarBooks(cacheKey, res.recommendations ?? []);
      } catch {
        setSimilarBooks(cacheKey, []);
      } finally {
        setSimilarLoading(cacheKey, false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookTitle]);

  return { books, loading };
}