'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Medal, Star, BookOpen, ArrowRight, X, Calendar, 
  FileText, WifiOff, RefreshCw, TrendingUp, Sparkles, Users, MessageCircle,
  Landmark, FlaskConical, Brain, User, Heart, Cpu, 
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
import type { AiRecommendation } from '@/store/aiStore';
// import { AISection } from '@/components/browse/AISection';

// ── Types & helpers ────────────────────────────────────────────────────────────
interface Book { key: string; title: string; author: string; coverId?: number; }

const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const pseudo = (n: number, mn: number, mx: number) =>
  mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);

const getRating = (coverId?: number, idx = 0) =>
  (pseudo((coverId ?? idx) + 7, 36, 50) / 10).toFixed(1);

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'fiction',    label: 'Fiksi',     icon: BookOpen      },
  { id: 'history',    label: 'Sejarah',   icon: Landmark      },
  { id: 'science',    label: 'Sains',     icon: FlaskConical  },
  { id: 'philosophy', label: 'Filsafat',  icon: Brain         },
  { id: 'biography',  label: 'Biografi',  icon: User          },
  { id: 'romance',    label: 'Romansa',   icon: Heart         },
  { id: 'mystery',    label: 'Misteri',   icon: Search        },
  { id: 'technology', label: 'Teknologi', icon: Cpu           },
];

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

// ── Dummy Top 3 ────────────────────────────────────────────────────────────────
interface Top3Book {
  key: string; title: string; author: string; coverId?: number; coverUrl?:string,
  rating: string; genres: string[]; year: string; pages: number; desc: string;
}

const DUMMY_TOP3: Top3Book[] = [
  {
    key: 'p1', title: 'Surga Anjing Liar', author: 'Adimas Immanuel',
    coverUrl: 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1612586447i/56966631.jpg', rating: '4.2', genres: ['Fiksi', 'Psikologis'],
    year: '2020', pages: 228,
    desc: 'Potret kelam masyarakat desa di kaki gunung yang bergulat dengan ambisi, kekuasaan, dan batas moral yang mengabur, melahirkan penjahat paling keji.',
  },
  {
    key: 'p2', title: 'Unwind', author: 'Neal Shusterman',
    coverId: 13347240, rating: '4.6', genres: ['Dystopia', 'Sci-Fi'],
    year: '2007', pages: 336,
    desc: 'Di dunia masa depan, orang tua bisa memilih untuk memisahkan organ anak remajanya secara paksa lewat proses "Unwinding". Tiga remaja berjuang melarikan diri dari takdir ini.',
  },
  {
    key: 'p3', title: 'Pulang', author: 'Leila S. Chudori',
    coverUrl: 'https://tse4.mm.bing.net/th/id/OIP.Gr4qolQ7Wik8cUPOmG9TTQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3', rating: '4.7', genres: ['Sastra', 'Sejarah'],
    year: '2012', pages: 464,
    desc: 'Kisah para eksil politik Indonesia di Paris pasca peristiwa 1965 yang terus dihantui trauma masa lalu, pencarian identitas, dan kerinduan mendalam akan tanah air.',
  },
];

const CACHE: Record<string, Book[]> = {};

