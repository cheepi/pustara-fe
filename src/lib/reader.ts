import { fetchBookById } from '@/lib/books';
import { READER_FALLBACK_BOOKS } from '@/data/readerFallback';
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
        total_pages: Number(data.total_pages ?? 0),
      };
    }
  } catch {
    // fallback below
  }

  const fromBooks = await fetchBookById(bookId);
  if (fromBooks) {
    return toReaderBook(fromBooks.id, fromBooks.title, fromBooks.authors[0] || 'Unknown');
  }

  return READER_FALLBACK_BOOKS[bookId] ?? READER_FALLBACK_BOOKS.d1;
}
