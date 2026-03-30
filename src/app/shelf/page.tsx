'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  BookOpen, Heart, Clock, CheckCircle, BookMarked,
  ChevronRight, Trash2, RotateCcw, Play, Calendar,
  AlertTriangle, Star, TrendingUp, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchShelfData, returnBorrowedBookForMe } from '@/lib/shelf';
import { removeSavedBookForMe } from '@/lib/shelf';
import type {
  BacaanBook, PinjamanBook, RiwayatBook,
  ShelfData, ShelfTabId, WishlistBook
} from '@/types/shelf';

const EMPTY_SHELF_DATA: ShelfData = {
  pinjaman: [],
  dibaca: [],
  wishlist: [],
  riwayat: [],
};

const coverUrl = (coverId?: number, coverUrlRaw?: string) =>
  coverUrlRaw || (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null);

const TABS = [
  { id: 'dipinjam', label: 'Dipinjam', icon: BookMarked },
  { id: 'dibaca', label: 'Sedang Dibaca', icon: BookOpen },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'riwayat', label: 'Riwayat', icon: Clock },
] as const;

const TAB_ACCENTS: Record<ShelfTabId, string> = {
  dipinjam: 'bg-gold',
  dibaca: 'bg-emerald-400',
  wishlist: 'bg-rose-400',
  riwayat: 'bg-blue-400',
};

type ShelfChaosMode = 'rapi' | 'natural' | 'berantakan';
const SHELF_CHAOS_STORAGE_KEY = 'pustara:shelf-chaos-mode';

const CHAOS_OPTIONS: Array<{ id: ShelfChaosMode; label: string }> = [
  { id: 'rapi', label: 'Rapi' },
  { id: 'natural', label: 'Natural' },
  { id: 'berantakan', label: 'Berantakan' },
];

const SPINE_COLORS = [
  '#6d28d9', '#0f766e', '#b45309', '#be185d', '#1d4ed8',
  '#065f46', '#9a3412', '#0369a1', '#7c3aed', '#15803d',
];

const spineColor = (key: string) =>
  SPINE_COLORS[Math.abs([...key].reduce((a, c) => a + c.charCodeAt(0), 0)) % SPINE_COLORS.length];

// ─── Genre lookup (extend as needed) ─────────────────────────────────────────
const GENRE_MAP: Record<string, string> = {
  '/works/OL82563W': 'FIKSI SEJARAH',
  '/works/OL17356W': 'SASTRA',
};
const genreLabel = (key: string) => GENRE_MAP[key] ?? 'SASTRA';

