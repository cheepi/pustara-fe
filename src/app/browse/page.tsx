'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';

interface Book { key: string; title: string; author: string; coverId?: number; }

const coverUrl = (id?: number) => id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

const CATEGORIES = [
  { id: 'fiction',     label: 'Fiksi',     emoji: '📖' },
  { id: 'history',    label: 'Sejarah',   emoji: '🏛️' },
  { id: 'science',    label: 'Sains',     emoji: '🔬' },
  { id: 'philosophy', label: 'Filsafat',  emoji: '🧠' },
  { id: 'biography',  label: 'Biografi',  emoji: '👤' },
  { id: 'romance',    label: 'Romansa',   emoji: '💕' },
  { id: 'mystery',    label: 'Misteri',   emoji: '🔍' },
  { id: 'technology', label: 'Teknologi', emoji: '💻' },
];

const RANK_STYLE = [
  { badge: 'bg-yellow-400 text-yellow-900', ring: 'ring-yellow-400/40', z: 'z-30', label: '#1' },
  { badge: 'bg-slate-300 text-slate-700',   ring: 'ring-slate-300/30',  z: 'z-20', label: '#2' },
  { badge: 'bg-amber-600 text-amber-100',   ring: 'ring-amber-500/30',  z: 'z-10', label: '#3' },
];

const CACHE: Record<string, Book[]> = {};

async function fetchBooks(q: string, limit = 24): Promise<Book[]> {
  const key = `${q}_${limit}`;
  if (CACHE[key]) return CACHE[key];
  const url = q.startsWith('subject:')
    ? `https://openlibrary.org/search.json?${q}&limit=${limit}&fields=key,title,author_name,cover_i`
    : `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i`;
  const r = await fetch(url);
  const d = await r.json();
  const books = (d.docs || []).filter((b: any) => b.cover_i).map((b: any) => ({
    key: b.key, title: b.title || '?',
    author: (b.author_name || ['?'])[0],
    coverId: b.cover_i,
  }));
  CACHE[key] = books;
  return books;
}

