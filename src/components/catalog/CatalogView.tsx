'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sun, Moon, Medal, TrendingUp, X, SearchX, Sparkles, BookOpen, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { CTASection } from './CTASection';
import PopularCarousel, { PopularBook } from '@/components/shared/PopularCarousel';
import { GenreShelfSection } from '@/components/shared/GenreShelfSection';
import { useTheme } from '@/components/theme/ThemeProvider';
import Link from 'next/link';
import { useTrendingBooks } from '@/hooks/useTrendingBooks';
import { useGenreShelves } from '@/hooks/useGenreShelves';
import { fetchBrowseBooks, fetchTopPustakrew } from '@/lib/browse';
import { proxyMediaUrl } from '@/lib/media';
import type { BrowseBook } from '@/types/browse';

// ── Types & constants ──────────────────────────────────────────────────────────
const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const RANK_STYLE = [
  { badge: 'bg-yellow-400 text-yellow-900', ring: 'ring-yellow-400/40', z: 'z-30', label: '#1' },
  { badge: 'bg-slate-300 text-slate-700',   ring: 'ring-slate-300/30',  z: 'z-20', label: '#2' },
  { badge: 'bg-amber-600 text-amber-100',   ring: 'ring-amber-500/30',  z: 'z-10', label: '#3' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CatalogView() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  const [books, setBooks]     = useState<BrowseBook[]>([]);
  const [top3, setTop3]       = useState<BrowseBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [timer, setTimer]     = useState<ReturnType<typeof setTimeout>>();

  const { books: popularBooks, loading: popularLoading } = useTrendingBooks(6);
  const {
    shelves: genreShelves,
    loading: genreShelvesLoading,
    error: genreShelvesError,
  } = useGenreShelves({ targetGenres: ['Misteri', 'Fiksi', 'Non-fiksi'], booksLimit: 13 });
  const popularBooksForCarousel = popularBooks;
  
  const [recentBooks, setRecentBooks] = useState<{
    book_id: string; key: string; title: string; author: string;
    genre: string; rating: number; cover_url: string | null; description: string;
  }[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [stats, setStats] = useState({
    totalBooks: 10000,
    readers: 50000,
    rating: 4.8,
  });

  useEffect(() => {
    let active = true;

    async function loadStats() {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const base = apiBase.replace(/\/$/, '');

      try {
        const [booksRes, communityRes, recentRes] = await Promise.all([
          fetch(`${base}/books?limit=1`),
          fetch(`${base}/reviews/stats`),
          fetch(`${base}/books/recent?limit=20`),
        ]);

        const booksJson = booksRes.ok ? await booksRes.json() : null;
        const communityJson = communityRes.ok ? await communityRes.json() : null;
        const recentJson = recentRes.ok ? await recentRes.json() : null;

        if (!active) return;

        const totalBooks = Number(
          booksJson?.pagination?.total
          ?? booksJson?.pagination?.total_items
          ?? booksJson?.data?.length
          ?? 0
        );
        const readers = Number(
          communityJson?.data?.raw?.total_readers
          ?? communityJson?.data?.readers
          ?? 0
        );
        const recentBooks = Array.isArray(recentJson?.data) ? recentJson.data : [];
        const ratingValues = recentBooks
          .map((book: Record<string, unknown>) => Number(book.avg_rating ?? book.rating ?? 0))
          .filter((value: number) => Number.isFinite(value) && value > 0);
        const rating = ratingValues.length > 0
          ? ratingValues.reduce((sum: number, value: number) => sum + value, 0) / ratingValues.length
          : 0;

        setStats((current) => ({
          totalBooks: totalBooks > 0 ? totalBooks : current.totalBooks,
          readers: readers > 0 ? readers : current.readers,
          rating: rating > 0 ? Number(rating.toFixed(1)) : current.rating,
        }));
      } catch {
        // Keep fallback values if public stats endpoints are unavailable.
      }
    }

    void loadStats();

    return () => {
      active = false;
    };
  }, []);


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
  
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiBase) { setRecentLoading(false); return; }
    let active = true;
    fetch(`${apiBase.replace(/\/$/, '')}/books/recent?limit=4`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        if (!active) return;
        const raw = Array.isArray(json) ? json : json?.data ?? [];
        setRecentBooks(raw.map((b: Record<string, unknown>) => ({
          book_id: String(b.book_id ?? b.id ?? ''),
          key: String(b.key ?? b.book_id ?? b.id ?? ''),
          title: String(b.title ?? ''),
          author: Array.isArray(b.authors)
            ? b.authors.map(String).join(', ')
            : String(b.author ?? b.authors ?? ''),
          genre: Array.isArray(b.genres)
            ? b.genres.map(String).filter(Boolean)[0] ?? '-'
            : String(b.genre ?? b.genres ?? '-').split(',')[0].trim(),
          rating: Number(b.rating ?? b.avg_rating ?? 0),
          cover_url: b.cover_url ? proxyMediaUrl(String(b.cover_url)) : null,
          description: String(b.description ?? ''),
        })));
      })
      .catch(() => { if (active) setRecentBooks([]); })
      .finally(() => { if (active) setRecentLoading(false); });
    return () => { active = false; };
  }, []);

  // ── Debounced search ──
  function handleSearch(q: string) {
    setSearch(q);
    clearTimeout(timer);
    if (!q.trim()) {
      setBooks([]);
      setLoading(false);
      return;
    }
    // Show skeleton immediately while waiting for debounced request.
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setBooks(await fetchBrowseBooks(q.trim()));
      } finally { setLoading(false); }
    }, 450);
    setTimer(t);
  }

  // const sectionLabel = search
  //   ? `Hasil "${search}"`
  //   : GENRES.find(g => g.id === genre)?.label ?? '';
  const hasSearched = search.trim().length > 0;
  const sectionLabel = hasSearched ? `Hasil untuk "${search.trim()}"` : '';
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

            <motion.div className="flex gap-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {[
                [stats.totalBooks, 'Judul Buku'],
                [stats.readers, 'Pembaca'],
                [stats.rating, 'Rating'],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="font-serif text-2xl font-black text-gold">
                    {typeof value === 'number' && value < 100 ? value.toFixed(label === 'Rating' ? 1 : 0) : Number(value).toLocaleString('id-ID')}{label === 'Rating' ? '' : '+'}
                  </div>
                  <div className={cn('text-[11px] mt-0.5', tk.muted)}>{label}</div>
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
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="mb-4">
          <h2 className={cn('font-serif text-2xl font-black mb-1', tk.text)}>Cari Buku</h2>
          <p className={cn('text-sm', tk.muted)}>Lihat apakah buku yang kamu cari ada di Pustara</p>
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
              onClick={() => {
                setSearch('');
                setBooks([]);
                setLoading(false);
                clearTimeout(timer);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {hasSearched && (
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
            <motion.div key={`grid-${search}`}
              className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {books.map((b, i) => (
                <BookCard key={b.key} book={b} index={i} dark={dark} cardCls={tk.card} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      )}

      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold" />
          <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Kurasi Berdasarkan Genre</h2>
        </div>
        <GenreShelfSection
          dark={dark}
          tk={tk}
          shelves={genreShelves}
          loading={genreShelvesLoading}
          error={genreShelvesError}
        />
      </section>

      {!recentLoading && recentBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-16 mb-[-86px]" id="recent">

          {/* Section header */}
          <div className="flex flex-col items-center text-center mb-14">
            <motion.p
              className="text-gold text-xs tracking-[0.3em] uppercase font-semibold mb-4 flex items-center gap-2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="w-3 h-3" />
              Koleksi Terbaru
            </motion.p>
            <motion.h3
              className={cn('font-serif text-4xl md:text-6xl font-black leading-none', tk.text)}
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              Baru Ditambahkan
            </motion.h3>
          </div>

          {/* Cards */}
          <div className="flex flex-col">
            {recentBooks.map((book, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={book.book_id}
                  className={cn(
                    'relative flex flex-col items-center gap-8',
                    'md:flex-row md:items-center md:gap-0',
                    !isEven && 'md:flex-row-reverse',
                    'min-h-[60vh] py-12 md:py-20 group',
                    index < recentBooks.length - 1 && 'border-b',
                  )}
                  style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(13,24,41,0.07)' }}
                >
                  {/* Giant watermark number */}
                  <motion.div
                    className={cn(
                      'absolute leading-none select-none pointer-events-none z-0 font-serif font-black',
                      'text-[10rem] md:text-[22rem]',
                      isEven ? 'left-0' : 'right-0',
                    )}
                    style={{ color: dark ? 'rgba(255,255,255,0.025)' : 'rgba(13,24,41,0.04)' }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </motion.div>

                  {/* Cover */}
                  <div className={cn(
                    'w-full md:w-1/2 flex z-10',
                    isEven ? 'justify-center md:justify-end md:pr-12' : 'justify-center md:justify-start md:pl-12',
                  )}>
                    <motion.div
                      className="relative w-full max-w-[240px] md:w-[300px] aspect-[2/3] rounded-2xl overflow-hidden"
                      style={{
                        boxShadow: dark
                          ? '0 20px 60px rgba(0,0,0,0.5)'
                          : '0 20px 60px rgba(13,24,41,0.15)',
                        border: '1px solid var(--border)',
                      }}
                      initial={{ clipPath: 'inset(100% 0 0 0)' }}
                      whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
                      viewport={{ once: true, margin: '-15%' }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 1.3 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true, margin: '-15%' }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: dark ? '#172944' : '#e8e2d6' }}
                          >
                            <BookOpen className="w-12 h-12 opacity-20 text-gold" />
                          </div>
                        )}
                      </motion.div>
                      {/* Spine shadow */}
                      <div
                        className={cn('absolute inset-y-0 w-6 z-10 pointer-events-none', isEven ? 'left-0' : 'right-0')}
                        style={{
                          background: isEven
                            ? `linear-gradient(to right, ${dark ? 'rgba(13,24,41,0.5)' : 'rgba(13,24,41,0.12)'}, transparent)`
                            : `linear-gradient(to left, ${dark ? 'rgba(13,24,41,0.5)' : 'rgba(13,24,41,0.12)'}, transparent)`,
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Text content */}
                  <motion.div
                    className={cn(
                      'w-full md:w-1/2 flex flex-col z-20 px-4 md:px-0',
                      isEven
                        ? 'items-center text-center md:items-start md:text-left md:-ml-8'
                        : 'items-center text-center md:items-end md:text-right md:-mr-8',
                    )}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-15%' }}
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
                    }}
                  >
                    {/* Genre pill */}
                    <motion.span
                      className="text-[11px] uppercase tracking-[0.18em] font-semibold px-3.5 py-1.5 rounded-full mb-5"
                      style={{
                        background: 'rgba(201,168,76,0.1)',
                        color: '#C9A84C',
                        border: '1px solid rgba(201,168,76,0.25)',
                      }}
                      variants={{
                        hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      {book.genre}
                    </motion.span>

                    {/* Title */}
                    <motion.h3
                      className={cn('font-serif font-black leading-[1.05] mb-2', tk.text)}
                      style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}
                      variants={{
                        hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      {book.title}
                    </motion.h3>

                    {/* Author */}
                    <motion.p
                      className="font-serif italic text-xl md:text-2xl mb-6"
                      style={{ color: '#E2C06A' }}
                      variants={{
                        hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      {book.author}
                    </motion.p>

                    <motion.div
                      className={cn('w-full max-w-sm', !isEven && 'md:ml-auto')}
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
                      }}
                    >
                      {/* Description */}
                      <p className={cn('text-sm leading-relaxed mb-6', tk.muted)}>
                        {book.description}
                      </p>

                      {/* Rating + CTA */}
                      <div className={cn(
                        'flex items-center justify-center gap-3',
                        !isEven && 'md:justify-end',
                      )}>
                        <div
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                          style={{
                            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(13,24,41,0.06)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                          <span className={cn('font-bold text-sm', tk.text)}>
                            {book.rating.toFixed(1)}
                          </span>
                        </div>
                        <Link
                          href={`/book/${book.key}`}
                          className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5"
                          style={{ background: '#C9A84C', color: '#1a1000' }}
                        >
                          Lihat Detail
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Fan CTA ending */}
          <div className="relative flex flex-col items-center py-20 mt-4 border-t"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(13,24,41,0.08)' }}>

            <motion.div
              className="text-center mb-14 relative z-10"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className={cn('font-serif text-3xl md:text-5xl italic font-bold mb-2', tk.text)}>
                Masih banyak lagi.
              </h3>
              <p className={cn('text-xs uppercase tracking-widest font-semibold', tk.muted)}>
                Eksplorasi ratusan judul di Pustara
              </p>
            </motion.div>

            {/* Fan of covers */}
            <motion.div
              className="relative w-full max-w-[600px] h-[220px] flex items-center justify-center mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-10%' }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }}
              />
              {[
                { xOff: -160, yOff: 40,  rot: -28, opacity: 0.3, scale: 0.72, grayscale: true,  delay: 0,    coverIdx: 1 },
                { xOff: -80,  yOff: 10,  rot: -14, opacity: 0.6, scale: 0.85, grayscale: false, delay: 0.08, coverIdx: 2 },
                { xOff:  80,  yOff: 10,  rot:  14, opacity: 0.6, scale: 0.85, grayscale: false, delay: 0.16, coverIdx: 0 },
                { xOff:  160, yOff: 40,  rot:  28, opacity: 0.3, scale: 0.72, grayscale: true,  delay: 0.24, coverIdx: 3 },
                { xOff:  0,   yOff: -12, rot:  0,  opacity: 1.0, scale: 1.0,  grayscale: false, delay: 0.32, coverIdx: 0 },
              ].map((card, i) => {
                const src = recentBooks[card.coverIdx % recentBooks.length]?.cover_url;
                const isFront = i === 4;
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-xl overflow-hidden"
                    style={{
                      width: isFront ? 130 : 110,
                      aspectRatio: '2/3',
                      border: isFront
                        ? '1px solid rgba(201,168,76,0.4)'
                        : '1px solid var(--border)',
                      boxShadow: isFront
                        ? '0 20px 50px rgba(0,0,0,0.4)'
                        : '0 8px 24px rgba(0,0,0,0.25)',
                      zIndex: i,
                    }}
                    variants={{
                      hidden: { opacity: 0, y: 80, x: 0, rotate: 0, scale: 0.8 },
                      visible: {
                        opacity: card.opacity,
                        y: card.yOff,
                        x: card.xOff,
                        rotate: card.rot,
                        scale: card.scale,
                        transition: { type: 'spring', bounce: 0.35, duration: 1.2, delay: card.delay },
                      },
                    }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: card.grayscale ? 'grayscale(1)' : 'none' }}
                      />
                    ) : (
                      <div style={{ background: dark ? '#172944' : '#e8e2d6', width: '100%', height: '100%' }} />
                    )}
                    {!isFront && (
                      <div
                        className="absolute inset-0"
                        style={{ background: dark ? 'rgba(13,24,41,0.45)' : 'rgba(255,255,255,0.4)' }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

          </div>
        </section>
      )}
  
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