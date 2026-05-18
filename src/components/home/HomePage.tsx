'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, BookCopy, Flame, Users, Heart, CircleCheckBig,
} from 'lucide-react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import PopularCarousel from '@/components/shared/PopularCarousel';
import Link from 'next/link';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useTrendingBooks } from '@/hooks/useTrendingBooks';
import AiRecoCard from '@/components/ai/AiRecoCard';
import AvatarImage from '@/components/shared/AvatarImage';
import {
  batchFetchCovers,
  getCoverFromMap,
  coverBatchCache,
  type CoverRequest,
} from '@/lib/coverBatch';
import { fetchFeedSidebarPayload } from '@/lib/feed';
import type { FeedSidebarPayload } from '@/lib/feed';
import type { CommunityReview } from "@/types/community";
import ReviewCard from '@/components/shared/ReviewCard';

const REQUEST_BOOK_SUBJECT = encodeURIComponent('Request Buku Baru Pustara');
const REQUEST_BOOK_BODY = encodeURIComponent(
  'Halo Pustakrew!\n\nAku mau request buku baru dong buat di Pustara:\n\nJudul: \nPenulis: \n\nTengkyu!'
);
const EMAIL_ADMIN = (
  process.env.NEXT_PUBLIC_EMAIL_ADMIN
  || process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL
  || ''
).trim();
const HAS_ADMIN_EMAIL = EMAIL_ADMIN.length > 0;
const REQUEST_BOOK_MAILTO = HAS_ADMIN_EMAIL
  ? `mailto:${EMAIL_ADMIN}?subject=${REQUEST_BOOK_SUBJECT}&body=${REQUEST_BOOK_BODY}`
  : '';
const PUSTAKREW_CONTACT_HREF = HAS_ADMIN_EMAIL ? REQUEST_BOOK_MAILTO : '/community';

