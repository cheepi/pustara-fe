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
import { DUMMY_COMMUNITY_REVIEWS } from '@/data/dummyData';
import type { CommunityReview } from '@/types/community';
import AvatarImage from '@/components/shared/AvatarImage';
import ReviewCard from '@/components/shared/ReviewCard';
import {
  batchFetchCovers,
  getCoverFromMap,
  coverBatchCache,
  type CoverRequest,
} from '@/lib/coverBatch';
import { fetchFeedSidebarPayload } from '@/lib/feed';

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

const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

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
  const firstName  = user?.displayName?.split(' ')[0] || 'Pembaca';
  const { books: popularBooks, loading: popularLoading } = useTrendingBooks(6);
  const { recommendations: aiReco, loading: aiLoading } = useRecommendations();
  const [aiCovers, setAiCovers] = useState<Map<string, string | null>>(new Map());
  const [greetingStats, setGreetingStats] = useState({ dipinjam: 0, streak: 0, selesai: 0 });

  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>(DUMMY_COMMUNITY_REVIEWS as unknown as CommunityReview[]);
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
      setGreetingStats({ dipinjam: 0, streak: 0, selesai: 0 });
      return;
    }

    let active = true;
    fetchFeedSidebarPayload()
      .then((payload) => {
        if (!active) return;
        setGreetingStats({
          dipinjam: Number(payload.profile.dipinjam || 0),
          streak: Number(payload.profile.streak || 0),
          selesai: Number(payload.profile.selesai || 0),
        });
      })
      .catch(() => {
        if (!active) return;
        setGreetingStats({ dipinjam: 0, streak: 0, selesai: 0 });
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);


  useEffect(() => {
    let active = true;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    if (!apiBase) return () => { active = false; };
    fetch(`${apiBase.replace(/\/$/, "")}/reviews/recent?limit=8`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(json => {
        if (!active) return;
        if (json?.success && Array.isArray(json.data)) {
          setCommunityReviews(json.data as CommunityReview[]);
        }
      })
      .catch(() => {})
      .finally(() => { active = false; });
    return () => { active = false; };
  }, []);
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* ── HERO GREETING ── */}
      <section className="px-4 pt-6 pb-0 max-w-7xl mx-auto">
        <motion.div
          className="relative rounded-2xl overflow-hidden px-6 py-5 mb-1"
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
                { icon: BookCopy,        val: String(greetingStats.dipinjam),  label: 'Dipinjam'    },
                { icon: Flame,           val: String(greetingStats.streak), label: 'Hari streak' },
                { icon: CircleCheckBig,  val: String(greetingStats.selesai), label: 'Selesai'     },
              ].map(({ icon: Icon, val, label }) => (
                <div key={label} className="flex flex-col items-center justify-center">
                  <Icon className="w-6 h-6 text-gold/70" />
                  <p className="font-black text-sm leading-none mt-1.5" style={{ color: 'var(--text)' }}>{val}</p>
                  <p className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{label}</p>
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
          : <PopularCarousel books={popularBooks} isLight={isLight} />
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
                  // Lookup cover from batch-fetched map
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
        <CommunitySection reviews={communityReviews} isLight={isLight} />
      </section>
    </div>
  );
}

function CommunitySection({ reviews, isLight: _isLight }: { reviews: CommunityReview[]; isLight: boolean }) {
  return (
    <>
      <div className="lg:hidden flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {reviews.slice(0, 5).map((r, i) => (
          <div key={r.review_id || i} className="flex-shrink-0 w-64">
            <ReviewCard
              reviewId={r.review_id}
              name={r.user}
              avatarUrl={r.avatar_url}
              rating={r.rating}
              text={r.text}
              initialLikes={r.likes}
              time={r.time}
              bookTitle={r.book}
              bookCoverUrl={r.cover_url}
              bookId={r.key}
              variant="compact"
              index={i}
            />
          </div>
        ))}
      </div>
      <div className="hidden lg:grid grid-cols-3 gap-3">
        {reviews.slice(0, 8).map((r, i) => (
          <ReviewCard
            key={r.review_id || i}
            reviewId={r.review_id}
            name={r.user}
            avatarUrl={r.avatar_url}
            rating={r.rating}
            text={r.text}
            initialLikes={r.likes}
            time={r.time}
            bookTitle={r.book}
            bookCoverUrl={r.cover_url}
            bookId={r.key}
            variant="compact"
            index={i}
          />
        ))}
      </div>
    </>
  );
}
