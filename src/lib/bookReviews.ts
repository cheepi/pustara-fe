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
    name: String(raw.name ?? raw.user ?? 'Anonymous'),
    avatar: String(raw.avatar ?? 'U').slice(0, 1).toUpperCase(),
    rating: Number(raw.rating ?? 0),
    text: String(raw.text ?? raw.reviewText ?? ''),
    time: String(raw.time ?? '-'),
    likes: Number(raw.likes ?? 0),
    loc: String(raw.loc ?? '-'),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  };
}

async function fetchReviewsFromApi(bookId: string): Promise<Review[] | null> {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}/reviews?limit=100`, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[Reviews] ⚠️ API returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    
    // fix: Safe response mapping - handle multiple response formats
    const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    
    if (raw.length > 0) {
      return raw.map((item: Record<string, unknown>) => normalizeReview(item));
    }
    return null;
  } catch (err) {
    console.error(`[Reviews] ❌ Error fetching reviews:`, err);
    return null;
  }
}

export async function fetchBookReviewData(bookId: string): Promise<{ meta: BookDetail | null; reviews: Review[] }> {
  const meta = await fetchBookById(bookId);
  const apiReviews = await fetchReviewsFromApi(bookId);
  
  // fix: JANGAN menggunakan data dummy - only return API reviews or empty array
  if (apiReviews && apiReviews.length > 0) {
    console.log(`[Reviews] ✅ Using API reviews (${apiReviews.length} found)`);
    return { meta, reviews: apiReviews };
  }

  if (meta?.reviews && meta.reviews.length > 0) {
    console.log(`[Reviews] ✅ Using book meta reviews (${meta.reviews.length} found)`);
    return { meta, reviews: meta.reviews };
  }

  // fix: Don't use dummy data - return empty array if no real reviews
  console.log(`[Reviews] ℹ️ No reviews found, returning empty array (no dummy data)`);
  return {
    meta,
    reviews: [], // Empty array, not dummy data
  };
}
