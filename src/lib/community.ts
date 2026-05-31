import { DUMMY_ALL_REVIEWS } from '@/data/dummyData';
import type { CommunityReview } from '@/types/community';
import { proxyMediaUrl } from '@/lib/media';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function normalizeReview(raw: Record<string, unknown>): CommunityReview {
  return {
    // review_id is the actual DB UUID used for likes
    review_id: String(raw.review_id ?? raw.id ?? ''),
    user_id: raw.user_id ? String(raw.user_id) : undefined,
    username: raw.username ? String(raw.username) : undefined,
    firebase_uid: raw.firebase_uid ? String(raw.firebase_uid) : undefined,
    // display_name is the human-facing name; fall back to username then name
    user: String(raw.display_name ?? raw.user ?? raw.username ?? raw.name ?? ''),
    avatar_url: raw.avatar_url ? proxyMediaUrl(String(raw.avatar_url)) : null,
    loc: String(raw.loc ?? '-'),
    rating: Number(raw.rating ?? 0),
    book: String(raw.book ?? raw.book_title ?? raw.bookTitle ?? '-'),
    author: String(raw.author ?? raw.bookAuthor ?? '-'),
    // Direct cover URL from books table (not OpenLibrary coverId)
    cover_url: raw.cover_url ? proxyMediaUrl(String(raw.cover_url)) || undefined : undefined,
    key: String(raw.key ?? raw.book_id ?? raw.bookId ?? ''),
    text: String(raw.text ?? raw.reviewText ?? raw.body ?? ''),
    likes: Number(raw.likes ?? 0),
    comments: Number(raw.comments ?? 0),
    time: String(raw.time ?? '-'),
  };
}

export async function fetchCommunityReviews(): Promise<CommunityReview[]> {
  const endpoints = ['/reviews/recent', '/community/recent', '/reviews', '/community'];

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

  return (DUMMY_ALL_REVIEWS as unknown[]).map((r) => normalizeReview(r as Record<string, unknown>));
}
