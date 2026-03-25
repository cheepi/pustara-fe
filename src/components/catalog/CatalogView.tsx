'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sun, Moon, Medal, TrendingUp, X, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { CTASection } from './CTASection';
import PopularCarousel, { PopularBook } from '@/components/shared/PopularCarousel';
import { useTheme } from '@/components/theme/ThemeProvider';
import Link from 'next/link';
import { useTrendingBooks } from '@/hooks/useTrendingBooks';
import { fetchBrowseBooks, fetchTopPustakrew } from '@/lib/browse';
import { BROWSE_POPULAR_BOOKS } from '@/data/browseFallback';
import type { BrowseBook } from '@/types/browse';

// ── Types & constants ──────────────────────────────────────────────────────────
const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const GENRE_QUERIES: Record<string, string> = {
  trending:   'subject:fiction&sort=rating',
  fiction:    'subject:fiction',
  history:    'subject:history',
  science:    'subject:science',
  philosophy: 'subject:philosophy',
  biography:  'subject:biography',
  romance:    'subject:romance',
};

const GENRES = [
  { id: 'trending',   label: 'Terpopuler', emoji: '🔥' },
  { id: 'fiction',    label: 'Fiksi',      emoji: '📖' },
  { id: 'history',    label: 'Sejarah',    emoji: '🏛️' },
  { id: 'science',    label: 'Sains',      emoji: '🔬' },
  { id: 'philosophy', label: 'Filsafat',   emoji: '🧠' },
  { id: 'biography',  label: 'Biografi',   emoji: '👤' },
  { id: 'romance',    label: 'Romansa',    emoji: '💕' },
];

