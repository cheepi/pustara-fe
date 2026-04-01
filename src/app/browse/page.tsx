'use client';
import { useState, useEffect, useMemo, useRef, type ComponentType } from 'react';
import { useSearchParams, useRouter, usePathname, ReadonlyURLSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Medal, Star, BookOpen, ArrowRight, X, Calendar, 
  FileText, WifiOff, RefreshCw, TrendingUp, Sparkles,
  Landmark, FlaskConical, Brain, User, Heart, Cpu, 
  Leaf, Wand2, Rocket, Cat, Flame, Feather, Notebook, Baby, Ghost, Sword, Globe
  } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import Link from 'next/link';
import { useChatAI } from '@/hooks/useChatAI';
import { useRecommendations } from '@/hooks/useRecommendations';
import { fetchOpenLibraryCoverId } from '@/lib/api';
import type { AiRecommendation } from '@/types/ai';
import AiRecoCard from '@/components/ai/AiRecoCard';
import { AiRecoCardSkeleton, } from '@/components/ai/AiRecoCard';
import { fetchTopPustakrew } from '@/lib/browse';
import type { BrowseBook } from '@/types/browse';
import { BROWSE_POPULAR_BOOKS } from '@/data/browseFallback';
import { getBooks, getGenres, searchBooks } from '@/lib/books';
import { useTrendingBooks } from '@/hooks/useTrendingBooks';
import { useGenreShelves } from '@/hooks/useGenreShelves';
import { GenreShelfSection } from '@/components/shared/GenreShelfSection';
import { JSX } from 'react/jsx-runtime';
import { Suspense } from 'react';

// const coverUrl = (id?: number, s = 'M') =>
//   id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const pseudo = (n: number, mn: number, mx: number) =>
  mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);

const getRating = (coverId?: number, idx = 0) =>
  (pseudo((coverId ?? idx) + 7, 36, 50) / 10).toFixed(1);

// ── Constants ──────────────────────────────────────────────────────────────────
type CategoryItem = {
  id: string;
  label: string;
  query: string;
  icon: ComponentType<{ className?: string }>;
};

const FALLBACK_CATEGORY_LABELS = [
  'Fiksi',
  'Sejarah',
  'Sains',
  'Sastra',
  'Biografi',
  'Romansa',
  'Misteri',
  'Teknologi',
];

function normalizeCategoryId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function pickCategoryIcon(label: string) {
  const text = label.toLowerCase();

  if (text.includes('alam') || text.includes('nature') || text.includes('lingkungan')) return Leaf;
  if (text.includes('fantasi') || text.includes('fantasy') || text.includes('magic')) return Wand2;
  if (text.includes('ilmiah') || text.includes('sci-fi') || text.includes('science fiction')) return Rocket;
  if (text.includes('distopia') || text.includes('dystopia') || text.includes('apocalypse')) return Flame;
  if (text.includes('fabel') || text.includes('hewan') || text.includes('animal')) return Cat;
  if (text.includes('anak') || text.includes('children') || text.includes('kids')) return Baby;
  if (text.includes('diary') || text.includes('jurnal') || text.includes('journal')) return Notebook;
  if (text.includes('esai') || text.includes('puisi') || text.includes('poem')) return Feather;
  if (text.includes('horor') || text.includes('horror') || text.includes('hantu')) return Ghost;
  if (text.includes('aksi') || text.includes('action') || text.includes('petualangan')) return Sword;
  if (text.includes('diaspora') || text.includes('budaya') || text.includes('culture')) return Globe;
  if (text.includes('sejarah') || text.includes('history')) return Landmark;
  if (text.includes('sains') || text.includes('science')) return FlaskConical;
  if (text.includes('sastra') || text.includes('literature') || text.includes('novel') || text.includes('fiksi') || text.includes('fiction')) return BookOpen;
  if (text.includes('biografi') || text.includes('biography') || text.includes('memoir')) return User;
  if (text.includes('romance') || text.includes('romansa') || text.includes('cinta')) return Heart;
  if (text.includes('misteri') || text.includes('mystery') || text.includes('thriller')) return Search;
  if (text.includes('teknologi') || text.includes('technology') || text.includes('computer') || text.includes('programming')) return Cpu;
  if (text.includes('psikologi') || text.includes('filsafat') || text.includes('pemikiran')) return Brain;

  if (text.includes('sastra') || text.includes('literature') || text.includes('novel') || text.includes('fiksi') || text.includes('fiction')) return BookOpen;
  
  return BookOpen;
}

function buildCategoryItems(labels: string[]): CategoryItem[] {
  const unique = new Map<string, string>();
  for (const label of labels) {
    const text = String(label || '').trim();
    if (!text) continue;
    const id = normalizeCategoryId(text);
    if (!id) continue;
    if (!unique.has(id)) unique.set(id, text);
  }

  return Array.from(unique.entries())
    .map(([id, label]) => ({
      id,
      label,
      query: label,
      icon: pickCategoryIcon(label),
    }))
    .slice(0, 16);
}

function mapToBrowseBook(book: Record<string, unknown>): BrowseBook {
  const authors = Array.isArray(book.authors)
    ? book.authors.map(String).join(', ')
    : String(book.author ?? book.authors ?? 'Unknown');
  const availableRaw = Number(book.available ?? book.available_count ?? NaN);
  const totalStockRaw = Number(book.total_stock ?? book.totalStock ?? NaN);
  const hasAvailable = Number.isFinite(availableRaw);
  const hasStock = Number.isFinite(totalStockRaw);

  return {
    key: String(book.id ?? ''),
    title: String(book.title ?? ''),
    author: authors,
    coverUrl: String(book.cover_url ?? ''),
    available: hasAvailable ? availableRaw > 0 : true,
    availableCount: hasAvailable ? availableRaw : undefined,
    totalStock: hasStock ? totalStockRaw : undefined,
    genres: Array.isArray(book.genres) ? book.genres.map(String) : [],
    rating: Number(book.avg_rating ?? 0),
    year: Number(book.year ?? 0) || undefined,
    pages: Number(book.pages ?? 0) || undefined,
    desc: String(book.description ?? ''),
  };
}