export default function BrowsePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  const [query,    setQuery]    = useState('');
  const [active,   setActive]   = useState('');
  const [books,    setBooks]    = useState<Book[]>([]);
  const [top3books, setTop3Books] = useState<Book[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [timer,    setTimer]    = useState<ReturnType<typeof setTimeout>>();

  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  // Theme tokens
  const tk = {
    bg:       dark ? 'bg-navy-900'       : 'bg-parchment',
    text:     dark ? 'text-white'        : 'text-navy-900',
    muted:    dark ? 'text-slate-500'    : 'text-slate-500',
    card:     dark ? 'bg-navy-700'       : 'bg-parchment-dark',
    skeleton: dark ? 'bg-navy-700/60'    : 'bg-parchment-dark',
    chip:     dark
      ? 'bg-navy-700/50 border-navy-500 text-slate-400 hover:border-gold/30 hover:text-slate-200'
      : 'bg-white border-parchment-darker text-slate-500 hover:border-gold/60 hover:text-slate-700',
    input:    dark
      ? 'bg-navy-700/80 border-navy-500 text-white placeholder-slate-500 focus:border-gold/50 focus:ring-gold/10'
      : 'bg-white border-parchment-darker text-navy-900 placeholder-slate-400 focus:border-gold focus:ring-gold/10',
  };

  // Always load trending top3
  useEffect(() => {
    fetchBooks('subject:fiction&sort=rating', 10).then(b => setTop3Books(b.slice(0, 3)));
  }, []);

  async function loadCategory(id: string) {
    setActive(id); setQuery(''); setSearched(true); setLoading(true);
    try { setBooks(await fetchBooks(`subject:${id}`)); }
    finally { setLoading(false); }
  }

  function handleSearch(q: string) {
    setQuery(q); setActive('');
    clearTimeout(timer);
    if (!q) { setSearched(false); setBooks([]); return; }
    const t = setTimeout(async () => {
      setSearched(true); setLoading(true);
      try { setBooks(await fetchBooks(q)); }
      finally { setLoading(false); }
    }, 450);
    setTimer(t);
  }

  // When searched, show search result top3; otherwise show trending top3
  const displayTop3 = searched && books.length >= 3 ? books.slice(0, 3) : top3books;
  const rest = searched ? books.slice(3) : [];

  const sectionLabel = active
    ? CATEGORIES.find(c => c.id === active)?.label
    : query ? `Hasil "${query}"` : '';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)}>
      <Navbar />

      {/* ── HERO: SEARCH + TOP3 ── */}
      <section className="max-w-7xl mx-auto px-4 pt-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">

          {/* LEFT */}
          <div className={cn(
            'flex flex-col gap-3 min-w-0',
            'md:w-[42%] lg:w-[38%]'
          )}>
            <AnimatePresence>
              {!searched && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <h1 className={cn('font-serif text-3xl lg:text-4xl font-black leading-tight mb-1', tk.text)}>
                    Temukan buku<br /><span className="text-gold">favoritmu.</span>
                  </h1>
                  <p className={cn('text-sm mt-1.5 mb-3', tk.muted)}>
                    Dari fiksi klasik sampai sains modern — semua ada di sini.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={query} onChange={e => handleSearch(e.target.value)}
                placeholder="Cari judul, penulis, atau genre…"
                className={cn('w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm outline-none ring-2 ring-transparent transition-all', tk.input)} />
            </div>

            {searched && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h2 className={cn('font-serif text-2xl font-black leading-tight', tk.text)}>{sectionLabel}</h2>
                    {!loading && books.length > 0 && (
                      <p className={cn('text-xs mt-0.5', tk.muted)}>{books.length} judul ditemukan</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Medal className="w-3.5 h-3.5 text-gold" />
                      <span className="text-gold text-xs font-semibold">Top 3 hasil terbaik</span>
                    </div>
                  </div>
                  <button onClick={() => { setSearched(false); setActive(''); setBooks([]); setQuery(''); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-1">
                    ← Kategori
                  </button>
                </div>
              </motion.div>
            )}

            {/* Trending label when not searched */}
            {!searched && (
              <div className="flex items-center gap-1.5 md:hidden mt-1">
                <Medal className="w-3.5 h-3.5 text-gold" />
                <span className="text-gold text-xs font-semibold">Top 3 Trending</span>
              </div>
            )}
          </div>

          {/* RIGHT — top3 always visible */}
          <div className="relative flex justify-center flex-1 pt-6" style={{ height: 250 }}>

            {/* Trending label desktop */}
            {!searched && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 whitespace-nowrap">
                <Medal className="w-3 h-3 text-gold" />
                <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">Top 3 Trending</span>
              </div>
            )}

            {displayTop3.length > 0 && [...displayTop3].reverse().map((b, ri) => {
              const i   = displayTop3.length - 1 - ri;
              const rs  = RANK_STYLE[i];
              const src = coverUrl(b.coverId);
              const xOff = [0, -68, 68][i];
              const yOff = [0, 22, 30][i];
              const rot  = [0, -9, 10][i];
              return (
                <motion.div
                  key={b.key}
                  className={cn('absolute cursor-pointer p-2', rs.z)}
                  style={{ x: xOff, y: yOff, rotate: rot }}
                  whileHover={{ y: yOff - 20, rotate: 0, scale: 1.08, zIndex: 50 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}>
                    <div className={cn(
                    'rounded-2xl overflow-hidden shadow-2xl ring-2',
                    rs.ring,
                    i === 0 ? 'w-32 h-48' : 'w-28 h-40',
                    dark ? 'bg-navy-700' : 'bg-parchment-dark'
                  )}>
                    {src && <img src={src} alt={b.title} className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className={cn('absolute top-4 left-4 px-2 py-0.5 rounded-full text-[11px] font-black shadow-lg', rs.badge)}>
                    {rs.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <AnimatePresence mode="wait">

        {/* KATEGORI */}
        {!searched && (
          <motion.section key="cats" className="max-w-7xl mx-auto px-4 mt-8 pb-12"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <h2 className={cn('font-serif text-lg font-bold mb-3', tk.text)}>Telusuri Kategori</h2>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map((c, i) => (
                <motion.button key={c.id} onClick={() => loadCategory(c.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                    tk.chip
                  )}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.95 }}>
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-xs font-medium text-center leading-tight">{c.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* RESULTS */}
        {searched && (
          <motion.section key="results" className="max-w-7xl mx-auto px-4 mt-6 pb-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {Array(16).fill(0).map((_,i) => (
                  <div key={i}>
                    <div className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', tk.skeleton)} />
                    <div className={cn('h-2.5 rounded mt-2 w-3/4 animate-pulse', tk.skeleton)} />
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className={cn('text-center py-16', tk.muted)}>Buku tidak ditemukan 😔</div>
            ) : rest.length > 0 ? (
              <div className="mt-[230px] md:mt-0">
                <p className="text-slate-500 text-xs font-medium mb-3 uppercase tracking-wider">#4 dan seterusnya</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4">
                  {rest.map((b, i) => (
                    <BookCard key={b.key} book={b} index={i} rank={i + 4} dark={dark} />
                  ))}
                </div>
              </div>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookCard({ book, index, rank, dark }: { book: Book; index: number; rank: number; dark: boolean }) {
  const src = coverUrl(book.coverId);
  return (
    <motion.div className="cursor-pointer group"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -6 }}
      onClick={() => window.location.href = `/book/${book.key.split('/').pop()}`}>
      <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg relative', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
        {src && <img src={src} alt={book.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy" />}
        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full
                        flex items-center justify-center">
          <span className="text-white/70 text-[9px] font-bold">{rank}</span>
        </div>
      </div>
      <p className={cn('text-xs font-medium mt-1.5 leading-tight line-clamp-2', dark ? 'text-white' : 'text-navy-900')}>{book.title}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{book.author}</p>
    </motion.div>
  );
}