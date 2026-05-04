import type { AiRecommendation } from '@/types/ai';

/**
 * Fallback recommendations ketika AI service tidak responsif
 */
export const DUMMY_AI_RECOMMENDATIONS: AiRecommendation[] = [
  {
    book_id: 'd1-reco',
    title: 'Laskar Pelangi',
    authors: 'Andrea Hirata',
    cover_url: 'https://covers.openlibrary.org/b/id/8231568-L.jpg',
    avg_rating: 4.9,
    reason_primary: 'Pilihan populer pembaca Indonesia',
    reason_secondary: 'Kisah inspiratif tentang semangat belajar',
    dominant_signal: 'content',
    hybrid_score: 0.95,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0.95,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0.85,
        weight: 0.5,
        label: 'Sinyal komunitas',
      },
    },
  },
  {
    book_id: 'd2-reco',
    title: 'Bumi Manusia',
    authors: 'Pramoedya Ananta Toer',
    cover_url: 'https://covers.openlibrary.org/b/id/8750787-L.jpg',
    avg_rating: 4.9,
    reason_primary: 'Karya sastra Indonesia klasik',
    reason_secondary: 'Pembaca sastra juga menyukai buku ini',
    dominant_signal: 'collab',
    hybrid_score: 0.92,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0.9,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0.92,
        weight: 0.6,
        label: 'Sinyal komunitas',
      },
    },
  },
  {
    book_id: 'd3-reco',
    title: 'Cantik Itu Luka',
    authors: 'Eka Kurniawan',
    cover_url: 'https://covers.openlibrary.org/b/id/10219665-L.jpg',
    avg_rating: 4.8,
    reason_primary: 'Masterpiece sastra Indonesia modern',
    reason_secondary: 'Rating tinggi dan banyak pengguna suka',
    dominant_signal: 'content',
    hybrid_score: 0.88,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0.88,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0.8,
        weight: 0.5,
        label: 'Sinyal komunitas',
      },
    },
  },
  {
    book_id: 'd4-reco',
    title: 'Perahu Kertas',
    authors: 'Dee Lestari',
    cover_url: 'https://covers.openlibrary.org/b/id/7886745-L.jpg',
    avg_rating: 4.7,
    reason_primary: 'Kisah cinta yang indah dan menyentuh',
    reason_secondary: 'Banyak pembaca muda menyukai karya Dee Lestari',
    dominant_signal: 'collab',
    hybrid_score: 0.85,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0.82,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0.85,
        weight: 0.6,
        label: 'Sinyal komunitas',
      },
    },
  },
  {
    book_id: 'd5-reco',
    title: 'Negeri 5 Menara',
    authors: 'Ahmad Fuadi',
    cover_url: 'https://covers.openlibrary.org/b/id/8913924-L.jpg',
    avg_rating: 4.8,
    reason_primary: 'Petualangan dan persahabatan di negeri jauh',
    reason_secondary: 'Sedang naik tren di platform',
    dominant_signal: 'content',
    hybrid_score: 0.84,
    phase: '❄️ Cold',
    signals: {
      content: {
        score: 0.84,
        weight: 1,
        label: 'Kemiripan konten',
      },
      collab: {
        score: 0.75,
        weight: 0.4,
        label: 'Sinyal komunitas',
      },
    },
  },
];
