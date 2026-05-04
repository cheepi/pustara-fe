import type { BookDetail, Review } from '@/types/book';

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