async function fetchBooks(q: string, limit = 24): Promise<Book[]> {
  const key = `${q}_${limit}`;
  if (CACHE[key]) return CACHE[key];
  const url = q.startsWith('subject:')
    ? `https://openlibrary.org/search.json?${q}&limit=${limit}&fields=key,title,author_name,cover_i`
    : `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const books = (d.docs || []).filter((b: any) => b.cover_i).map((b: any) => ({
      key: b.key, title: b.title || '?',
      author: (b.author_name || ['?'])[0],
      coverId: b.cover_i,
    }));
    CACHE[key] = books;
    return books;
  } finally {
    clearTimeout(timeout);
  }
}


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
 
  // Reko default (personal, pakai genre preferensi user)
  const { recommendations: defaultRecs, loading: defaultLoading } = useRecommendations();
 
  // Chat hook untuk query manual
  const { sendMessage, chatHistory, chatLoading } = useChatAI();
 
  // Ambil hasil dari pesan chat terakhir
  useEffect(() => {
    const last = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.recommendations?.length);
    if (last?.recommendations) setChatResult(last.recommendations.slice(0, 4));
  }, [chatHistory]);
 
  // Tampilkan: kalau ada hasil chat → pakai itu, kalau tidak → pakai default reks
  const displayRecs = chatResult.length > 0 ? chatResult : defaultRecs.slice(0, 4);
  const isLoadingDisplay = chatResult.length === 0 && defaultLoading;
 
  async function handleSend(q: string) {
    if (!q.trim() || chatLoading) return;
    setInput('');
    setChatResult([]); // clear dulu biar loading keliatan
    await sendMessage(q);
  }
 
  return (
    <div>
      {/* Reko cards — real data */}
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.3) transparent' }}>
        {isLoadingDisplay
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32">
                <div className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', dark ? 'bg-navy-700/60' : 'bg-parchment-darker')} />
                <div className={cn('h-2 rounded mt-2 w-3/4 animate-pulse', dark ? 'bg-navy-700/60' : 'bg-parchment-darker')} />
              </div>
            ))
          : displayRecs.map((reco, i) => (
              <AIRecoMiniCard key={reco.book_id + i} reco={reco} dark={dark} tk={tk} />
            ))
        }
      </div>
 
      {/* Chat prompt toggle — UI persis sama seperti sebelumnya */}
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
 
              {/* Suggestion chips */}
              <div className="flex gap-2 flex-wrap mb-3">
                {CHAT_SUGGESTIONS.map(s => (
                  <button key={s}
                    onClick={() => handleSend(s)}
                    className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                      dark ? 'border-white/10 text-white/60 hover:border-gold/40 hover:text-gold'
                           : 'border-slate-200 text-slate-500 hover:border-gold/40 hover:text-gold')}>
                    {s}
                  </button>
                ))}
              </div>
 
              {/* Input */}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                  placeholder="Atau ketik sendiri..."
                  className={cn('flex-1 px-3 py-2 rounded-xl border text-sm outline-none transition-all',
                    dark ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50'
                         : 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold')}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || chatLoading}
                  className="px-4 py-2 rounded-xl bg-gold text-navy-900 text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40">
                  {chatLoading ? '...' : 'Tanya'}
                </button>
              </div>
 
              {/* Hasil chat inline */}
              <AnimatePresence>
                {chatResult.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                    <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-2', tk.muted)}>Hasil PustarAI</p>
                    <div className="space-y-1">
                      {chatResult.map(r => <MiniRecoCard key={r.book_id} reco={r} dark={dark} tk={tk} />)}
                    </div>
                    <Link href="/recommendations/chat"
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
 
// Mini card untuk horizontal scroll (sebelumnya pakai coverId hardcoded)
function AIRecoMiniCard({ reco, dark, tk }: { reco: AiRecommendation; dark: boolean; tk: any }) {
  const coverSrc = useAiCover(reco);
  return (
    <Link href={`/browse?q=${encodeURIComponent(reco.title)}`}>
      <motion.div className="flex-shrink-0 w-32 cursor-pointer group"
        whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg relative', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
          {coverSrc
            ? <img src={coverSrc} alt={reco.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 opacity-20" style={{ color: 'var(--text)' }} /></div>
          }
        </div>
        <p className={cn('text-[11px] font-semibold leading-tight line-clamp-2 mt-2', tk.text)}>{reco.title}</p>
        <p className={cn('text-[10px] mt-0.5 line-clamp-2', tk.muted)}>{reco.reason_primary}</p>
      </motion.div>
    </Link>
  );
}
 

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const { ready } = useProtectedRoute();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query,      setQuery]      = useState('');
  const [active,     setActive]     = useState('');
  const [books,      setBooks]      = useState<Book[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [searched,   setSearched]   = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Sync state dari ?q= (mis. dari navbar search, link, back/forward)
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      setQuery(prev => (prev ? '' : prev));
      setSearched(false);
      setActive('');
      setBooks([]);
      setError(null);
      return;
    }

    setQuery(q);
    setActive('');
    setSearched(true);
    setLoading(true);
    setError(null);
    fetchBooks(q)
      .then(setBooks)
      .catch(() => setError('Pencarian gagal. Coba lagi.'))
      .finally(() => setLoading(false));
  }, [searchParams]);

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

  async function loadCategory(id: string) {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (urlTimerRef.current) {
      clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    }
    syncQueryToUrl('');
    setActive(id); setQuery(''); setSearched(true); setLoading(true); setError(null);
    try { setBooks(await fetchBooks(`subject:${id}`)); }
    catch { setError('Gagal memuat buku. Periksa koneksi internetmu.'); setBooks([]); }
    finally { setLoading(false); }
  }

  function handleSearch(q: string) {
    setQuery(q); setActive(''); setError(null);
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
      flushUrlSync('');
      setSearched(false);
      setBooks([]);
      return;
    }

    // Delay URL update supaya typing tetap mulus.
    urlTimerRef.current = setTimeout(() => {
      syncQueryToUrl(trimmed);
    }, 900);

    searchTimerRef.current = setTimeout(async () => {
      setSearched(true); setLoading(true); setError(null);
      try { setBooks(await fetchBooks(trimmed)); }
      catch { setError('Pencarian gagal. Coba lagi beberapa saat.'); setBooks([]); }
      finally { setLoading(false); }
    }, 650);
  }

  const rest         = searched ? books.slice(3) : [];
  const sectionLabel = active
    ? CATEGORIES.find(c => c.id === active)?.label
    : query ? `Hasil "${query}"` : '';

  if (!ready) return <PageSkeleton />;

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — LEFT (info/search) + RIGHT (top 3)
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 pt-5 pb-2">

        {/* Centered label */}
        <div className="hidden md:flex items-center justify-end gap-2 mt-8 -mb-12">
          <Medal className="w-3.5 h-3.5 text-gold" />
          <span className="text-gold text-xs font-semibold uppercase tracking-wider">
            {searched ? 'Top 3 Hasil Terbaik' : 'Pustara\'s Pick — kurasi dari Pustakrew 📚'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-3 min-w-0 md:w-[44%] lg:w-[40%] md:pt-6">

            {/* Search bar — always present */}
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

              {/* ── NOT searched: headline + quick stats ── */}
              {!searched && (
                <motion.div key="idle"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

                  {/* Desktop: show hovered book detail if any, else headline */}
                  <div className="hidden md:block">
                    {(() => {
                      const activeIdx = hoveredIdx ?? 0;
                      const b  = DUMMY_TOP3[activeIdx];
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
                              {b.genres.map(g => (
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
                            {/* {hoveredIdx === null && (
                              <p className={cn('text-xs mt-3 flex items-center gap-1.5', tk.muted)}>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                                Hover cover lain untuk detail
                              </p>
                            )} */}
                          </motion.div>
                        </AnimatePresence>
                      );
                    })()}
                  </div>

                  {/* Mobile: just tagline */}
                  <div className="md:hidden">
                    <h1 className={cn('font-serif text-3xl font-black leading-tight mb-1', tk.text)}>
                      Temukan buku<br /><span className="text-gold">favoritmu.</span>
                    </h1>
                    <p className={cn('text-sm', tk.muted)}>Dari fiksi klasik sampai sains modern.</p>
                    {/* if mobile, show tagline */}
                    <div className="flex md:hidden items-center justify-start mt-8">
                      <Medal className="w-3.5 h-3.5 text-gold" />
                      <span className="text-gold text-xs font-semibold uppercase tracking-wider">
                        'Pustara\'s Pick — kurasi dari Pustakrew 📚'
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Searched: result meta + active book preview ── */}
              {searched && (
                <motion.div key="searched"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

                  {/* Desktop only */}
                  <div className="hidden md:block">
                    {(() => {
                      // activeIdx: hovered OR default to 0 so left panel is never empty
                      const activeIdx = hoveredIdx ?? 0;
                      const b    = books[activeIdx];
                      const rs   = RANK_STYLE[activeIdx];
                      const rating = getRating(b?.coverId, activeIdx);
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
                            <div className="flex items-center gap-1 mb-4">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={cn('w-4 h-4',
                                  s <= Math.round(rn) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200'
                                )} />
                              ))}
                              <span className="text-gold font-bold ml-1">{rating}</span>
                            </div>
                            <Link href={`/book/${b.key.split('/').pop()}`}
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

                  {/* Mobile search meta */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className={cn('font-serif text-2xl font-black leading-tight', tk.text)}>{sectionLabel}</h2>
                        {!loading && books.length > 0 && (
                          <p className={cn('text-xs mt-0.5', tk.muted)}>{books.length} judul ditemukan</p>
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

          {/* ══════════════════════════════════════════
              TOP 3 RIGHT PANEL
              Desktop: fanned covers, hover → info panel slides in (clickable)
              Mobile:  3 covers side-by-side, tap → info card below
          ══════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 pt-0 md:pt-24">
            {/* Determine which 3 books to show */}
            {(() => {
              // When search has results, use top3 from results; otherwise show dummy
              const top3: Top3Book[] = searched && books.length >= 3
                ? books.slice(0, 3).map((b, i) => ({
                    key: b.key, title: b.title, author: b.author,
                    coverId: b.coverId ?? 0,
                    rating: getRating(b.coverId, i),
                    genres: DUMMY_TOP3[i]?.genres ?? ['Fiksi'],
                    year: String(2000 + Math.floor(pseudo((b.coverId ?? i) + 5, 0, 24))),
                    pages: Math.floor(pseudo((b.coverId ?? i) + 9, 200, 600)),
                    desc: DUMMY_TOP3[i]?.desc ?? '',
                  }))
                : DUMMY_TOP3;

              return (
                <>                  
                  {/* ── DESKTOP: fanned + hover-to-reveal side panel ── */}
                  <div className="hidden md:block relative"
                    style={{ height: 300 }}
                    onMouseLeave={() => setHoveredIdx(null)}>

                    {/* Fanned covers */}
                    {[...top3].reverse().map((b, ri) => {
                      const i     = top3.length - 1 - ri;
                      const rs    = RANK_STYLE[i];
                      const isHov = hoveredIdx === i;
                      const isSide = i !== 0;

                      // #1 bigger, #2 #3 slightly smaller
                      const baseW = searched
                        ? (i === 0 ? 160 : 134)
                        : (i === 0 ? 213 : 174);
                      const baseH = searched
                        ? (i === 0 ? 220 : 188)
                        : (i === 0 ? 306 : 258);

                      // Fan positions
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
                          onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}>

                          <div
                            className={cn('rounded-2xl overflow-hidden relative transition-all duration-300', isHov ? rs.shadow : rs.idle)}
                            style={{ width: baseW, height: baseH }}>

                            {/* Cover image */}
                            {b.coverUrl || b.coverId ? (
                              <img 
                                src={b.coverUrl ? b.coverUrl : `https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} 
                                alt={b.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                loading="lazy" 
                              />
                            ) : (
                              <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                            )}

                            {/* Side books: dark vignette overlay so they read as "behind" */}
                            {isSide && !isHov && (
                              <div className="absolute inset-0 bg-black/30 rounded-2xl" />
                            )}

                            {/* Rank badge */}
                            <div className={cn(
                              'absolute top-2.5 left-2.5 min-w-[28px] h-7 px-2 rounded-full',
                              'flex items-center justify-center text-[11px] font-black shadow-lg',
                              rs.badge
                            )}>
                              #{i + 1}
                            </div>

                            {/* Rating pill */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                              <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                              <span className="text-white text-[10px] font-bold">{b.rating}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Desktop info panel — sibling (not child), so never scaled */}
                    <AnimatePresence>
                      {hoveredIdx !== null && (() => {
                        const i     = hoveredIdx;
                        const b     = top3[i];
                        if (!b) return null;
                        const baseW = searched 
                        ? (i === 0 ? 140 : 114)
                        : (i === 0 ? 210 : 171);
                        const xOff  = searched ? [0, -88, 88][i] : [0, -40, 88][i];
                        // panel left of #1 and #3, right of #2
                        const panelX = i === 1
                          ? xOff + baseW / 2 - 80
                          : xOff - baseW / 2 - 180;

                        return (
                          <motion.div key={`dp-${i}`}
                            className={cn(
                              'absolute rounded-2xl border shadow-2xl p-4 backdrop-blur-md cursor-pointer',
                              tk.panelBg
                            )}
                            style={{ width: 220, zIndex: 60, top: [0, 28, 36][i] - 18, left: '50%', x: panelX }}
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}>

                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-navy-900 font-black text-[10px]">{i + 1}</span>
                              </div>
                              <span className={cn('text-[10px] font-semibold uppercase tracking-widest', tk.muted)}>
                                Trending #{i + 1}
                              </span>
                            </div>

                            <p className={cn('font-serif font-black text-base leading-tight mb-0.5 line-clamp-2', tk.text)}>
                              {b.title}
                            </p>
                            <p className={cn('text-xs mb-2.5', tk.muted)}>{b.author}</p>

                            <div className="flex items-center gap-1 mb-2.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={cn('w-3 h-3',
                                  s <= Math.round(Number(b.rating)) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200'
                                )} />
                              ))}
                              <span className="text-gold text-xs font-bold ml-1">{b.rating}</span>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-2.5">
                              {b.genres.map(g => (
                                <span key={g} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', tk.genreChip)}>{g}</span>
                              ))}
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className={cn('w-3 h-3', tk.muted)} />
                                <span className={cn('text-[11px]', tk.muted)}>{b.year}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className={cn('w-3 h-3', tk.muted)} />
                                <span className={cn('text-[11px]', tk.muted)}>{b.pages} hal.</span>
                              </div>
                            </div>

                            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', dark ? 'text-gold' : 'text-navy-700')}>
                              <BookOpen className="w-3.5 h-3.5" />
                              Lihat Detail
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* ── MOBILE: 3 covers side by side, tap → info card ── */}
                  <div className="md:hidden">

                    {/* 3 covers row */}
                    <div className="flex gap-3 mb-4">
                      {top3.map((b, i) => {
                        const rs       = RANK_STYLE[i];
                        const isActive = hoveredIdx === i;
                        const isSide   = i !== 0;
                        return (
                          <motion.button key={b.key}
                            className="flex-1 relative"
                            onTap={() => setHoveredIdx(isActive ? null : i)}
                            onClick={() => setHoveredIdx(isActive ? null : i)}
                            animate={{ y: isActive ? -8 : 0, scale: isActive ? 1.04 : 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}>

                            <div
                              className={cn(
                                'w-full rounded-2xl overflow-hidden relative transition-all duration-300',
                                isActive ? rs.shadow : rs.idle,
                              )}
                              style={{ aspectRatio: '2/3' }}>

                              {b.coverUrl || b.coverId ? (
                                <img 
                                  src={b.coverUrl ? b.coverUrl : `https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} 
                                  alt={b.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                  loading="lazy" 
                                />
                              ) : (
                                <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                              )}

                              {/* Vignette on non-active side books */}
                              {isSide && !isActive && (
                                <div className="absolute inset-0 bg-black/20 rounded-2xl" />
                              )}

                              {/* Rank badge */}
                              <div className={cn(
                                'absolute top-2 left-2 min-w-[26px] h-[26px] px-1.5 rounded-full',
                                'flex items-center justify-center text-[11px] font-black shadow-lg',
                                rs.badge
                              )}>
                                #{i + 1}
                              </div>

                              {/* Rating */}
                              <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                                <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                                <span className="text-white text-[10px] font-bold">{b.rating}</span>
                              </div>
                            </div>

                            {/* Active indicator dot */}
                            <motion.div
                              className="w-1.5 h-1.5 rounded-full mx-auto mt-2"
                              animate={{ backgroundColor: isActive ? '#c9a84c' : 'transparent' }}
                            />
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Info card — slides in below covers when tapped */}
                    <AnimatePresence mode="wait">
                      {hoveredIdx !== null && top3[hoveredIdx] && (() => {
                        const i  = hoveredIdx;
                        const b  = top3[i];
                        const rs = RANK_STYLE[i];

                        return (
                          <motion.div key={`mc-${i}`}
                            initial={{ opacity: 0, y: -12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className={cn('rounded-2xl border overflow-hidden', tk.panelBg)}>

                            <div className="flex gap-4 p-4">
                              {/* Mini cover */}
                              <div className="flex-shrink-0 relative">
                                <div className={cn('rounded-xl overflow-hidden', rs.shadow)}
                                  style={{ width: 80, height: 116 }}>
                                  {b.coverUrl || b.coverId ? (
                                    <img 
                                      src={b.coverUrl ? b.coverUrl : `https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} 
                                      alt={b.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                      loading="lazy" 
                                    />
                                  ) : (
                                    <div className={cn('w-full h-full', dark ? 'bg-navy-700' : 'bg-parchment-dark')} />
                                  )}                                </div>
                                <div className={cn('absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow', rs.badge)}>
                                  {i + 1}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[10px] font-semibold uppercase tracking-widest mb-1', tk.muted)}>
                                  Trending #{i + 1}
                                </p>
                                <p className={cn('font-serif font-black text-base leading-tight mb-0.5 line-clamp-2', tk.text)}>
                                  {b.title}
                                </p>
                                <p className={cn('text-xs mb-2', tk.muted)}>{b.author}</p>

                                {/* Stars */}
                                <div className="flex items-center gap-1 mb-2">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={cn('w-3 h-3',
                                      s <= Math.round(Number(b.rating)) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200'
                                    )} />
                                  ))}
                                  <span className="text-gold text-xs font-bold ml-1">{b.rating}</span>
                                </div>

                                {/* Genres */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {b.genres.map(g => (
                                    <span key={g} className={cn('text-[10px] px-2 py-0.5 rounded-full border', tk.genreChip)}>{g}</span>
                                  ))}
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-3">
                                  <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                    <Calendar className="w-3 h-3" />{b.year}
                                  </span>
                                  <span className={cn('text-[11px] flex items-center gap-1', tk.muted)}>
                                    <FileText className="w-3 h-3" />{b.pages} hal.
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Desc */}
                            {b.desc && (
                              <p className={cn('text-xs leading-relaxed px-4 pb-3', tk.muted)}>{b.desc}</p>
                            )}

                            {/* CTA — full width, tappable */}
                            <button
                              onClick={() => window.location.href = `/book/${b.key.split('/').pop()}`}
                              className={cn(
                                'w-full flex items-center justify-center gap-2 py-3 border-t text-sm font-semibold transition-colors',
                                dark ? 'border-white/10 text-gold hover:bg-white/5' : 'border-navy-100 text-navy-700 hover:bg-navy-50'
                              )}>
                              <BookOpen className="w-4 h-4" />
                              Lihat Detail Buku
                              <ArrowRight className="w-3.5 h-3.5" />
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
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {CATEGORIES.map((c, i) => (
                <motion.button key={c.id} onClick={() => loadCategory(c.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                    tk.chip
                  )}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}>
                  <span className="text-2xl"><c.icon className="w-6 h-6 text-gold/70" /></span>
                  <span className="text-xs font-medium text-center leading-tight">{c.label}</span>
                </motion.button>
              ))}
            </div>

            {/* ══ POPULER ══ */}
            <div id="popular" className="scroll-mt-28 flex items-center justify-between mt-10 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Bacaan Populer</h2>
              </div>
              <Link href="/popular" className={cn('text-xs font-semibold text-gold hover:underline')}>
                Lihat semua →
              </Link>
            </div>
            <PopularSection dark={dark} tk={tk} />

            {/* ══ PUSTARAI ══ */}
            <div id="ai-reco" className="scroll-mt-28 flex items-center justify-between mt-10 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>PustarAI</h2>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', dark ? 'border-gold/30 text-gold/70' : 'border-gold/40 text-gold/80')}>
                  Beta
                </span>
              </div>
            </div>
            <AISection dark={dark} tk={tk} />

            {/* ══ AKTIVITAS TEMAN ══ */}
            <div id="community" className="scroll-mt-28 flex items-center justify-between mt-10 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Aktivitas Teman</h2>
              </div>
              <Link href="/community" className={cn('text-xs font-semibold text-gold hover:underline')}>
                Komunitas →
              </Link>
            </div>
            <FriendActivitySection dark={dark} tk={tk} />
          </motion.section>
        )}

        {searched && (
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
                  onClick={() => active ? loadCategory(active) : handleSearch(query)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold text-navy-900 text-sm font-semibold hover:bg-gold/90 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            ) : books.length === 0 ? (
              <div className={cn('text-center py-20', tk.muted)}>
                <p className="text-4xl mb-3">😔</p>
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
                    <GridBookCard key={b.key} book={b} index={i} rank={i + 4} dark={dark} tk={tk} />
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

// ── GridBookCard — rating badge on cover ──────────────────────────────────────
function GridBookCard({
  book, index, rank, dark, tk,
}: {
  book: Book; index: number; rank: number; dark: boolean; tk: any;
}) {
  const src       = coverUrl(book.coverId);
  const rating    = getRating(book.coverId, index);
  const ratingNum = Number(rating);

  return (
    <motion.div
      className="cursor-pointer group"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -6 }}
      onClick={() => window.location.href = `/book/${book.key.split('/').pop()}`}>

      {/* Cover */}
      <div className={cn(
        'w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md relative',
        dark ? 'bg-navy-700' : 'bg-parchment-dark'
      )}>
        {src && (
          <img src={src} alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy" />
        )}

        {/* Rank badge — top left */}
        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/55 backdrop-blur-sm rounded-full flex items-center justify-center">
          <span className="text-white/80 text-[9px] font-bold">{rank}</span>
        </div>

        {/* Rating — always visible small pill bottom-right */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm group-hover:opacity-0 transition-opacity duration-150">
          <Star className="w-2 h-2 text-gold fill-gold" />
          <span className="text-white text-[9px] font-bold">{rating}</span>
        </div>

        {/* Rating + stars — expands on hover from bottom */}
        <div className={cn(
          'absolute bottom-0 left-0 right-0 px-2 py-2 flex items-center justify-between',
          'bg-gradient-to-t from-black/80 via-black/50 to-transparent rounded-b-xl',
          'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
          'transition-all duration-200'
        )}>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={cn(
                'w-2 h-2',
                s <= Math.round(ratingNum) ? 'text-gold fill-gold' : 'text-white/30'
              )} />
            ))}
          </div>
          <span className="text-white text-[10px] font-bold">{rating}</span>
        </div>
      </div>

      {/* Text */}
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

// ── Dummy data for new sections ───────────────────────────────────────────────
const POPULAR_BOOKS = [
  { key:'d1', title:'Laskar Pelangi',   author:'Andrea Hirata',         coverId:8231568  },
  { key:'d2', title:'Bumi Manusia',     author:'Pramoedya Ananta Toer', coverId:8750787  },
  { key:'d3', title:'Cantik Itu Luka',  author:'Eka Kurniawan',         coverId:12699828 },
  { key:'d4', title:'Perahu Kertas',    author:'Dee Lestari',           coverId:7886745  },
  { key:'d5', title:'Negeri 5 Menara',  author:'Ahmad Fuadi',           coverId:8913924  },
  { key:'d6', title:'Ayah',             author:'Andrea Hirata',         coverId:10521865 },
];

// const AI_RECO = [
//   { key:'d3', title:'Cantik Itu Luka',  author:'Eka Kurniawan',         coverId:12699828, reason:'Karena kamu suka Bumi Manusia' },
//   { key:'d5', title:'Negeri 5 Menara',  author:'Ahmad Fuadi',           coverId:8913924,  reason:'Cocok dengan genre favoritmu' },
//   { key:'d4', title:'Perahu Kertas',    author:'Dee Lestari',           coverId:7886745,  reason:'Banyak dibaca minggu ini' },
//   { key:'d6', title:'Ayah',             author:'Andrea Hirata',         coverId:10521865, reason:'Dari penulis favoritmu' },
// ];

const FRIEND_ACTIVITY = [
  { user:'Ameliana R.', avatar:'A', action:'sedang membaca', book:'Laskar Pelangi',  coverId:8231568,  key:'d1', time:'2 jam lalu'    },
  { user:'Budi S.',     avatar:'B', action:'selesai membaca', book:'Bumi Manusia',   coverId:8750787,  key:'d2', time:'5 jam lalu'    },
  { user:'Sari A.',     avatar:'S', action:'sedang membaca', book:'Perahu Kertas',   coverId:7886745,  key:'d4', time:'kemarin'       },
  { user:'Dika P.',     avatar:'D', action:'baru meminjam',  book:'Cantik Itu Luka', coverId:12699828, key:'d3', time:'2 hari lalu'   },
];

const pseudo2 = (n: number, mn: number, mx: number) =>
  mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);

