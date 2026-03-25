import type { ReaderBook } from '@/types/reader';

const SAMPLE_PDF = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf';

export const READER_FALLBACK_BOOKS: Record<string, ReaderBook> = {
  d1: { id: 'd1', title: 'Laskar Pelangi', author: 'Andrea Hirata', dueDate: '18 Mar 2026', daysLeft: 0, pdfUrl: SAMPLE_PDF },
  d2: { id: 'd2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', dueDate: '21 Mar 2026', daysLeft: 3, pdfUrl: SAMPLE_PDF },
  d3: { id: 'd3', title: 'Cantik Itu Luka', author: 'Eka Kurniawan', dueDate: '22 Mar 2026', daysLeft: 4, pdfUrl: SAMPLE_PDF },
  d4: { id: 'd4', title: 'Perahu Kertas', author: 'Dee Lestari', dueDate: '22 Mar 2026', daysLeft: 4, pdfUrl: SAMPLE_PDF },
  d5: { id: 'd5', title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', dueDate: '23 Mar 2026', daysLeft: 5, pdfUrl: SAMPLE_PDF },
  d6: { id: 'd6', title: 'Ayah', author: 'Andrea Hirata', dueDate: '24 Mar 2026', daysLeft: 6, pdfUrl: SAMPLE_PDF },
};
