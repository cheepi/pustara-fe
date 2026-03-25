'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowLeft, Heart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchBookReviewData } from '@/lib/bookReviews';
import type { Review } from '@/types/book';
import type { BookDetail } from '@/types/book';
const RATING_FILTERS = ['Semua', '5 ★', '4 ★', '3 ★', '2 ★', '1 ★'];
const PAGE_SIZE = 3;

export default function ReviewsPage() {
  const params  = useParams();
  const router  = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bookKey = (params?.bookId as string) ?? 'd1';
  const [meta, setMeta] = useState<BookDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter,  setFilter]  = useState('Semua');
  const [liked,   setLiked]   = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookReviewData(bookKey)
      .then(({ meta, reviews }) => {
        setMeta(meta);
        setReviews(reviews);
      })
      .finally(() => setLoadingData(false));
  }, [bookKey]);

  useEffect(() => {
    if (!meta) return;
    document.title = `Pustara | Ulasan ${meta.title}`;
  }, [meta]);

  // Reset visible ketika filter berubah
  useEffect(() => { setVisible(PAGE_SIZE); }, [filter]);

  const filtered  = filter === 'Semua' ? reviews : reviews.filter(r => r.rating === parseInt(filter, 10));
  const displayed = filtered.slice(0, visible);
  const hasMore   = visible < filtered.length;

  if (loadingData || !meta) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
        <Navbar />
      </div>
    );
  }

  const authorText = meta.authors.join(', ');
  const cover = meta.cover_url || 'https://placehold.co/240x360?text=No+Cover';

  function handleLoadMore() {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE_SIZE, filtered.length));
      setLoading(false);
    }, 400);
  }

  // Rating distribution
  const dist = [5,4,3,2,1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    pct:   reviews.length > 0 ? Math.round(reviews.filter(r => r.rating === s).length / reviews.length * 100) : 0,
  }));

  const tk = {
    text:    isLight ? 'text-navy-900' : 'text-white',
    muted:   isLight ? 'text-slate-500' : 'text-slate-400',
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    chip:    isLight ? 'bg-white border-parchment-darker text-slate-600' : 'bg-navy-700/50 border-white/10 text-white/60',
    chipAct: 'bg-gold text-navy-900 border-gold',
    bar:     isLight ? 'bg-parchment-darker' : 'bg-navy-700',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-20">

        {/* Back */}
        <motion.button onClick={() => router.back()}
          className={cn('flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors', tk.muted, 'hover:text-gold')}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Buku
        </motion.button>

        {/* Book header */}
        <motion.div className={cn('flex gap-4 p-4 rounded-2xl border mb-6', tk.surface)}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link href={`/book/${bookKey}`} className="flex-shrink-0">
            <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg">
              <img src={cover} alt={meta.title} className="w-full h-full object-cover" />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className={cn('font-serif text-xl font-black leading-tight', tk.text)}>{meta.title}</h1>
            <p className={cn('text-sm mt-0.5 mb-3', tk.muted)}>{authorText}</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-4 h-4',
                    s <= Math.round(meta.avg_rating) ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                ))}
              </div>
              <span className="text-gold font-bold">{meta.avg_rating}</span>
              <span className={cn('text-xs', tk.muted)}>({meta.rating_count.toLocaleString()} ulasan)</span>
            </div>
          </div>
        </motion.div>

        {/* Rating distribution */}
        <motion.div className={cn('rounded-2xl border p-5 mb-6', tk.surface)}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Distribusi Rating</h2>
          <div className="flex flex-col gap-2">
            {dist.map(d => (
              <div key={d.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-14 flex-shrink-0">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <span className={cn('text-xs', tk.text)}>{d.stars}</span>
                </div>
                <div className={cn('flex-1 h-2 rounded-full overflow-hidden', tk.bar)}>
                  <motion.div className="h-full bg-gold rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }} />
                </div>
                <span className={cn('text-xs w-8 text-right flex-shrink-0', tk.muted)}>{d.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          {RATING_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all',
                filter === f ? tk.chipAct : tk.chip)}>
              {f}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className={cn('text-xs mb-4', tk.muted)}>
          Menampilkan {displayed.length} dari {filtered.length} ulasan
        </p>

        {/* Reviews */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {displayed.map((r, i) => {
              const isLiked = liked.has(i);
              return (
                <motion.div key={i}
                  className={cn('rounded-2xl border p-4', tk.surface)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i < PAGE_SIZE ? i * 0.04 : 0 }}>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                      {r.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', tk.text)}>{r.name}</p>
                      <p className={cn('text-xs', tk.muted)}>{r.loc ?? '-'} · {r.time ?? '-'}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-3 h-3',
                          s <= r.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                      ))}
                    </div>
                  </div>

                  <p className={cn('text-sm leading-relaxed mb-3', tk.muted)}>{r.text}</p>

                  {/* Actions */}
                  <button
                    onClick={() => setLiked(l => {
                      const n = new Set(l);
                      isLiked ? n.delete(i) : n.add(i);
                      return n;
                    })}
                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                      isLiked ? 'text-rose-400' : tk.muted, 'hover:text-rose-400')}>
                    <Heart className={cn('w-3.5 h-3.5', isLiked && 'fill-rose-400')} />
                    {(r.likes ?? 0) + (isLiked ? 1 : 0)}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Load more button */}
        {hasMore && (
          <motion.div className="mt-6 flex justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-2xl border text-sm font-semibold transition-all',
                isLight
                  ? 'bg-white border-parchment-darker text-navy-700 hover:border-gold/50 hover:text-gold'
                  : 'bg-navy-800/50 border-white/10 text-white/70 hover:border-gold/40 hover:text-gold',
                loading && 'opacity-60 cursor-not-allowed'
              )}>
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Memuat...</>
                : <><ChevronDown className="w-4 h-4" /> Muat {Math.min(PAGE_SIZE, filtered.length - visible)} ulasan lagi</>
              }
            </button>
          </motion.div>
        )}

        {/* All loaded */}
        {!hasMore && displayed.length > PAGE_SIZE && (
          <p className={cn('text-center text-xs mt-8', tk.muted)}>Semua ulasan sudah ditampilkan 🎉</p>
        )}

      </main>
    </div>
  );
}