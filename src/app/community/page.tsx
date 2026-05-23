'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchCommunityReviews } from '@/lib/community';
import { getMyFollowingUsers } from '@/lib/users';
import { useAuthStore } from '@/store/authStore';
import ReviewCard from '@/components/shared/ReviewCard';
import type { CommunityReview } from '@/types/community';
import type { RecommendedUser } from '@/types/user';

const TABS = ['Terbaru', 'Terpopuler', 'Diikuti'];
const PAGE_SIZE = 4;

const normalizeComparable = (value?: string | null) => (value || '').trim().toLowerCase();

function buildFollowingIdentitySet(users: RecommendedUser[]) {
  return new Set(
    users
      .flatMap((user) => [user.id, user.firebase_uid, user.username, user.display_name, user.name])
      .map((value) => normalizeComparable(value))
      .filter(Boolean)
  );
}

export default function CommunityPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { user, loading: authLoading } = useAuthStore();

  const [tab, setTab]         = useState('Terbaru');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [followingUsers, setFollowingUsers] = useState<RecommendedUser[]>([]);

  const [communityStats, setCommunityStats] = useState<{
    readers: string; reviews: string; positive_pct: string;
  } | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = 'Pustara | Komunitas'; }, []);

  useEffect(() => {
    let active = true;

    fetchCommunityReviews()
      .then((result) => {
        if (active) setReviews(result);
      })
      .catch(() => {
        if (active) setReviews([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (authLoading) return;

    if (!user?.uid) {
      setFollowingUsers([]);
      return () => {
        active = false;
      };
    }

    getMyFollowingUsers(100)
      .then((result) => {
        if (active) setFollowingUsers(result);
      })
      .catch(() => {
        if (active) setFollowingUsers([]);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.uid]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiBase) return;
    fetch(`${apiBase.replace(/\/$/, '')}/reviews/stats`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(json => { if (json?.success && json.data) setCommunityStats(json.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { setVisible(PAGE_SIZE); }, [tab]);

  const followingIdentitySet = buildFollowingIdentitySet(followingUsers);

  const followingReviews = reviews.filter((review) => {
    const reviewId = normalizeComparable(review.user_id);
    const reviewUid = normalizeComparable(review.firebase_uid);
    const reviewUser = normalizeComparable(review.user);
    return (
      (reviewId && followingIdentitySet.has(reviewId)) ||
      (reviewUid && followingIdentitySet.has(reviewUid)) ||
      (reviewUser && followingIdentitySet.has(reviewUser))
    );
  });

  // "Terpopuler" sorts by current likes count — ReviewCard manages live counts internally
  // so for initial sort we use the seed value from the API
  const scopedReviews = tab === 'Diikuti' ? followingReviews : reviews;
  const sorted = tab === 'Terpopuler'
    ? [...scopedReviews].sort((a, b) => b.likes - a.likes)
    : scopedReviews;

  const displayed = sorted.slice(0, visible);
  const hasMore   = visible < sorted.length;

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE_SIZE, sorted.length));
      setLoading(false);
    }, 400);
  }, [loading, hasMore, sorted.length]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const tk = {
    text:    isLight ? 'text-navy-900' : 'text-white',
    muted:   isLight ? 'text-slate-500' : 'text-slate-400',
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    chip:    isLight ? 'bg-white border-parchment-darker text-slate-600' : 'bg-navy-700/50 border-white/10 text-white/60',
    chipAct: 'bg-gold text-navy-900 border-gold',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-20">

        {/* Header */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">Komunitas</span>
          </div>
          <h1 className={cn('font-serif text-3xl lg:text-4xl font-black', tk.text)}>Koleksi Komunitas</h1>
          <p className={cn('text-sm mt-1', tk.muted)}>Ulasan &amp; rekomendasi dari pembaca Pustara</p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          {([
            [communityStats?.readers ?? '—', 'Pembaca'],
            [communityStats?.reviews ?? '—', 'Ulasan'],
            [communityStats?.positive_pct ?? '—', 'Positif'],
          ] as [string, string][]).map(([v, l]) => (
            <div key={l} className={cn('rounded-2xl border p-3 text-center', tk.surface)}>
              <p className="font-serif text-xl font-black text-gold">{v}</p>
              <p className={cn('text-[11px] mt-0.5', tk.muted)}>{l}</p>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-full border text-xs font-semibold transition-all',
                t === tab ? tk.chipAct : tk.chip)}>
              {t}
            </button>
          ))}
        </div>

        {/* Diikuti empty state */}
        {tab === 'Diikuti' && displayed.length === 0 && (
          <motion.div
            className={cn('rounded-3xl border p-10 text-center', tk.surface)}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <BookHeart className="w-10 h-10 text-gold/50 mx-auto mb-3" />
            <p className={cn('font-semibold text-sm mb-1', tk.text)}>
              {followingUsers.length === 0 ? 'Belum ada yang diikuti' : 'Belum ada ulasan dari yang diikuti'}
            </p>
            <p className={cn('text-xs leading-relaxed', tk.muted)}>
              {followingUsers.length === 0
                ? 'Ikuti pengguna lain untuk melihat ulasan mereka di sini.'
                : 'Ulasan dari orang yang kamu ikuti akan muncul otomatis di tab ini.'}
            </p>
          </motion.div>
        )}

        {/* Feed — uses shared ReviewCard with book context */}
        {tab !== 'Diikuti' && (
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {displayed.map((r, i) => (
                <ReviewCard
                  key={`${tab}-${r.review_id || i}`}
                  reviewId={r.review_id || ''}
                  name={r.user}
                  username={r.username}
                  avatarUrl={r.avatar_url}
                  rating={r.rating}
                  text={r.text}
                  initialLikes={r.likes}
                  time={r.time}
                  bookTitle={r.book}
                  bookAuthor={r.author}
                  bookCoverUrl={r.cover_url}
                  bookId={r.key}
                  firebaseUid={r.firebase_uid}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {tab !== 'Diikuti' && (
          <div ref={loaderRef} className="py-8 flex justify-center">
            {loading && (
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            {!hasMore && displayed.length > 0 && (
              <p className={cn('text-xs', tk.muted)}>Kamu sudah melihat semua ulasan 🎉</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}