const RANK_STYLE = [
  {
    // #1 — gold crown
    badge:  'bg-yellow-400 text-yellow-900',
    ring:   'ring-2 ring-yellow-400/70',
    shadow: 'shadow-[0_0_0_2px_rgba(250,204,21,0.6),0_20px_60px_rgba(250,204,21,0.25),0_8px_32px_rgba(0,0,0,0.4)]',
    idle:   'shadow-[0_0_0_2px_rgba(250,204,21,0.35),0_12px_40px_rgba(0,0,0,0.35)]',
  },
  {
    // #2 — silver
    badge:  'bg-slate-200 text-slate-700',
    ring:   'ring-2 ring-slate-300/60',
    shadow: 'shadow-[0_0_0_2px_rgba(203,213,225,0.6),0_20px_60px_rgba(148,163,184,0.2),0_8px_32px_rgba(0,0,0,0.45)]',
    idle:   'shadow-[0_0_0_2px_rgba(203,213,225,0.3),0_12px_40px_rgba(0,0,0,0.4)]',
  },
  {
    // #3 — bronze
    badge:  'bg-amber-600 text-amber-100',
    ring:   'ring-2 ring-amber-500/60',
    shadow: 'shadow-[0_0_0_2px_rgba(217,119,6,0.55),0_20px_60px_rgba(217,119,6,0.18),0_8px_32px_rgba(0,0,0,0.45)]',
    idle:   'shadow-[0_0_0_2px_rgba(217,119,6,0.3),0_12px_40px_rgba(0,0,0,0.4)]',
  },
];
function useAiCover(reco?: AiRecommendation) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!reco) return;
    fetchOpenLibraryCoverId(reco.title, reco.authors).then(id => {
      if (id) setSrc(`https://covers.openlibrary.org/b/id/${id}-M.jpg`);
    });
  }, [reco?.title, reco?.authors]);
  return src;
}
 
