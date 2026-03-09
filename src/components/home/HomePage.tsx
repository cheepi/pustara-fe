'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, Star, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';

interface Book { key: string; title: string; author: string; coverId?: number; }

const CACHE: Record<string, Book[]> = {};
const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const DUMMY_POPULAR = [
  { key: 'd1', title: 'Laskar Pelangi',    author: 'Andrea Hirata',         coverId: 8231568  },
  { key: 'd2', title: 'Bumi Manusia',       author: 'Pramoedya Ananta Toer', coverId: 8750787  },
  { key: 'd3', title: 'Cantik Itu Luka',    author: 'Eka Kurniawan',         coverId: 12699828 },
  { key: 'd4', title: 'Perahu Kertas',      author: 'Dee Lestari',           coverId: 7886745  },
  { key: 'd5', title: 'Negeri 5 Menara',    author: 'Ahmad Fuadi',           coverId: 8913924  },
  { key: 'd6', title: 'Ayah',               author: 'Andrea Hirata',         coverId: 10521865 },
];

async function fetchBooks(query: string, limit = 10): Promise<Book[]> {
  const k = `${query}_${limit}`;
  if (CACHE[k]) return CACHE[k];
  const r = await fetch(`https://openlibrary.org/search.json?${query}&limit=${limit}&fields=key,title,author_name,cover_i`);
  const d = await r.json();
  const books = (d.docs || []).filter((b: any) => b.cover_i).map((b: any) => ({
    key: b.key, title: b.title || '?',
    author: (b.author_name || ['?'])[0], coverId: b.cover_i,
  }));
  CACHE[k] = books;
  return books;
}

const COMMUNITY = [
  { name: 'Rina D.',  avatar: 'R', rating: 4, book: 'Laskar Pelangi',  text: 'Buku yang sangat menginspirasi dan mengharukan!' },
  { name: 'Budi S.',  avatar: 'B', rating: 3, book: 'Bumi Manusia',    text: 'Pramoedya selalu berhasil memukau pembacanya.' },
  { name: 'Sari A.',  avatar: 'S', rating: 5, book: 'Cantik Itu Luka', text: 'Masterpiece sastra Indonesia yang wajib dibaca.' },
  { name: 'Dika P.',  avatar: 'D', rating: 4, book: 'Perahu Kertas',   text: 'Romantis, mengalir, dan sangat indah.' },
];

export default function HomePage() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [aiReco, setAiReco] = useState<Book[]>([]);
  const [loadAi, setLoadAi] = useState(true);
  const firstName = user?.displayName?.split(' ')[0] || 'Pembaca';

  useEffect(() => {
    fetchBooks('subject:philosophy&sort=rating', 10).then(setAiReco).finally(() => setLoadAi(false));
  }, []);

  // Skeleton color adaptive
  const skeletonBg = isLight ? 'bg-parchment-darker' : 'bg-navy-700/60';

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* GREETING */}
      <section className="px-4 pt-5 pb-4 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-gold/70 text-sm font-medium">Selamat datang kembali,</p>
          <h1 className="font-serif text-3xl lg:text-4xl font-black mt-0.5" style={{ color: 'var(--text)' }}>
            {firstName}! 👋
          </h1>
        </motion.div>
      </section>

      {/* BACAAN POPULER */}
      <section className="mt-2 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Bacaan Populer</h2>
          <Link href="/browse" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <Carousel3D books={DUMMY_POPULAR} isLight={isLight} />
      </section>

      {/* AI BANNER */}
      <section className="max-w-7xl mx-auto px-4 mt-7">
        <Link href="/browse?tab=ai">
          <div className={cn(
            'border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group',
            isLight
              ? 'bg-navy-800/5 border-navy-200 hover:border-gold/40 hover:bg-navy-800/10'
              : 'bg-gradient-to-r from-navy-700/80 via-navy-600/60 to-navy-700/80 border-gold/20 hover:border-gold/40'
          )}>
            <div className="w-11 h-11 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gold/25 transition-colors">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Rekomendasi PustarAI untuk Kamu</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Dipersonalisasi berdasarkan preferensi kamu</p>
            </div>
            <ChevronRight className="w-4 h-4 group-hover:text-gold transition-colors flex-shrink-0" style={{ color: 'var(--muted)' }} />
          </div>
        </Link>
      </section>

      {/* REKOMENDASI AI */}
      <section className="mt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Rekomendasi PustarAI</h2>
          <Link href="/browse?tab=ai" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {loadAi
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-28">
                  <div className={cn('w-28 h-44 rounded-xl animate-pulse', skeletonBg)} />
                  <div className={cn('h-2.5 rounded mt-2 w-20 animate-pulse', skeletonBg)} />
                </div>
              ))
            : aiReco.map((b, i) => <BookCardH key={b.key} book={b} index={i} isLight={isLight} />)
          }
        </div>
      </section>

      {/* KOMUNITAS */}
      <section className="max-w-7xl mx-auto px-4 mt-7 pb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Koleksi Komunitas Terbaru</h2>
          <span className="text-gold text-xs font-medium cursor-pointer">Lihat semua →</span>
        </div>
        <div className="flex gap-3 lg:hidden overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {COMMUNITY.map((r, i) => <ReviewCardH key={i} review={r} index={i} isLight={isLight} />)}
        </div>
        <div className="hidden lg:grid grid-cols-2 gap-3">
          {COMMUNITY.map((r, i) => <ReviewCardGrid key={i} review={r} index={i} isLight={isLight} />)}
        </div>
      </section>
    </div>
  );
}