// ── PopularSection ────────────────────────────────────────────────────────────
function PopularSection({ dark, tk }: { dark: boolean; tk: any }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-gold"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.3) transparent' }}>
      {POPULAR_BOOKS.map((b, i) => {
        const rating = (pseudo2(b.coverId + 7, 38, 50) / 10).toFixed(1);
        const reads  = Math.floor(pseudo2(b.coverId + 1, 1200, 28000));
        const RANK_BADGE = [
          'bg-yellow-400 text-yellow-900',
          'bg-slate-300 text-slate-700',
          'bg-amber-600 text-amber-100',
        ];
        return (
          <Link key={b.key} href={`/book/${b.key}`}>
            <motion.div className="flex-shrink-0 w-32 cursor-pointer group"
              whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
              <div className="relative">
                {i < 3 && (
                  <div className={cn(
                    'absolute z-10 w-6 h-6 rounded-lg rounded-bl-none rounded-tr-none flex items-center justify-center text-[10px] font-black shadow-lg',
                    RANK_BADGE[i]
                  )}>#{i + 1}</div>
                )}
                <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
                  <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} alt={b.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
              </div>
              <p className={cn('text-[11px] font-semibold leading-tight line-clamp-2 mt-2', tk.text)}>{b.title}</p>
              <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{b.author}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                <span className="text-gold text-[10px] font-bold">{rating}</span>
                <span className={cn('text-[10px]', tk.muted)}>· {reads.toLocaleString()}x</span>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

// // ── AISection ─────────────────────────────────────────────────────────────────
// function AISection({ dark, tk }: { dark: boolean; tk: any }) {
//   const [expanded, setExpanded] = useState(false);

//   return (
//     <div>
//       <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-gold"
//         style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.3) transparent' }}>
//         {AI_RECO.map((b, i) => (
//           <Link key={b.key + i} href={`/book/${b.key}`}>
//             <motion.div className="flex-shrink-0 w-32 cursor-pointer group"
//               whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
//               <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg', dark ? 'bg-navy-700' : 'bg-parchment-dark')}>
//                 <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} alt={b.title}
//                   className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
//               </div>
//               <p className={cn('text-[11px] font-semibold leading-tight line-clamp-2 mt-2', tk.text)}>{b.title}</p>
//               <p className={cn('text-[10px] mt-0.5', tk.muted)}>{b.reason}</p>
//             </motion.div>
//           </Link>
//         ))}
//       </div>

//       {/* AI chat prompt */}
//       <motion.button
//         onClick={() => setExpanded(v => !v)}
//         className={cn(
//           'mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left',
//           dark ? 'border-gold/20 bg-gold/5 hover:bg-gold/10' : 'border-gold/30 bg-gold/5 hover:bg-gold/10'
//         )}>
//         <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
//         <span className={cn('text-sm', tk.text)}>
//           Tanya PustarAI — <span className={cn('', tk.muted)}>
//             "Rekomendasiin buku mirip Laskar Pelangi..."
//           </span>
//         </span>
//         <ArrowRight className={cn('w-4 h-4 ml-auto flex-shrink-0 transition-transform', tk.muted, expanded && 'rotate-90')} />
//       </motion.button>

//       <AnimatePresence>
//         {expanded && (
//           <motion.div
//             initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
//             exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
//             className="overflow-hidden">
//             <div className={cn('mt-2 p-4 rounded-2xl border', dark ? 'bg-navy-800/60 border-white/8' : 'bg-white border-parchment-darker')}>
//               <p className={cn('text-xs mb-3', tk.muted)}>Apa yang ingin kamu temukan?</p>
//               <div className="flex gap-2 flex-wrap mb-3">
//                 {['Mirip Laskar Pelangi', 'Sastra Indonesia klasik', 'Buku untuk dibaca sebelum tidur', 'Fiksi pendek'].map(s => (
//                   <button key={s}
//                     className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors', dark ? 'border-white/10 text-white/60 hover:border-gold/40 hover:text-gold' : 'border-slate-200 text-slate-500 hover:border-gold/40 hover:text-gold')}>
//                     {s}
//                   </button>
//                 ))}
//               </div>
//               <div className="flex gap-2">
//                 <input placeholder="Atau ketik sendiri..."
//                   className={cn('flex-1 px-3 py-2 rounded-xl border text-sm outline-none transition-all',
//                     dark ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50'
//                          : 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold'
//                   )} />
//                 <button className="px-4 py-2 rounded-xl bg-gold text-navy-900 text-sm font-semibold hover:bg-gold/90 transition-colors">
//                   Tanya
//                 </button>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// ── FriendActivitySection ─────────────────────────────────────────────────────
function FriendActivitySection({ dark, tk }: { dark: boolean; tk: any }) {
  return (
    <div className="flex flex-col gap-3">
      {FRIEND_ACTIVITY.map((a, i) => (
        <motion.div key={i}
          className={cn('flex items-center gap-3 p-3 rounded-2xl border transition-all', dark ? 'bg-navy-800/40 border-white/6 hover:bg-navy-800/60' : 'bg-white border-parchment-darker hover:bg-slate-50')}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
            {a.avatar}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm leading-tight', tk.text)}>
              <span className="font-semibold">{a.user}</span>
              <span className={cn('font-normal', tk.muted)}> {a.action} </span>
              <span className="font-semibold">{a.book}</span>
            </p>
            <p className={cn('text-xs mt-0.5', tk.muted)}>{a.time}</p>
          </div>

          {/* Cover thumbnail */}
          <Link href={`/book/${a.key}`} className="flex-shrink-0">
            <div className="w-9 h-12 rounded-lg overflow-hidden shadow-md">
              <img src={`https://covers.openlibrary.org/b/id/${a.coverId}-S.jpg`} alt={a.book}
                className="w-full h-full object-cover" loading="lazy" />
            </div>
          </Link>

          {/* Comment icon */}
          <Link href={`/book/${a.key}/reviews`}
            className={cn('flex-shrink-0 p-1.5 rounded-lg transition-colors', tk.muted, 'hover:text-gold')}>
            <MessageCircle className="w-4 h-4" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}