function formatTooltipDay(dayKey?: string | null): string {
  if (!dayKey) return '-';
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const EMPTY_SIDEBAR: FeedSidebarPayload = {
  profile: {
    initials: 'P',
    name: 'Pembaca Pustara',
    subtitle: 'Pembaca aktif',
    avatar_url: null,
    dipinjam: 0,
    streak: 0,
    selesai: 0,
    borrowed_tooltip: '',
    streak_tooltip: '',
  },
  recentReads: [],
  suggestions: [],
};

const COMMUNITY_LIKE_STORAGE_PREFIX = 'pustara:community-liked:';

function getCommunityReviewLikeKey(review: CommunityReview): string {
  return review.review_id || review.key;
}

function AiRecoCardSkeleton({ isLight }: { isLight: boolean }) {
  const skel = isLight ? 'bg-parchment-darker' : 'bg-navy-700/60';
  return (
    <div className="flex-shrink-0 w-44">
      <div className={cn('w-44 h-64 rounded-2xl animate-pulse mb-3', skel)} />
      <div className={cn('h-2.5 w-3/4 rounded animate-pulse mb-1.5', skel)} />
      <div className={cn('h-2 w-1/2 rounded animate-pulse', skel)} />
    </div>
  );
}

function PopularSkeleton({ isLight }: { isLight: boolean }) {
  const skel = isLight ? 'bg-parchment-darker' : 'bg-navy-700/60';
  return (
    <div className="px-4">
      <div className={cn(
        'hidden lg:grid lg:grid-cols-[240px_1fr_240px] lg:items-center px-4 py-6 rounded-2xl',
        isLight
          ? 'bg-gradient-to-b from-parchment-dark/60 to-transparent'
          : 'bg-gradient-to-b from-white/[0.04] to-transparent'
      )}>
        <div className="pr-6">
          <div className={cn('h-3 w-24 rounded animate-pulse mb-3', skel)} />
          <div className={cn('h-8 w-44 rounded animate-pulse mb-2', skel)} />
          <div className={cn('h-4 w-32 rounded animate-pulse mb-4', skel)} />
          <div className={cn('h-3 w-28 rounded animate-pulse', skel)} />
        </div>

        <div className="flex flex-col items-center">
          <div className="relative w-full flex items-center justify-center" style={{ height: 360 }}>
            <div className={cn('absolute w-[190px] h-[276px] rounded-2xl animate-pulse opacity-65', skel)} style={{ transform: 'translateX(-130px) scale(0.72)' }} />
            <div className={cn('absolute w-[190px] h-[276px] rounded-2xl animate-pulse', skel)} />
            <div className={cn('absolute w-[190px] h-[276px] rounded-2xl animate-pulse opacity-65', skel)} style={{ transform: 'translateX(130px) scale(0.72)' }} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn('w-6 h-6 rounded-full animate-pulse', skel)} />
            <div className={cn('w-6 h-1.5 rounded-full animate-pulse', skel)} />
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', skel)} />
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', skel)} />
            <div className={cn('w-6 h-6 rounded-full animate-pulse', skel)} />
          </div>
        </div>

        <div className="pl-6 flex flex-col items-end">
          <div className={cn('h-3 w-28 rounded animate-pulse mb-3', skel)} />
          <div className={cn('h-3 w-44 rounded animate-pulse mb-2', skel)} />
          <div className={cn('h-3 w-36 rounded animate-pulse mb-5', skel)} />
          <div className={cn('h-9 w-28 rounded-xl animate-pulse', skel)} />
        </div>
      </div>

      <div className="lg:hidden flex flex-col items-center">
        <div className={cn(
          'relative w-full flex items-center justify-center rounded-2xl',
          isLight
            ? 'bg-gradient-to-b from-parchment-dark/70 to-transparent'
            : 'bg-gradient-to-b from-white/[0.04] to-transparent'
        )} style={{ height: 260 }}>
          <div className={cn('absolute w-[150px] h-[216px] rounded-2xl animate-pulse opacity-60', skel)} style={{ transform: 'translateX(-92px) scale(0.72)' }} />
          <div className={cn('absolute w-[150px] h-[216px] rounded-2xl animate-pulse', skel)} />
          <div className={cn('absolute w-[150px] h-[216px] rounded-2xl animate-pulse opacity-60', skel)} style={{ transform: 'translateX(92px) scale(0.72)' }} />
        </div>
        <div className="w-full mt-4 space-y-2 px-1">
          <div className={cn('h-3 w-20 rounded animate-pulse', skel)} />
          <div className={cn('h-6 w-3/4 rounded animate-pulse', skel)} />
          <div className={cn('h-4 w-2/3 rounded animate-pulse', skel)} />
          <div className={cn('h-9 w-32 rounded-xl animate-pulse mt-3', skel)} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user }   = useAuthStore();
  const { theme }  = useTheme();
  const isLight    = theme === 'light';
  const displayName = user?.displayName || user?.email || 'Pembaca';
  const firstName  = displayName.split(' ')[0] || 'Pembaca';
  const { books: popularBooks, loading: popularLoading } = useTrendingBooks(12);
  const homepagePopularBooks = popularBooks.slice(0, 6);
  const { recommendations: aiReco, loading: aiLoading } = useRecommendations();
  const [aiCovers, setAiCovers] = useState<Map<string, string | null>>(new Map());
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [likedCommunityIds, setLikedCommunityIds] = useState<Record<string, boolean>>({});
  const [sidebar, setSidebar] = useState<FeedSidebarPayload>(EMPTY_SIDEBAR);
  const [greetingStats, setGreetingStats] = useState({ dipinjam: 0, streak: 0, selesai: 0 });
  const borrowedTooltip = sidebar?.profile?.borrowed_tooltip || '';
  const streakTooltip = sidebar?.profile?.streak_tooltip || '';
  const communityLikeStorageKey = user?.uid ? `${COMMUNITY_LIKE_STORAGE_PREFIX}${user.uid}` : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!communityLikeStorageKey) {
      setLikedCommunityIds({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(communityLikeStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const next: Record<string, boolean> = {};

      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          if (typeof value === 'string' && value) {
            next[value] = true;
          }
        }
      }

      setLikedCommunityIds(next);
    } catch {
      setLikedCommunityIds({});
    }
  }, [communityLikeStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !communityLikeStorageKey) return;

    try {
      const likedIds = Object.entries(likedCommunityIds)
        .filter(([, liked]) => liked)
        .map(([id]) => id);
      window.localStorage.setItem(communityLikeStorageKey, JSON.stringify(likedIds));
    } catch {
      // ignore localStorage access failures
    }
  }, [communityLikeStorageKey, likedCommunityIds]);

  useEffect(() => {
    if (!aiReco || aiReco.length === 0) {
      setAiCovers(new Map());
      return;
    }

    // Prepare cover requests
    const coverRequests: CoverRequest[] = aiReco.map((reco) => ({
      title: reco.title,
      authors: reco.authors,
      coverUrl: (reco as any).cover_url, // Check if already have URL
    }));

    // Batch fetch all covers at once
    coverBatchCache
      .fetch(coverRequests)
      .then((coverMap) => {
        // Convert map to simple key->url for easier lookup
        const urlMap = new Map<string, string | null>();
        for (const [key, result] of coverMap.entries()) {
          urlMap.set(key, result.coverUrl);
        }
        setAiCovers(urlMap);
      })
      .catch(() => {
        setAiCovers(new Map());
      });
  }, [aiReco]);

  useEffect(() => {
    if (!user) {
      setSidebar(EMPTY_SIDEBAR);
      setGreetingStats({ dipinjam: 0, streak: 0, selesai: 0 });
      return;
    }

    let active = true;
    fetchFeedSidebarPayload()
      .then((payload) => {
        if (!active) return;
        setSidebar(payload);
        setGreetingStats({
          dipinjam: Number(payload.profile.dipinjam || 0),
          streak: Number(payload.profile.streak || 0),
          selesai: Number(payload.profile.selesai || 0),
        });
      })
      .catch(() => {
        if (!active) return;
        setSidebar(EMPTY_SIDEBAR);
        setGreetingStats({ dipinjam: 0, streak: 0, selesai: 0 });
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    setCommunityLoading(true);

    if (!apiBase) {
      setCommunityReviews([]);
      setCommunityLoading(false);
      return () => { active = false; };
    }

    fetch(`${apiBase.replace(/\/$/, '')}/reviews/recent?limit=8`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch')))
      .then((json) => {
        if (!active) return;
        if (json && json.success && Array.isArray(json.data)) {
          setCommunityReviews(json.data);
        } else {
          setCommunityReviews([]);
        }
      })
      .catch(() => {
        if (!active) return;
        setCommunityReviews([]);
      })
      .finally(() => {
        if (!active) return;
        setCommunityLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ── HERO GREETING ── */}
      <section className="px-4 pt-6 pb-0 max-w-7xl mx-auto">
        <motion.div
          className="relative rounded-2xl overflow-visible px-6 py-5 mb-1"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 50%, transparent 100%)',
            border: isLight ? '1px solid rgba(201,168,76,0.15)' : '1px solid rgba(201,168,76,0.12)',
          }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)' }} />

          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <motion.p className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: 'var(--muted)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                Selamat datang kembali
              </motion.p>
              <motion.h1 className="font-serif text-2xl lg:text-3xl font-black leading-tight"
                style={{ color: 'var(--text)' }}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                {firstName}! <span className="inline-block animate-[wave_1.5s_ease-in-out_1]">👋</span>
              </motion.h1>
              <motion.p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                Lanjut membaca atau temukan buku baru hari ini.
              </motion.p>
            </div>

            <motion.div className="hidden sm:flex items-center gap-5 flex-shrink-0"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {[
                { icon: BookCopy,       val: String(greetingStats.dipinjam),  label: 'Dipinjam',   tooltip: borrowedTooltip },
                { icon: Flame,          val: String(greetingStats.streak),    label: 'Hari streak', tooltip: streakTooltip },
                { icon: CircleCheckBig, val: String(greetingStats.selesai),   label: 'Selesai',    tooltip: `Total selesai ${greetingStats.selesai} buku` },
              ].map(({ icon: Icon, val, label, tooltip }) => (
                <div key={label} className="group relative flex flex-col items-center justify-center">
                  <Icon className="w-6 h-6 text-gold/70" />
                  <p className="font-black text-sm leading-none mt-1.5" style={{ color: 'var(--text)' }}>{val}</p>
                  <p className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{label}</p>
                  {tooltip ? (
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 rounded-2xl border border-gold/20 bg-[rgba(8,15,26,0.97)] px-3 py-2 text-left text-[11px] leading-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] group-hover:block whitespace-pre-line min-w-44">
                      {tooltip}
                    </div>
                  ) : null}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── BACAAN POPULER ── */}
      <section className="mt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Bacaan Populer</h2>
          <Link href="/browse#popular" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        {popularLoading
          ? <PopularSkeleton isLight={isLight} />
          : <PopularCarousel books={homepagePopularBooks} isLight={isLight} />
        }
      </section>

      {/* ── REKOMENDASI PUSTARAI ── */}
      <section className="mt-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Rekomendasi PustarAI</h2>
          </div>
          <Link href="/browse#ai-reco" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <div className="flex gap-4 px-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
          {aiLoading
            ? Array(5).fill(0).map((_, i) => <AiRecoCardSkeleton key={i} isLight={isLight} />)
            : aiReco.length > 0
              ? aiReco.slice(0, 5).map((reco, i) => {
                  const key = `${reco.title}—${reco.authors}`.toLowerCase();
                  const coverUrl = aiCovers.get(key) || (reco as any).cover_url;
                  return (
                    <AiRecoCard
                      key={reco.book_id}
                      reco={reco}
                      index={i}
                      isLight={isLight}
                      coverUrl={coverUrl}
                    />
                  );
                })
              : (
                <p className="text-sm px-1 py-8" style={{ color: 'var(--muted)' }}>
                  Rekomendasi belum tersedia. Hubungi{' '}
                  <Link href={PUSTAKREW_CONTACT_HREF} className="text-gold hover:underline">@Pustakrew</Link>{' '}
                  jika menurutmu ini tidak seharusnya terjadi.
                </p>
              )
          }
        </div>
      </section>

      {/* ── KOMUNITAS ── */}
      <section className="max-w-7xl mx-auto px-4 mt-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Koleksi Komunitas</h2>
          </div>
          <Link href="/community" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <CommunitySection
          reviews={communityReviews}
          loading={communityLoading}
          isLight={isLight}
          likedCommunityIds={likedCommunityIds}
          onToggleLike={(review) => {
            const likeKey = getCommunityReviewLikeKey(review);
            if (!likeKey) return;

            setLikedCommunityIds((current) => ({
              ...current,
              [likeKey]: !current[likeKey],
            }));
          }}
        />
      </section>
    </div>
  );
}

function CommunitySection({
  reviews,
  loading,
  isLight,
  likedCommunityIds,
  onToggleLike,
}: {
  reviews: CommunityReview[];
  loading: boolean;
  isLight: boolean;
  likedCommunityIds: Record<string, boolean>;
  onToggleLike: (review: CommunityReview) => void;
}) {
  return (
    <>
      {loading ? (
        <>
          <div className="lg:hidden flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {Array.from({ length: 3 }).map((_, i) => <CommunityCardSkeleton key={i} isLight={isLight} />)}
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <CommunityCardSkeleton key={i} isLight={isLight} />)}
          </div>
        </>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border p-5 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          Koleksi komunitas belum tersedia saat ini.
        </div>
      ) : (
        <>
          <div className="lg:hidden flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
           {reviews.slice(0, 5).map((r, i) => (
            <ReviewCard
              key={r.review_id || r.key}
              reviewId={r.review_id}
              name={r.user}
              avatarUrl={r.avatar_url}
              rating={r.rating}
              text={r.text}
              initialLikes={r.likes}
              time={r.time}
              bookTitle={r.book}
              bookAuthor={r.author}
              bookCoverUrl={r.cover_url}
              bookId={r.key}
              index={i}
            />
          ))}
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {reviews.slice(0, 8).map((r, i) => (
              <ReviewCard
                key={r.review_id || r.key}
                reviewId={r.review_id}
                name={r.user}
                avatarUrl={r.avatar_url}
                rating={r.rating}
                text={r.text}
                initialLikes={r.likes}
                time={r.time}
                bookTitle={r.book}
                bookAuthor={r.author}
                bookCoverUrl={r.cover_url}
                bookId={r.key}
                index={i}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CommunityCardSkeleton({ isLight }: { isLight: boolean }) {
  return (
    <div
      className="flex-shrink-0 w-64 lg:w-auto rounded-2xl p-4 animate-pulse"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-full', isLight ? 'bg-slate-200' : 'bg-white/10')} />
        <div className="flex-1 min-w-0">
          <div className={cn('h-3.5 rounded w-3/5 mb-2', isLight ? 'bg-slate-200' : 'bg-white/10')} />
          <div className={cn('h-2.5 rounded w-1/2', isLight ? 'bg-slate-200' : 'bg-white/10')} />
        </div>
      </div>
      <div className={cn('h-4 rounded w-full mb-2', isLight ? 'bg-slate-200' : 'bg-white/10')} />
      <div className={cn('h-4 rounded w-5/6 mb-2', isLight ? 'bg-slate-200' : 'bg-white/10')} />
      <div className={cn('h-3 rounded w-1/3', isLight ? 'bg-slate-200' : 'bg-white/10')} />
    </div>
  );
}

function CommunityCard({ review, index, isLight, liked, onLike }: {
  review: CommunityReview;
  index: number;
  isLight: boolean;
  liked: boolean;
  onLike: () => void;
}) {
  const src = review.cover_url;

  function formatRelativeTime(t: string | null | undefined) {
    if (!t) return '-';
    const parsed = Date.parse(String(t));
    if (Number.isNaN(parsed)) return String(t);
    const diff = Date.now() - parsed;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec} detik lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} hari lalu`;
    const wk = Math.floor(day / 7);
    if (wk < 5) return `${wk} minggu lalu`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo} bulan lalu`;
    return `${Math.floor(day / 365)} tahun lalu`;
  }

  return (
    <motion.div
      className="flex-shrink-0 w-64 lg:w-auto rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start gap-3 mb-3">
        <AvatarImage
          src={review.avatar_url || null}
          alt={review.user || 'User avatar'}
          initials={review.user.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{review.user}</p>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'w-2.5 h-2.5',
                    s <= review.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700'
                  )}
                />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{formatRelativeTime(review.time)}</span>
          </div>
        </div>
        <Link href={`/book/${review.key}`} className="flex-shrink-0">
          <div className="w-8 h-12 rounded-lg overflow-hidden shadow">
            {src && <img src={src} alt={review.book} className="w-full h-full object-cover" />}
          </div>
        </Link>
      </div>

      <Link href={`/book/${review.key}`}>
        <p className="text-xs font-semibold text-gold/80 hover:text-gold mb-1.5 transition-colors">{review.book}</p>
      </Link>
      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--muted)' }}>{review.text}</p>

      <motion.button
        onClick={onLike}
        className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', liked ? 'text-rose-400' : '')}
        style={!liked ? { color: 'var(--muted)' } : {}}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.3 }}>
          <Heart className={cn('w-3.5 h-3.5', liked && 'fill-rose-400')} />
        </motion.div>
        {liked ? 'Disukai' : 'Suka'}
      </motion.button>
    </motion.div>
  );
}