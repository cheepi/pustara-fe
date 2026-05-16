import { DUMMY_BOOKS, DUMMY_REVIEWS_BY_BOOK } from '@/data/dummyData';
import { fetchBookById } from '@/lib/books';
import type { BookDetail, Review } from '@/types/book';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function normalizeReview(raw: Record<string, unknown>): Review {
  return {
    id: String(raw.id ?? ''),
    user_id: String(raw.user_id ?? ''),
    book_id: String(raw.book_id ?? ''),
    body: String(raw.text ?? raw.reviewText ?? raw.body ?? ''),
    // display_name is the human-facing name; fall back to username/name
    name: String(raw.display_name ?? raw.name ?? raw.user ?? raw.username ?? ''),
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    rating: Number(raw.rating ?? 0),
    text: String(raw.text ?? raw.body ?? raw.reviewText ?? ''),
    time: String(raw.time ?? raw.created_at ?? '-'),
    likes: Number(raw.likes ?? 0),
    loc: String(raw.loc ?? '-'),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  };
}

async function fetchReviewsFromApi(bookId: string): Promise<Review[] | null> {
  const endpoints = [`/books/${bookId}/reviews`, `/reviews/book/${bookId}`];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) continue;

      const json = await res.json();
      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      if (raw.length > 0) {
        return raw.map((item: Record<string, unknown>) => normalizeReview(item));
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
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
