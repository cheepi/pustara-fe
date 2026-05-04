'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchGenres, fetchBooksByGenre } from '@/lib/browse';
import { Grid2X2, Search, X, SearchX } from 'lucide-react';
import type { BrowseBook } from '@/types/browse';

export default function BrowseGenrePage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [books, setBooks] = useState<BrowseBook[]>([]);
  const [search, setSearch] = useState('');
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const tk = {
    text: dark ? 'text-white' : 'text-navy-900',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    bg: dark ? 'bg-navy-900' : 'bg-white',
    card: dark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-slate-50 hover:bg-slate-100',
    chip: dark ? 'bg-navy-700 border-navy-500 text-white' : 'bg-white border-slate-300 text-navy-900',
    chipActive: 'bg-gold text-navy-900 border-gold',
    input: dark
      ? 'bg-navy-800 border-navy-600 text-white placeholder-slate-500'
      : 'bg-white border-slate-300 text-navy-900 placeholder-slate-400',
  };

  // Load genres on mount
  useEffect(() => {
    (async () => {
      setLoadingGenres(true);
      const genreList = await fetchGenres();
      setGenres(genreList);
      if (genreList.length > 0) {
        setSelectedGenre(genreList[0]);
      }
      setLoadingGenres(false);
    })();
  }, []);

  // Load books when genre changes
  useEffect(() => {
    if (!selectedGenre) return;

    (async () => {
      setLoadingBooks(true);
      const bookList = await fetchBooksByGenre(selectedGenre, 48);
      setBooks(bookList);
      setLoadingBooks(false);
    })();
  }, [selectedGenre]);

  const filteredBooks = books.filter(b =>
    !search ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Grid2X2 className="w-5 h-5 text-gold" />
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">Jelajahi</span>
          </div>
          <h1 className={cn('font-serif text-4xl font-black mb-1', tk.text)}>
            Telusuri Berdasarkan Kategori
          </h1>
          <p className={cn('text-sm', tk.muted)}>
            Pilih genre favorit Anda dan temukan buku-buku menarik
          </p>
        </motion.div>

        {/* Genre List */}
        <div className="mb-8">
          <h2 className={cn('text-sm font-semibold mb-3 uppercase tracking-wider', tk.muted)}>
            Kategori
          </h2>
          {loadingGenres ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={cn('h-10 w-24 rounded-full animate-pulse', dark ? 'bg-navy-700' : 'bg-slate-200')}
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {genres.map(genre => (
                <motion.button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={cn(
                    'px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all',
                    selectedGenre === genre ? tk.chipActive : tk.chip
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}>
                  {genre}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari di kategori ini..."
              className={cn(
                'w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm outline-none transition-all',
                tk.input
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Genre Title & Count */}
        {selectedGenre && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between">
              <h2 className={cn('font-serif text-2xl font-bold', tk.text)}>
                 {selectedGenre}
              </h2>
              {!loadingBooks && (
                <span className={cn('text-sm', tk.muted)}>
                  {filteredBooks.length} buku ditemukan
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Books Grid */}
        <AnimatePresence mode="wait">
          {loadingBooks ? (
            <motion.div
              key="loading"
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}>
              {[...Array(24)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={cn(
                      'w-full aspect-[2/3] rounded-lg animate-pulse',
                      dark ? 'bg-navy-700' : 'bg-slate-200'
                    )}
                  />
                  <div className={cn('h-2 rounded animate-pulse', dark ? 'bg-navy-700' : 'bg-slate-200')} />
                  <div className={cn('h-2 rounded w-2/3 animate-pulse', dark ? 'bg-navy-700' : 'bg-slate-200')} />
                </div>
              ))}
            </motion.div>
          ) : filteredBooks.length === 0 ? (
            <motion.div
              key="empty"
              className={cn('flex flex-col items-center justify-center py-20', tk.muted)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}>
              <SearchX className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-semibold">Buku tidak ditemukan</p>
              <p className="text-sm mt-1 opacity-70">Coba kategori atau pencarian yang berbeda</p>
            </motion.div>
          ) : (
            <motion.div
              key={`books-${selectedGenre}`}
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              {filteredBooks.map((book, idx) => (
                <motion.button
                  key={book.key}
                  className="text-left group cursor-pointer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={{ y: -4 }}
                  onClick={() => (window.location.href = `/book/${book.key}`)}>
                  <div
                    className={cn(
                      'w-full aspect-[2/3] rounded-lg overflow-hidden shadow-md relative transition-all',
                      tk.card
                    )}>
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className={cn('w-full h-full flex items-center justify-center', dark ? 'bg-navy-700' : 'bg-slate-300')}>
                        <span className="text-2xl">📖</span>
                      </div>
                    )}
                  </div>
                  <p className={cn('text-xs font-medium mt-2 line-clamp-2 leading-tight', tk.text)}>
                    {book.title}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5 truncate">{book.author}</p>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
