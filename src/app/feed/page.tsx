'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bell, Users, Star, Heart, MessageCircle,
  BookOpen, ArrowRight, RefreshCw, TrendingUp, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useChatAI } from '@/hooks/useChatAI';
import { useRecommendations } from '@/hooks/useRecommendations';
import { fetchOpenLibraryCoverId } from '@/lib/api';
import type { AiRecommendation } from '@/store/aiStore';

// ── Types ─────────────────────────────────────────────────────────────────────
type FeedItemType = 'activity' | 'ai_reco' | 'notif' | 'trending';

interface FeedItem {
  id: string;
  type: FeedItemType;
  time: string;
  user?: string; avatar?: string; loc?: string;
  action?: string; rating?: number; reviewText?: string;
  bookKey?: string; bookTitle?: string; bookAuthor?: string; coverId?: number;
  aiReason?: string;
  notifTitle?: string; notifBody?: string;
  rank?: number; reads?: number;
  // real AI reco
  aiReco?: AiRecommendation;
}

const pseudo = (n: number, mn: number, mx: number) =>
  mn + ((n * 9301 + 49297) % 233280) / 233280 * (mx - mn);
const getRating = (coverId = 0) => (pseudo(coverId + 7, 38, 50) / 10).toFixed(1);
const getReads  = (coverId = 0) => Math.floor(pseudo(coverId + 1, 1200, 28000));

const STATIC_FEED: FeedItem[] = [
  {
    id: 'tr1', type: 'trending', time: '1 jam lalu',
    bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata',
    coverId: 8231568, rank: 1, reads: getReads(8231568),
  },
  {
    id: 'ac1', type: 'activity', time: '2 jam lalu',
    user: 'Ameliana R.', avatar: 'A', loc: 'Yogyakarta',
    action: 'selesai membaca', rating: 5,
    reviewText: 'Buku yang benar-benar mengubah cara pandangku. Andrea Hirata membawa kita ke Belitung dengan sangat hidup.',
    bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata', coverId: 8231568,
  },
  {
    id: 'no1', type: 'notif', time: '3 jam lalu',
    notifTitle: 'Tenggat Besok!',
    notifBody: '"Bumi Manusia" harus dikembalikan besok. Perpanjang sekarang.',
    bookKey: 'd2', coverId: 8750787,
  },
  {
    id: 'ac2', type: 'activity', time: 'Kemarin',
    user: 'Budi S.', avatar: 'B', loc: 'Jakarta',
    action: 'sedang membaca',
    bookKey: 'd2', bookTitle: 'Bumi Manusia', bookAuthor: 'Pramoedya Ananta Toer', coverId: 8750787,
  },
  {
    id: 'tr2', type: 'trending', time: 'Kemarin',
    bookKey: 'd4', bookTitle: 'Perahu Kertas', bookAuthor: 'Dee Lestari',
    coverId: 7886745, rank: 4, reads: getReads(7886745),
  },
  {
    id: 'ac3', type: 'activity', time: '2 hari lalu',
    user: 'Sari A.', avatar: 'S', loc: 'Bandung',
    action: 'memberikan ulasan', rating: 5,
    reviewText: 'Realisme magis yang gelap dan indah. Eka Kurniawan memadukan sejarah kelam Indonesia dengan narasi yang memukau.',
    bookKey: 'd3', bookTitle: 'Cantik Itu Luka', bookAuthor: 'Eka Kurniawan', coverId: 12699828,
  },
  {
    id: 'no2', type: 'notif', time: '3 hari lalu',
    notifTitle: 'Antrean Tersedia!',
    notifBody: '"Perahu Kertas" yang kamu antrikan kini tersedia. Pinjam sebelum 24 jam.',
    bookKey: 'd4', coverId: 7886745,
  },
];

const FILTER_TABS = [
  { id: 'all',      label: 'Semua',      icon: null        },
  { id: 'activity', label: 'Teman',      icon: Users       },
  { id: 'ai_reco',  label: 'PustarAI',   icon: Sparkles    },
  { id: 'trending', label: 'Trending',   icon: TrendingUp  },
  { id: 'notif',    label: 'Notifikasi', icon: Bell        },
];

// ── Cover hook untuk AI reco card ─────────────────────────────────────────────
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

// ── Card components ───────────────────────────────────────────────────────────

