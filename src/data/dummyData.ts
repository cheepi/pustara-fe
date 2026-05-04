import type { BookDetail, Review } from '@/types/book';
// ── Helpers ───────────────────────────────────────────────────────────────────
function dummyBook(b: Omit<BookDetail, 'external_key' | 'cover_id' | 'language' | 'is_active' | 'created_at' | 'updated_at' | 'file_url' | 'file_type' | 'total_pages'>): BookDetail {
  return {
    external_key: null,
    cover_id:     null,
    language:     'id',
    is_active:    true,
    created_at:   '',
    updated_at:   '',
    file_url:     null,
    file_type:    'pdf',
    total_pages:  null,
    ...b,
  };
}

function dummyReview(r: Omit<Review, 'id' | 'user_id' | 'book_id' | 'body' | 'created_at' | 'updated_at'> & { id?: string }): Review {
  return {
    id:         r.id ?? crypto.randomUUID(),
    user_id:    'dummy',
    book_id:    'dummy',
    body:       r.text ?? null,
    created_at: '',
    updated_at: '',
    ...r,
  };
}

export interface CommunityReview {
  user: string;
  avatar: string;
  rating: number;
  time: string;
  coverId: number;
  key: string;
  book: string;
  text: string;
}

export interface PustaraBook {
  key: string;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  rating: number;
  year: number;
  pages: number;
  desc: string;
}

export interface FeedItem {
  id: string;
  [key: string]: any;
}

export const DUMMY_BOOKS: Record<string, BookDetail> = {};

export const DUMMY_ALL_REVIEWS: CommunityReview[] = [];

export const DUMMY_COMMUNITY_REVIEWS: CommunityReview[] = [];

export const DUMMY_REVIEWS_BY_BOOK: Record<string, Review[]> = {};

// ── TOP3_PUSTAKREW ─────────────────────────────────────────────────────────────
export const TOP3_PUSTAKREW: PustaraBook[] = [];

// ── DUMMY_STATIC_FEED ─────────────────────────────────────────────────────────
export const DUMMY_STATIC_FEED: FeedItem[] = [];