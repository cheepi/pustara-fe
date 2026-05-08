import { fetchBookById } from '@/lib/books';
import { READER_FALLBACK_BOOKS } from '@/data/readerFallback';
import { getBookById } from '@/lib/supabase-admin';
import type { ReaderBook } from '@/types/reader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SAMPLE_PDF = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf';

function formatDueDate(daysAhead = 7): { dueDate: string; daysLeft: number } {
  const now = new Date();
  const due = new Date(now);
  due.setDate(now.getDate() + daysAhead);
  const dueDate = due.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return { dueDate, daysLeft: daysAhead };
}

function toReaderBook(id: string, title: string, author: string, pdfUrl?: string): ReaderBook {
  const { dueDate, daysLeft } = formatDueDate(7);
  return {
    id,
    title,
    author,
    authors: [author],
    cover_url: null,
    file_url: pdfUrl || SAMPLE_PDF,
    file_type: 'pdf',
    dueDate,
    daysLeft,
    pdfUrl: pdfUrl || SAMPLE_PDF,
    currentPage: 1,
    total_pages: 0,
  };
}

export async function fetchReaderBook(bookId: string): Promise<ReaderBook> {
  try {
    const res = await fetch(`${API_URL}/books/${bookId}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data ?? json;
      return {
        id: String(data.id ?? bookId),
        title: String(data.title ?? '-'),
        author: String(data.author ?? data.authors ?? '-'),
        authors: Array.isArray(data.authors) ? data.authors : [String(data.author ?? data.authors ?? '-')],
        cover_url: data.cover_url ?? null,
        file_url: String(data.pdfUrl ?? data.fileUrl ?? data.file_url ?? SAMPLE_PDF),
        file_type: 'pdf',
        dueDate: String(data.dueDate ?? formatDueDate(7).dueDate),
        daysLeft: Number(data.daysLeft ?? 7),
        pdfUrl: String(data.pdfUrl ?? data.fileUrl ?? data.file_url ?? SAMPLE_PDF),
        currentPage: Number(data.currentPage ?? data.current_page ?? 1),
        total_pages: Number(data.total_pages ?? 0),
      };
    }
  } catch {
    // fallback below
  }

  // Try Supabase first for newly uploaded books
  try {
    const supabaseBook = await getBookById(bookId);
    if (supabaseBook && supabaseBook.file_url) {
      return {
        id: supabaseBook.id,
        title: supabaseBook.title,
        author: supabaseBook.authors[0] || 'Unknown',
        authors: supabaseBook.authors,
        cover_url: supabaseBook.cover_url ?? null,
        file_url: supabaseBook.file_url,
        file_type: 'pdf',
        dueDate: formatDueDate(7).dueDate,
        daysLeft: 7,
        pdfUrl: supabaseBook.file_url,
        currentPage: 1,
        total_pages: supabaseBook.pages || 0,
      };
    }
  } catch {
    // fallback to fetchBookById
  }

  const fromBooks = await fetchBookById(bookId);
  if (fromBooks) {
    return toReaderBook(fromBooks.id, fromBooks.title, fromBooks.authors[0] || 'Unknown');
  }

  return READER_FALLBACK_BOOKS[bookId] ?? READER_FALLBACK_BOOKS.d1;
}
