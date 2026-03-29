'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Star, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchPopularBooks } from '@/lib/browse';
import type { BrowseBook } from '@/types/browse';

const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const GENRES = ['Semua', 'Fiksi', 'Sastra', 'Romance', 'Sejarah', 'Sains', 'Filsafat', 'Biografi'];

const pseudo = (n: number, mn: number, mx: number) =>
  mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);

const getRating  = (coverId?: number, i = 0) => (pseudo((coverId ?? i) + 7, 38, 50) / 10).toFixed(1);
const getReads   = (coverId?: number, i = 0) => Math.floor(pseudo((coverId ?? i) + 1, 1200, 28000));

// Rank badge styles
const RANK = [
  { bg: 'bg-yellow-400', text: 'text-yellow-900', glow: 'shadow-[0_0_24px_rgba(250,204,21,0.4)]', label: 'GOLD'   },
  { bg: 'bg-slate-300',  text: 'text-slate-800',  glow: 'shadow-[0_0_20px_rgba(203,213,225,0.3)]', label: 'SILVER' },
  { bg: 'bg-amber-600',  text: 'text-amber-100',  glow: 'shadow-[0_0_20px_rgba(217,119,6,0.3)]',   label: 'BRONZE' },
];

export default function PopularPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const dark = !isLight;

  const [books,   setBooks]   = useState<BrowseBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [genre,   setGenre]   = useState('Semua');

  useEffect(() => { document.title = 'Pustara | Bacaan Populer'; }, []);

  useEffect(() => {
    setLoading(true);
    fetchPopularBooks(genre, 40).then(setBooks).finally(() => setLoading(false));
  }, [genre]);

  const filtered = books.filter(b =>
    !search ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const tk = {
    text:    dark ? 'text-white'      : 'text-navy-900',
    muted:   dark ? 'text-slate-400'  : 'text-slate-500',
    surface: dark ? 'bg-navy-800/50 border-white/8' : 'bg-white border-parchment-darker',
    input:   dark
      ? 'bg-navy-700/80 border-navy-500 text-white placeholder-slate-500 focus:border-gold/50'
      : 'bg-white border-parchment-darker text-navy-900 placeholder-slate-400 focus:border-gold',
    chip:    dark ? 'bg-navy-700/50 border-white/10 text-white/60' : 'bg-white border-parchment-darker text-slate-600',
    chipAct: 'bg-gold text-navy-900 border-gold',
    skel:    dark ? 'bg-navy-700/60' : 'bg-parchment-darker',
    row:     dark ? 'hover:bg-white/4' : 'hover:bg-navy-50/60',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-6 pb-20">

        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">Peringkat</span>
          </div>
          <h1 className={cn('font-serif text-3xl lg:text-4xl font-black', tk.text)}>Bacaan Populer</h1>
          <p className={cn('text-sm mt-1', tk.muted)}>Buku paling banyak dibaca di Pustara minggu ini</p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari di daftar ini..."
            className={cn('w-full pl-11 pr-10 py-3 border rounded-2xl text-sm outline-none transition-all', tk.input)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: 'none' }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)}
              className={cn('flex-shrink-0 px-4 py-2 rounded-full border text-xs font-semibold transition-all', genre === g ? tk.chipAct : tk.chip)}>
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          /* Skeleton */
          <div className="space-y-3">
            {/* Podium skeleton */}
            <div className="flex gap-3 justify-center mb-6">
              {[180, 220, 180].map((h, i) => (
                <div key={i} className={cn('flex-shrink-0 w-28 rounded-2xl animate-pulse', tk.skel)} style={{ height: h }} />
              ))}
            </div>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className={cn('h-16 rounded-2xl animate-pulse', tk.skel)} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={genre + search}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>

              {/* ══ PODIUM TOP 3 ══ */}
              {top3.length >= 3 && !search && (
                <div className="mb-8">
                  <p className={cn('text-xs font-semibold uppercase tracking-wider mb-4 text-center', tk.muted)}>
                    🏆 Top 3 Minggu Ini
                  </p>

                  {/* Podium layout: #2 left, #1 center (taller), #3 right */}
                  <div className="flex items-end justify-center gap-3">
                    {[1, 0, 2].map((rankIdx, col) => {
                      const b      = top3[rankIdx];
                      const rk     = RANK[rankIdx];
                      const rating = getRating(b.coverId, rankIdx);
                      const reads  = getReads(b.coverId, rankIdx);
                      const isFirst = rankIdx === 0;
                      const src = b.coverUrl || coverUrl(b.coverId, 'M');

                      return (
                        <motion.div key={b.key}
                          className="flex flex-col items-center"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: col * 0.1, type: 'spring', stiffness: 300, damping: 28 }}>

                          {/* Rank label */}
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-2 shadow-lg',
                            rk.bg, rk.text, rk.glow
                          )}>
                            {rankIdx + 1}
                          </div>

                          {/* Cover */}
                          <Link href={`/book/${b.key.split('/').pop()}`}>
                            <div className={cn(
                              'rounded-2xl overflow-hidden shadow-2xl transition-transform hover:-translate-y-1',
                              rk.glow
                            )}
                              style={{ width: isFirst ? 120 : 96, height: isFirst ? 172 : 138 }}>
                              {src
                                ? <img src={src} alt={b.title}
                                    className="w-full h-full object-cover" loading="lazy" />
                                : <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                              }
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="text-center mt-2" style={{ width: isFirst ? 120 : 96 }}>
                            <p className={cn('text-xs font-bold leading-tight line-clamp-2', tk.text)}>
                              {b.title}
                            </p>
                            <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{b.author}</p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                              <span className="text-gold text-[10px] font-bold">{rating}</span>
                              <span className={cn('text-[10px]', tk.muted)}>· {reads.toLocaleString()}x</span>
                            </div>
                          </div>

                          {/* Podium base */}
                          <div className={cn(
                            'mt-3 rounded-t-xl w-full flex items-center justify-center',
                            rk.bg, rk.text
                          )}
                            style={{ height: isFirst ? 40 : 28, width: isFirst ? 120 : 96 }}>
                            <span className="text-[10px] font-black">{rk.label}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ══ RANKED LIST #4+ ══ */}
              {rest.length > 0 && (
                <div>
                  <p className={cn('text-xs font-semibold uppercase tracking-wider mb-3', tk.muted)}>
                    #4 dan seterusnya
                  </p>
                  <div className="flex flex-col gap-1">
                    {rest.map((b, i) => {
                      const rank   = i + 4;
                      const rating = getRating(b.coverId, i + 3);
                      const reads  = getReads(b.coverId, i + 3);
                      const src    = b.coverUrl || coverUrl(b.coverId);

                      return (
                        <motion.div key={b.key}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                          <Link href={`/book/${b.key.split('/').pop()}`}>
                            <div className={cn(
                              'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all cursor-pointer',
                              tk.row
                            )}>
                              {/* Rank number */}
                              <span className={cn('w-7 text-right text-sm font-black flex-shrink-0', tk.muted)}>
                                #{rank}
                              </span>

                              {/* Cover thumbnail */}
                              <div className={cn('w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-md', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
                                {src && <img src={src} alt={b.title} className="w-full h-full object-cover" loading="lazy" />}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-semibold leading-tight truncate', tk.text)}>
                                  {b.title}
                                </p>
                                <p className={cn('text-xs mt-0.5 truncate', tk.muted)}>{b.author}</p>
                              </div>

                              {/* Stats */}
                              <div className="flex-shrink-0 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <Star className="w-3 h-3 text-gold fill-gold" />
                                  <span className="text-gold text-xs font-bold">{rating}</span>
                                </div>
                                <span className={cn('text-[10px]', tk.muted)}>{reads.toLocaleString()}x</span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filtered.length === 0 && (
                <div className={cn('text-center py-20', tk.muted)}>
                  <p className="font-semibold">Tidak ditemukan</p>
                  <p className="text-sm mt-1">Coba kata kunci yang berbeda</p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}