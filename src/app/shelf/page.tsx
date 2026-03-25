'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Heart, Clock, CheckCircle, BookMarked,
  ChevronRight, Trash2, RotateCcw, Play, Calendar,
  AlertTriangle, Star, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { fetchShelfData } from '@/lib/shelf';
import { SHELF_FALLBACK_DATA } from '@/data/shelfFallback';
import type { BacaanBook, PinjamanBook, RiwayatBook, ShelfData, ShelfTabId, WishlistBook } from '@/types/shelf';

const coverUrl = (id?: number) =>
  id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dipinjam', label: 'Dipinjam',      icon: BookMarked },
  { id: 'dibaca',   label: 'Sedang Dibaca', icon: BookOpen },
  { id: 'wishlist', label: 'Wishlist',      icon: Heart },
  { id: 'riwayat',  label: 'Riwayat',       icon: Clock },
] as const;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RakBukuPage() {
  const { theme } = useTheme();
  const { user }  = useAuthStore();
  const isLight = theme === 'light';
  const [tab, setTab] = useState<ShelfTabId>('dipinjam');
  const [shelfData, setShelfData] = useState<ShelfData>(SHELF_FALLBACK_DATA);

  useEffect(() => { document.title = 'Pustara | Rak Buku'; }, []);
  useEffect(() => {
    fetchShelfData().then(setShelfData).catch(() => setShelfData(SHELF_FALLBACK_DATA));
  }, []);

  const firstName = user?.displayName?.split(' ')[0] || 'Pembaca';

  const tk = {
    bg:      isLight ? 'bg-parchment'            : '',
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    text:    isLight ? 'text-navy-900'            : 'text-white',
    muted:   isLight ? 'text-slate-500'           : 'text-slate-400',
    chip:    isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/10 text-white/60',
  };

  // Stats summary
  const stats = [
    { label: 'Dipinjam',    value: shelfData.pinjaman.length, icon: BookMarked,  color: 'text-gold' },
    { label: 'Dibaca',      value: shelfData.dibaca.length,   icon: TrendingUp,  color: 'text-emerald-400' },
    { label: 'Wishlist',    value: shelfData.wishlist.length, icon: Heart,       color: 'text-rose-400' },
    { label: 'Selesai',     value: shelfData.riwayat.length,  icon: CheckCircle, color: 'text-blue-400' },
  ];

  const tabCounts: Record<ShelfTabId, number> = {
    dipinjam: shelfData.pinjaman.length,
    dibaca: shelfData.dibaca.length,
    wishlist: shelfData.wishlist.length,
    riwayat: shelfData.riwayat.length,
  };

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)} style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-gold/70 text-sm font-medium mb-0.5">Koleksi kamu,</p>
          <h1 className={cn('font-serif text-3xl lg:text-4xl font-black', tk.text)}>
            Rak Buku
          </h1>
        </motion.div>

        {/* Stats row */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {stats.map((s, i) => (
            <motion.div key={s.label}
              className={cn('rounded-2xl border p-4 flex items-center gap-3', tk.surface)}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--surface2)' }}>
                <s.icon className={cn('w-4 h-4', s.color)} />
              </div>
              <div>
                <p className={cn('text-2xl font-black font-serif', tk.text)}>{s.value}</p>
                <p className={cn('text-xs', tk.muted)}>{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border',
                tab === t.id
                  ? 'bg-gold text-navy-900 border-gold shadow-[0_0_20px_rgba(201,168,76,0.25)]'
                  : cn(tk.surface, tk.muted, 'hover:border-gold/40')
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              <span className={cn(
                'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-navy-900/20 text-navy-900' : isLight ? 'bg-navy-100 text-navy-600' : 'bg-white/10 text-white/60'
              )}>{tabCounts[t.id]}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>

            {tab === 'dipinjam' && <TabDipinjam books={shelfData.pinjaman} tk={tk} isLight={isLight} />}
            {tab === 'dibaca'   && <TabDibaca   books={shelfData.dibaca}   tk={tk} isLight={isLight} />}
            {tab === 'wishlist' && <TabWishlist books={shelfData.wishlist} tk={tk} isLight={isLight} />}
            {tab === 'riwayat'  && <TabRiwayat  books={shelfData.riwayat}  tk={tk} isLight={isLight} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Tab: Dipinjam ─────────────────────────────────────────────────────────────
function TabDipinjam({ books, tk, isLight }: { books: PinjamanBook[]; tk: any; isLight: boolean }) {
  if (!books.length) return <EmptyState icon={BookMarked} label="Belum ada buku yang dipinjam" />;

  return (
    <div className="flex flex-col gap-4">
      {/* Deadline warning */}
      {books.some(b => b.daysLeft <= 1) && (
        <motion.div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30"
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            {books.filter(b => b.daysLeft <= 1).length} buku akan segera jatuh tempo!
          </p>
        </motion.div>
      )}

      {books.map((book, i) => {
        const src = coverUrl(book.coverId);
        const isUrgent = book.daysLeft <= 1;
        const isOverdue = book.daysLeft === 0;
        return (
          <motion.div key={book.key}
            className={cn('rounded-2xl border overflow-hidden', tk.surface)}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}>
            <div className="flex gap-4 p-4">
              {/* Cover */}
              <Link href={`/book/${book.key}`} className="flex-shrink-0">
                <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg">
                  {src
                    ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-navy-700" />}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', tk.chip)}>{book.genre}</span>
                    <h3 className={cn('font-serif font-bold mt-1.5 leading-tight', tk.text)}>{book.title}</h3>
                    <p className={cn('text-xs mt-0.5', tk.muted)}>{book.author}</p>
                  </div>
                  {/* Due date badge */}
                  <div className={cn(
                    'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold',
                    isOverdue ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : isUrgent ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isLight  ? 'bg-navy-50 text-navy-600 border border-navy-200'
                    :            'bg-white/5 text-white/60 border border-white/10'
                  )}>
                    <Calendar className="w-3 h-3" />
                    {isOverdue ? 'Hari ini!' : `${book.daysLeft}h lagi`}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-[11px]', tk.muted)}>Progress membaca</span>
                    <span className="text-[11px] font-semibold text-gold">{book.progress}%</span>
                  </div>
                  <div className={cn('h-1.5 rounded-full overflow-hidden', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                    <motion.div className="h-full bg-gold rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${book.progress}%` }}
                      transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Link href={`/read/${book.key}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-colors">
                    <Play className="w-3 h-3" /> Lanjut Baca
                  </Link>
                  <p className={cn('text-[11px]', tk.muted)}>Dipinjam {book.borrowedAt}</p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Tab: Sedang Dibaca ────────────────────────────────────────────────────────
function TabDibaca({ books, tk, isLight }: { books: BacaanBook[]; tk: any; isLight: boolean }) {
  if (!books.length) return <EmptyState icon={BookOpen} label="Belum ada buku yang sedang dibaca" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {books.map((book, i) => {
        const src = coverUrl(book.coverId);
        return (
          <motion.div key={book.key}
            className={cn('rounded-2xl border p-4 flex gap-4', tk.surface)}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }}>
            {/* Cover with circular progress overlay */}
            <Link href={`/book/${book.key}`} className="flex-shrink-0 relative">
              <div className="w-20 h-28 rounded-xl overflow-hidden shadow-lg">
                {src
                  ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-navy-700" />}
              </div>
              {/* Progress circle */}
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-gold flex items-center justify-center shadow-lg border-2"
                style={{ borderColor: 'var(--bg)' }}>
                <span className="text-navy-900 font-black text-[9px]">{book.progress}%</span>
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', tk.chip)}>{book.genre}</span>
              <h3 className={cn('font-serif font-bold mt-1.5 leading-tight line-clamp-1', tk.text)}>{book.title}</h3>
              <p className={cn('text-xs mt-0.5 mb-3', tk.muted)}>{book.author}</p>

              {/* Page progress */}
              <div className={cn('h-1.5 rounded-full overflow-hidden mb-1.5', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                <motion.div className="h-full bg-emerald-400 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${book.progress}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: 'easeOut' }} />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className={cn('text-[11px]', tk.muted)}>Hal. {book.currentPage} / {book.totalPages}</span>
                <span className={cn('text-[11px]', tk.muted)}>{book.lastRead}</span>
              </div>

              <Link href={`/read/${book.key}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-colors">
                <Play className="w-3 h-3" /> Lanjut Baca
              </Link>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Tab: Wishlist ─────────────────────────────────────────────────────────────
function TabWishlist({ books, tk, isLight }: { books: WishlistBook[]; tk: any; isLight: boolean }) {
  const [list, setList] = useState(books);
  if (!list.length) return <EmptyState icon={Heart} label="Wishlist kamu masih kosong" />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {list.map((book, i) => {
        const src = coverUrl(book.coverId);
        return (
          <motion.div key={book.key}
            className="group relative"
            initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -4 }}>
            {/* Cover */}
            <Link href={`/book/${book.key}`}>
              <div className={cn(
                'w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-lg mb-2.5 relative',
                isLight ? 'bg-parchment-darker' : 'bg-navy-700'
              )}>
                {src && <img src={src} alt={book.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                {/* Available badge */}
                <div className={cn(
                  'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold',
                  book.available
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-600/80 text-slate-200'
                )}>
                  {book.available ? 'Tersedia' : 'Antrean'}
                </div>
              </div>
            </Link>

            {/* Info */}
            <h3 className={cn('text-xs font-semibold leading-tight line-clamp-2 mb-0.5', tk.text)}>{book.title}</h3>
            <p className={cn('text-[10px] truncate mb-1.5', tk.muted)}>{book.author}</p>

            {/* Rating + actions */}
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
                  onClick={() => setList(l => l.filter(b => b.key !== book.key))}
                  className={cn('p-1.5 rounded-lg transition-colors', isLight ? 'hover:bg-red-50 text-slate-400 hover:text-red-400' : 'hover:bg-red-500/10 text-white/30 hover:text-red-400')}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Tab: Riwayat ──────────────────────────────────────────────────────────────
function TabRiwayat({ books, tk, isLight }: { books: RiwayatBook[]; tk: any; isLight: boolean }) {
  if (!books.length) return <EmptyState icon={Clock} label="Belum ada riwayat baca" />;

  return (
    <div className="flex flex-col gap-3">
      {books.map((book, i) => {
        const src = coverUrl(book.coverId);
        return (
          <motion.div key={`${book.key}-${i}`}
            className={cn('rounded-2xl border p-4 flex gap-4 items-center', tk.surface)}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}>
            {/* Cover */}
            <Link href={`/book/${book.key}`} className="flex-shrink-0">
              <div className="w-12 h-16 rounded-xl overflow-hidden shadow-md">
                {src
                  ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-navy-700" />}
              </div>
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={cn('font-serif font-bold leading-tight line-clamp-1', tk.text)}>{book.title}</h3>
                  <p className={cn('text-xs mt-0.5', tk.muted)}>{book.author}</p>
                </div>
                {/* User rating */}
                {book.userRating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1,2,3,4,5].map(s => (
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

            {/* Pinjam lagi */}
            <Link href={`/book/${book.key}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                isLight
                  ? 'border-navy-200 text-navy-700 hover:border-gold/50 hover:text-gold'
                  : 'border-white/10 text-white/60 hover:border-gold/40 hover:text-gold'
              )}>
              <RotateCcw className="w-3 h-3" />
              Pinjam Lagi
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
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