function ShelfStage({ children, isLight }: { children: React.ReactNode; isLight: boolean }) {
  return (
    <div
      className={cn(
        'relative rounded-3xl border p-4 md:p-6 overflow-hidden',
        isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/45 border-white/10'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          isLight
            ? 'bg-[radial-gradient(120%_90%_at_20%_0%,rgba(201,168,76,0.14),transparent_55%)]'
            : 'bg-[radial-gradient(120%_90%_at_20%_0%,rgba(201,168,76,0.22),transparent_55%)]'
        )}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function useBookTilt() {
  const x = useSpring(0, { stiffness: 300, damping: 30 });
  const y = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(y, [-0.5, 0.5], ['8deg', '-8deg']);
  const rotateY = useTransform(x, [-0.5, 0.5], ['-8deg', '8deg']);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { rotateX, rotateY, onMouseMove, onMouseLeave };
}

function PlankDust() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-xl">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full bg-gold/30"
          style={{ left: `${15 + i * 14}%`, bottom: '4px' }}
          animate={{ y: [0, -16, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

interface SpineProps {
  book: PinjamanBook | BacaanBook;
  stackedCompanion?: PinjamanBook | BacaanBook;
  companionSelected?: boolean;
  isMobile?: boolean;
  isSelected: boolean;
  isNew?: boolean;
  index: number;
  posture: 'upright' | 'lean-left' | 'lean-right' | 'lying';
  stackCount: 1 | 2 | 3;
  lyingThickness?: 'normal' | 'thick';
  onCompanionClick?: () => void;
  onClick: () => void;
}

function BookSpine({ book, stackedCompanion, companionSelected, isMobile = false, isSelected, isNew, index, posture, stackCount, lyingThickness = 'normal', onCompanionClick, onClick }: SpineProps) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useBookTilt();
  const src = coverUrl(book.coverId, book.coverUrl);
  const bg = spineColor(book.key);
  const spineW = 28 + (book.title.length % 10);
  const isLying = posture === 'lying';
  const lyingWidth = isMobile ? 102 : 124;
  const lyingHeight = isLying ? (lyingThickness === 'thick' ? 44 : 38) : 38;

  const baseSkew =
    posture === 'lean-left' ? -7 :
    posture === 'lean-right' ? 7 :
    posture === 'lying' ? 0 : 0;

  const verticalNudge =
    posture === 'lean-left' || posture === 'lean-right' ? -2 :
    posture === 'lying' ? 1 : 0;

  const stackLayers = Array.from({ length: stackCount - 1 });
  const hasCompanionStack = Boolean(isLying && stackCount > 1 && stackedCompanion);
  const hoverLiftY = isLying ? (stackCount > 1 ? -7 : -10) : -18;
  const hoverScale = isLying && stackCount > 1 ? 1.015 : 1;
  const canClickCompanion = Boolean(hasCompanionStack && onCompanionClick);

  return (
    <motion.div
      style={{ perspective: 800, width: isLying ? lyingWidth + 8 : spineW, flexShrink: 0 }}
      className="relative cursor-pointer"
      onClick={onClick}
      initial={isNew ? { y: -100, opacity: 0, rotate: -12 } : false}
      animate={isNew ? { y: 0, opacity: 1, rotate: 0 } : {}}
      transition={isNew ? { type: 'spring', stiffness: 220, damping: 18, delay: index * 0.04 } : {}}
      whileHover={hasCompanionStack ? undefined : { y: hoverLiftY, scale: hoverScale, zIndex: 14 }}
      layout
    >
      {stackLayers.map((_, layerIndex) => {
        const isCompanionLayer = isLying && layerIndex === 0 && Boolean(stackedCompanion);
        const layerBook = isCompanionLayer ? stackedCompanion : null;
        const layerBg = layerBook ? spineColor(layerBook.key) : bg;
        const layerSrc = layerBook ? coverUrl(layerBook.coverId, layerBook.coverUrl) : null;
        const layerBottom = isLying
          ? isCompanionLayer
            ? 16
            : 6 + (layerIndex + 1) * 6
          : (layerIndex + 1) * 2;

        return (
          <div
            key={`${book.key}-stack-${layerIndex}`}
            className={cn(
              'absolute rounded-r-sm rounded-l-[3px] shadow-md overflow-hidden',
              isCompanionLayer ? 'z-30' : 'z-[1]',
              isCompanionLayer ? 'opacity-100' : 'opacity-70',
              isLying ? 'left-1.5' : 'h-[120px]'
            )}
            style={{
              height: isLying ? lyingHeight : 120,
              width: isLying ? lyingWidth : spineW,
              bottom: layerBottom,
              left: isLying ? 6 : (layerIndex + 1) * 1.5,
              transform: `rotate(${baseSkew + (layerIndex + 1) * (posture === 'lean-left' ? -1.4 : posture === 'lean-right' ? 1.4 : 0)}deg)`,
              background: layerBg,
              borderRight: '2px solid rgba(0,0,0,0.12)',
              boxShadow: isCompanionLayer ? '0 4px 10px rgba(0,0,0,0.24)' : undefined,
            }}
          >
            {layerSrc && (
              <img
                src={layerSrc}
                alt={layerBook?.title || book.title}
                className="absolute w-full h-full object-cover opacity-78"
                style={
                  isLying
                    ? {
                        width: '170%',
                        height: '170%',
                        left: '-35%',
                        top: '-35%',
                        transform: 'rotate(90deg)',
                        transformOrigin: 'center',
                      }
                    : { left: 0, top: 0 }
                }
              />
            )}
          </div>
        );
      })}

      {canClickCompanion && (
        <motion.button
          type="button"
          aria-label={`Lihat detail ${stackedCompanion?.title || 'buku'}`}
          className={cn(
            'absolute left-[6px] w-[124px] h-[14px] rounded-t-sm z-20',
            'bg-transparent cursor-pointer',
            companionSelected && 'ring-2 ring-gold/70'
          )}
          style={{ bottom: lyingHeight + 14 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.995 }}
          onClick={(event) => {
            event.stopPropagation();
            onCompanionClick?.();
          }}
        />
      )}

      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={cn(
          'relative z-10 rounded-r-sm rounded-l-[3px] overflow-hidden',
          isLying ? 'ml-1.5' : 'h-[120px]',
          'shadow-lg transition-shadow duration-300',
          isSelected && 'ring-2 ring-gold ring-offset-2'
        )}
        animate={isSelected ? { y: -10, rotate: baseSkew } : { y: verticalNudge, rotate: baseSkew }}
        style={{
          rotateX,
          rotateY,
          height: isLying ? lyingHeight : 120,
          width: isLying ? lyingWidth : spineW,
          transformStyle: 'preserve-3d',
          background: bg,
          borderRight: '2px solid rgba(0,0,0,0.18)',
        }}
      >
        {src && (
          <img
            src={src}
            alt={book.title}
            className="absolute w-full h-full object-cover opacity-80"
            style={
              isLying
                ? {
                    width: '170%',
                    height: '170%',
                    left: '-35%',
                    top: '-35%',
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center',
                  }
                : { left: 0, top: 0 }
            }
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white/90 font-semibold text-[9px] leading-tight px-1"
            style={{
              writingMode: isLying ? 'horizontal-tb' : 'vertical-rl',
              textOrientation: isLying ? 'initial' : 'mixed',
              transform: isLying ? 'none' : 'rotate(180deg)',
              maxHeight: isLying ? '24px' : '100px',
              maxWidth: isLying ? '76px' : 'none',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: isLying ? 'horizontal' : 'vertical',
            }}
          >
            {book.title}
          </span>
        </div>

        {/* Progress % badge — shown in centre-bottom of spine */}
        {book.progress > 0 && (
          <div className={cn('absolute z-10', isLying ? 'top-1 right-1' : 'bottom-2 left-1/2 -translate-x-1/2')}>
            <span className="bg-black/40 text-white/90 text-[7px] font-bold px-1 py-0.5 rounded-full leading-none">
              {book.progress}%
            </span>
          </div>
        )}

        {/* Thin progress bar at very bottom */}
        {book.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
            <motion.div
              className="h-full bg-gold/80"
              initial={{ width: 0 }}
              animate={{ width: `${book.progress}%` }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        )}

        {typeof (book as PinjamanBook).daysLeft === 'number' && (book as PinjamanBook).daysLeft <= 1 && (
          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </motion.div>
    </motion.div>
  );
}

interface PlankProps {
  books: (PinjamanBook | BacaanBook)[];
  selectedId: string | null;
  newIds: Set<string>;
  isLight: boolean;
  chaosMode: ShelfChaosMode;
  onSelect: (key: string | null) => void;
}

function ShelfPlank({ books, selectedId, newIds, isLight, chaosMode, onSelect }: PlankProps) {
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const syncWidth = () => setViewportWidth(window.innerWidth || 1280);
    syncWidth();
    window.addEventListener('resize', syncWidth);
    return () => window.removeEventListener('resize', syncWidth);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  const booksPerTier = chaosMode === 'rapi'
    ? isMobile ? 7 : isTablet ? 8 : 10
    : chaosMode === 'natural'
      ? isMobile ? 6 : isTablet ? 7 : 8
      : isMobile ? 3 : isTablet ? 5 : 7;

  const tiers = Array.from({ length: Math.ceil(books.length / booksPerTier) }, (_, tierIndex) =>
    books.slice(tierIndex * booksPerTier, (tierIndex + 1) * booksPerTier)
  );

  const shouldBorrowForTopDoubleStack =
    chaosMode === 'berantakan' &&
    !isMobile &&
    tiers.length > 1 &&
    tiers[0] &&
    tiers[0].length >= 7 &&
    tiers[1] &&
    tiers[1].length > 0;

  const borrowedCompanionBook = shouldBorrowForTopDoubleStack ? tiers[1][0] : null;
  const borrowedCompanionKey = borrowedCompanionBook?.key ?? null;

  return (
    <div className="relative mb-1 space-y-4">
      {books.length === 0 ? (
        <div className={cn(
          'relative rounded-xl border px-5 py-8 min-h-[132px] flex items-center justify-center gap-2 text-sm',
          isLight ? 'bg-amber-50/60 border-amber-200/60' : 'bg-navy-800/70 border-white/8'
        )} style={{ color: 'var(--muted)' }}>
          <BookMarked className="w-4 h-4 opacity-40" />
          <span className="opacity-40">Rak masih kosong</span>
        </div>
      ) : (
        tiers.map((tierBooks, tierIndex) => (
          <div key={`tier-${tierIndex}`} className="relative">
            <div className={cn(
              'relative rounded-t-xl border border-b-0 pb-0',
              'flex items-end overflow-x-hidden overflow-y-visible',
              isMobile ? 'gap-1' : 'gap-2',
              isMobile ? 'px-4 pt-6 min-h-[148px]' : 'px-5 pt-5 min-h-[132px]',
              isLight ? 'bg-amber-50/60 border-amber-200/60' : 'bg-navy-800/70 border-white/8'
            )}>
              <PlankDust />

              {tierBooks.map((book, i) => {
                if (tierIndex === 1 && borrowedCompanionKey && i === 0 && book.key === borrowedCompanionKey) {
                  return null;
                }

                const hash = Math.abs([...book.key].reduce((a, c) => a + c.charCodeAt(0), 0));
                const totalBooks = tierBooks.length;
                const globalIndex = tierIndex * booksPerTier + i;
                const isTopTier = tierIndex === 0;
                const canUseLying = isTopTier && chaosMode !== 'rapi' && totalBooks >= 3;
                const useGuidedTopPattern = chaosMode === 'berantakan' && isTopTier && totalBooks >= 7;
                const shouldForceMobileLowerDoubleLying = chaosMode === 'berantakan' && isMobile && tierIndex === 1 && i === 0;
                const guidedSingleLyingIndex = 2;
                const guidedDoubleLyingIndex = 6;
                const forcedTopLyingA = Math.min(2, totalBooks - 1);
                const forcedTopLyingB = totalBooks >= 5
                  ? (totalBooks === 5 ? 0 : Math.max(0, totalBooks - 2))
                  : -1;

                const shouldForceTopSingleLying = canUseLying && (useGuidedTopPattern ? i === guidedSingleLyingIndex : i === forcedTopLyingA);
                const shouldForceDoubleLying = canUseLying && (useGuidedTopPattern ? i === guidedDoubleLyingIndex : i === forcedTopLyingB);

                let posture: SpineProps['posture'] = 'upright';
                if (chaosMode === 'natural') {
                  if (totalBooks <= 3) {
                    posture = hash % 5 === 0 ? 'lean-right' : hash % 4 === 0 ? 'lean-left' : 'upright';
                  } else if (totalBooks <= 8) {
                    posture = canUseLying && hash % 11 === 0 ? 'lying' : hash % 3 === 0 ? 'lean-left' : hash % 4 === 0 ? 'lean-right' : 'upright';
                  } else {
                    posture = hash % 5 === 0 ? 'lean-left' : hash % 7 === 0 ? 'lean-right' : 'upright';
                  }
                }

                if (chaosMode === 'berantakan') {
                  if (totalBooks <= 4) {
                    posture = canUseLying && hash % 4 === 0 ? 'lying' : hash % 2 === 0 ? 'lean-left' : hash % 3 === 0 ? 'lean-right' : 'upright';
                  } else if (totalBooks <= 8) {
                    posture = canUseLying && hash % 7 === 0 ? 'lying' : hash % 2 === 0 ? 'lean-left' : hash % 3 === 0 ? 'lean-right' : 'upright';
                  } else {
                    posture = canUseLying && hash % 13 === 0 ? 'lying' : hash % 2 === 0 ? 'lean-left' : hash % 3 === 0 ? 'lean-right' : 'upright';
                  }

                  // Make the top shelf visibly chaotic by guaranteeing horizontal stacks.
                  if (shouldForceTopSingleLying || shouldForceDoubleLying) {
                    posture = 'lying';
                  }

                  if (shouldForceMobileLowerDoubleLying) {
                    posture = 'lying';
                  }

                  // Guided top pattern: 2 standing, 1 lying, 3 standing, 1 double-lying stack.
                  if (useGuidedTopPattern && i <= guidedDoubleLyingIndex) {
                    if (shouldForceTopSingleLying || shouldForceDoubleLying) {
                      posture = 'lying';
                    } else {
                      posture = (hash + i) % 2 === 0 ? 'lean-left' : 'lean-right';
                    }
                  }
                }

                let stackCount: SpineProps['stackCount'] = 1;
                let lyingThickness: SpineProps['lyingThickness'] = 'normal';
                if (chaosMode === 'natural') {
                  if (posture === 'lying') {
                    stackCount = hash % 2 === 0 ? 2 : 1;
                  } else {
                    stackCount = hash % 8 === 0 ? 2 : 1;
                  }
                }
                if (chaosMode === 'berantakan') {
                  if (posture === 'lying') {
                    if (shouldForceTopSingleLying) stackCount = 1;
                    else if (shouldForceDoubleLying) {
                      stackCount = 2;
                      lyingThickness = 'normal';
                    }
                    else if (shouldForceMobileLowerDoubleLying) {
                      stackCount = 2;
                      lyingThickness = 'normal';
                    }
                    else stackCount = hash % 2 === 0 ? 2 : 1;
                  } else if (totalBooks <= 5) {
                    stackCount = hash % 4 === 0 ? 3 : hash % 3 === 0 ? 2 : 1;
                  } else {
                    stackCount = hash % 9 === 0 ? 3 : hash % 5 === 0 ? 2 : 1;
                  }

                  if (useGuidedTopPattern && i <= guidedDoubleLyingIndex && !shouldForceTopSingleLying && !shouldForceDoubleLying) {
                    stackCount = 1;
                  }
                }

                return (
                  <BookSpine
                    key={book.key}
                    book={book}
                    stackedCompanion={shouldForceDoubleLying ? borrowedCompanionBook ?? undefined : undefined}
                    companionSelected={Boolean(shouldForceDoubleLying && borrowedCompanionBook && selectedId === borrowedCompanionBook.key)}
                    isMobile={isMobile}
                    index={globalIndex}
                    posture={posture}
                    stackCount={stackCount}
                    lyingThickness={lyingThickness}
                    isNew={newIds.has(book.key)}
                    isSelected={selectedId === book.key}
                    onCompanionClick={
                      shouldForceDoubleLying && borrowedCompanionBook
                        ? () => onSelect(selectedId === borrowedCompanionBook.key ? null : borrowedCompanionBook.key)
                        : undefined
                    }
                    onClick={() => onSelect(selectedId === book.key ? null : book.key)}
                  />
                );
              })}
            </div>

            <div className={cn(
              'h-3 rounded-b-md border border-t-0',
              isLight
                ? 'bg-amber-200/80 border-amber-300/60 shadow-[0_3px_0_rgba(0,0,0,0.08)]'
                : 'bg-navy-700/80 border-white/5 shadow-[0_3px_0_rgba(0,0,0,0.3)]'
            )} />
          </div>
        ))
      )}
    </div>
  );
}

// ─── BookDetailDrawer — tweaked to match screenshot ───────────────────────────
function BookDetailDrawer({
  book,
  isLight,
  onClose,
  mode,
  onReturn,
  returning,
}: {
  book: PinjamanBook | BacaanBook;
  isLight: boolean;
  onClose: () => void;
  mode: 'dipinjam' | 'dibaca';
  onReturn?: () => void;
  returning?: boolean;
}) {
  const src = coverUrl(book.coverId, book.coverUrl);
  const bg = spineColor(book.key);
  const isBaca = mode === 'dibaca';
  const baca = book as BacaanBook;
  const pinjam = book as PinjamanBook;
  const daysLeft = typeof pinjam.daysLeft === 'number' ? pinjam.daysLeft : 99;
  const isUrgent = !isBaca && daysLeft <= 1;
  const isOverdue = !isBaca && daysLeft === 0;

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'mt-2 rounded-2xl border overflow-hidden',
          isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/60 border-white/8'
        )}
        initial={{ opacity: 0, height: 0, y: -8 }}
        animate={{ opacity: 1, height: 'auto', y: 0 }}
        exit={{ opacity: 0, height: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="flex gap-4 p-5">
          {/* Cover */}
          <div className="relative flex-shrink-0">
            <Link href={`/book/${book.key}`}>
              <div className="w-[72px] h-[100px] rounded-xl overflow-hidden shadow-xl transition-transform hover:scale-[1.02]"
                style={{ background: bg }}>
                {src
                  ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: bg }} />}
              </div>
            </Link>
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            {/* Genre label — matches screenshot "SEJARAH" */}
            <p className={cn(
              'text-[10px] font-bold tracking-widest uppercase mb-1',
              isLight ? 'text-slate-400' : 'text-slate-500'
            )}>
              {genreLabel(book.key)}
            </p>

            <h3 className={cn('font-serif font-bold text-xl leading-tight mb-0.5', isLight ? 'text-navy-900' : 'text-white')}>
              {book.title}
            </h3>
            <p className={cn('text-xs mb-3', isLight ? 'text-slate-500' : 'text-slate-400')}>
              {book.author}
            </p>

            {/* Chips row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {!isBaca && (
                <div className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border',
                  isOverdue ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : isUrgent ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : isLight ? 'bg-navy-50 text-navy-600 border-navy-200'
                  : 'bg-white/5 text-white/60 border-white/10'
                )}>
                  <Calendar className="w-3 h-3" />
                  {isOverdue ? 'Jatuh tempo hari ini!' : `${daysLeft}h lagi`}
                </div>
              )}
              {isBaca && (
                <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border', isLight ? 'bg-navy-50 text-navy-600 border-navy-200' : 'bg-white/5 text-white/60 border-white/10')}>
                  <Calendar className="w-3 h-3" />
                  {baca.lastRead}
                </div>
              )}
            </div>

            {/* Progress — "Progress membaca  85%" layout matching screenshot */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn('text-xs font-medium', isLight ? 'text-slate-500' : 'text-slate-400')}>
                  Progress membaca
                </span>
                <span className={cn('text-xs font-bold', isLight ? 'text-navy-900' : 'text-white')}>
                  {book.progress}%
                </span>
              </div>
              <div className={cn('h-1.5 rounded-full overflow-hidden', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                <motion.div
                  className={cn('h-full rounded-full', isBaca ? 'bg-emerald-400' : 'bg-gold')}
                  initial={{ width: 0 }}
                  animate={{ width: `${book.progress}%` }}
                  transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Actions — "Lanjut Baca" primary, "Tutup" outline (no X icon button) */}
            <div className="flex items-center gap-2">
              <Link href={`/read/${book.key}`}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-colors">
                  <Play className="w-3 h-3" /> Lanjut Baca
                </motion.button>
              </Link>

              {/* Kembalikan — only shown for dipinjam, kept subtle */}
              {!isBaca && onReturn && (
                <motion.button
                  onClick={onReturn}
                  disabled={Boolean(returning)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors',
                    isLight
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-red-500/30 text-red-300 hover:bg-red-500/10'
                  )}
                >
                  <RotateCcw className="w-3 h-3" /> {returning ? 'Memproses...' : 'Kembalikan'}
                </motion.button>
              )}

              {/* "Tutup" text button — matches screenshot */}
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  'flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border transition-colors',
                  isLight
                    ? 'border-parchment-darker text-slate-500 hover:bg-parchment'
                    : 'border-white/10 text-white/40 hover:bg-white/5'
                )}>
                <X className="w-3 h-3" /> Tutup
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function RakBukuPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [tab, setTab] = useState<ShelfTabId>('dipinjam');
  const [shelfData, setShelfData] = useState<ShelfData>(EMPTY_SHELF_DATA);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [newBookKeys, setNewBookKeys] = useState<Set<string>>(new Set());
  const [returningBookKey, setReturningBookKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chaosMode, setChaosMode] = useState<ShelfChaosMode>(() => {
    if (typeof window === 'undefined') return 'natural';
    const saved = window.localStorage.getItem(SHELF_CHAOS_STORAGE_KEY);
    if (saved === 'rapi' || saved === 'natural' || saved === 'berantakan') {
      return saved;
    }
    return 'natural';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SHELF_CHAOS_STORAGE_KEY, chaosMode);
  }, [chaosMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newKey = params.get('newBook');
    if (newKey) {
      setNewBookKeys((prev) => new Set(prev).add(newKey));
      setTab('dipinjam');
      setTimeout(() => {
        setNewBookKeys((prev) => {
          const next = new Set(prev);
          next.delete(newKey);
          return next;
        });
      }, 1200);
    }
  }, []);

  useEffect(() => { document.title = 'Pustara | Rak Buku'; }, []);
  const refreshShelf = () => fetchShelfData().then(setShelfData).catch(() => setShelfData(EMPTY_SHELF_DATA));

  useEffect(() => {
    refreshShelf();
  }, []);

  async function handleReturnBook(bookKey: string) {
    setActionError(null);
    setActionMessage(null);
    setReturningBookKey(bookKey);
    try {
      await returnBorrowedBookForMe(bookKey);
      await refreshShelf();
      setSelectedKey(null);
      setActionMessage('Buku berhasil dikembalikan.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengembalikan buku.';
      if (message.includes('401')) {
        setActionError('Sesi login berakhir. Silakan login ulang.');
      } else {
        setActionError('Gagal mengembalikan buku. Coba lagi sebentar.');
      }
    } finally {
      setReturningBookKey(null);
    }
  }

  const tk = {
    bg: isLight ? 'bg-parchment' : '',
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    text: isLight ? 'text-navy-900' : 'text-white',
    muted: isLight ? 'text-slate-500' : 'text-slate-400',
    chip: isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/10 text-white/60',
  };

  const tabCounts: Record<ShelfTabId, number> = {
    dipinjam: shelfData.pinjaman.length,
    dibaca: shelfData.dibaca.length,
    wishlist: shelfData.wishlist.length,
    riwayat: shelfData.riwayat.length,
  };

  const selectedBook =
    [...shelfData.pinjaman, ...shelfData.dibaca].find((book) => book.key === selectedKey) ?? null;

  function handleTabChange(nextTab: ShelfTabId) {
    setTab(nextTab);
    setSelectedKey(null);
  }

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)} style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-20">
        <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-gold/70 text-sm font-medium mb-0.5">Koleksi kamu,</p>
          <h1 className={cn('font-serif text-3xl lg:text-4xl font-black', tk.text)}>Rak Buku</h1>
          <p className={cn('text-sm mt-1.5', tk.muted)}>
            Ruang baca interaktif kamu. Ketuk buku untuk detail dan kelola pinjaman.
          </p>
        </motion.div>

        {/* ── Stat cards — number big at bottom, dot + icon at top ── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {TABS.map((t, i) => (
            <motion.button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'rounded-2xl border p-2 sm:p-4 min-h-[52px] sm:min-h-[108px] text-left transition-all',
                'flex',
                tab === t.id
                  ? isLight
                    ? 'border-gold/70 bg-gold/10 shadow-[0_10px_25px_rgba(201,168,76,0.2)]'
                    : 'border-gold/70 bg-gold/10 shadow-[0_10px_25px_rgba(201,168,76,0.18)]'
                  : cn(tk.surface, 'hover:border-gold/40')
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <div className="sm:hidden w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', TAB_ACCENTS[t.id])} />
                  <t.icon className={cn('w-3.5 h-3.5 flex-shrink-0', tab === t.id ? 'text-gold' : tk.muted)} />
                  <span className={cn('text-[13px] font-semibold truncate', tab === t.id ? (isLight ? 'text-navy-800' : 'text-slate-200') : tk.muted)}>
                    {t.label}
                  </span>
                </div>
                <span className={cn('font-serif text-3xl leading-none font-black flex-shrink-0', tab === t.id ? (isLight ? 'text-navy-900' : 'text-white') : tk.text)}>
                  {tabCounts[t.id]}
                </span>
              </div>

              {/* Desktop card layout */}
              <div className="hidden sm:flex sm:flex-col sm:justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', TAB_ACCENTS[t.id])} />
                  <t.icon className={cn('w-4 h-4', tab === t.id ? 'text-gold' : tk.muted)} />
                </div>

                <div>
                  <p className={cn(
                    'font-serif text-4xl leading-none font-black',
                    tab === t.id ? (isLight ? 'text-navy-900' : 'text-white') : tk.text
                  )}>
                    {tabCounts[t.id]}
                  </p>
                  <p className={cn(
                    'text-sm mt-1 font-semibold',
                    tab === t.id ? (isLight ? 'text-navy-800' : 'text-slate-200') : tk.muted
                  )}>
                    {t.label}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {(tab === 'dipinjam' || tab === 'dibaca') && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className={cn('text-xs sm:text-sm font-medium', tk.muted)}>Tampilan rak</p>
            <div className={cn('inline-flex rounded-xl border p-1', tk.surface)}>
              {CHAOS_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setChaosMode(mode.id)}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors',
                    chaosMode === mode.id
                      ? 'bg-gold text-navy-900'
                      : isLight
                        ? 'text-slate-500 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {actionMessage && (
          <p className="text-sm text-emerald-600 mb-4">{actionMessage}</p>
        )}
        {actionError && (
          <p className="text-sm text-red-500 mb-4">{actionError}</p>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>

            {tab === 'dipinjam' && (
              <ShelfStage isLight={isLight}>
                {shelfData.pinjaman.some((book) => (book.daysLeft ?? 99) <= 1) && (
                  <motion.div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4"
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300 text-sm font-medium">
                      {shelfData.pinjaman.filter((book) => (book.daysLeft ?? 99) <= 1).length} buku akan segera jatuh tempo!
                    </p>
                  </motion.div>
                )}

                {shelfData.pinjaman.length === 0
                  ? <EmptyState icon={BookMarked} label="Belum ada buku yang dipinjam" />
                  : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] gap-4 lg:items-start">
                      <div>
                        <ShelfPlank
                          books={shelfData.pinjaman}
                          selectedId={selectedKey}
                          newIds={newBookKeys}
                          isLight={isLight}
                          chaosMode={chaosMode}
                          onSelect={setSelectedKey}
                        />
                        <p className={cn('text-[11px] text-center mt-2 mb-1', tk.muted)}>
                          Ketuk punggung buku untuk detail
                        </p>
                      </div>

                      <div>
                        <AnimatePresence>
                          {selectedBook && tab === 'dipinjam' ? (
                            <BookDetailDrawer
                              book={selectedBook}
                              isLight={isLight}
                              mode="dipinjam"
                              onReturn={() => handleReturnBook(selectedBook.key)}
                              returning={returningBookKey === selectedBook.key}
                              onClose={() => setSelectedKey(null)}
                            />
                          ) : (
                            <motion.div
                              className={cn(
                                'mt-2 rounded-2xl border p-6 text-sm',
                                isLight ? 'bg-white border-parchment-darker text-slate-500' : 'bg-navy-800/60 border-white/8 text-slate-300'
                              )}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              Pilih buku di rak untuk melihat detail cepat di panel ini.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
              </ShelfStage>
            )}

            {tab === 'dibaca' && (
              <ShelfStage isLight={isLight}>
                {shelfData.dibaca.length === 0
                  ? <EmptyState icon={BookOpen} label="Belum ada buku yang sedang dibaca" />
                  : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] gap-4 lg:items-start">
                      <div>
                        <ShelfPlank
                          books={shelfData.dibaca}
                          selectedId={selectedKey}
                          newIds={newBookKeys}
                          isLight={isLight}
                          chaosMode={chaosMode}
                          onSelect={setSelectedKey}
                        />
                        <p className={cn('text-[11px] text-center mt-2 mb-1', tk.muted)}>
                          Ketuk punggung buku untuk detail
                        </p>
                      </div>

                      <div>
                        <AnimatePresence>
                          {selectedBook && tab === 'dibaca' ? (
                            <BookDetailDrawer
                              book={selectedBook}
                              isLight={isLight}
                              mode="dibaca"
                              onClose={() => setSelectedKey(null)}
                            />
                          ) : (
                            <motion.div
                              className={cn(
                                'mt-2 rounded-2xl border p-6 text-sm',
                                isLight ? 'bg-white border-parchment-darker text-slate-500' : 'bg-navy-800/60 border-white/8 text-slate-300'
                              )}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              Pilih buku di rak untuk melihat progress dan aksi baca di sini.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
              </ShelfStage>
            )}

            {tab === 'wishlist' && (
              <ShelfStage isLight={isLight}>
                <TabWishlist books={shelfData.wishlist} tk={tk} isLight={isLight} />
              </ShelfStage>
            )}

            {tab === 'riwayat' && (
              <ShelfStage isLight={isLight}>
                <TabRiwayat books={shelfData.riwayat} tk={tk} isLight={isLight} />
              </ShelfStage>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function TabWishlist({ books, tk, isLight }: { books: WishlistBook[]; tk: any; isLight: boolean }) {
  const [list, setList] = useState(books);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  useEffect(() => { setList(books); }, [books]);

  if (!list.length) return <EmptyState icon={Heart} label="Wishlist kamu masih kosong" />;

  return (
    <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <AnimatePresence>
      {list.map((book, i) => {
        const src = coverUrl(book.coverId, book.coverUrl);
        const bg = spineColor(book.key);
        return (
          <motion.div key={book.key} className="group relative"
            layout
            initial={{ opacity: 0, scale: 0.93, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -12 }}
            transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }}>
            <Link href={`/book/${book.key}`}>
              <div className={cn(
                'w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-lg mb-2.5 relative',
                isLight ? 'bg-parchment-darker' : 'bg-navy-700'
              )} style={{ background: bg }}>
                {src && (
                  <img src={src} alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
                <div className={cn(
                  'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold',
                  book.available ? 'bg-emerald-500 text-white' : 'bg-slate-600/80 text-slate-200'
                )}>
                  {book.available ? 'Tersedia' : 'Antrean'}
                </div>
              </div>
            </Link>
            <h3 className={cn('text-xs font-semibold leading-tight line-clamp-2 mb-0.5', tk.text)}>{book.title}</h3>
            <p className={cn('text-[10px] truncate mb-1.5', tk.muted)}>{book.author}</p>
            <div className="flex items-center justify-between">
              {book.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <span className="text-gold text-[11px] font-bold">{book.rating}</span>
                </div>
              )}
              <div className="flex gap-1 ml-auto">
                {book.available && (
                  <Link href={`/book/${book.key}`}
                    className="p-1.5 rounded-lg bg-gold text-navy-900 hover:bg-gold-light transition-colors">
                    <BookOpen className="w-3 h-3" />
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setRemovingKey(book.key);
                    try {
                      await removeSavedBookForMe(book.key);
                      setList((prev) => prev.filter((item) => item.key !== book.key));
                    } catch {
                      // Keep UI stable when API fails.
                    } finally {
                      setRemovingKey(null);
                    }
                  }}
                  disabled={removingKey === book.key}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isLight ? 'hover:bg-red-50 text-slate-400 hover:text-red-400' : 'hover:bg-red-500/10 text-white/30 hover:text-red-400'
                  )}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </motion.div>
  );
}

function TabRiwayat({ books, tk, isLight }: { books: RiwayatBook[]; tk: any; isLight: boolean }) {
  if (!books.length) return <EmptyState icon={Clock} label="Belum ada riwayat baca" />;

  return (
    <motion.div layout className="flex flex-col gap-3">
      {books.map((book, i) => {
        const src = coverUrl(book.coverId, book.coverUrl);
        const bg = spineColor(book.key);
        return (
          <motion.div layout key={`${book.key}-${i}`}
            className={cn('rounded-2xl border p-4 flex gap-4 items-center', tk.surface)}
            initial={{ opacity: 0, x: -8, y: 10 }} animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: i * 0.05 }}>
            <Link href={`/book/${book.key}`} className="flex-shrink-0">
              <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md" style={{ background: bg }}>
                {src
                  ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                  : null}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={cn('font-serif font-bold leading-tight line-clamp-1', tk.text)}>{book.title}</h3>
                  <p className={cn('text-xs mt-0.5', tk.muted)}>{book.author}</p>
                </div>
                {book.userRating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-3 h-3', s <= book.userRating! ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span className={cn('text-[11px]', tk.muted)}>Selesai {book.returnedAt}</span>
                </div>
                <span className={cn('text-[11px]', tk.muted)}>·</span>
                <span className={cn('text-[11px]', tk.muted)}>{book.readDays} hari baca</span>
              </div>
            </div>
            <Link href={`/book/${book.key}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                isLight
                  ? 'border-navy-200 text-navy-700 hover:border-gold/50 hover:text-gold'
                  : 'border-white/10 text-white/60 hover:border-gold/40 hover:text-gold'
              )}>
              <RotateCcw className="w-3 h-3" /> Pinjam Lagi
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <motion.div className="flex flex-col items-center justify-center py-20 gap-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gold/50" />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      <Link href="/browse"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:bg-gold-light transition-colors">
        Eksplor Buku <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}
