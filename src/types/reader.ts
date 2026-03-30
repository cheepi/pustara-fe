import type { ReadingSession, Book } from './database';

/**
 * Book being read with session data
 */
export interface ReaderBook extends Pick<Book, 'id' | 'title' | 'authors' | 'cover_url' | 'file_url' | 'file_type' | 'total_pages'> {
  reading_session?: ReadingSession;
  dueDate?: string; 
  daysLeft?: number;
  author: string; 
  pdfUrl?: string;
}

/**
 * Reading progress update payload
 */
export interface ReadingProgressUpdate {
  book_id: string;
  current_page: number;
  reading_time_minutes?: number;
}

/**
 * Reading statistics
 */
export interface ReadingStats {
  total_minutes: number;
  pages_read: number;
  average_per_day: number;
  current_streak: number;
  longest_streak: number;
}