function CoverThumb({ coverId, src, size = 'sm' }: { coverId?: number; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-10 h-14', md: 'w-14 h-20', lg: 'w-20 h-28' };
  const imgSrc = src ?? (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null);
  if (!imgSrc) return null;
  return (
    <div className={cn('rounded-xl overflow-hidden shadow-lg flex-shrink-0', dims[size])}>
      <img src={imgSrc} className="w-full h-full object-cover" loading="lazy" alt="" />
    </div>
  );
}

function ActivityCard({ item, dark, tk, liked, onLike }: { item: FeedItem; dark: boolean; tk: any; liked: boolean; onLike: () => void }) {
  return (
    <div className={cn('rounded-3xl border p-5 transition-all', tk.card)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
          {item.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', tk.text)}>{item.user}</p>
          <p className={cn('text-xs', tk.muted)}>{item.loc} · {item.time}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <Users className="w-3 h-3 text-gold/60" />
          <span className="text-[10px] text-gold/60 font-medium">mengikuti</span>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href={`/book/${item.bookKey}`}><CoverThumb coverId={item.coverId} size="md" /></Link>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-medium mb-1', tk.muted)}>
            <span className="font-semibold text-gold/80">{item.action}</span>
          </p>
          <Link href={`/book/${item.bookKey}`}>
            <p className={cn('text-sm font-bold hover:text-gold transition-colors', tk.text)}>{item.bookTitle}</p>
          </Link>
          <p className={cn('text-xs', tk.muted)}>{item.bookAuthor}</p>
          {item.rating && (
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn('w-3 h-3', s <= item.rating! ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200')} />
              ))}
            </div>
          )}
        </div>
      </div>
      {item.reviewText && (
        <p className={cn('text-sm leading-relaxed mt-3 line-clamp-3', tk.muted)}>"{item.reviewText}"</p>
      )}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onLike}
          className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', liked ? 'text-rose-400' : tk.muted, 'hover:text-rose-400')}>
          <Heart className={cn('w-4 h-4', liked && 'fill-rose-400')} />
          {liked ? 'Disukai' : 'Suka'}
        </button>
        <Link href={`/book/${item.bookKey}/reviews`}
          className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', tk.muted, 'hover:text-gold')}>
          <MessageCircle className="w-4 h-4" /> Ulasan
        </Link>
        <Link href={`/book/${item.bookKey}`}
          className={cn('ml-auto flex items-center gap-1 text-xs font-medium transition-colors', tk.muted, 'hover:text-gold')}>
          <BookOpen className="w-3.5 h-3.5" /> Lihat Buku
        </Link>
      </div>
    </div>
  );
}

// AIRecoCard — supports both dummy (coverId) and real (AiRecommendation) data
function AIRecoCard({ item, dark, tk }: { item: FeedItem; dark: boolean; tk: any }) {
  const aiCoverSrc = useAiCover(item.aiReco);
  const coverSrc = item.aiReco ? aiCoverSrc : (item.coverId ? `https://covers.openlibrary.org/b/id/${item.coverId}-M.jpg` : null);
  const title    = item.aiReco?.title ?? item.bookTitle ?? '';
  const author   = item.aiReco?.authors ?? item.bookAuthor ?? '';
  const reason   = item.aiReco?.reason_primary ?? item.aiReason ?? '';
  const rating   = item.aiReco?.avg_rating?.toFixed(1) ?? getRating(item.coverId);
  const href     = item.aiReco ? `/browse?q=${encodeURIComponent(title)}` : `/book/${item.bookKey}`;

  return (
    <div className={cn('rounded-3xl border p-5 transition-all relative overflow-hidden', tk.card)}>
      <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-gold/15 border border-gold/25">
        <Sparkles className="w-3 h-3 text-gold" />
        <span className="text-[10px] font-semibold text-gold">PustarAI</span>
      </div>
      <div className="flex gap-4">
        <Link href={href}><CoverThumb src={coverSrc} size="lg" /></Link>
        <div className="flex-1 min-w-0 pr-16">
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5', tk.muted)}>Rekomendasi Untukmu</p>
          <Link href={href}>
            <p className={cn('font-serif text-xl font-black leading-tight mb-0.5 hover:text-gold transition-colors', tk.text)}>{title}</p>
          </Link>
          <p className={cn('text-sm mb-2', tk.muted)}>{author}</p>
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={cn('w-3 h-3', s <= Math.round(Number(rating)) ? 'text-gold fill-gold' : dark ? 'text-slate-700' : 'text-slate-200')} />
            ))}
            <span className="text-gold text-xs font-bold ml-1">{rating}</span>
          </div>
          <p className={cn('text-xs leading-relaxed italic mb-3', tk.muted)}>{reason}</p>
          <Link href={href}
            className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all',
              dark ? 'bg-gold/15 text-gold hover:bg-gold/25' : 'bg-navy-800 text-white hover:bg-navy-700')}>
            <BookOpen className="w-3.5 h-3.5" /> Lihat Detail <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <p className={cn('text-[11px] mt-3', tk.muted)}>{item.time}</p>
    </div>
  );
}

