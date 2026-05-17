'use client';
 
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Heart, UserPlus, UserCheck,
  Star, Flame, Users, BookMarked, TrendingUp,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AvatarImage from '@/components/shared/AvatarImage';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { getRecommendedUsers, getUserProfile, toggleFollowUser } from '@/lib/users';
import { useAuthStore } from '@/store/authStore';
import type { RecommendedUser, UserProfile } from '@/types/user';
 
type UserProfileWithStats = UserProfile & {
  total_read?:       number;
  reading_streak?:   number;
  avg_rating?:       number;
}

type FullProfile = UserProfileWithStats;

const BOOK_PALETTE = [
  'from-amber-700  to-amber-900',
  'from-emerald-700 to-emerald-900',
  'from-blue-700   to-blue-900',
  'from-rose-700   to-rose-900',
  'from-violet-700 to-violet-900',
  'from-teal-700   to-teal-900',
  'from-orange-700 to-orange-900',
  'from-cyan-700   to-cyan-900',
];
 
function bookColor(index: number) {
  return BOOK_PALETTE[index % BOOK_PALETTE.length];
}

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

function buildGenreStatsFromGenres(genres: string[], limit = 5) {
  const genreMap = new Map<string, number>();
  for (const genre of genres) {
    genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
  }

  const topGenres = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id'))
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }));

  if (topGenres.length === 0) return [];

  const total = topGenres.reduce((sum, item) => sum + item.count, 0) || 1;
  const ranked = topGenres.map((item) => {
    const exact = (item.count / total) * 100;
    const base = Math.floor(exact);
    return { ...item, pct: base, remainder: exact - base };
  });

  let remaining = 100 - ranked.reduce((sum, item) => sum + item.pct, 0);
  const order = [...ranked].sort((a, b) => b.remainder - a.remainder || b.count - a.count || a.genre.localeCompare(b.genre, 'id'));

  for (let index = 0; index < remaining; index += 1) {
    order[index % order.length].pct += 1;
  }

  return ranked.map(({ genre, count, pct }) => ({ genre, count, pct }));
}
 
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const half   = !filled && i < rating;
        return (
          <Star
            key={i}
            className={cn(
              'w-3 h-3',
              filled ? 'text-gold fill-gold' : half ? 'text-gold fill-gold/40' : 'text-white/20 fill-transparent'
            )}
          />
        );
      })}
    </div>
  );
}
 
function StatPill({
  icon: Icon,
  value,
  label,
  color,
  delay = 0,
  isLight,
  tooltip,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  delay?: number;
  isLight: boolean;
  tooltip?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl flex-1',
        isLight ? 'bg-white/60 backdrop-blur border border-parchment-darker' : 'bg-white/5 backdrop-blur border border-white/8'
      )}
    >
      <Icon className={cn('w-4 h-4', color)} />
      <span className={cn('font-serif font-black text-2xl leading-none', isLight ? 'text-navy-900' : 'text-white')}>
        {value}
      </span>
      <span className={cn('text-[11px] text-center', isLight ? 'text-slate-500' : 'text-slate-400')}>{label}</span>
      {tooltip ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 rounded-2xl border border-gold/20 bg-[rgba(8,15,26,0.97)] px-3 py-2 text-left text-[11px] leading-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] group-hover:block whitespace-pre-line min-w-52">
          {tooltip}
        </div>
      ) : null}
    </motion.div>
  );
}
 
function GenreBar({
  genre,
  pct,
  count,
  index,
  isLight,
}: {
  genre: string;
  pct: number;
  count: number;
  index: number;
  isLight: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.4 }}
      className="flex items-center gap-3 group"
    >
      <span className={cn('text-xs w-24 flex-shrink-0 font-medium truncate', isLight ? 'text-navy-700' : 'text-slate-300')}>
        {genre}
      </span>
      <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', isLight ? 'bg-slate-100' : 'bg-white/10')}>
        <motion.div
          className="h-full bg-gold rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 8)}%` }}
          transition={{ delay: 0.3 + index * 0.06, duration: 0.55, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-xs w-10 text-right flex-shrink-0 tabular-nums', isLight ? 'text-slate-400' : 'text-slate-500')}>
        {pct}%
      </span>
    </motion.div>
  );
}
 
