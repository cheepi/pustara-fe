import { DUMMY_ALL_REVIEWS } from '@/data/dummyData';
import type { CommunityReview } from '@/types/community';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function normalizeReview(raw: Record<string, unknown>): CommunityReview {
  return {
    user: String(raw.user ?? raw.name ?? 'Anonymous'),
    avatar: String(raw.avatar ?? 'U').slice(0, 1).toUpperCase(),
    loc: String(raw.loc ?? '-'),
    rating: Number(raw.rating ?? 0),
    book: String(raw.book ?? raw.bookTitle ?? '-'),
    author: String(raw.author ?? raw.bookAuthor ?? '-'),
    coverId: Number(raw.coverId ?? 0) || undefined,
    key: String(raw.key ?? raw.bookId ?? ''),
    text: String(raw.text ?? raw.reviewText ?? ''),
    likes: Number(raw.likes ?? 0),
    comments: Number(raw.comments ?? 0),
    time: String(raw.time ?? '-'),
  };
}

export async function fetchCommunityReviews(): Promise<CommunityReview[]> {
  try {
    const res = await fetch(`${API_URL}/books/1/reviews?limit=100`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch reviews');

    const json = await res.json();
    const raw = Array.isArray(json?.data) ? json.data : [];
    if (raw.length > 0) {
      return raw.map((item: Record<string, unknown>) => normalizeReview(item));
    }
    return DUMMY_ALL_REVIEWS as CommunityReview[];
  } catch {
    return DUMMY_ALL_REVIEWS as CommunityReview[];
  }
}
