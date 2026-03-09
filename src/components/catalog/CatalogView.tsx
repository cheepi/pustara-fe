'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Sun, Moon, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { CTASection } from './CTASection';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Book { key: string; title: string; author: string; coverId?: number; }

const CACHE: Record<string, Book[]> = {};
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
  { id: 'trending',   label: 'Terpopuler' },
  { id: 'fiction',    label: 'Fiksi' },
  { id: 'history',    label: 'Sejarah' },
  { id: 'science',    label: 'Sains' },
  { id: 'philosophy', label: 'Filsafat' },
  { id: 'biography',  label: 'Biografi' },
  { id: 'romance',    label: 'Romansa' },
];

const RANK_STYLE = [
  { badge: 'bg-yellow-400 text-yellow-900', ring: 'ring-yellow-400/40', z: 'z-30', label: '#1' },
  { badge: 'bg-slate-300 text-slate-700',   ring: 'ring-slate-300/30',  z: 'z-20', label: '#2' },
  { badge: 'bg-amber-600 text-amber-100',   ring: 'ring-amber-500/30',  z: 'z-10', label: '#3' },
];

async function fetchBooks(genre: string): Promise<Book[]> {
  if (CACHE[genre]) return CACHE[genre];
  const q = GENRE_QUERIES[genre] || `subject:${genre}`;
  const r = await fetch(`https://openlibrary.org/search.json?${q}&limit=24&fields=key,title,author_name,cover_i`);
  const d = await r.json();
  const books = (d.docs || []).filter((b: any) => b.cover_i).map((b: any) => ({
    key: b.key, title: b.title || '?',
    author: (b.author_name || ['?'])[0],
    coverId: b.cover_i,
  }));
  CACHE[genre] = books;
  return books;
}

