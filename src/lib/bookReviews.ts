import { DUMMY_BOOKS, DUMMY_REVIEWS_BY_BOOK } from '@/data/dummyData';
import { fetchBookById } from '@/lib/books';
import type { BookDetail, Review } from '@/types/book';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function normalizeReview(raw: Record<string, unknown>): Review {
  return {
    name: String(raw.name ?? raw.user ?? 'Anonymous'),
    avatar: String(raw.avatar ?? 'U').slice(0, 1).toUpperCase(),
    rating: Number(raw.rating ?? 0),
    text: String(raw.text ?? raw.reviewText ?? ''),
    time: String(raw.time ?? '-'),
    likes: Number(raw.likes ?? 0),
    loc: String(raw.loc ?? '-'),
  };
}

async function fetchReviewsFromApi(bookId: string): Promise<Review[] | null> {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}/reviews?limit=100`, { cache: 'no-store' });
    if (!res.ok) return null;

    const json = await res.json();
    const raw = Array.isArray(json?.data) ? json.data : [];
    if (raw.length > 0) {
      return raw.map((item: Record<string, unknown>) => normalizeReview(item));
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchBookReviewData(bookId: string): Promise<{ meta: BookDetail | null; reviews: Review[] }> {
  const meta = await fetchBookById(bookId);
  const apiReviews = await fetchReviewsFromApi(bookId);
  if (meta && apiReviews) {
    return { meta, reviews: apiReviews };
  }

  if (meta?.reviews && meta.reviews.length > 0) {
    return { meta, reviews: meta.reviews };
  }

  const fallbackMeta = meta ?? DUMMY_BOOKS[bookId] ?? DUMMY_BOOKS.d1;
  const fallbackReviews = DUMMY_REVIEWS_BY_BOOK[bookId] ?? fallbackMeta.reviews ?? [];

  return {
    meta: fallbackMeta,
    reviews: fallbackReviews,
  };
}
