import type { BookDetail } from '@/types/book';
import type { ReadingSession } from '@/types/database';

/**
 * User book summary for shelf/profile views
 */
export interface UserBookSummary extends Pick<BookDetail, 'id' | 'title' | 'authors' | 'genres' | 'cover_url' | 'avg_rating' | 'year' | 'pages'> {
  progress_percentage?: number;
  last_read_at?: string | null;
  liked_at?: string | null;
  reading_session?: ReadingSession;
}

/**
 * Complete user profile with related data
 */
export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  // Backward-compat alias because several UI flows still reference `name`.
  name?: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_genres: string[];
  total_read: number;
  reading_streak: number;
  created_at: string | null;
  updated_at?: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  currently_reading: UserBookSummary[];
  liked_books: UserBookSummary[];
  stats?: {
    total_read: number;
    reading_streak: number;
    borrowed_books: number;
    reviews_written: number;
  };
}

/**
 * Recommended user for discovery/community
 */
export interface RecommendedUser {
  id: string;
  username: string | null;
  display_name: string | null;
  // Backward-compat alias because some cards still render `name`.
  name?: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferred_genres: string[];
  followers_count: number;
  total_read: number;
  reading_streak: number;
  is_following: boolean;
}

/**
 * Follow action response
 */
export interface FollowActionResult {
  follower_id: string;
  following_id: string;
  target_followers_count: number;
  actor_following_count: number;
  is_following: boolean;
}

