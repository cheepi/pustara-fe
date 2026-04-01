'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrowseBook } from '@/types/browse';

type ThemeKit = {
  text: string;
  muted: string;
};

export function ShelfBookCard({
  book,
  dark,
  tk,
  index,
}: {
  book: BrowseBook;
  dark: boolean;
  tk: ThemeKit;
  index: number;
}) {
  const isAvailable = book.available !== false;
  const bookId = String(book.key || '').split('/').pop() || String(book.key || '');

  return (
    <Link href={`/book/${bookId}`} className="flex-shrink-0 w-28 group">
      <motion.div
        className={cn(
          'w-full aspect-[2/3] rounded-xl overflow-hidden shadow-sm transition-all relative',
          dark ? 'bg-navy-700' : 'bg-parchment-dark'
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.24) }}
        whileHover={{ y: -4 }}
      >
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-50">
            <BookOpen className="w-5 h-5" />
          </div>
        )}

        <div
          className={cn(
            'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm',
            isAvailable
              ? 'bg-emerald-500/85 text-white border-emerald-300/60'
              : 'bg-rose-500/85 text-white border-rose-300/60'
          )}
        >
          {isAvailable ? 'Available' : 'Tidak tersedia'}
        </div>
      </motion.div>

      <p className={cn('text-[11px] font-semibold mt-1.5 line-clamp-2', tk.text)}>{book.title}</p>
      <p className={cn('text-[10px] line-clamp-1', tk.muted)}>{book.author}</p>
    </Link>
  );
}