export default function CatalogView() {
  const [genre, setGenre]     = useState('trending');
  const [books, setBooks]     = useState<Book[]>([]);
  const [top3, setTop3]       = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [timer, setTimer]     = useState<ReturnType<typeof setTimeout>>();

  // Global theme — syncs with browse page
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    fetchBooks('trending').then(b => setTop3(b.slice(0, 3)));
  }, []);

  const load = useCallback(async (g: string) => {
    setLoading(true);
    try { setBooks(await fetchBooks(g)); }
    catch { setBooks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(genre); }, [genre, load]);

  function handleSearch(q: string) {
    setSearch(q);
    clearTimeout(timer);
    if (!q) { load(genre); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=24&fields=key,title,author_name,cover_i`);
        const d = await r.json();
        setBooks((d.docs||[]).filter((b:any)=>b.cover_i).map((b:any)=>({
          key:b.key, title:b.title, author:(b.author_name||['?'])[0], coverId:b.cover_i
        })));
      } finally { setLoading(false); }
    }, 450);
    setTimer(t);
  }

  const tk = {
    bg:         dark ? 'bg-navy-900'    : 'bg-parchment',
    text:       dark ? 'text-white'     : 'text-navy-900',
    muted:      dark ? 'text-slate-500' : 'text-slate-500',
    card:       dark ? 'bg-navy-700'    : 'bg-parchment-dark',
    skeleton:   dark ? 'bg-navy-700/60' : 'bg-parchment-dark',
    input:      dark
      ? 'bg-navy-700/80 border-navy-500 text-white placeholder-slate-500 focus:border-gold/50 focus:ring-gold/10'
      : 'bg-white border-parchment-darker text-navy-900 placeholder-slate-400 focus:border-gold focus:ring-gold/10',
    chip:       dark
      ? 'border-navy-500 text-slate-400 hover:border-gold/40 hover:text-slate-200'
      : 'border-parchment-darker text-slate-500 hover:border-gold/60 hover:text-slate-700',
    chipActive: dark
      ? 'border-gold text-gold bg-gold/10'
      : 'border-gold text-gold bg-gold/10',
    toggle:     dark
      ? 'bg-navy-700 border-navy-500 text-slate-300 hover:text-white'
      : 'bg-white border-parchment-darker text-slate-500 hover:text-slate-700',
  };

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)}>
      <Navbar />

      {/* ── HERO ── */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">

          {/* LEFT */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-gold/70 text-xs font-semibold uppercase tracking-widest mb-1">Katalog Publik</p>
                <h1 className={cn('font-serif text-3xl lg:text-4xl font-black leading-tight mb-1', tk.text)}>
                  Perpustakaan Digital
                </h1>
                <p className={cn('text-sm', tk.muted)}>Jelajahi ribuan buku — gratis, tanpa akun</p>
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

            {/* Search */}
            <div className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Cari judul, penulis, atau topik…"
                className={cn(
                  'w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm outline-none ring-2 ring-transparent transition-all',
                  tk.input
                )} />
            </div>
          </div>

          {/* RIGHT — Top 3 Trending, always visible */}
          {top3.length > 0 && (
            <motion.div
              className="flex-shrink-0 relative flex justify-center"
              style={{ width: 260, height: 210 }}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}>

              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
                <Medal className="w-3 h-3 text-gold" />
                <span className="text-gold text-[10px] font-semibold uppercase tracking-wider">Top 3 Trending</span>
              </div>

              {[...top3].reverse().map((b, ri) => {
                const i   = top3.length - 1 - ri;
                const rs  = RANK_STYLE[i];
                const src = coverUrl(b.coverId);
                const xOff = [0, -68, 68][i];
                const yOff = [0, 22, 30][i];
                const rot  = [0, -9, 10][i];
                return (
                  <motion.div key={b.key} className={cn('absolute cursor-pointer p-2', rs.z)}
                    style={{ x: xOff, y: yOff + 20, rotate: rot }}
                    whileHover={{ y: yOff + 20 - 20, rotate: 0, scale: 1.08, zIndex: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}>
                    <div className={cn(
                      'rounded-2xl overflow-hidden shadow-2xl ring-2',
                      rs.ring, tk.card,
                      i === 0 ? 'w-28 h-40' : 'w-24 h-36'
                    )}>
                      {src && <img src={src} alt={b.title} className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className={cn('absolute top-4 left-4 px-2 py-0.5 rounded-full text-[11px] font-black shadow-lg', rs.badge)}>
                      {rs.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── GENRE CHIPS ── */}
      <section className="max-w-7xl mx-auto px-4 mt-10 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {GENRES.map(g => (
            <button key={g.id} onClick={() => { setGenre(g.id); setSearch(''); }}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border',
                genre === g.id && !search ? tk.chipActive : tk.chip
              )}>
              {g.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── BOOKS GRID ── */}
      <section className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn('font-serif text-lg font-bold', tk.text)}>
            {search ? `Hasil "${search}"` : GENRES.find(g => g.id === genre)?.label}
          </h2>
          {!loading && books.length > 0 && (
            <span className={cn('text-xs', tk.muted)}>{books.length} judul</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4">
            {Array(16).fill(0).map((_,i) => (
              <div key={i}>
                <div className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', tk.skeleton)} />
                <div className={cn('h-2.5 rounded mt-2 w-3/4 animate-pulse', tk.skeleton)} />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className={cn('text-center py-16', tk.muted)}>Buku tidak ditemukan</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 gap-3 lg:gap-4">
            {books.map((b, i) => (
              <BookCard key={b.key} book={b} index={i} dark={dark} cardCls={tk.card} />
            ))}
          </div>
        )}
      </section>

      <CTASection dark={dark} />
    </div>
  );
}

function BookCard({ book, index, dark, cardCls }: { book: Book; index: number; dark: boolean; cardCls: string }) {
  const src = coverUrl(book.coverId);
  return (
    <motion.div className="cursor-pointer group"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.25) }} whileHover={{ y: -5 }}
      onClick={() => window.location.href = `/book/${book.key.split('/').pop()}`}>
      <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md', cardCls)}>
        {src && <img src={src} alt={book.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy" />}
      </div>
      <p className={cn('text-[11px] font-medium mt-1.5 leading-tight line-clamp-2', dark ? 'text-white' : 'text-navy-900')}>{book.title}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{book.author}</p>
    </motion.div>
  );
}