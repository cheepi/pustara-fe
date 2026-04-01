'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GenreShelf } from '@/hooks/useGenreShelves';
import { ShelfBookCard } from './ShelfBookCard';

type ThemeKit = {
  text: string;
  muted: string;
};

export function GenreShelfRow({
  shelf,
  dark,
  tk,
  rowIndex,
}: {
  shelf: GenreShelf;
  dark: boolean;
  tk: ThemeKit;
  rowIndex: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rowIndex * 0.05 }}
      className={cn(
        'rounded-2xl border p-4',
        dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker'
      )}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className={cn('font-serif text-base font-bold truncate', tk.text)}>{shelf.label}</h3>
        <Link
          href={`/browse?q=${encodeURIComponent(shelf.label)}`}
          className={cn('text-xs font-semibold text-gold hover:underline whitespace-nowrap')}
        >
          Lihat semua →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {shelf.books.map((book, bookIndex) => (
          <ShelfBookCard
            key={`${shelf.id}-${book.key}`}
            book={book}
            dark={dark}
            tk={tk}
            index={bookIndex}
          />
        ))}

        {shelf.books.length === 0 && <p className={cn('text-xs', tk.muted)}>Belum ada buku pada kurasi ini.</p>}
      </div>
    </motion.div>
  );
}
