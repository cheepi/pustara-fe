import type { Book, Review as DBReview, BookDetail as DBBookDetail } from './database';

/**
 * UI-specific review model (with user display data)
 * Extends database Review with computed/display fields
 */
export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  rating: number; // 1-5
  body: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
  // UI enrichment fields
  name: string;
  avatar: string;
  text?: string;
  time?: string;
  loc?: string;
}

/**
 * Book detail for display pages
 * Extends DB schema with computed fields
 */
export interface BookDetail extends Omit<Book, 'file_size' | 'deleted_at' | 'deleted_by'> {
  queue: number; // Computed from queue table
  available: number;
  total_stock: number;
  reviews?: Review[];
  relatedBooks?: Partial<Book>[];
  // Optional computed fields
  userLoanStatus?: 'borrowed' | 'queued' | 'none';
  isBorrowed?: boolean;
  isWishlisted?: boolean;
}

/**
 * API Response shape from Express backend
 */
export interface BookApiResponse {
  success: boolean;
  data: BookDetail | BookDetail[];
  message?: string;
  error?: string;
}

/**
 * Paginated list response
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface BooksListApiResponse {
  success: boolean;
  data: BookDetail[];
  pagination: PaginationMeta;
  message?: string;
  error?: string;
}