function NotifCard({ item, dark, tk }: { item: FeedItem; dark: boolean; tk: any }) {
  return (
    <div className={cn('rounded-3xl border p-5 transition-all flex gap-4', tk.card,
      dark ? 'bg-amber-400/5 border-amber-400/20' : 'bg-amber-50 border-amber-200/60')}>
      <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
        <Bell className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold mb-0.5', tk.text)}>{item.notifTitle}</p>
        <p className={cn('text-sm', tk.muted)}>{item.notifBody}</p>
        <p className={cn('text-[11px] mt-2', tk.muted)}>{item.time}</p>
      </div>
      {item.coverId && (
        <Link href={`/book/${item.bookKey}`}><CoverThumb coverId={item.coverId} size="sm" /></Link>
      )}
    </div>
  );
}

function TrendingCard({ item, dark, tk }: { item: FeedItem; dark: boolean; tk: any }) {
  const RANK_BADGE = ['bg-yellow-400 text-yellow-900', 'bg-slate-300 text-slate-700', 'bg-amber-600 text-amber-100'];
  const badgeCls = item.rank && item.rank <= 3 ? RANK_BADGE[item.rank - 1] : 'bg-black/40 text-white';
  return (
    <div className={cn('rounded-3xl border p-5 transition-all flex gap-4 items-center', tk.card)}>
      <div className="relative flex-shrink-0">
        <Link href={`/book/${item.bookKey}`}><CoverThumb coverId={item.coverId} size="md" /></Link>
        <div className={cn('absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg', badgeCls)}>
          #{item.rank}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3 h-3 text-gold" />
          <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">Trending</span>
        </div>
        <Link href={`/book/${item.bookKey}`}>
          <p className={cn('font-serif text-base font-black leading-tight hover:text-gold transition-colors', tk.text)}>{item.bookTitle}</p>
        </Link>
        <p className={cn('text-xs mt-0.5', tk.muted)}>{item.bookAuthor}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-gold fill-gold" />
            <span className="text-gold text-xs font-bold">{getRating(item.coverId)}</span>
          </div>
          <span className={cn('text-xs', tk.muted)}>{item.reads?.toLocaleString()}x dibaca</span>
        </div>
      </div>
      <p className={cn('text-[11px] flex-shrink-0', tk.muted)}>{item.time}</p>
    </div>
  );
}

// ── AI Sidebar widget ─────────────────────────────────────────────────────────
const SIDEBAR_SUGGESTIONS = ['Buku sedih tapi indah', 'Sastra Indonesia', 'Bacaan ringan'];

