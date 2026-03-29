/**
 * Database Schema Types
 * Generated from PostgeSQL schema to match book, users, loans, reviews, etc.
 */

export interface User {
  id: string; // UUID
  firebase_uid: string;
  username: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  preferred_genres: string[];
  reading_streak: number;
  total_read: number;
  created_at: string;
  updated_at: string;
}

export interface UserSurvey {
  id: number;
  userid: string; // UUID, FK to users
  favoritegenre: string | null;
  age: string | null;
  gender: string | null;
  createdat: string;
  updatedat: string;
}

export interface Book {
  id: string;
  external_key: string | null;
  cover_id: number | null;
  title: string;
  authors: string[];
  genres: string[];
  description: string | null;
  year: number | null;
  pages: number | null;
  language: string; // default: 'id'
  avg_rating: number; // numeric(3,2) -> 0.00 to 9.99
  rating_count: number;
  total_stock: number;
  available: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cover_url: string | null;
  file_url: string | null;
  file_size: number | null; // bigint
  file_type: string; // default: 'pdf' - 'pdf' | 'epub' | 'mobi'
  deleted_at: string | null;
  deleted_by: string | null;
  total_pages: number | null;
}

export interface BookWithRelations extends Book {
  reviews?: Review[];
  relatedBooks?: Book[];
  queue_count?: number;
}

// API response types
export interface BookDetail extends Omit<Book, 'external_key' | 'cover_id' | 'file_size' | 'deleted_at' | 'deleted_by'> {
  queue?: number;
  reviews?: Review[];
  relatedBooks?: Partial<Book>[];
}

export interface Loan {
  id: string; 
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  extended: boolean;
  status: 'active' | 'returned' | 'overdue' | 'extended';
}

export interface Queue {
  id: string;
  user_id: string;
  book_id: string;
  position: number;
  joined_at: string;
  notified: boolean;
}

export interface Review {
  id: string; 
  user_id: string;
  book_id: string;
  rating: number;
  body: string | null;
  likes: number;
  created_at: string;
  updated_at: string; 
}

export interface ReviewWithUser extends Review {
  user?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface ReadingSession {
  id: string; 
  user_id: string; 
  book_id: string; 
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  started_at: string;
  last_read_at: string; 
  finished_at: string | null; 
  status: 'reading' | 'paused' | 'finished';
  reading_time_minutes: number;
}

export interface Wishlist {
  user_id: string; // FK users
  book_id: string; // FK books
  added_at: string;
}

export interface Follow {
  follower_id: string; // FK users
  following_id: string; // FK users
  created_at: string; 
}

export type NotificationType = 'borrow' | 'due' | 'like' | 'follow' | 'review' | 'system' | 'queue';

export interface Notification {
  id: string; 
  user_id: string; 
  type: NotificationType;
  title: string;
  body: string;
  book_id: string | null; 
  actor_id: string | null; // FK users (who triggered the notification)
  read: boolean;
  created_at: string; 
}

export interface UserBookScore {
  user_id: string;
  book_id: string; 
  score: number; // numeric(8,3)
  views: number;
  reads: number;
  likes: number;
  bookmarks: number;
  shares: number;
  review_cnt: number;
  updated_at: string;
}

// UNIFIED API RESPONSE TYPES
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
  message?: string;
}

export interface BookWithQueue extends BookDetail {
  queue: number;
  userLoanStatus?: 'borrowed' | 'queued' | 'none';
}

export interface UserSessionWithBooks extends User {
  currently_reading: ReadingSession[];
  wishlisted_books: Wishlist[];
  borrowed_books: Loan[];
}