// Mini reco card untuk hasil chat
function MiniRecoCard({ reco, dark, tk }: { reco: AiRecommendation; dark: boolean; tk: any }) {
  const coverSrc = useAiCover(reco);
  return (
    <Link href={`/browse?q=${encodeURIComponent(reco.title)}`}>
      <motion.div
        className={cn('flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all',
          dark ? 'hover:bg-white/5' : 'hover:bg-slate-50')}
        whileHover={{ x: 3 }}>
        <div className={cn('w-9 h-12 rounded-lg overflow-hidden flex-shrink-0', dark ? 'bg-navy-700' : 'bg-parchment-darker')}>
          {coverSrc && <img src={coverSrc} alt={reco.title} className="w-full h-full object-cover" loading="lazy" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold line-clamp-1', tk.text)}>{reco.title}</p>
          <p className={cn('text-[10px] truncate mt-0.5', tk.muted)}>{reco.authors}</p>
          <p className={cn('text-[10px] line-clamp-1 mt-0.5 italic', tk.muted)}>✦ {reco.reason_primary}</p>
        </div>
        <span className="text-[10px] font-bold text-gold flex-shrink-0">★{reco.avg_rating.toFixed(1)}</span>
      </motion.div>
    </Link>
  );
}
 
const CHAT_SUGGESTIONS = [
  'Mirip Laskar Pelangi',
  'Sastra Indonesia klasik',
  'Buku untuk dibaca sebelum tidur',
  'Fiksi pendek',
];
 
export function AISection({ dark, tk }: { dark: boolean; tk: any }) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [chatResult, setChatResult] = useState<AiRecommendation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLight = !dark;

  const { recommendations: defaultRecs, loading: defaultLoading } = useRecommendations();
  const { sendMessage, chatHistory, chatLoading } = useChatAI();

  useEffect(() => {
    const last = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.recommendations?.length);
    if (last?.recommendations) setChatResult(last.recommendations.slice(0, 4));
  }, [chatHistory]);

  const aiReco = defaultRecs;
  const aiLoading = defaultLoading;

  function handleSuggestion(s: string) {
    setInput(s);
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  async function handleSend(q: string) {
    if (!q.trim() || chatLoading) return;
    setInput('');
    setChatResult([]);
    await sendMessage(q);
  }

  return (
    <div>
      <section className="mt-8 max-w-7xl mx-auto">
        <div className="flex gap-4 px-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
          {aiLoading
            ? Array(5).fill(0).map((_, i) => <AiRecoCardSkeleton key={i} isLight={isLight} />)
            : aiReco.length > 0
              ? aiReco.map((reco, i) => (
                  <AiRecoCard key={reco.book_id} reco={reco} index={i} isLight={isLight} />
                ))
              : (
                <p className="text-sm px-1 py-8" style={{ color: 'var(--muted)' }}>
                  Rekomendasi belum tersedia. Hubungi <Link href=" " target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">@Pustakrew</Link> jika menurutmu ini tidak seharusnya terjadi.
                </p>
              )
          }
        </div>
      </section>

      <motion.button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left',
          dark ? 'border-gold/20 bg-gold/5 hover:bg-gold/10' : 'border-gold/30 bg-gold/5 hover:bg-gold/10'
        )}>
        <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
        <span className={cn('text-sm', tk.text)}>
          Tanya PustarAI — <span className={tk.muted}>"Rekomendasiin buku mirip Laskar Pelangi..."</span>
        </span>
        <ArrowRight className={cn('w-4 h-4 ml-auto flex-shrink-0 transition-transform', tk.muted, expanded && 'rotate-90')} />
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className={cn('mt-2 p-4 rounded-2xl border', dark ? 'bg-navy-800/60 border-white/8' : 'bg-white border-parchment-darker')}>
              <p className={cn('text-xs mb-3', tk.muted)}>Apa yang ingin kamu temukan?</p>

              <div className="flex gap-2 flex-wrap mb-3">
                {CHAT_SUGGESTIONS.map(s => (
                  <button key={s}
                    onClick={() => handleSuggestion(s)}
                    className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                      dark ? 'border-white/10 text-white/60 hover:border-gold/40 hover:text-gold'
                           : 'border-slate-200 text-slate-500 hover:border-gold/40 hover:text-gold')}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                  placeholder={chatLoading ? 'PustarAI sedang berpikir...' : 'Atau ketik sendiri...'}
                  disabled={chatLoading}
                  className={cn('flex-1 px-3 py-2 rounded-xl border text-sm outline-none transition-all',
                    dark ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50 disabled:opacity-50'
                         : 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold disabled:opacity-50')}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || chatLoading}
                  className="px-4 py-2 rounded-xl bg-gold text-navy-900 text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40 min-w-[64px] flex items-center justify-center">
                  {chatLoading
                    ? <div className="flex gap-0.5">{[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-navy-900 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    : 'Tanya'
                  }
                </button>
              </div>

              <AnimatePresence>
                {chatResult.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                    <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-2', tk.muted)}>Hasil PustarAI</p>
                    <div className="space-y-1">
                      {chatResult.map(r => <MiniRecoCard key={r.book_id} reco={r} dark={dark} tk={tk} />)}
                    </div>
                    <Link href="/pustarai/chat"
                      className={cn('flex items-center justify-center gap-1 text-xs font-semibold mt-3 pt-2 border-t transition-colors hover:text-gold', tk.muted)}
                      style={{ borderColor: 'var(--border)' }}>
                      Buka Chat lengkap <ArrowRight className="w-3 h-3" />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
function BrowseContent() {
  const { ready } = useProtectedRoute();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query,      setQuery]      = useState('');
  const [activeCategoryQuery, setActiveCategoryQuery] = useState('');
  const [activeCategoryLabel, setActiveCategoryLabel] = useState('');
  const [categories, setCategories] = useState<CategoryItem[]>(
    buildCategoryItems(FALLBACK_CATEGORY_LABELS)
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [books,      setBooks]      = useState<BrowseBook[]>([]);
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotalPages, setBooksTotalPages] = useState(1);
  const [booksTotalItems, setBooksTotalItems] = useState(0);
  const [topPicks,   setTopPicks]   = useState<BrowseBook[]>([]);
  const [topPicksLoading, setTopPicksLoading] = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [searched,   setSearched]   = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { books: trendingPopularBooks, loading: popularLoading } = useTrendingBooks(12);
  const popularBooks = useMemo<BrowseBook[]>(() => {
    return trendingPopularBooks.map((book) => ({
      key: String(book.key ?? ''),
      title: String(book.title ?? ''),
      author: String(book.author ?? 'Unknown'),
      coverUrl: String(book.coverUrl ?? ''),
      available: true,
      genres: Array.isArray(book.genre) ? book.genre : [],
      rating: Number(book.avgRating ?? 0),
      year: book.year ? Number(book.year) || undefined : undefined,
      pages: Number(book.pages ?? 0) || undefined,
      desc: String(book.desc ?? ''),
    }));
  }, [trendingPopularBooks]);
  const {
    shelves: genreShelves,
    loading: genreShelvesLoading,
    error: genreShelvesError,
  } = useGenreShelves({ limit: 16, booksLimit: 8 });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const appendInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const localSearchCacheRef = useRef<Map<string, BrowseBook[]>>(new Map());

  function syncQueryToUrl(q: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    const target = next.toString() ? `${pathname}?${next.toString()}` : pathname;
    router.replace(target, { scroll: false });
  }

  function flushUrlSync(q: string) {
    if (urlTimerRef.current) {
      clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    }
    syncQueryToUrl(q);
  }

  useEffect(() => {
    let active = true;
    setTopPicksLoading(true);
    fetchTopPustakrew(3)
      .then((items) => {
        if (!active) return;
        setTopPicks(items);
      })
      .catch(() => {
        if (!active) return;
        setTopPicks([]);
      })
      .finally(() => {
        if (!active) return;
        setTopPicksLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setCategoriesLoading(true);
    setCategoriesError(null);

    getGenres()
      .then((genreList) => {
        if (!mounted) return;
        const dynamicItems = buildCategoryItems(genreList);
        if (dynamicItems.length > 0) {
          setCategories(dynamicItems);
          return;
        }
        setCategories(buildCategoryItems(FALLBACK_CATEGORY_LABELS));
      })
      .catch(() => {
        if (!mounted) return;
        setCategories(buildCategoryItems(FALLBACK_CATEGORY_LABELS));
        setCategoriesError('Kategori dinamis belum tersedia, memakai kategori default.');
      })
      .finally(() => {
        if (!mounted) return;
        setCategoriesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function runBooksQuery(options: {
    search?: string;
    genre?: string;
    page?: number;
    append?: boolean;
  }) {
    const nextPage = options.page ?? 1;
    const isAppend = Boolean(options.append);
    const requestId = ++requestIdRef.current;

    if (isAppend) setLoadingMore(true);
    else setLoading(true);

    setError(null);

    try {
      const result = await getBooks({
        search: options.search,
        genre: options.genre,
        page: nextPage,
        limit: 24,
      });

      if (requestId !== requestIdRef.current) return;

      const mapped = result.data.map((item) => mapToBrowseBook(item as unknown as Record<string, unknown>));

      if (mapped.length === 0 && options.search?.trim()) {
        const cacheKey = options.search.trim().toLowerCase();
        let fallbackList = localSearchCacheRef.current.get(cacheKey);

        if (!fallbackList) {
          const localMatches = await searchBooks(options.search);
          fallbackList = localMatches.map((book) => ({
            key: String(book.id ?? ''),
            title: String(book.title ?? ''),
            author: Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown',
            coverUrl: String(book.cover_url ?? ''),
            available: Number(book.available ?? 0) > 0,
            availableCount: Number(book.available ?? 0),
            totalStock: Number(book.total_stock ?? 0),
            genres: Array.isArray(book.genres) ? book.genres.map(String) : [],
            rating: Number(book.avg_rating ?? 0),
            year: Number(book.year ?? 0) || undefined,
            pages: Number(book.pages ?? 0) || undefined,
            desc: String(book.description ?? ''),
          }));
          localSearchCacheRef.current.set(cacheKey, fallbackList);
        }

        const totalItems = fallbackList.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / 24));
        const start = (nextPage - 1) * 24;
        const paged = fallbackList.slice(start, start + 24);

        setBooks((prev) => {
          if (!isAppend) return paged;

          const merged = [...prev, ...paged];
          const unique = new Map<string, BrowseBook>();
          for (const book of merged) {
            if (!book.key) continue;
            if (!unique.has(book.key)) unique.set(book.key, book);
          }
          return Array.from(unique.values());
        });

        setBooksPage(Math.min(nextPage, totalPages));
        setBooksTotalPages(totalPages);
        setBooksTotalItems(totalItems);
        return;
      }

      setBooks((prev) => {
        if (!isAppend) return mapped;

        const merged = [...prev, ...mapped];
        const unique = new Map<string, BrowseBook>();
        for (const book of merged) {
          if (!book.key) continue;
          if (!unique.has(book.key)) unique.set(book.key, book);
        }
        return Array.from(unique.values());
      });

      setBooksPage(result.meta.page);
      setBooksTotalPages(result.meta.total_pages);
      setBooksTotalItems(result.meta.total_items);
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (!isAppend) setBooks([]);
      setError('Gagal memuat buku. Coba lagi beberapa saat.');
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      if (activeCategoryQuery) {
        return;
      }
      setQuery((prev) => (prev ? '' : prev));
      setSearched(false);
      setActiveCategoryQuery('');
      setActiveCategoryLabel('');
      setBooks([]);
      setBooksPage(1);
      setBooksTotalPages(1);
      setBooksTotalItems(0);
      setError(null);
      return;
    }

    setQuery(q);
    setActiveCategoryQuery('');
    setActiveCategoryLabel('');
    setSearched(true);
    void runBooksQuery({ search: q, page: 1, append: false });
  }, [searchParams, activeCategoryQuery]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
    };
  }, []);

  const { theme } = useTheme();
  const dark = theme === 'dark';

  const tk = {
    text:     dark ? 'text-white'     : 'text-navy-900',
    muted:    dark ? 'text-slate-400' : 'text-slate-500',
    skeleton: dark ? 'bg-navy-700/60' : 'bg-parchment-darker',
    chip:     dark
      ? 'bg-navy-700/50 border-navy-500/60 text-slate-400 hover:border-gold/30 hover:text-slate-200'
      : 'bg-white border-parchment-darker text-slate-500 hover:border-gold/60 hover:text-slate-700',
    input: dark
      ? 'bg-navy-700/80 border-navy-500 text-white placeholder-slate-500 focus:border-gold/50'
      : 'bg-white border-parchment-darker text-navy-900 placeholder-slate-400 focus:border-gold',
    panelBg: dark
      ? 'bg-navy-800/96 border-white/10'
      : 'bg-white/96 border-navy-200/70',
    genreChip: dark
      ? 'bg-white/5 border-white/15 text-white/70'
      : 'bg-navy-50 border-navy-200 text-navy-600',
  };

  async function loadCategory(categoryQuery: string, categoryLabel?: string) {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (urlTimerRef.current) {
      clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    }
    setActiveCategoryQuery(categoryQuery);
    setActiveCategoryLabel(categoryLabel || categoryQuery);
    setQuery('');
    setSearched(true);
    setError(null);
    syncQueryToUrl('');
    await runBooksQuery({ genre: categoryQuery, page: 1, append: false });
  }

  function handleSearch(q: string) {
    setQuery(q);
    setActiveCategoryQuery('');
    setActiveCategoryLabel('');
    setError(null);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (urlTimerRef.current) {
      clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    }

    const trimmed = q.trim();
    if (!trimmed) {
      localSearchCacheRef.current.clear();
      flushUrlSync('');
      setSearched(false);
      setBooks([]);
      return;
    }

    urlTimerRef.current = setTimeout(() => {
      syncQueryToUrl(trimmed);
    }, 900);

    searchTimerRef.current = setTimeout(async () => {
      setSearched(true);
      await runBooksQuery({ search: trimmed, page: 1, append: false });
    }, 650);
  }

  const rest         = searched ? books.slice(3) : [];
  const sectionLabel = activeCategoryLabel
    ? `Kategori ${activeCategoryLabel}`
    : query ? `Hasil "${query}"` : '';
  const hasMoreBooks = booksPage < booksTotalPages;
  const compactDesktopResults = searched && books.length > 0 && books.length <= 3;

  function getSourceLabel(book: BrowseBook): string {
    if (activeCategoryLabel) return `Genre: ${activeCategoryLabel}`;

    const q = query.trim().toLowerCase();
    if (!q) return 'Cocok untuk kamu';

    const author = (book.author || '').toLowerCase();
    const title = (book.title || '').toLowerCase();
    const matchedGenre = (book.genres || []).some((genre) => String(genre).toLowerCase().includes(q));

    if (matchedGenre) return 'Dari genre yang kamu cari';
    if (author.includes(q)) return 'Dari author yang kamu cari';
    if (title.includes(q)) return 'Cocok dari judul';
    return 'Cocok untuk kamu';
  }

  useEffect(() => {
    if (!searched || loading || !!error || !hasMoreBooks) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (appendInFlightRef.current || loadingMore) return;

        appendInFlightRef.current = true;
        void runBooksQuery({
          search: activeCategoryQuery ? undefined : query.trim() || undefined,
          genre: activeCategoryQuery || undefined,
          page: booksPage + 1,
          append: true,
        }).finally(() => {
          appendInFlightRef.current = false;
        });
      },
      { rootMargin: '260px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    searched,
    loading,
    loadingMore,
    error,
    hasMoreBooks,
    booksPage,
    query,
    activeCategoryQuery,
  ]);

  if (!ready) return <PageSkeleton />;

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <section className="max-w-7xl mx-auto px-4 pt-5 pb-2">
        <div className={cn(
          'hidden md:flex items-center justify-end gap-2 mt-8 -mb-12',
          compactDesktopResults ? 'mr-2 opacity-0 pointer-events-none' : 'mr-52'
        )}>
          <Medal className="w-3.5 h-3.5 text-gold" />
          <span className="text-gold text-xs font-semibold uppercase tracking-wider">
            {searched ? 'Top 3 Hasil Terbaik' : 'Pustara\'s Pick — kurasi dari Pustakrew'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-3 min-w-0 md:w-[44%] lg:w-[40%] md:pt-6">

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query} onChange={e => handleSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    flushUrlSync(query);
                  }
                }}
                placeholder="Cari judul, penulis, atau genre…"
                className={cn(
                  'w-full pl-11 pr-10 py-3.5 border rounded-2xl text-sm outline-none transition-all',
                  tk.input
                )}
              />
              {query && (
                <button onClick={() => handleSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {/* ── NOT searched ── */}
              {!searched && (
                <motion.div key="idle"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

                  <div className="hidden md:block">
                    {topPicksLoading && (
                      <div className="animate-pulse">
                        <div className={cn('h-3 w-24 rounded mb-3', tk.skeleton)} />
                        <div className={cn('h-9 w-4/5 rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-4 w-1/2 rounded mb-3', tk.skeleton)} />
                        <div className="flex gap-1 mb-3">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className={cn('h-4 w-4 rounded', tk.skeleton)} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={cn('h-6 w-20 rounded-full', tk.skeleton)} />
                          ))}
                        </div>
                        <div className={cn('h-3 w-full rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-3 w-11/12 rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-3 w-4/5 rounded mb-4', tk.skeleton)} />
                        <div className={cn('h-10 w-32 rounded-2xl', tk.skeleton)} />
                      </div>
                    )}
                    {(() => {
                      if (topPicksLoading) return null;
                      const activeIdx = hoveredIdx ?? 0;
                      const b  = topPicks[activeIdx] ?? topPicks[0];
                      if (!b) return null;
                      const rs = RANK_STYLE[activeIdx];
                      const rn = Number(b.rating);
                      return (
                        <AnimatePresence mode="wait">
                          <motion.div key={`preview-${activeIdx}`}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0', rs.badge)}>
                                {activeIdx + 1}
                              </div>
                              <span className={cn('text-[11px] font-semibold uppercase tracking-widest', tk.muted)}>
                                Pick #{activeIdx + 1}
                              </span>
                            </div>
                            <h2 className={cn('font-serif text-3xl lg:text-4xl font-black leading-tight mb-1', tk.text)}>
                              {b.title}
                            </h2>
                            <p className={cn('text-sm mb-3', tk.muted)}>{b.author}</p>
                            <div className="flex items-center gap-1 mb-3">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={cn('w-4 h-4',
                                  s <= Math.round(rn) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200'
                                )} />
                              ))}
                              <span className="text-gold font-bold ml-1">{b.rating}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {b.genres?.map((g: string) => (
                                <span key={g} className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', tk.genreChip)}>{g}</span>
                              ))}
                            </div>
                            <p className={cn('text-sm leading-relaxed mb-4 line-clamp-3', tk.muted)}>{b.desc}</p>
                            <div className="flex items-center gap-4 mb-4">
                              <span className={cn('text-sm flex items-center gap-1.5', tk.muted)}>
                                <Calendar className="w-3.5 h-3.5" />{b.year}
                              </span>
                              <span className={cn('text-sm flex items-center gap-1.5', tk.muted)}>
                                <FileText className="w-3.5 h-3.5" />{b.pages} hal.
                              </span>
                            </div>
                            <Link href={`/book/${b.key}`}
                              className={cn(
                                'inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                                dark ? 'bg-gold text-navy-900 hover:bg-gold-light' : 'bg-navy-800 text-white hover:bg-navy-700'
                              )}>
                              <BookOpen className="w-4 h-4" />
                              Lihat Detail
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <p className={cn('text-xs mt-3 flex items-center gap-1.5', tk.muted)}>
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                              Hover cover lain untuk detail
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      );
                    })()}
                  </div>

                  <div className="md:hidden">
                    {topPicksLoading ? (
                      <div className="animate-pulse">
                        <div className={cn('h-9 w-3/4 rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-4 w-2/3 rounded mb-8', tk.skeleton)} />
                        <div className={cn('h-3 w-40 rounded', tk.skeleton)} />
                      </div>
                    ) : (
                      <>
                        <h1 className={cn('font-serif text-3xl font-black leading-tight mb-1', tk.text)}>
                          Temukan buku<br /><span className="text-gold">favoritmu.</span>
                        </h1>
                        <p className={cn('text-sm', tk.muted)}>Dari fiksi klasik sampai sains modern.</p>
                        <div className="flex md:hidden items-center justify-start mt-8">
                          <Medal className="w-3.5 h-3.5 text-gold" />
                          <span className="text-gold text-xs font-semibold uppercase tracking-wider">
                            Pustara's Pick — kurasi dari Pustakrew 📚
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Searched ── */}
              {searched && (
                <motion.div key="searched"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

                  <div className="hidden md:block">
                    {(() => {
                      const activeIdx = hoveredIdx ?? 0;
                      const b    = books[activeIdx];
                      const rs   = RANK_STYLE[activeIdx] || RANK_STYLE[2];
                      const rating = b?.rating?.toFixed(1) || "4.5";
                      const rn   = Number(rating);
                      if (!b) return null;
                      return (
                        <AnimatePresence mode="wait">
                          <motion.div key={`sr-${activeIdx}`}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black', rs.badge)}>
                                {activeIdx + 1}
                              </div>
                              <span className={cn('text-[11px] font-semibold uppercase tracking-widest', tk.muted)}>
                                Hasil #{activeIdx + 1}
                              </span>
                            </div>
                            <h2 className={cn('font-serif text-3xl font-black leading-tight mb-1', tk.text)}>
                              {b.title}
                            </h2>
                            <p className={cn('text-sm mb-3', tk.muted)}>{b.author}</p>
                            <p className={cn('text-xs mb-3 font-medium', tk.muted)}>{getSourceLabel(b)}</p>
                            <div className="flex items-center gap-1 mb-4">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={cn('w-4 h-4',
                                  s <= Math.round(rn) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200'
                                )} />
                              ))}
                              <span className="text-gold font-bold ml-1">{rating}</span>
                            </div>
                            <Link href={`/book/${b.key}`}
                              className={cn(
                                'inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                                dark ? 'bg-gold text-navy-900 hover:bg-gold-light' : 'bg-navy-800 text-white hover:bg-navy-700'
                              )}>
                              <BookOpen className="w-4 h-4" /> Lihat Detail
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <p className={cn('text-xs mt-4', tk.muted)}>
                              {books.length} judul ditemukan · hover cover untuk ganti
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      );
                    })()}
                  </div>

                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className={cn('font-serif text-2xl font-black leading-tight', tk.text)}>{sectionLabel}</h2>
                        {!loading && books.length > 0 && (
                          <p className={cn('text-xs mt-0.5', tk.muted)}>{booksTotalItems} judul ditemukan</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSearch('')}
                        className={cn('text-xs transition-colors flex-shrink-0 mt-1 hover:text-gold', tk.muted)}>
                        ← Kategori
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT (Top 3) ── */}
          <div className={cn(
            'flex-1 min-w-0 pt-0',
            compactDesktopResults ? 'md:pt-6 md:max-w-[300px] md:mr-auto' : 'md:pt-24'
          )}>
            {(() => {
              if (!searched && topPicksLoading) {
                return (
                  <>
                    <div className="hidden md:block relative" style={{ height: 300 }}>
                      <div className="absolute left-1/2" style={{ transform: 'translateX(-50%)', top: 0 }}>
                        <div className={cn('w-[213px] h-[306px] rounded-2xl animate-pulse', tk.skeleton)} />
                      </div>
                      <div className="absolute left-1/2" style={{ transform: 'translateX(calc(-50% - 138px))', top: 45 }}>
                        <div className={cn('w-[174px] h-[258px] rounded-2xl animate-pulse opacity-80', tk.skeleton)} />
                      </div>
                      <div className="absolute left-1/2" style={{ transform: 'translateX(calc(-50% + 152px))', top: 57 }}>
                        <div className={cn('w-[174px] h-[258px] rounded-2xl animate-pulse opacity-80', tk.skeleton)} />
                      </div>
                    </div>

                    <div className="md:hidden">
                      <div className="flex gap-3 mb-4">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className={cn('flex-1 rounded-2xl animate-pulse', tk.skeleton)} style={{ aspectRatio: '2/3' }} />
                        ))}
                      </div>
                      <div className={cn('rounded-2xl border p-4 animate-pulse', dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker')}>
                        <div className={cn('h-3 w-24 rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-5 w-3/4 rounded mb-2', tk.skeleton)} />
                        <div className={cn('h-3 w-1/2 rounded mb-4', tk.skeleton)} />
                        <div className={cn('h-9 w-full rounded-xl', tk.skeleton)} />
                      </div>
                    </div>
                  </>
                );
              }

              const top3: BrowseBook[] = searched ? books.slice(0, 3) : topPicks;

              if (searched && top3.length < 3) {
                return (
                  <div className="mt-2 md:mt-3">
                    <div
                      className={cn(
                        'grid gap-3 mr-auto',
                        top3.length === 1
                          ? 'grid-cols-1 w-[220px]'
                          : 'grid-cols-2 w-full max-w-[460px]'
                      )}
                    >
                      {top3.map((b, i) => (
                        <GridBookCard
                          key={b.key}
                          book={b}
                          index={i}
                          rank={i + 1}
                          dark={dark}
                          tk={tk}
                          sourceLabel={getSourceLabel(b)}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <>                  
                  {/* Desktop fanned */}
                  <div className="hidden md:block relative" style={{ height: 300 }} onMouseLeave={() => setHoveredIdx(null)}>
                    {[...top3].reverse().map((b, ri) => {
                      const i     = top3.length - 1 - ri;
                      const rs    = RANK_STYLE[i] || RANK_STYLE[2];
                      const isHov = hoveredIdx === i;
                      const isSide = i !== 0;

                      const baseW = searched ? (i === 0 ? 160 : 134) : (i === 0 ? 213 : 174);
                      const baseH = searched ? (i === 0 ? 220 : 188) : (i === 0 ? 306 : 258);
                      const xOff = searched ? [0, -88, 88][i] : [0, -138, 152][i];
                      const yOff = [0, 45, 57][i];
                      const rot  = [0, -11, 12][i];

                      return (
                        <motion.div key={b.key}
                          className="absolute cursor-pointer left-1/2"
                          style={{ zIndex: isHov ? 50 : 10 - i, marginLeft: -baseW / 2 }}
                          animate={{
                            x:      xOff,
                            y:      isHov ? yOff - 20 : yOff,
                            rotate: isHov ? 0 : rot,
                            scale: isHov ? (searched ? 152 / baseW : 218 / baseW) : 1,
                            marginTop: searched ? -40 : 0,
                          }}
                          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                          onHoverStart={() => setHoveredIdx(i)}
                          onClick={() => window.location.href = `/book/${b.key}`}>

                          <div className={cn('rounded-2xl overflow-hidden relative transition-all duration-300', isHov ? rs.shadow : rs.idle)}
                            style={{ width: baseW, height: baseH }}>
                            {b.coverUrl ? (
                              <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                            ) : (
                              <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                            )}
                            {isSide && !isHov && <div className="absolute inset-0 bg-black/30 rounded-2xl" />}
                            <div className={cn('absolute top-2.5 left-2.5 min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg', rs.badge)}>
                              #{i + 1}
                            </div>
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                              <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                              <span className="text-white text-[10px] font-bold">{b.rating?.toFixed(1) || "4.5"}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    <AnimatePresence>
                      {hoveredIdx !== null && (() => {
                        const i     = hoveredIdx;
                        const b     = top3[i];
                        if (!b) return null;
                        const baseW = searched ? (i === 0 ? 140 : 114) : (i === 0 ? 210 : 171);
                        const xOff  = searched ? [0, -88, 88][i] : [0, -40, 88][i];
                        const panelX = i === 1 ? xOff + baseW / 2 - 80 : xOff - baseW / 2 - 180;

                        return (
                          <motion.div key={`dp-${i}`}
                            className={cn('absolute rounded-2xl border shadow-2xl p-4 backdrop-blur-md cursor-pointer', tk.panelBg)}
                            style={{ width: 220, zIndex: 60, top: [0, 28, 36][i] - 18, left: '50%', x: panelX }}
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => window.location.href = `/book/${b.key}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-navy-900 font-black text-[10px]">{i + 1}</span>
                              </div>
                              <span className={cn('text-[10px] font-semibold uppercase tracking-widest', tk.muted)}>Trending #{i + 1}</span>
                            </div>
                            <p className={cn('font-serif font-black text-base leading-tight mb-0.5 line-clamp-2', tk.text)}>{b.title}</p>
                            <p className={cn('text-xs mb-2.5', tk.muted)}>{b.author}</p>
                            <div className="flex items-center gap-1 mb-2.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={cn('w-3 h-3', s <= Math.round(b.rating || 4) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200')} />
                              ))}
                              <span className="text-gold text-xs font-bold ml-1">{b.rating?.toFixed(1) || "4.5"}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2.5">
                              {b.genres?.map(g => (
                                <span key={g} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', tk.genreChip)}>{g}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                <Calendar className="w-3 h-3" />{b.year || 2020}
                              </span>
                              <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                <FileText className="w-3 h-3" />{b.pages || 300} hal.
                              </span>
                            </div>
                            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', dark ? 'text-gold' : 'text-navy-700')}>
                              <BookOpen className="w-3.5 h-3.5" /> Lihat Detail <ArrowRight className="w-3 h-3" />
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Mobile covers */}
                  <div className="md:hidden">
                    <div className="flex gap-3 mb-4">
                      {top3.map((b, i) => {
                        const rs       = RANK_STYLE[i] || RANK_STYLE[2];
                        const isActive = hoveredIdx === i;
                        const isSide   = i !== 0;
                        return (
                          <motion.button key={b.key}
                            className="flex-1 relative"
                            onTap={() => setHoveredIdx(isActive ? null : i)}
                            onClick={() => setHoveredIdx(isActive ? null : i)}
                            animate={{ y: isActive ? -8 : 0, scale: isActive ? 1.04 : 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                            <div className={cn('w-full rounded-2xl overflow-hidden relative transition-all duration-300', isActive ? rs.shadow : rs.idle)} style={{ aspectRatio: '2/3' }}>
                              {b.coverUrl ? (
                                <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                              ) : (
                                <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                              )}
                              {isSide && !isActive && <div className="absolute inset-0 bg-black/20 rounded-2xl" />}
                              <div className={cn('absolute top-2 left-2 min-w-[26px] h-[26px] px-1.5 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg', rs.badge)}>
                                #{i + 1}
                              </div>
                              <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                                <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                                <span className="text-white text-[10px] font-bold">{b.rating?.toFixed(1) || "4.5"}</span>
                              </div>
                            </div>
                            <motion.div className="w-1.5 h-1.5 rounded-full mx-auto mt-2" animate={{ backgroundColor: isActive ? '#c9a84c' : 'transparent' }} />
                          </motion.button>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {hoveredIdx !== null && top3[hoveredIdx] && (() => {
                        const i  = hoveredIdx;
                        const b  = top3[i];
                        const rs = RANK_STYLE[i] || RANK_STYLE[2];

                        return (
                          <motion.div key={`mc-${i}`}
                            initial={{ opacity: 0, y: -12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className={cn('rounded-2xl border overflow-hidden', tk.panelBg)}>
                            <div className="flex gap-4 p-4">
                              <div className="flex-shrink-0 relative">
                                <div className={cn('rounded-xl overflow-hidden', rs.shadow)} style={{ width: 80, height: 116 }}>
                                  {b.coverUrl ? (
                                    <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                  ) : (
                                    <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                                  )}                                
                                </div>
                                <div className={cn('absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow', rs.badge)}>
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-widest mb-1', tk.muted)}>Trending #{i + 1}</p>
                                <p className={cn('font-serif font-black text-base leading-tight mb-0.5 line-clamp-2', tk.text)}>{b.title}</p>
                                <p className={cn('text-xs mb-2', tk.muted)}>{b.author}</p>
                                <div className="flex items-center gap-1 mb-2">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={cn('w-3 h-3', s <= Math.round(b.rating || 4) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200')} />
                                  ))}
                                  <span className="text-gold text-xs font-bold ml-1">{b.rating?.toFixed(1) || "4.5"}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {b.genres?.map(g => (
                                    <span key={g} className={cn('text-[10px] px-2 py-0.5 rounded-full border', tk.genreChip)}>{g}</span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                    <Calendar className="w-3 h-3" />{b.year || 2020}
                                  </span>
                                  <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                    <FileText className="w-3 h-3" />{b.pages || 300} hal.
                                  </span>
                                </div>
                              </div>
                            </div>
                            {b.desc && <p className={cn('text-xs leading-relaxed px-4 pb-3', tk.muted)}>{b.desc}</p>}
                            <button
                              onClick={() => window.location.href = `/book/${b.key}`}
                              className={cn('w-full flex items-center justify-center gap-2 py-3 border-t text-sm font-semibold transition-colors', dark ? 'border-white/10 text-gold hover:bg-white/5' : 'border-navy-100 text-navy-700 hover:bg-navy-50')}>
                              <BookOpen className="w-4 h-4" /> Lihat Detail Buku <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          KATEGORI or HASIL
      ══════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {!searched && (
          <motion.section key="cats"
            className="max-w-7xl mx-auto px-4 mt-8 pb-12"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <h2 className={cn('font-serif text-lg font-bold mb-3', tk.text)}>Telusuri Kategori</h2>
            <div className="flex items-center justify-between mb-2 min-h-[18px]">
              <span className={cn('text-xs', tk.muted)}>
                {categoriesLoading ? 'Memuat kategori...' : `${categories.length} kategori tersedia`}
              </span>
              {categoriesError && (
                <span className="text-[11px] text-amber-500">{categoriesError}</span>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {categoriesLoading
                ? Array(8).fill(0).map((_, i) => (
                    <div key={i} className={cn('p-3 rounded-2xl border animate-pulse', dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker')}>
                      <div className={cn('w-6 h-6 rounded mx-auto mb-2', tk.skeleton)} />
                      <div className={cn('h-2.5 w-12 rounded mx-auto', tk.skeleton)} />
                    </div>
                  ))
                : categories.map((c, i) => (
                    <motion.button
                      key={c.id}
                      type="button"
                      onClick={() => loadCategory(c.query, c.label)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                        tk.chip,
                        activeCategoryQuery.toLowerCase() === c.query.toLowerCase() && (
                          dark
                            ? 'border-gold/60 text-gold bg-gold/10'
                            : 'border-gold text-navy-800 bg-gold/10'
                        )
                      )}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}>
                      <span className="text-2xl"><c.icon className="w-6 h-6 text-gold/70" /></span>
                      <span className="text-xs font-medium text-center leading-tight">{c.label}</span>
                    </motion.button>
                  ))}
            </div>

            <div id="popular" className="scroll-mt-28 flex items-center justify-between mt-10 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Bacaan Populer</h2>
              </div>
              <Link href="/popular" className={cn('text-xs font-semibold text-gold hover:underline')}>
                Lihat semua →
              </Link>
            </div>
            <PopularSection dark={dark} tk={tk} books={popularBooks} loading={popularLoading} />

            <div id="ai-reco" className="scroll-mt-28 flex items-center justify-between mt-10 -mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>PustarAI</h2>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', dark ? 'border-gold/30 text-gold/70' : 'border-gold/40 text-gold/80')}>Beta</span>
              </div>
              <Link href="/pustarai/chat" className="text-gold text-xs font-medium hover:underline">
                Buka chat →
              </Link>
            </div>
            <AISection dark={dark} tk={tk} />

            <div id="genre-curation" className="scroll-mt-28 flex items-center justify-between mt-10 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Kurasi Berdasarkan Genre</h2>
              </div>
            </div>
            <GenreShelfSection
              dark={dark}
              tk={tk}
              shelves={genreShelves}
              loading={genreShelvesLoading}
              error={genreShelvesError}
            />
          </motion.section>
        )}

        {searched && (loading || error || books.length === 0 || books.length > 3) && (
          <motion.section key="results"
            className="max-w-7xl mx-auto px-4 mt-6 pb-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {Array(16).fill(0).map((_, i) => (
                  <div key={i}>
                    <div className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', tk.skeleton)} />
                    <div className={cn('h-2.5 rounded mt-2 w-3/4 animate-pulse', tk.skeleton)} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mb-4">
                  <WifiOff className="w-8 h-8 text-red-400/60" />
                </div>
                <p className={cn('font-semibold mb-1', tk.text)}>Koneksi Bermasalah</p>
                <p className={cn('text-sm mb-5', tk.muted)}>{error}</p>
                <button
                  onClick={() => activeCategoryQuery ? loadCategory(activeCategoryQuery, activeCategoryLabel) : handleSearch(query)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold text-navy-900 text-sm font-semibold hover:bg-gold/90 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
              </div>
            ) : books.length === 0 ? (
              <div className={cn('text-center py-20', tk.muted)}>
                <p className="font-semibold">Buku tidak ditemukan</p>
                <p className="text-sm mt-1">Coba kata kunci yang berbeda</p>
              </div>
            ) : rest.length > 0 ? (
              <div className="mt-0 md:-mt-12">
                <p className={cn('text-xs font-medium mb-4 uppercase tracking-wider', tk.muted)}>
                  #4 dan seterusnya
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4">
                  {rest.map((b, i) => (
                    <GridBookCard
                      key={b.key}
                      book={b}
                      index={i}
                      rank={i + 4}
                      dark={dark}
                      tk={tk}
                      sourceLabel={getSourceLabel(b)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-2 md:-mt-4">
                <p className={cn('text-xs font-medium mb-4 uppercase tracking-wider', tk.muted)}>
                  Hasil Pencarian
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {books.map((b, i) => (
                    <GridBookCard
                      key={b.key}
                      book={b}
                      index={i}
                      rank={i + 1}
                      dark={dark}
                      tk={tk}
                      sourceLabel={getSourceLabel(b)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && books.length > 0 && (
              <div ref={loadMoreRef} className="flex justify-center mt-8 min-h-[36px]">
                {hasMoreBooks ? (
                  <div className={cn('text-xs font-medium', tk.muted)}>
                    {loadingMore ? 'Memuat hasil berikutnya...' : 'Scroll untuk memuat lebih banyak'}
                  </div>
                ) : (
                  <div className={cn('text-xs font-medium', tk.muted)}>Semua hasil sudah dimuat</div>
                )}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── GridBookCard ─────────────────────────────────────────────────────────────
function GridBookCard({
  book,
  index,
  rank,
  dark,
  tk,
  sourceLabel,
}: {
  book: BrowseBook;
  index: number;
  rank: number;
  dark: boolean;
  tk: any;
  sourceLabel?: string;
}) {
  const src       = book.coverUrl;
  const rating    = book.rating?.toFixed(1) || "4.5";
  const ratingNum = Number(rating);
  const isAvailable = book.available !== false;

  return (
    <motion.div className="cursor-pointer group"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }} whileHover={{ y: -6 }}
      onClick={() => window.location.href = `/book/${book.key}`}>
      <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md relative', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
        {src && <img src={src} alt={book.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />}
        <div className={cn(
          'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm',
          isAvailable
            ? 'bg-emerald-500/85 text-white border-emerald-300/60'
            : 'bg-rose-500/85 text-white border-rose-300/60'
        )}>
          {isAvailable ? 'Available' : 'Tidak tersedia'}
        </div>
        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/55 backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-white/80 text-[9px] font-bold">{rank}</span>
        </div>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm group-hover:opacity-0 transition-opacity duration-150">
          <Star className="w-2 h-2 text-gold fill-gold" />
          <span className="text-white text-[9px] font-bold">{rating}</span>
        </div>
        <div className={cn('absolute bottom-0 left-0 right-0 px-2 py-2 flex items-center justify-between', 'bg-gradient-to-t from-black/80 via-black/50 to-transparent rounded-b-xl', 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100', 'transition-all duration-200')}>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn('w-2 h-2', s <= Math.round(ratingNum) ? 'text-gold fill-gold' : 'text-white/30')} />)}
          </div>
          <span className="text-white text-[10px] font-bold">{rating}</span>
        </div>
      </div>
      <p className={cn('text-[11px] font-medium mt-1.5 leading-tight line-clamp-2', dark ? 'text-white' : 'text-navy-900')}>{book.title}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{book.author}</p>
      {sourceLabel && (
        <p className={cn('text-[10px] mt-1 font-medium line-clamp-1', tk.muted)}>{sourceLabel}</p>
      )}
    </motion.div>
  );
}

const pseudo2 = (n: number, mn: number, mx: number) => mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);
function PopularSection({ dark, tk, books, loading }: { dark: boolean; tk: any; books: BrowseBook[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-4 px-4 -mx-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36 animate-pulse">
            <div className={cn('w-full aspect-[2/3] rounded-xl mb-2', tk.skeleton)} />
            <div className={cn('h-3 w-5/6 rounded mb-1.5', tk.skeleton)} />
            <div className={cn('h-2.5 w-2/3 rounded mb-2', tk.skeleton)} />
            <div className="flex items-center gap-1.5">
              <div className={cn('h-4 w-12 rounded', tk.skeleton)} />
              <div className={cn('h-3 w-20 rounded', tk.skeleton)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = books;

  if (items.length === 0) {
    return (
      <div className={cn('rounded-2xl border p-4 text-sm', dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker', tk.muted)}>
        Belum ada bacaan populer saat ini.
      </div>
    );
  }
  
  return (
    <div className="flex gap-4 px-4 -mx-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {items.map((b, i) => {
        const rating = Number.isFinite(b.rating) && Number(b.rating) > 0
          ? Number(b.rating).toFixed(1)
          : (pseudo2(i + 8, 38, 50) / 10).toFixed(1);
        const reads  = Math.floor(pseudo2(i + 2, 1200, 28000));
        
        const RANK_BADGE = [
          'bg-yellow-400 text-yellow-900', 
          'bg-slate-300 text-slate-700', 
          'bg-amber-600 text-amber-100'
        ];
        const isAvailable = b.available !== false;

        return (
          <Link key={b.key} href={`/book/${b.key}`} className="flex-shrink-0">
            <motion.div 
              className="w-36 cursor-pointer group flex flex-col h-full" 
              whileHover={{ y: -4 }} 
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="relative mb-2">
                {/* Badge Top 3 */}
                {i < 3 && (
                  <div className={cn(
                    'absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg', 
                    RANK_BADGE[i]
                  )}>
                    #{i + 1}
                  </div>
                )}
                
                {/* Cover Buku (aspect ratio disamain 2/3) */}
                <div className={cn(
                  'w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300', 
                  dark ? 'bg-navy-700' : 'bg-parchment-dark'
                )}>
                  {b.coverUrl ? (
                    <img 
                      src={b.coverUrl} 
                      alt={b.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      loading="lazy" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 opacity-50">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className={cn(
                  'absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold border backdrop-blur-sm',
                  isAvailable
                    ? 'bg-emerald-500/85 text-white border-emerald-300/60'
                    : 'bg-rose-500/85 text-white border-rose-300/60'
                )}>
                  {isAvailable ? 'Available' : 'Tidak tersedia'}
                </div>
              </div>

              {/* Info Buku */}
              <div className="flex flex-col flex-1">
                <p className={cn('text-xs font-bold leading-snug line-clamp-2 mb-1', tk.text)}>
                  {b.title}
                </p>
                <p className={cn('text-[10px] truncate mb-1.5 mt-auto', tk.muted)}>
                  {b.author}
                </p>
                
                {/* Rating & Stats */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                    <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                    <span className="text-gold font-bold">{rating}</span>
                  </div>
                  <span className={cn('text-[9px] font-medium uppercase tracking-wider', tk.muted)}>
                    {reads.toLocaleString()}x dibaca
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
export default function BrowsePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BrowseContent />
    </Suspense>
  );
}