function AISidebarWidget({ dark, tk }: { dark: boolean; tk: any }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { sendMessage, chatHistory, chatLoading } = useChatAI();

  // Ambil hasil dari chatHistory entry terakhir yang punya recs
  useEffect(() => {
    const last = [...chatHistory].reverse().find(m => m.role === 'assistant' && m.recommendations?.length);
    if (last?.recommendations) setResult(last.recommendations.slice(0, 3));
  }, [chatHistory]);

  async function handleSend(q: string) {
    if (!q.trim() || chatLoading) return;
    setInput('');
    setLoading(true);
    await sendMessage(q);
    setLoading(false);
  }

  return (
    <div className={cn('rounded-3xl border p-5 relative overflow-hidden', tk.card)}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gold/5 -translate-y-8 translate-x-8 pointer-events-none" />
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-gold" />
        <p className={cn('font-semibold text-sm', tk.text)}>Tanya PustarAI</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold font-semibold">Beta</span>
      </div>
      <p className={cn('text-xs leading-relaxed mb-3', tk.muted)}>Cari rekomendasi buku yang sempurna untukmu.</p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SIDEBAR_SUGGESTIONS.map(s => (
          <button key={s}
            onClick={() => handleSend(s)}
            className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
              dark ? 'border-white/10 text-white/50 hover:border-gold/30 hover:text-gold'
                   : 'border-slate-200 text-slate-400 hover:border-gold/40 hover:text-gold')}>
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
          placeholder="Ketik pertanyaan..."
          className={cn('flex-1 px-3 py-2 rounded-xl border text-xs outline-none transition-all',
            dark ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/40'
                 : 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold')}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || chatLoading}
          className="px-3 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold/90 transition-colors disabled:opacity-40">
          {chatLoading ? '...' : '→'}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-2">
            {result.map(r => (
              <SidebarRecoItem key={r.book_id} reco={r} dark={dark} tk={tk} />
            ))}
            <Link href="/recommendations/chat"
              className={cn('flex items-center justify-center gap-1 text-xs font-semibold mt-2 pt-2 border-t transition-colors hover:text-gold', tk.muted)}
              style={{ borderColor: 'var(--border)' }}>
              Lihat semua di Chat <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarRecoItem({ reco, dark, tk }: { reco: AiRecommendation; dark: boolean; tk: any }) {
  const coverSrc = useAiCover(reco);
  return (
    <Link href={`/browse?q=${encodeURIComponent(reco.title)}`}>
      <motion.div
        className={cn('flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer',
          dark ? 'hover:bg-white/5' : 'hover:bg-slate-50')}
        whileHover={{ x: 3 }}>
        <div className={cn('w-8 h-11 rounded-lg overflow-hidden flex-shrink-0', dark ? 'bg-navy-700' : 'bg-parchment-darker')}>
          {coverSrc && <img src={coverSrc} alt={reco.title} className="w-full h-full object-cover" loading="lazy" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold line-clamp-1', tk.text)}>{reco.title}</p>
          <p className={cn('text-[10px] truncate', tk.muted)}>{reco.authors}</p>
        </div>
        <span className="text-[10px] font-bold text-gold flex-shrink-0">★{reco.avg_rating.toFixed(1)}</span>
      </motion.div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { ready } = useProtectedRoute();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  // Real AI recs untuk feed items
  const { recommendations: aiRecs, loading: aiLoading } = useRecommendations();

  const [filter, setFilter]           = useState('all');
  const [liked,  setLiked]            = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingMore, setLoadingMore]   = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Build FEED: sisipkan real AI recs di posisi 0 dan 4
  const FEED: FeedItem[] = (() => {
    const feed = [...STATIC_FEED];
    if (!aiLoading && aiRecs.length > 0) {
      // Sisipkan AI reco pertama di index 0
      feed.unshift({
        id: `ai_real_0`,
        type: 'ai_reco',
        time: 'Baru saja',
        aiReco: aiRecs[0],
      });
      // Sisipkan AI reco kedua di tengah (index 4) kalau ada
      if (aiRecs.length > 1) {
        feed.splice(4, 0, {
          id: `ai_real_1`,
          type: 'ai_reco',
          time: '5 jam lalu',
          aiReco: aiRecs[1],
        });
      }
    }
    return feed;
  })();

  const allFiltered = filter === 'all' ? FEED : FEED.filter(i => i.type === filter);
  const filtered = allFiltered.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(5); }, [filter]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && visibleCount < allFiltered.length) {
        setLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(v => Math.min(v + 3, FEED.length));
          setLoadingMore(false);
        }, 600);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [loadingMore, visibleCount, allFiltered.length]);

  if (!ready) return <PageSkeleton />;

  const tk = {
    text:    dark ? 'text-white'     : 'text-navy-900',
    muted:   dark ? 'text-slate-400' : 'text-slate-500',
    card:    dark ? 'bg-navy-800/50 border-white/8 hover:bg-navy-800/70' : 'bg-white border-parchment-darker hover:bg-slate-50/80',
    chip:    dark ? 'bg-navy-700/50 border-white/10 text-white/60' : 'bg-white border-parchment-darker text-slate-500',
    chipAct: 'bg-gold text-navy-900 border-gold',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-20">
        <div className="lg:grid lg:grid-cols-[1fr_520px_1fr] lg:gap-8">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="hidden lg:block pt-1">
            <div className="sticky top-24 space-y-6">
              <div className={cn('rounded-3xl border p-5', tk.card)}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/25 border border-gold/40 flex items-center justify-center font-bold text-lg text-gold">C</div>
                  <div>
                    <p className={cn('font-semibold text-sm', tk.text)}>cheeps</p>
                    <p className={cn('text-xs', tk.muted)}>Pembaca aktif</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[['12', 'Dipinjam'], ['3', 'Streak'], ['24', 'Selesai']].map(([v, l]) => (
                    <div key={l} className={cn('rounded-xl p-2', dark ? 'bg-navy-700/40' : 'bg-parchment/60')}>
                      <p className="font-serif font-black text-base text-gold">{v}</p>
                      <p className={cn('text-[10px]', tk.muted)}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn('rounded-3xl border p-5', tk.card)}>
                <p className={cn('text-xs font-semibold uppercase tracking-wider mb-4', tk.muted)}>Aktivitas Baru</p>
                <div className="space-y-3">
                  {[
                    { key: 'd1', title: 'Laskar Pelangi', author: 'Andrea Hirata', coverId: 8231568, progress: 68 },
                    { key: 'd2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', coverId: 8750787, progress: 32 },
                  ].map(b => (
                    <Link key={b.key} href={`/read/${b.key}`}>
                      <div className="flex gap-3 group cursor-pointer">
                        <div className="w-10 h-14 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                          <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-S.jpg`} className="w-full h-full object-cover" alt={b.title} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-semibold leading-tight line-clamp-2 group-hover:text-gold transition-colors', tk.text)}>{b.title}</p>
                          <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{b.author}</p>
                          <div className="mt-1.5">
                            <div className={cn('w-full h-1 rounded-full', dark ? 'bg-white/10' : 'bg-slate-100')}>
                              <div className="h-1 rounded-full bg-gold" style={{ width: `${b.progress}%` }} />
                            </div>
                            <p className={cn('text-[10px] mt-0.5', tk.muted)}>{b.progress}%</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/shelf"
                  className={cn('mt-3 flex items-center justify-center gap-1 text-xs font-semibold pt-3 border-t transition-colors hover:text-gold', tk.muted)}
                  style={{ borderColor: 'var(--border)' }}>
                  Lihat Rak Buku →
                </Link>
              </div>
            </div>
          </aside>

          {/* ── MAIN FEED ── */}
          <main>
            <div className="flex items-center justify-between mb-5">
              <h1 className={cn('font-serif text-2xl font-black', tk.text)}>Feed</h1>
              <button className={cn('p-2 rounded-xl transition-colors', tk.muted, 'hover:text-gold', dark ? 'hover:bg-white/5' : 'hover:bg-navy-50')}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
              {FILTER_TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={cn('flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all',
                    filter === id ? tk.chipAct : tk.chip)}>
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="popLayout">
              <div className="flex flex-col gap-4">
                {filtered.map((item, idx) => (
                  <motion.div key={item.id} layout
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 32 }}>
                    {item.type === 'activity' && (
                      <ActivityCard item={item} dark={dark} tk={tk}
                        liked={liked.has(item.id)}
                        onLike={() => setLiked(s => { const n = new Set(s); s.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })}
                      />
                    )}
                    {item.type === 'ai_reco'  && <AIRecoCard   item={item} dark={dark} tk={tk} />}
                    {item.type === 'notif'    && <NotifCard    item={item} dark={dark} tk={tk} />}
                    {item.type === 'trending' && <TrendingCard item={item} dark={dark} tk={tk} />}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            <div ref={loaderRef} className="py-6 flex justify-center">
              {loadingMore && (
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
              {!loadingMore && visibleCount >= allFiltered.length && allFiltered.length > 0 && (
                <p className={cn('text-xs', tk.muted)}>Kamu sudah melihat semua 🎉</p>
              )}
            </div>
          </main>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="hidden lg:block pt-1">
            <div className="sticky top-24 space-y-6">
              {/* AI widget — sekarang live */}
              <AISidebarWidget dark={dark} tk={tk} />

              {/* Who to follow */}
              <div className={cn('rounded-3xl border p-5', tk.card)}>
                <p className={cn('text-xs font-semibold uppercase tracking-wider mb-4', tk.muted)}>Saran Mengikuti</p>
                <div className="space-y-4">
                  {[
                    { name: 'Ameliana R.', loc: 'Yogyakarta', books: 31, avatar: 'A' },
                    { name: 'Budi S.',     loc: 'Jakarta',    books: 18, avatar: 'B' },
                    { name: 'Sari A.',     loc: 'Bandung',    books: 24, avatar: 'S' },
                  ].map(u => (
                    <div key={u.name} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">{u.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', tk.text)}>{u.name}</p>
                        <p className={cn('text-xs', tk.muted)}>{u.loc} · {u.books} buku</p>
                      </div>
                      <button className={cn('text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all',
                        dark ? 'border-gold/30 text-gold hover:bg-gold/10' : 'border-navy-200 text-navy-700 hover:bg-navy-50')}>
                        Ikuti
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}