import type { Review } from './database';

/**
 * Book on shelf with minimal metadata
 */
export interface RakBook {
  key: string; // book.id
  title: string;
  author: string; // First author
  authors?: string[];
  coverId?: number;
  coverUrl?: string;
  cover_url?: string;
  genre: string; // First genre
  genres?: string[];
  rating?: number;
}

/**
 * Borrowed book with loan metadata
 */
export interface PinjamanBook extends RakBook {
  loan_id?: string;
  borrowedAt: string; // loan.borrowed_at
  dueDate: string; // loan.due_at
  daysLeft: number; // Computed
  progress: number; // From reading session if exists
  status?: 'active' | 'returned' | 'overdue' | 'extended';
}

/**
 * Recently returned/completed book
 */
export interface RiwayatBook extends RakBook {
  loan_id?: string;
  returnedAt: string; // loan.returned_at
  readDays: number; // Computed from loan dates
  userRating?: number; // From review
  review?: Review;
}

/**
 * Book in wishlist
 */
export interface WishlistBook extends RakBook {
  addedAt: string; // wishlist.added_at
  available: boolean; // book.available > 0
  total_stock?: number;
  queue_position?: number; // If user is queued
}

/**
 * Book being read with progress
 */
export interface BacaanBook extends RakBook {
  session_id?: string;
  progress: number; // progress_percentage
  lastRead: string; // last_read_at
  totalPages: number;
  currentPage: number;
  reading_status?: 'reading' | 'paused' | 'finished';
  started_at?: string;
}

/**
 * Complete shelf data grouped by category
 */
export interface ShelfData {
  pinjaman: PinjamanBook[];
  dibaca: BacaanBook[];
  wishlist: WishlistBook[];
  riwayat: RiwayatBook[];
  stats?: {
    total_borrowed: number;
    total_reading: number;
    total_wishlist: number;
    total_read: number;
  };
}

/**
 * Shelf tab identifiers
 */
export type ShelfTabId = 'dipinjam' | 'dibaca' | 'wishlist' | 'riwayat';