function BookPosterCard({
  book,
  index,
  isLight,
}: {
  book: { id: string; title: string; authors: string[] };
  index: number;
  isLight: boolean;
}) {
  const gradient   = bookColor(index);
  const shortTitle = book.title.length > 22 ? book.title.slice(0, 20) + '…' : book.title;
 
  return (
    <Link href={`/book/${book.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 + index * 0.04, duration: 0.35 }}
        whileHover={{ y: -4, scale: 1.03 }}
        className="relative rounded-xl overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '2/3' }}
      >
        <div className={cn('absolute inset-0 bg-gradient-to-br', gradient)} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: 'cover' }}
        />
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">{shortTitle}</p>
          <p className="text-white/60 text-[9px] mt-0.5 line-clamp-1">
            {book.authors?.[0] ?? 'Unknown'}
          </p>
        </div>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
      </motion.div>
    </Link>
  );
}
 
function ReadingCard({
  book,
  index,
  isLight,
}: {
  book: { id: string; title: string; authors: string[]; progress_percentage?: number };
  index: number;
  isLight: boolean;
}) {
  const pct = Math.round(book.progress_percentage || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07 }}
    >
      <Link href={`/book/${book.id}`}>
        <div className={cn(
          'rounded-2xl border p-4 transition-all hover:scale-[1.01] group',
          isLight
            ? 'bg-parchment border-parchment-darker hover:border-gold/30'
            : 'bg-white/5 border-white/8 hover:border-gold/30'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn('w-8 flex-shrink-0 rounded-md bg-gradient-to-br', bookColor(index))}
              style={{ aspectRatio: '2/3', minHeight: 48 }}
            />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-bold leading-snug line-clamp-1 group-hover:text-gold transition-colors', isLight ? 'text-navy-900' : 'text-white')}>
                {book.title}
              </p>
              <p className={cn('text-xs mt-0.5 line-clamp-1', isLight ? 'text-slate-500' : 'text-slate-400')}>
                {Array.isArray(book.authors) ? book.authors.join(', ') : 'Unknown'}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <div className={cn('flex-1 h-1 rounded-full overflow-hidden', isLight ? 'bg-slate-200' : 'bg-white/10')}>
                  <motion.div
                    className="h-full bg-gold rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.2 + index * 0.07, duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className={cn('text-[10px] flex-shrink-0 tabular-nums font-semibold', isLight ? 'text-slate-400' : 'text-slate-500')}>
                  {pct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
 
export default function UserProfilePage() {
  const params          = useParams();
  const profileUsername = String(params?.username || '');
  const { theme }       = useTheme();
  const isLight         = theme === 'light';
 
  const [profile,       setProfile]       = useState<FullProfile | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [suggestions,   setSuggestions]   = useState<RecommendedUser[]>([]);
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
 
  useEffect(() => {
    if (!profileUsername) return;
    let active = true;
    setLoading(true);
 
    Promise.all([
      getUserProfile(profileUsername),
      getRecommendedUsers(5),
    ])
      .then(([profileData, recs]) => {
        if (!active) return;
        setProfile(profileData as FullProfile);
        setAvatarUrl((profileData as FullProfile)?.avatar_url || null);
        setSuggestions(recs.filter((r: RecommendedUser) => r.id !== (profileData as FullProfile)?.id));
      })
      .finally(() => { if (active) setLoading(false); });
 
    return () => { active = false; };
  }, [profileUsername]);

  const { user } = useAuthStore();
 
  const initials = useMemo(() => {
    const src = profile?.name || 'Pustara';
    return src.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  }, [profile?.name]);
 
  const genreStats = useMemo(() => {
    if (!profile) return [];

    const backendGenreStats = Array.isArray(profile.stats?.favorite_genres)
      ? profile.stats.favorite_genres
          .map((item: any) => ({
            genre: String(item?.genre ?? '').trim(),
            count: Number(item?.count ?? 0),
            pct: Number(item?.pct ?? 0),
          }))
          .filter((item) => Boolean(item.genre))
      : [];

    if (backendGenreStats.length > 0) {
      return backendGenreStats;
    }

    const allGenres = [
      ...(profile.currently_reading ?? []).flatMap((b: any) =>
        Array.isArray((b as any).genres) ? (b as any).genres : []
      ),
      ...(profile.liked_books ?? []).flatMap((b: any) =>
        Array.isArray((b as any).genres) ? (b as any).genres : []
      ),
    ].map((g: unknown) => String(g).trim()).filter(Boolean);

    return buildGenreStatsFromGenres(allGenres, 6);
  }, [profile]);
 
  async function handleFollow() {
    if (!profile || loadingFollow) return;
    setLoadingFollow(true);
    try {
      const action = profile.is_following ? 'unfollow' : 'follow';
      const result = await toggleFollowUser(profile.id, action);
      if (!result) return;
      setProfile((prev: FullProfile | null) => prev ? {
        ...prev,
        is_following:    result.is_following,
        followers_count: result.target_followers_count,
      } : prev);
    } finally {
      setLoadingFollow(false);
    }
  }
 
  const tk = {
    text:  isLight ? 'text-navy-900'    : 'text-white',
    muted: isLight ? 'text-slate-500'   : 'text-slate-400',
    card:  isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    chip:  isLight ? 'bg-parchment border-parchment-darker text-navy-700' : 'bg-white/5 border-white/10 text-white/70',
    hover: isLight ? 'hover:bg-parchment' : 'hover:bg-white/5',
  };
 
  if (loading) return <PageSkeleton />;
 
  if (!profile) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className={cn('font-serif text-3xl font-black mb-2', tk.text)}>Profil tidak ditemukan</p>
          <p className={cn('text-sm', tk.muted)}>Pengguna dengan username tersebut belum tersedia.</p>
        </main>
      </div>
    );
  }
 
  const totalRead    = Number(profile.total_read   ?? profile.currently_reading?.length ?? 0);
  const streak       = Number(profile.reading_streak ?? 0);
  const likedCount   = profile.liked_books?.length ?? 0;
  const followersNum = profile.followers_count ?? 0;
  const followingNum = profile.following_count ?? 0;
  const streakTooltip = profile.streak_is_active
    ? [`Streak aktif: ${streak} hari`, `Mulai: ${formatTooltipDay(profile.streak_last_start_day)}`, `Aktif terakhir: ${formatTooltipDay(profile.streak_last_end_day)}`].join('\n')
    : [`Streak terakhir: ${profile.streak_last_length ?? streak} hari`, `Berakhir: ${formatTooltipDay(profile.streak_last_end_day)}`, `Reset: ${formatTooltipDay(profile.streak_reset_day)}`].join('\n');
 
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
 
      <main className="max-w-6xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative pt-8 pb-6 mb-6 overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-10 -left-20 w-72 h-72 rounded-full bg-gold/10 blur-[80px]" />
          <div className="pointer-events-none absolute top-0 right-10 w-56 h-56 rounded-full bg-blue-500/10 blur-[60px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 w-40 h-40 rounded-full bg-gold/5 blur-[50px]" />
 
          <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative flex-shrink-0"
            >
              <div className={cn(
                'w-24 h-24 lg:w-28 lg:h-28 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden',
                'bg-gradient-to-br from-gold/30 via-gold/10 to-transparent border-2 border-gold/40'
              )}>
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={profile?.name || 'User avatar'}
                    initials={initials}
                    size="lg"
                    className="w-full h-full rounded-3xl"
                  />
                ) : (
                  <span className="font-serif font-black text-gold text-3xl lg:text-4xl select-none">
                    {initials}
                  </span>
                )}
              </div>
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold/60 shadow-sm shadow-gold/50" />
            </motion.div>
 
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <p className={cn('text-xs font-semibold uppercase tracking-[0.2em] mb-1', isLight ? 'text-gold' : 'text-gold/80')}>
                  Pustara Reader
                </p>
                <h1 className={cn('font-serif text-4xl lg:text-5xl font-black leading-none', tk.text)}>
                  {profile.name}
                </h1>
                {profile.username && (
                  <p className={cn('text-sm mt-1 font-mono', tk.muted)}>@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className={cn('text-sm mt-2 max-w-md leading-relaxed', tk.muted)}>{profile.bio}</p>
                )}
              </motion.div>
            </div>
 
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex-shrink-0"
            >
              <button
                onClick={handleFollow}
                disabled={loadingFollow || !user}
                className={cn(
                  'px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-60',
                  profile.is_following
                    ? isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
                    : 'bg-gold text-navy-900 hover:brightness-110 shadow-lg shadow-gold/20'
                )}
              >
                {user ? (
                  profile.is_following
                    ? <><UserCheck className="w-4 h-4" /> Mengikuti</>
                    : <><UserPlus  className="w-4 h-4" /> Ikuti</>
                ) : (
                  <Link href="/auth/login" className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Masuk untuk mengikuti
                  </Link>
                )}
              </button>
            </motion.div>
          </div>
 
          <div className="flex gap-2.5 mt-6 overflow-x-auto pb-1 scrollbar-hide">
            <StatPill icon={BookOpen}   value={totalRead}    label="Buku Dibaca" color="text-gold"        delay={0.18} isLight={isLight} />
            <StatPill icon={Flame}      value={streak}       label="Hari Streak" color="text-orange-400"  delay={0.22} isLight={isLight} tooltip={streakTooltip} />
            <StatPill icon={Heart}      value={likedCount}   label="Disukai"     color="text-rose-400"    delay={0.26} isLight={isLight} />
            <StatPill icon={Users}      value={followersNum} label="Pengikut"    color="text-blue-400"    delay={0.30} isLight={isLight} />
            <StatPill icon={BookMarked} value={followingNum} label="Mengikuti"   color="text-emerald-400" delay={0.34} isLight={isLight} />
          </div>
 
          <div className={cn('mt-6 h-px', isLight ? 'bg-parchment-darker' : 'bg-white/8')} />
        </motion.div>
 
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-6">
            {profile.currently_reading && profile.currently_reading.length > 0 && (
              <section>
                <SectionHeader icon={BookOpen} label="Sedang Dibaca" count={profile.currently_reading.length} isLight={isLight} />
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {profile.currently_reading.map((book, i: number) => (
                    <ReadingCard key={book.id} book={book as any} index={i} isLight={isLight} />
                  ))}
                </div>
              </section>
            )}
 
            {profile.liked_books && profile.liked_books.length > 0 && (
              <section>
                <SectionHeader icon={Heart} label="Buku Disukai" count={profile.liked_books.length} isLight={isLight} />
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mt-3">
                  {profile.liked_books.slice(0, 18).map((book, i: number) => (
                    <BookPosterCard key={book.id} book={book as any} index={i} isLight={isLight} />
                  ))}
                </div>
                {profile.liked_books.length > 18 && (
                  <p className={cn('text-xs mt-2', tk.muted)}>
                    +{profile.liked_books.length - 18} buku lainnya
                  </p>
                )}
              </section>
            )}
 
            {(!profile.currently_reading || profile.currently_reading.length === 0) &&
             (!profile.liked_books       || profile.liked_books.length === 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn('rounded-3xl border p-12 text-center', tk.card)}
              >
                <BookOpen className={cn('w-10 h-10 mx-auto mb-3 opacity-20', tk.text)} />
                <p className={cn('text-sm', tk.muted)}>Belum ada aktivitas baca yang tersedia.</p>
              </motion.div>
            )}
          </div>
 
          <div className="flex flex-col gap-5">
            {genreStats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className={cn('rounded-3xl border p-5', tk.card)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  <h2 className={cn('font-serif text-base font-bold', tk.text)}>Genre Favorit</h2>
                </div>
                <div className="flex flex-col gap-2.5">
                  {genreStats.map((g, i) => (
                    <GenreBar
                      key={g.genre}
                      genre={g.genre}
                      pct={g.pct}
                      count={g.count}
                      index={i}
                      isLight={isLight}
                    />
                  ))}
                </div>
              </motion.div>
            )}
 
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className={cn('rounded-3xl border p-5', tk.card)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gold" />
                  <h2 className={cn('font-serif text-base font-bold', tk.text)}>Pembaca Lainnya</h2>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.slice(0, 5).map((item, i) => (
                    <SuggestionRow key={item.id} user={item} index={i} isLight={isLight} tk={tk} />
                  ))}
                </div>
              </motion.div>
            )}
 
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className={cn('rounded-3xl border p-5', tk.card)}
            >
              <h2 className={cn('font-serif text-base font-bold mb-3', tk.text)}>Info</h2>
              <div className="flex flex-col gap-2.5">
                <InfoRow label="Buku Dibaca" value={String(totalRead)}    isLight={isLight} />
                <InfoRow label="Pengikut"    value={String(followersNum)} isLight={isLight} />
                <InfoRow label="Mengikuti"   value={String(followingNum)} isLight={isLight} />
                {streak > 0 && (
                  <InfoRow label="Streak Baca" value={`${streak} hari 🔥`} isLight={isLight} />
                )}
                {profile.preferred_genres && profile.preferred_genres.length > 0 && (
                  <div>
                    <p className={cn('text-xs mb-1.5', tk.muted)}>Genre Pilihan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.preferred_genres.filter((g: string) => g && g !== '__SKIPPED__').length > 0 ? (
                        profile.preferred_genres.filter((g: string) => g && g !== '__SKIPPED__').slice(0, 6).map((g: string) => (
                        <span key={g} className={cn('px-2 py-0.5 rounded-xl border text-[10px] font-medium', tk.chip)}>
                          {g}
                        </span>
                        ))
                      ) : (
                        <span className={cn('text-[10px]', tk.muted)}>belum ada preferensi</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
 
function SectionHeader({
  icon: Icon,
  label,
  count,
  isLight,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  isLight: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-center gap-2"
    >
      <Icon className="w-4 h-4 text-gold" />
      <h2 className={cn('font-serif text-lg font-bold', isLight ? 'text-navy-900' : 'text-white')}>
        {label}
      </h2>
      {count !== undefined && (
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-semibold ml-1',
          isLight ? 'bg-parchment text-slate-500' : 'bg-white/8 text-slate-400'
        )}>
          {count}
        </span>
      )}
      <div className={cn('flex-1 h-px ml-1', isLight ? 'bg-parchment-darker' : 'bg-white/8')} />
    </motion.div>
  );
}
 
function InfoRow({
  label,
  value,
  isLight,
}: {
  label: string;
  value: string;
  isLight: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-xs', isLight ? 'text-slate-500' : 'text-slate-400')}>{label}</span>
      <span className={cn('text-xs font-semibold', isLight ? 'text-navy-900' : 'text-white')}>{value}</span>
    </div>
  );
}
 
function SuggestionRow({
  user,
  index,
  isLight,
  tk,
}: {
  user: RecommendedUser;
  index: number;
  isLight: boolean;
  tk: Record<string, string>;
}) {
  const name     = user.display_name?.trim() || user.name?.trim() || user.username?.trim() || 'Pustara User';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
 
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.04 }}
    >
      <Link href={`/profile/@${user.username || user.id}`}>
        <div className={cn(
          'flex items-center gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer',
          isLight ? 'hover:bg-parchment' : 'hover:bg-white/5'
        )}>
          <AvatarImage
            src={user.avatar_url}
            alt={name}
            initials={initials}
            size="md"
            className="w-8 h-8"
          />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold truncate', tk.text)}>{name}</p>
            <p className={cn('text-xs', tk.muted)}>
              {user.followers_count ?? 0} pengikut · {user.total_read ?? 0} buku
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}