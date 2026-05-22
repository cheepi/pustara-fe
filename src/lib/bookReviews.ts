import { DUMMY_BOOKS, DUMMY_REVIEWS_BY_BOOK } from '@/data/dummyData';
import { fetchBookById } from '@/lib/books';
import { apiGet } from '@/lib/api';
import type { BookDetail, Review } from '@/types/book';

function normalizeReview(raw: Record<string, unknown>): Review {
  return {
    id: String(raw.id ?? ''),
    user_id: String(raw.user_id ?? ''),
    book_id: String(raw.book_id ?? ''),
    body: String(raw.text ?? raw.reviewText ?? raw.body ?? ''),
    name: String(raw.display_name ?? raw.name ?? raw.user ?? raw.username ?? ''),
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    rating: Number(raw.rating ?? 0),
    text: String(raw.text ?? raw.body ?? raw.reviewText ?? ''),
    time: String(raw.time ?? raw.created_at ?? '-'),
    likes: Number(raw.likes ?? 0),
    loc: String(raw.loc ?? '-'),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    firebase_uid: String(raw.firebase_uid ?? raw.firebaseUid ?? ''),
  };
}

async function fetchReviewsFromApi(bookId: string): Promise<Review[] | null> {
  try {
    const res = await apiGet<any>(`/books/${bookId}/reviews?limit=100`);
    
    const raw = Array.isArray(res) 
      ? res 
      : (Array.isArray(res?.reviews) 
          ? res.reviews 
          : (Array.isArray(res?.data?.reviews) 
              ? res.data.reviews 
              : (Array.isArray(res?.data) ? res.data : null)));
    
    if (!raw) {
      console.warn('[BookReviews] API returned non-array data');
      return null;
    }
    
    const normalized = raw.map((item: any, idx: number) => {
      const review = normalizeReview(item as Record<string, unknown>);
      if (idx < 2) {
        console.log('[BookReviews] Normalized review:', {
          id: review.id,
          rating: review.rating,
          textLength: review.text?.length,
        });
      }
      return review;
    });
    
    console.log('[BookReviews] Normalized:', normalized.length, 'reviews from /books/' + bookId + '/reviews');
    return normalized;
  } catch (error) {
    console.warn('[BookReviews] Endpoint /books/' + bookId + '/reviews failed:', error);
    return null;
  }
}

export async function fetchBookReviewData(bookId: string): Promise<{ meta: BookDetail | null; reviews: Review[] }> {
  const meta = await fetchBookById(bookId);
  console.log('[BookReviews] Fetching review data for:', bookId);
  const apiReviews = await fetchReviewsFromApi(bookId);

  // apiReviews !== null means the API responded (even if empty) — use it
  if (meta && apiReviews !== null) {
    console.log('[BookReviews] Using API reviews:', apiReviews.length);
    return { meta, reviews: apiReviews };
  }

  if (meta?.reviews && meta.reviews.length > 0) {
    console.log('[BookReviews] Using embedded reviews from book:', meta.reviews.length);
    return { meta, reviews: meta.reviews };
  }

  const fallbackMeta = meta ?? DUMMY_BOOKS[bookId] ?? DUMMY_BOOKS.d1;
  const fallbackReviews = DUMMY_REVIEWS_BY_BOOK[bookId] ?? fallbackMeta?.reviews ?? [];

  console.log('[BookReviews] Using fallback:', {
    hasApiReviews: apiReviews !== null,
    hasEmbedded: !!meta?.reviews?.length,
    fallbackCount: fallbackReviews.length,
  });

  return {
    meta: fallbackMeta,
    reviews: fallbackReviews,
  };
}