// ── 3D Carousel ───────────────────────────────────────────────────────────────

function Carousel3D({ books, isLight }: { books: Book[]; isLight: boolean }) {
  const [active, setActive] = useState(0);
  const [containerW, setContainerW] = useState(400);
  const trackRef = useRef<HTMLDivElement>(null);
  const total = books.length;

  useEffect(() => {
    const obs = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width));
    if (trackRef.current) obs.observe(trackRef.current);
    return () => obs.disconnect();
  }, []);

  const prev = () => setActive(i => (i - 1 + total) % total);
  const next = () => setActive(i => (i + 1) % total);

  function getPos(i: number) {
    let d = i - active;
    if (d > total / 2)  d -= total;
    if (d < -total / 2) d += total;
    return d;
  }

  function getStyle(pos: number) {
    const absPos = Math.abs(pos);
    if (absPos > 2) return null;
    const step       = Math.min(containerW * 0.27, 130);
    const translateX = pos * step;
    const scale      = absPos === 0 ? 1 : absPos === 1 ? 0.75 : 0.55;
    const opacity    = absPos === 0 ? 1 : absPos === 1 ? 0.65 : 0.35;
    const zIndex     = 10 - absPos;
    return { translateX, scale, opacity, zIndex };
  }

  const cardW = Math.min(Math.round(containerW * 0.36), 176);
  const cardH = Math.round(cardW * (64 / 44));

  // Adaptive arrow/dot colors
  const arrowBg     = isLight ? 'bg-navy-100 hover:bg-navy-200 text-navy-600'       : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white';
  const dotInactive = isLight ? 'bg-navy-200'  : 'bg-white/25';

  return (
    <div className="relative flex flex-col items-center select-none">
      <div ref={trackRef} className="relative w-full flex items-center justify-center overflow-hidden"
           style={{ height: cardH + 68, perspective: '800px' }}>
        {books.map((book, i) => {
          const pos = getPos(i);
          const s   = getStyle(pos);
          if (!s) return null;
          const src = coverUrl(book.coverId, 'L');
          return (
            <motion.div
              key={book.key}
              className="absolute cursor-pointer"
              style={{ zIndex: s.zIndex }}
              animate={{ x: s.translateX, scale: s.scale, opacity: s.opacity, rotateY: pos * -8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              onClick={() => pos !== 0 ? setActive(i) : undefined}
            >
              <div className={cn(
                'rounded-2xl overflow-hidden shadow-2xl relative',
                pos === 0 && 'ring-2 ring-gold/40 shadow-[0_0_40px_rgba(201,168,76,0.15)]'
              )} style={{ width: cardW, height: cardH }}>
                {src
                  ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-navy-700 flex items-center justify-center">
                      <span className="text-slate-600 text-xs text-center px-2">{book.title}</span>
                    </div>
                }
                {pos === 0 && (
                  <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-xs">{active + 1}</span>
                  </div>
                )}
              </div>
              {pos === 0 && (
                <motion.div className="mt-3 text-center px-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{book.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{book.author}</p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dots + arrows */}
      <div className="flex items-center gap-4 mt-4">
        <button onClick={prev} className={cn('p-1.5 rounded-full transition-all', arrowBg)}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {books.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={cn('rounded-full transition-all', i === active ? 'w-5 h-1.5 bg-gold' : `w-1.5 h-1.5 ${dotInactive}`)} />
          ))}
        </div>
        <button onClick={next} className={cn('p-1.5 rounded-full transition-all', arrowBg)}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Book card ─────────────────────────────────────────────────────────────────

function BookCardH({ book, index, isLight }: { book: Book; index: number; isLight: boolean }) {
  const src = coverUrl(book.coverId);
  return (
    <motion.div className="flex-shrink-0 w-28 cursor-pointer group"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }} whileTap={{ scale: 0.95 }}>
      <div className={cn('w-28 h-44 rounded-xl overflow-hidden shadow-lg', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
        {src && <img src={src} alt={book.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />}
      </div>
      <p className="text-xs font-medium mt-1.5 leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>{book.title}</p>
      <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{book.author}</p>
    </motion.div>
  );
}

// ── Review cards ──────────────────────────────────────────────────────────────

function Stars({ rating, isLight }: { rating: number; isLight: boolean }) {
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn('w-3 h-3', i <= rating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-600')} />
      ))}
    </div>
  );
}

function ReviewCardH({ review, index, isLight }: { review: typeof COMMUNITY[0]; index: number; isLight: boolean }) {
  return (
    <motion.div
      className="flex-shrink-0 w-64 rounded-2xl p-3.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
          <span className="text-gold font-bold text-xs">{review.avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{review.name}</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{review.book}</p>
        </div>
        <Stars rating={review.rating} isLight={isLight} />
      </div>
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }}>{review.text}</p>
    </motion.div>
  );
}

function ReviewCardGrid({ review, index, isLight }: { review: typeof COMMUNITY[0]; index: number; isLight: boolean }) {
  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-gold font-bold text-sm">{review.avatar}</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{review.name}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{review.book}</p>
          </div>
        </div>
        <Stars rating={review.rating} isLight={isLight} />
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{review.text}</p>
    </motion.div>
  );
}