const RANK_STYLE = [
  { badge: 'bg-yellow-400 text-yellow-900', ring: 'ring-yellow-400/40', z: 'z-30', label: '#1' },
  { badge: 'bg-slate-300 text-slate-700',   ring: 'ring-slate-300/30',  z: 'z-20', label: '#2' },
  { badge: 'bg-amber-600 text-amber-100',   ring: 'ring-amber-500/30',  z: 'z-10', label: '#3' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CatalogView() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  const [genre, setGenre]     = useState('trending');
  const [books, setBooks]     = useState<BrowseBook[]>([]);
  const [top3, setTop3]       = useState<BrowseBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [timer, setTimer]     = useState<ReturnType<typeof setTimeout>>();

  const { books: popularBooks, loading: popularLoading } = useTrendingBooks(6);
  const popularFallbackBooks: PopularBook[] = BROWSE_POPULAR_BOOKS.map((b) => ({
    key: b.key,
    title: b.title,
    author: b.author,
    coverUrl: b.coverUrl,
    coverId: b.coverId,
    genre: b.genres,
    desc: b.desc,
    year: b.year ? String(b.year) : '',
    pages: b.pages,
    avgRating: b.rating,
  }));
  const popularBooksForCarousel = popularBooks.length > 0 ? popularBooks : popularFallbackBooks;
  
  // ── Token classes ──
  const tk = {
    text:     dark ? 'text-white'       : 'text-navy-900',
    muted:    dark ? 'text-slate-500'   : 'text-slate-500',
    card:     dark ? 'bg-navy-700'      : 'bg-parchment-dark',
    skeleton: dark ? 'bg-navy-700/60'   : 'bg-parchment-darker',
    input:    dark
      ? 'bg-navy-700/80 border-navy-500 text-white placeholder-slate-500 focus:border-gold/50'
      : 'bg-white border-parchment-darker text-navy-900 placeholder-slate-400 focus:border-gold',
    chip: dark
      ? 'border-navy-500 text-slate-400 hover:border-gold/40 hover:text-slate-200'
      : 'border-parchment-darker text-slate-500 hover:border-gold/60 hover:text-slate-700',
    chipActive: 'border-gold text-gold bg-gold/10',
    toggle: dark
      ? 'bg-navy-700/50 border-white/10 text-slate-300 hover:text-white hover:border-white/20'
      : 'bg-white border-parchment-darker text-slate-500 hover:text-slate-700',
  };

  // ── Load top3 on mount ──
  useEffect(() => {
    fetchTopPustakrew(3).then(setTop3).catch(() => setTop3([]));
  }, []);

  // ── Load by genre ──
  const load = useCallback(async (g: string) => {
    setLoading(true);
    const query = GENRE_QUERIES[g] || `subject:${g}`;
    try { setBooks(await fetchBrowseBooks(query)); }
    catch { setBooks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(genre); }, [genre, load]);

  // ── Debounced search ──
  function handleSearch(q: string) {
    setSearch(q);
    clearTimeout(timer);
    if (!q) { load(genre); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setBooks(await fetchBrowseBooks(q));
      } finally { setLoading(false); }
    }, 450);
    setTimer(t);
  }

  // const sectionLabel = search
  //   ? `Hasil "${search}"`
  //   : GENRES.find(g => g.id === genre)?.label ?? '';
 const sectionLabel = `${search ? `Hasil untuk "${search}"` :''}`;
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — headline + top3 fanned covers
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">

          {/* ── LEFT: headline + tagline ── */}
          <motion.div className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-gold/70 text-xs font-semibold uppercase tracking-widest mb-2">
                  Katalog Publik · Gratis
                </p>
                <h1 className={cn('font-serif text-3xl lg:text-5xl font-black leading-tight mb-2', tk.text)}>
                  Perpustakaan Digital<br />
                  <span className="text-gold">Nusantara.</span>
                </h1>
                <p className={cn('text-sm leading-relaxed max-w-sm', tk.muted)}>
                  Jelajahi ribuan buku — fiksi, sejarah, sains, dan sastra Indonesia. Tanpa akun, tanpa biaya.
                </p>
              </div>

              {/* Theme toggle */}
              <button onClick={toggle}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                  tk.toggle
                )}>
                {dark
                  ? <><Sun className="w-3.5 h-3.5 text-gold" /><span className="hidden sm:inline">Terang</span></>
                  : <><Moon className="w-3.5 h-3.5" /><span className="hidden sm:inline">Gelap</span></>
                }
              </button>
            </div>

            {/* CTA pills */}
            <motion.div className="flex gap-2 flex-wrap mb-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Link href="/auth/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-yellow-400 transition-all shadow-md shadow-gold/20">
                Daftar Gratis →
              </Link>
              <Link href="/auth/login"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-all',
                  dark ? 'border-white/15 text-white/70 hover:bg-white/5' : 'border-navy-200 text-navy-700 hover:bg-parchment'
                )}>
                Sudah punya akun
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div className="flex gap-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {[['10K+', 'Judul Buku'], ['500+', 'Penulis'], ['50K+', 'Pembaca']].map(([v, l]) => (
                <div key={l}>
                  <p className="font-serif text-xl font-black text-gold">{v}</p>
                  <p className={cn('text-[11px] mt-0.5', tk.muted)}>{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── RIGHT: top 3 fanned covers ── */}
          {top3.length > 0 && (
            <motion.div className="flex-shrink-0 relative hidden md:flex justify-center"
              style={{ width: 260, height: 220 }}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
                <Medal className="w-3 h-3 text-gold" />
                <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">Pustakrew's Top Pick</span>
              </div>
              {[...top3].reverse().map((b, ri) => {
                const i   = top3.length - 1 - ri;
                const rs  = RANK_STYLE[i];
                const src = b.coverUrl || coverUrl(b.coverId);
                const xOff = [0, -68, 68][i];
                const yOff = [0, 22, 30][i];
                const rot  = [0, -9, 10][i];
                return (
                  <motion.div key={b.key}
                    className={cn('absolute cursor-pointer p-2', rs.z)}
                    style={{ x: xOff, y: yOff + 20, rotate: rot }}
                    whileHover={{ y: yOff + 20 - 20, rotate: 0, scale: 1.08, zIndex: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}>
                    <div className={cn(
                      'rounded-2xl overflow-hidden shadow-2xl ring-2',
                      rs.ring, tk.card,
                      i === 0 ? 'w-28 h-40' : 'w-24 h-36'
                    )}>
                      {src && (
                        <img src={src} alt={b.title}
                          className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className={cn(
                      'absolute top-4 left-4 px-2 py-0.5 rounded-full text-[11px] font-black shadow-lg',
                      rs.badge
                    )}>
                      {rs.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BACAAN POPULER CAROUSEL
      ══════════════════════════════════════════ */}
      <section className="mt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Bacaan Populer</h2>
          </div>
          <Link href="/popular" className="text-gold text-xs font-medium hover:underline">
            Lihat semua →
          </Link>
        </div>
        <PopularCarousel books={popularBooksForCarousel} isLight={!dark} />
      </section>

      {/* ══════════════════════════════════════════
          SEARCH + GENRE FILTER
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="mb-4">
          <h2 className={cn('font-serif text-2xl font-black mb-1', tk.text)}>Katalog Buku</h2>
          <p className={cn('text-sm', tk.muted)}>Temukan buku yang kamu cari</p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-lg mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari judul, penulis, atau topik…"
            className={cn(
              'w-full pl-11 pr-10 py-3.5 border rounded-2xl text-sm outline-none ring-2 ring-transparent transition-all',
              tk.input
            )}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); load(genre); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Genre chips
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          {GENRES.map(g => (
            <button key={g.id}
              onClick={() => { setGenre(g.id); setSearch(''); }}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all border',
                genre === g.id && !search ? tk.chipActive : tk.chip
              )}>
              <span>{g.emoji}</span> {g.label}
            </button>
          ))}
        </div> */}
      </section>

      {/* ══════════════════════════════════════════
          BOOKS GRID
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-serif text-lg font-bold')}>
            {sectionLabel}
          </h3>
          {!loading && books.length > 0 && (
            <span className={cn('text-xs', tk.muted)}>{books.length} judul</span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton"
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {Array(24).fill(0).map((_, i) => (
                <div key={i}>
                  <div className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', tk.skeleton)} />
                  <div className={cn('h-2.5 rounded mt-2 w-3/4 animate-pulse', tk.skeleton)} />
                  <div className={cn('h-2 rounded mt-1 w-1/2 animate-pulse', tk.skeleton)} />
                </div>
              ))}
            </motion.div>
          ) : books.length === 0 ? (
            <motion.div key="empty"
              className={cn('text-center py-20', tk.muted)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SearchX className="w-16 h-16 mx-auto mb-3" />
              <p className="font-semibold">Buku tidak ditemukan</p>
              <p className="text-sm mt-1">Coba kata kunci yang berbeda</p>
            </motion.div>
          ) : (
            <motion.div key={`grid-${genre}-${search}`}
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {books.map((b, i) => (
                <BookCard key={b.key} book={b} index={i} dark={dark} cardCls={tk.card} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION 
      ══════════════════════════════════════════ */}
      <CTASection dark={dark} />
    </div>
  );
}

// ── BookCard ───────────────────────────────────────────────────────────────────
function BookCard({
  book, index, dark, cardCls,
}: {
  book: BrowseBook; index: number; dark: boolean; cardCls: string;
}) {
  const src = book.coverUrl || coverUrl(book.coverId);
  return (
    <motion.div
      className="cursor-pointer group"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.3) }}
      whileHover={{ y: -5 }}
      onClick={() => window.location.href = `/book/${book.key.split('/').pop()}`}>
      <div className={cn(
        'w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md relative',
        cardCls
      )}>
        {src && (
          <img
            src={src}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
        {/* hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl" />
      </div>
      <p className={cn(
        'text-[11px] font-medium mt-1.5 leading-tight line-clamp-2',
        dark ? 'text-white' : 'text-navy-900'
      )}>
        {book.title}
      </p>
      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{book.author}</p>
    </motion.div>
  );
}