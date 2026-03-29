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
    dueDate,
    daysLeft,
    pdfUrl: pdfUrl || SAMPLE_PDF,
  };
}

export async function fetchReaderBook(bookId: string): Promise<ReaderBook> {
  try {
    // Try fetch from /books/:id endpoint (yang ada di backend)
    const res = await fetch(`${API_URL}/books/${bookId}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const data = json?.data ?? json;
      return {
        id: String(data.id ?? bookId),
        title: String(data.title ?? '-'),
        author: String(data.author ?? data.authors ?? '-'),
        dueDate: String(data.dueDate ?? formatDueDate(7).dueDate),
        daysLeft: Number(data.daysLeft ?? 7),
        pdfUrl: String(data.pdfUrl ?? data.fileUrl ?? data.file_url ?? SAMPLE_PDF),
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
