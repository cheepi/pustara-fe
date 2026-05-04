'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, BookOpen, ArrowRight, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface PopularBook {
  key: string;
  title: string;
  author: string;
  coverId?: number;
  coverUrl?: string;
  genre?: string[];
  desc?: string;
  year?: string;
  pages?: number;
  avgRating?: number;
}

const RATINGS = [4.7, 4.9, 4.6, 4.8, 4.5, 4.7];

/**
 * Generate cover URL from OpenLibrary book ID
 * Fallback when API doesn't have cover_url
 */
const coverUrl = (id?: number, s = 'L') => {
  if (!id || !Number.isFinite(id)) return null;
  return `https://covers.openlibrary.org/b/id/${id}-${s}.jpg`;
};

/**
 * Get best available cover URL for a book
 * Priority: 1. coverUrl (from API) 2. coverId (OpenLibrary) 3. null
 */
function getBestCoverUrl(book: PopularBook): string | null {
  console.log(`[PopularCarousel] Getting cover for "${book.title}":`, {
    coverUrl: book.coverUrl,
    coverId: book.coverId,
  });
  
  if (book.coverUrl) {
    console.log(`[PopularCarousel] ✅ Using coverUrl from API`);
    return book.coverUrl;
  }
  
  if (book.coverId && Number.isFinite(book.coverId)) {
    const url = coverUrl(book.coverId, 'L');
    console.log(`[PopularCarousel] ✅ Using generated coverUrl from ID: ${url}`);
    return url;
  }
  
  console.log(`[PopularCarousel] ⚠️ No cover available`);
  return null;
}

interface PopularCarouselProps {
  books: PopularBook[];
  isLight: boolean;
}

export default function PopularCarousel({ books, isLight }: PopularCarouselProps) {
  const [active, setActive]       = useState(0);
  const [containerW, setContainerW] = useState(500);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef  = useRef<HTMLDivElement>(null);
  const total = books.length;
  const activeIndex = total > 0 ? active % total : 0;

  useEffect(() => {
    const handleResize = () => {
      const el = window.innerWidth >= 1024 ? desktopRef.current : mobileRef.current;
      if (el) setContainerW(el.getBoundingClientRect().width);
    };
    const obs = new ResizeObserver(handleResize);
    if (desktopRef.current) obs.observe(desktopRef.current);
    if (mobileRef.current)  obs.observe(mobileRef.current);
    handleResize();
    return () => obs.disconnect();
  }, []);

  const prev = () => {
    if (total <= 1) return;
    setActive(i => (i - 1 + total) % total);
  };
  const next = () => {
    if (total <= 1) return;
    setActive(i => (i + 1) % total);
  };

  function getPos(i: number) {
    let d = i - activeIndex;
    if (d > total / 2)  d -= total;
    if (d < -total / 2) d += total;
    return d;
  }

  function getStyle(pos: number) {
    const abs = Math.abs(pos);
    if (abs > 2) return null;
    const step = Math.min(containerW * 0.32, 155);
    // Light mode needs higher opacity so side books are visible against white bg
    const opacityMid  = isLight ? 0.82 : 0.6;
    const opacityFar  = isLight ? 0.55 : 0.3;
    return {
      translateX: pos * step,
      scale:   abs === 0 ? 1 : abs === 1 ? 0.72 : 0.52,
      opacity: abs === 0 ? 1 : abs === 1 ? opacityMid : opacityFar,
      zIndex:  10 - abs,
    };
  }

  const cardW = Math.min(Math.round(containerW * 0.46), 210);
  const cardH = Math.round(cardW * (64 / 44));

  const arrowBg     = isLight ? 'bg-navy-100 hover:bg-navy-200 text-navy-600' : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white';
  const dotInactive = isLight ? 'bg-navy-800/25' : 'bg-white/25';
  const activeBook  = books[activeIndex];
  
  // Fallback rating: use book's avgRating if valid, else use fallback rating
  const activeRating = activeBook?.avgRating && Number.isFinite(activeBook.avgRating) && activeBook.avgRating > 0
    ? Number(activeBook.avgRating)
    : RATINGS[activeIndex % RATINGS.length];

  if (total === 0) {
    return (
      <div className="select-none px-4 py-8 rounded-2xl mx-4 text-center" style={{ color: 'var(--muted)' }}>
        Belum ada bacaan populer saat ini.
      </div>
    );
  }

  return (
    <div className="select-none">

      {/* ══ DESKTOP: 3-column grid ══ */}
      <div className={cn(
        'hidden lg:grid lg:grid-cols-[240px_1fr_240px] lg:items-center px-4 py-6 rounded-2xl mx-4',
        isLight
          ? 'bg-gradient-to-b from-parchment-dark/60 to-transparent'
          : 'bg-gradient-to-b from-white/[0.04] to-transparent'
      )}>

        {/* LEFT PANEL */}
        <div className="pr-6 flex justify-end">
          <AnimatePresence mode="wait">
            <motion.div key={`left-${activeIndex}`} className="w-full"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-[11px]">{activeIndex + 1}</span>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Trending #{activeIndex + 1}
                </span>
              </div>

              <h3 className="font-serif text-3xl xl:text-4xl font-black leading-tight mb-1" style={{ color: 'var(--text)' }}>
                {activeBook.title}
              </h3>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>
                {activeBook.author}
              </p>

              <div className="flex items-center gap-1.5 mb-4">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-3.5 h-3.5',
                    s <= Math.round(activeRating) ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700'
                  )} />
                ))}
                <span className="text-sm font-bold text-gold ml-1">{activeRating}</span>
              </div>

              {activeBook.genre && (
                <div className="flex flex-wrap gap-1.5">
                  {activeBook.genre.map(g => (
                    <span key={g} className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full border',
                      isLight ? 'bg-navy-50 border-navy-200 text-navy-600' : 'bg-white/5 border-white/15 text-white/70'
                    )}>{g}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CENTER — carousel */}
        <div ref={desktopRef} className="flex flex-col items-center min-w-0">
          <div className="relative w-full flex items-center justify-center overflow-visible"
            style={{ height: cardH + 56, perspective: '900px' }}>
            {books.map((book, i) => {
              const pos = getPos(i);
              const s = getStyle(pos);
              if (!s) return null;
              const src = getBestCoverUrl(book);
              const isSide = pos !== 0;
              return (
                <motion.div key={book.key} className="absolute cursor-pointer" style={{ zIndex: s.zIndex }}
                  animate={{ x: s.translateX, scale: s.scale, opacity: s.opacity, rotateY: pos * -8 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  onClick={() => pos !== 0 ? setActive(i) : undefined}>
                  <div className={cn(
                    'rounded-2xl overflow-hidden relative',
                    pos === 0
                      ? 'ring-2 ring-gold/40 shadow-[0_0_40px_rgba(201,168,76,0.18)]'
                      : isLight
                        ? 'shadow-[0_8px_32px_rgba(0,0,0,0.28)] ring-1 ring-black/15'
                        : 'ring-1 ring-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_40px_rgba(0,0,0,0.5)]'
                  )} style={{ width: cardW, height: cardH }}>
                    {src ? (
                      // ✅ Have cover URL: show image
                      <img 
                        src={src} 
                        alt={book.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(`[PopularCarousel] ❌ Image failed to load: ${src}`);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      // ❌ No cover: show fallback
                      <div className={cn('w-full h-full flex flex-col items-center justify-center p-4', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                        <BookOpen className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
                        <span className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                          {book.title}
                        </span>
                      </div>
                    )}
                    {/* Light mode: dark overlay. Dark mode: bright overlay */}
                    {isSide && (
                      <div className={cn(
                        'absolute inset-0 rounded-2xl pointer-events-none',
                        isLight
                          ? 'bg-gradient-to-b from-black/15 to-black/30'
                          : 'bg-gradient-to-b from-white/5 to-white/0'
                      )} />
                    )}
                    {pos === 0 && (
                      <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-xs">{activeIndex + 1}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Dots + arrows */}
          <div className="flex items-center gap-4 mt-3">
            <button onClick={prev} className={cn('p-1.5 rounded-full transition-all', arrowBg)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {books.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={cn('rounded-full transition-all', i === activeIndex ? 'w-5 h-1.5 bg-gold' : `w-1.5 h-1.5 ${dotInactive}`)} />
              ))}
            </div>
            <button onClick={next} className={cn('p-1.5 rounded-full transition-all', arrowBg)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="pl-6">
          <AnimatePresence mode="wait">
            <motion.div key={`right-${activeIndex}`} className="w-full text-right"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>

              {(activeBook.year || activeBook.pages) && (
                <div className="flex items-center justify-end gap-3 mb-3">
                  {activeBook.year && (
                    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                      <CalendarRange className="w-4 h-4" /> {activeBook.year}
                    </span>
                  )}
                  {activeBook.pages && (
                    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                      <BookOpen className="w-4 h-4" /> {activeBook.pages} hal.
                    </span>
                  )}
                </div>
              )}

              {activeBook.desc && (
                <p className="text-sm leading-relaxed mb-5 line-clamp-4 text-right" style={{ color: 'var(--muted)' }}>
                  {activeBook.desc}
                </p>
              )}

              <div className="flex justify-end">
                <Link href={`/book/${activeBook.key}`}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                  isLight ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-gold text-navy-900 hover:bg-gold-light'
                )}>
                <BookOpen className="w-4 h-4" />
                Lihat Detail
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ══ MOBILE: carousel + info card below ══ */}
      <div className="lg:hidden flex flex-col items-center">
        <div ref={mobileRef}
          className={cn(
            'relative w-full flex items-center justify-center overflow-hidden rounded-2xl mx-0',
            isLight
              ? 'bg-gradient-to-b from-parchment-dark/70 to-transparent'
              : 'bg-gradient-to-b from-white/[0.04] to-transparent'
          )}
          style={{ height: cardH + 24, perspective: '800px' }}>
          {books.map((book, i) => {
            const pos = getPos(i);
            const s = getStyle(pos);
            if (!s) return null;
            const src = book.coverUrl || coverUrl(book.coverId, 'L');
            return (
              <motion.div key={book.key} className="absolute cursor-pointer" style={{ zIndex: s.zIndex }}
                animate={{ x: s.translateX, scale: s.scale, opacity: s.opacity, rotateY: pos * -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                onClick={() => pos !== 0 ? setActive(i) : undefined}>
                <div className={cn(
                  'rounded-2xl overflow-hidden relative',
                  pos === 0
                    ? 'ring-2 ring-gold/40 shadow-[0_0_40px_rgba(201,168,76,0.15)]'
                    : isLight
                      ? 'shadow-[0_8px_32px_rgba(0,0,0,0.28)] ring-1 ring-black/15'
                      : 'ring-1 ring-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_40px_rgba(0,0,0,0.5)]'
                )} style={{ width: cardW, height: cardH }}>
                  {src
                    ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                    : <div className={cn('w-full h-full flex items-center justify-center', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                        <span className="text-slate-500 text-xs text-center px-2">{book.title}</span>
                      </div>
                  }
                  {pos !== 0 && (
                    <div className={cn(
                      'absolute inset-0 rounded-2xl pointer-events-none',
                      isLight
                        ? 'bg-gradient-to-b from-black/15 to-black/30'
                        : 'bg-gradient-to-b from-white/5 to-white/0'
                    )} />
                  )}
                  {pos === 0 && (
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-black text-xs">{activeIndex + 1}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {/* Arrow kiri — overlay di atas buku inactive kiri */}
          <button onClick={prev}
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 z-20',
              'w-9 h-9 rounded-full flex items-center justify-center',
              'backdrop-blur-sm transition-all active:scale-90',
              isLight
                ? 'bg-white/70 text-navy-700 shadow-md border border-black/8'
                : 'bg-black/40 text-white/80 border border-white/15'
            )}
            style={{ zIndex: 20 }}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Arrow kanan — overlay di atas buku inactive kanan */}
          <button onClick={next}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 z-20',
              'w-9 h-9 rounded-full flex items-center justify-center',
              'backdrop-blur-sm transition-all active:scale-90',
              isLight
                ? 'bg-white/70 text-navy-700 shadow-md border border-black/8'
                : 'bg-black/40 text-white/80 border border-white/15'
            )}
            style={{ zIndex: 20 }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dots only — no arrows */}
        <div className="flex items-center gap-1.5 mt-3">
          {books.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={cn('rounded-full transition-all', i === activeIndex ? 'w-5 h-1.5 bg-gold' : `w-1.5 h-1.5 ${dotInactive}`)} />
          ))}
        </div>

        {/* Mobile info card — slides in when active changes */}
        <div className="w-full px-4 mt-4">
          <AnimatePresence mode="wait">
            <motion.div key={`mobile-info-${activeIndex}`}
              className={cn('rounded-2xl border p-4', isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/60 border-white/8')}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>

              {/* Title + badge row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-[10px]">{activeIndex + 1}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                      Trending
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-black leading-tight" style={{ color: 'var(--text)' }}>
                    {activeBook.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{activeBook.author}</p>
                </div>

                {/* Rating badge */}
                <div className={cn(
                  'flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl',
                  isLight ? 'bg-gold/10 border border-gold/20' : 'bg-gold/10 border border-gold/20'
                )}>
                  <span className="text-gold font-black text-base leading-none">{activeRating}</span>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3].map(s => (
                      <Star key={s} className="w-1.5 h-1.5 text-gold fill-gold" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Genre chips */}
              {activeBook.genre && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {activeBook.genre.map(g => (
                    <span key={g} className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      isLight ? 'bg-navy-50 border-navy-200 text-navy-600' : 'bg-white/5 border-white/15 text-white/60'
                    )}>{g}</span>
                  ))}
                  {activeBook.year && (
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      isLight ? 'bg-navy-50 border-navy-200 text-navy-600' : 'bg-white/5 border-white/15 text-white/60'
                    )}>📅 {activeBook.year}</span>
                  )}
                </div>
              )}

              {/* Desc */}
              {activeBook.desc && (
                <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--muted)' }}>
                  {activeBook.desc}
                </p>
              )}

              <Link href={`/book/${activeBook.key.replace('/works/', '')}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                  isLight ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-gold text-navy-900 hover:bg-gold-light'
                )}>
                <BookOpen className="w-3.5 h-3.5" />
                Lihat Detail
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}