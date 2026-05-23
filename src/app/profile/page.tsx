'use client';
import { useState, useEffect, useRef } from 'react';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  BookOpen, Star, Flame, TrendingUp, Heart,
  CheckCircle, Edit3, X, Check,
  UserPlus, BookMarked, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import AvatarImage from '@/components/shared/AvatarImage';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import AvatarUploadDialog from '@/components/profile/AvatarUploadDialog';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import FollowingModal from '@/components/shared/FollowingModal';
import {
  getMyFollowersUsers,
  getMyFollowingUsers,
  getMyProfile,
  getRecommendedUsers,
  toggleFollowUser,
  updateMyProfile,
} from '@/lib/users';
import { fetchShelfData } from '@/lib/shelf';
import { formatRelativeTime } from '@/lib/reading';
import type { RecommendedUser } from '@/types/user';
import { getMySurvey, saveSurvey } from '@/lib/survey';
import { GENRE_OPTIONS } from '@/lib/genreOptions';

const coverSrc = (coverId?: number, coverUrl?: string) =>
  coverUrl || (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null);

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

type ActivityItem = {
  type: 'selesai' | 'pinjam' | 'wishlist' | 'review' | 'follow';
  book: string;
  author: string;
  coverId?: number;
  coverUrl?: string;
  key: string;
  rating: number | null;
  time: string;
  // for 'follow' type
  followName?: string;
};

type FollowingPreviewItem = {
  id: string;
  username: string | null;
  name: string;
  avatar_url: string | null;
  books: number;
};

type ProfileStatItem = {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  tooltip?: string;
};

function StatCard({
  stat,
  index,
  isLight,
  textClass,
  mutedClass,
}: {
  stat: ProfileStatItem;
  index: number;
  isLight: boolean;
  textClass: string;
  mutedClass: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; placement: 'top' | 'bottom' } | null>(null);

  const showTooltip = () => {
    if (!stat.tooltip || !ref.current || typeof window === 'undefined') return;
    const rect = ref.current.getBoundingClientRect();
    const tooltipWidth = 208;
    const tooltipHeight = 112;
    const margin = 12;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipWidth / 2 + margin),
      window.innerWidth - tooltipWidth / 2 - margin
    );
    const hasRoomBelow = rect.bottom + tooltipHeight + margin < window.innerHeight;
    setTooltipPos({
      left,
      top: hasRoomBelow ? rect.bottom + 10 : rect.top - 10,
      placement: hasRoomBelow ? 'bottom' : 'top',
    });
  };

  const hideTooltip = () => setTooltipPos(null);

  useEffect(() => {
    if (!tooltipPos) return;
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, [tooltipPos]);

  return (
    <motion.div
      ref={ref}
      tabIndex={stat.tooltip ? 0 : undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onClick={() => stat.tooltip && (tooltipPos ? hideTooltip() : showTooltip())}
      className={cn(
        'relative z-10 rounded-2xl p-3.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        isLight ? 'bg-parchment' : 'bg-navy-700/40'
      )}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.08 + index * 0.04 }}
    >
      <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
      <p className={cn('font-serif font-black text-2xl', textClass)}>
        {stat.value}
        {stat.suffix && <span className={cn('text-sm font-sans font-normal ml-0.5', mutedClass)}>{stat.suffix}</span>}
      </p>
      <p className={cn('text-[11px] mt-0.5', mutedClass)}>{stat.label}</p>
      {stat.tooltip && tooltipPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[120] w-52 rounded-2xl border border-gold/20 bg-[rgba(8,15,26,0.97)] px-3 py-2 text-left text-[11px] leading-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)] whitespace-pre-line"
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: tooltipPos.placement === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
              }}
            >
              {stat.tooltip}
            </div>,
            document.body
          )
        : null}
    </motion.div>
  );
}

export default function ProfilePage() {
  const { theme } = useTheme();
  const { user }  = useAuthStore();
  const isLight   = theme === 'light';

  const [editing,   setEditing]   = useState(false);
  const [name,      setName]      = useState('');
  const [bio,       setBio]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [draftName, setDraftName] = useState('');
  const [draftBio,  setDraftBio]  = useState('');
  const [saving, setSaving] = useState(false);
  const [profileCounts, setProfileCounts] = useState({ followers: 0, following: 0, wishlist: 0 });
  const [borrowedCount, setBorrowedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [followingPreview, setFollowingPreview] = useState<FollowingPreviewItem[]>([]);
  const [followingUsers, setFollowingUsers] = useState<RecommendedUser[]>([]);
  const [followerUsers, setFollowerUsers] = useState<RecommendedUser[]>([]);
  const [suggestionUsers, setSuggestionUsers] = useState<RecommendedUser[]>([]);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ProfileStatItem[]>([
    { label: 'Buku Dibaca', value: 0, icon: BookOpen, color: 'text-gold' },
    { label: 'Streak', value: '0', suffix: 'hari', icon: Flame, color: 'text-orange-400' },
    { label: 'Ulasan', value: 0, icon: Star, color: 'text-blue-400' },
    { label: 'Wishlist', value: 0, icon: Heart, color: 'text-rose-400' },
  ]);
  const [genreStats, setGenreStats] = useState<Array<{ genre: string; count: number; pct: number }>>([]);
  const [surveyEditing, setSurveyEditing] = useState(false);
  const [surveySaving, setSurveySaving] = useState(false);
  const [surveyGender, setSurveyGender] = useState('');
  const [surveyAge, setSurveyAge] = useState('');
  const [surveyGenres, setSurveyGenres] = useState<string[]>([]);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);

  const genderOptions = ['Laki-Laki', 'Perempuan', 'Tidak ingin diketahui'];
  const ageOptions = ['< 20 Tahun', '21 - 30 Tahun', '31 - 40 Tahun', '> 40 Tahun'];

  // Modal state — which tab to open
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTab,  setModalTab]        = useState<'following' | 'followers' | 'suggestions'>('following');

  function openModal(tab: 'following' | 'followers' | 'suggestions') {
    setModalTab(tab);
    setModalOpen(true);
  }

  useEffect(() => { document.title = 'Pustara | Profil'; }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      getMyProfile(),
      fetchShelfData(),
      getMySurvey(),
      getRecommendedUsers(3),
      getMyFollowingUsers(30),
      getMyFollowersUsers(30),
    ])
      .then(([profile, shelf, survey, suggestions, following, followers]) => {
        if (!active || !profile) return;

        const resolvedName = String(profile.name ?? profile.username ?? '').trim();
        const resolvedBio = String(profile.bio ?? '').trim();
        setName(resolvedName);
        setDraftName(resolvedName);
        setBio(resolvedBio);
        setDraftBio(resolvedBio);
        console.log('[DEBUG] profile page fetched profile:', { avatar_url: profile.avatar_url });
        setAvatarUrl(profile.avatar_url || null);
        console.log('[DEBUG] profile page set avatarUrl to:', profile.avatar_url || null);

        setProfileCounts({
          followers: Number(profile.followers_count ?? 0),
          following: Number(profile.following_count ?? 0),
          wishlist: Number(profile.liked_books?.length ?? 0),
        });
        setProfileUsername(profile.username || '');
        setProfileCreatedAt(profile.created_at || null);

        // "Buku Dibaca" = books currently being read (sedang dibaca tab in /shelf)
        const currentlyReadingCount = shelf.dibaca.length;
        const streak = Math.max(0, Number(profile.reading_streak ?? 0));
        const ulasan = Number(profile.stats?.reviews_written ?? 0);
        const streakTooltip = profile.streak_is_active
          ? [`Streak aktif: ${streak} hari`, `Mulai: ${formatTooltipDay(profile.streak_last_start_day)}`, `Aktif terakhir: ${formatTooltipDay(profile.streak_last_end_day)}`].join('\n')
          : [`Streak terakhir: ${profile.streak_last_length ?? streak} hari`, `Berakhir: ${formatTooltipDay(profile.streak_last_end_day)}`, `Reset: ${formatTooltipDay(profile.streak_reset_day)}`].join('\n');

        setStats([
          { label: 'Buku Dibaca', value: currentlyReadingCount, icon: BookOpen, color: 'text-gold' },
          { label: 'Streak', value: String(streak), suffix: 'hari', icon: Flame, color: 'text-orange-400', tooltip: streakTooltip },
          { label: 'Ulasan', value: ulasan, icon: Star, color: 'text-blue-400' },
          { label: 'Wishlist', value: Number(profile.liked_books?.length ?? 0), icon: Heart, color: 'text-rose-400' },
        ]);

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
          setGenreStats(backendGenreStats);
        } else {
          const allGenres = [
            ...(profile.currently_reading ?? []).flatMap((book) => Array.isArray(book.genres) ? book.genres : []),
            ...(profile.liked_books ?? []).flatMap((book) => Array.isArray(book.genres) ? book.genres : []),
          ]
            .map((genre) => String(genre).trim())
            .filter(Boolean);

          setGenreStats(buildGenreStatsFromGenres(allGenres, 5));
        }

        if (survey) {
          setSurveyGender(survey.gender || '');
          setSurveyAge(survey.age || '');
          setSurveyGenres(
            (survey.favoriteGenre || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          );
        }

        // Aktivitas Terbaru:
        //   - "Selesai membaca" = buku yang SUDAH dikembalikan (riwayat)
        //   - "Meminjam"        = buku yang MASIH dipinjam (pinjaman aktif),
        //                         tidak muncul jika buku tsb sudah ada di riwayat
        //   - "Wishlist"        = buku yang disimpan ke wishlist
        // Tidak ada duplikat — setiap buku hanya muncul sekali.

        const riwayatItems: ActivityItem[] = shelf.riwayat.slice(0, 4).map((r) => ({
          type: 'selesai' as const,
          book: r.title,
          author: r.author,
          key: r.key,
          coverUrl: r.coverUrl,
          rating: null,
          time: r.returnedAt || 'Baru saja',
        }));

        // Book IDs already covered by riwayat — exclude them from pinjaman
        const riwayatBookKeys = new Set(shelf.riwayat.map((r) => r.key));

        const pinjamanItems: ActivityItem[] = shelf.pinjaman
          .filter((p) => !riwayatBookKeys.has(p.key))
          .slice(0, 2)
          .map((p) => ({
            type: 'pinjam' as const,
            book: p.title,
            author: p.author,
            key: p.key,
            coverUrl: p.coverUrl,
            rating: null,
            time: p.borrowedAt || 'Baru saja',
          }));

        const wishlistItems: ActivityItem[] = (profile.liked_books ?? []).slice(0, 2).map((book) => ({
          type: 'wishlist' as const,
          book: book.title,
          author: Array.isArray(book.authors) ? String(book.authors[0] ?? 'Unknown Author') : 'Unknown Author',
          key: book.id,
          coverUrl: book.cover_url || undefined,
          rating: null,
          time: formatRelativeTime(book.liked_at ?? undefined),
        }));

        // Merge: riwayat first (most meaningful), then active borrows, then wishlist
        const liveRecent: ActivityItem[] = [
          ...riwayatItems,
          ...pinjamanItems,
          ...wishlistItems,
        ].slice(0, 6);

        setRecentActivity(liveRecent);

        setFollowingPreview(
          following.slice(0, 4).map((item) => {
            const displayName = item.display_name?.trim() || item.name?.trim() || item.username?.trim() || 'Pustara User';
            return {
              id: item.id,
              username: item.username ?? null,
              name: displayName,
              avatar_url: item.avatar_url || null,
              books: Number(item.total_read ?? 0) || Number(item.reviews_written ?? 0),
            };
          })
        );

        setFollowingUsers(following);
        setFollowerUsers(followers);
        setSuggestionUsers(suggestions);
      })
      .catch(() => {
        // keep local fallback
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const safeName = name.trim();
  const initials = safeName
    ? safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '';
  const profileMetaLine = [
    profileUsername ? `@${profileUsername}` : '',
    user?.email || '',
    profileCreatedAt
      ? `Bergabung ${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(profileCreatedAt))}`
      : '',
  ].filter(Boolean).join(' · ');

  if (profileLoading) {
    return <PageSkeleton />;
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);

    try {
      const updated = await updateMyProfile({
        name: draftName,
        bio: draftBio,
      });

      const finalName = updated?.name || draftName;

      if (auth?.currentUser && finalName) {
        try {
          await updateFirebaseProfile(auth.currentUser, { displayName: finalName });
        } catch (error) {
          console.warn('[profile] update Firebase Auth displayName gagal:', error);
        }
      }

      if (updated) {
        setName(finalName);
        setBio(updated.bio || draftBio);
        setDraftName(finalName);
        setDraftBio(updated.bio || draftBio);
      } else {
        setName(draftName);
        setBio(draftBio);
      }

      setEditing(false);
    } finally {
      setSaving(false);
    }
  }
  function cancelEdit() { setDraftName(name); setDraftBio(bio); setEditing(false); }

  async function handleFollowToggle(user: RecommendedUser) {
    if (followLoadingIds.has(user.id)) return;

    const action = user.is_following ? 'unfollow' : 'follow';
    setFollowLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(user.id);
      return next;
    });

    try {
      const result = await toggleFollowUser(user.id, action);
      if (!result) return;

      setSuggestionUsers((prev) => prev.map((item) => {
        if (item.id !== user.id) return item;
        return {
          ...item,
          is_following: result.is_following,
          followers_count: result.target_followers_count,
        };
      }));

      setFollowerUsers((prev) => prev.map((item) => {
        if (item.id !== user.id) return item;
        return {
          ...item,
          is_following: result.is_following,
          followers_count: result.target_followers_count,
        };
      }));

      setFollowingUsers((prev) => {
        const exists = prev.some((item) => item.id === user.id);
        if (result.is_following) {
          if (exists) {
            return prev.map((item) => item.id === user.id ? { ...item, is_following: true } : item);
          }
          return [{ ...user, is_following: true, followers_count: result.target_followers_count }, ...prev];
        }
        return prev.filter((item) => item.id !== user.id);
      });

      setProfileCounts((prev) => ({
        ...prev,
        following: Math.max(0, prev.following + (result.is_following ? 1 : -1)),
      }));
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }

  async function saveSurveyPreferences() {
    if (surveySaving) return;
    setSurveySaving(true);
    try {
      const payload = {
        gender: surveyGender || null,
        age: surveyAge || null,
        favoriteGenre: surveyGenres.length > 0 ? surveyGenres.join(',') : null,
      };

      const result = await saveSurvey(payload);
      if (!result.success) return;

      await updateMyProfile({ preferred_genres: surveyGenres });
      setSurveyEditing(false);
    } finally {
      setSurveySaving(false);
    }
  }

  function toggleSurveyGenre(genre: string) {
    setSurveyGenres((current) => (
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre]
    ));
  }

  const tk = {
    surface:  isLight ? 'bg-white border-parchment-darker'     : 'bg-navy-800/50 border-white/8',
    text:     isLight ? 'text-navy-900'                         : 'text-white',
    muted:    isLight ? 'text-slate-500'                        : 'text-slate-400',
    input:    isLight
      ? 'bg-slate-50 border-slate-200 text-navy-900 focus:border-navy-400'
      : 'bg-navy-700/60 border-white/10 text-white focus:border-gold/50',
    chip:     isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/10 text-white/60',
    chipActive: isLight ? 'bg-navy-700 border-navy-700 text-white shadow-md shadow-navy-700/15' : 'bg-gold/15 border-gold/50 text-gold',
    chipInactive: isLight ? 'bg-white border-slate-200 text-slate-700 hover:border-navy-300 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20 hover:bg-white/8',
    hover:    isLight ? 'hover:bg-parchment' : 'hover:bg-white/5',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* ── PROFILE HEADER ── */}
        <motion.div className={cn('rounded-3xl border p-6 mb-5 relative overflow-visible z-20', tk.surface)}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row gap-5 items-start">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/30 flex items-center justify-center shadow-lg overflow-hidden">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt="Your avatar"
                    initials={initials}
                    size="lg"
                    className="w-full h-full rounded-2xl"
                  />
                ) : (
                  <span className="font-serif font-black text-gold text-2xl lg:text-3xl">{initials}</span>
                )}
              </div>
              {editing && (
                <button 
                  onClick={() => setUploadDialogOpen(true)}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-gold text-navy-900 flex items-center justify-center shadow-md hover:bg-gold-light transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col gap-2.5">
                    <input value={draftName} onChange={e => setDraftName(e.target.value)}
                      className={cn('w-full max-w-xs px-3 py-2 rounded-xl border text-sm font-semibold outline-none transition-all', tk.input)} />
                    <textarea value={draftBio} onChange={e => setDraftBio(e.target.value)} rows={2}
                      className={cn('w-full max-w-md px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all', tk.input)} />
                    <div className="flex gap-2">
                      <button onClick={saveEdit}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-colors">
                        <Check className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={cancelEdit}
                        className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-medium transition-colors', tk.chip)}>
                        <X className="w-3.5 h-3.5" /> Batal
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start gap-3 flex-wrap">
                      {safeName ? (
                        <h1 className={cn('font-serif text-2xl lg:text-3xl font-black', tk.text)}>{safeName}</h1>
                      ) : null}
                      <button onClick={() => setEditing(true)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all mt-1', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                        <Edit3 className="w-3 h-3" /> Edit Profil
                      </button>
                    </div>
                    {bio ? <p className={cn('text-sm mt-1 max-w-md', tk.muted)}>{bio}</p> : null}
                    {profileMetaLine ? <p className={cn('text-xs mt-2', tk.muted)}>{profileMetaLine}</p> : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Follow counts — clickable, opens modal */}
            <div className="flex gap-5 flex-shrink-0">
              {([
                { val: String(profileCounts.following), lbl: 'Mengikuti', tab: 'following' },
                { val: String(profileCounts.followers), lbl: 'Pengikut',  tab: 'followers' },
              ] as const).map(({ val, lbl, tab }) => (
                <button key={lbl} onClick={() => openModal(tab)}
                  className="text-center group">
                  <p className={cn('font-serif text-xl font-black group-hover:text-gold transition-colors', tk.text)}>{val}</p>
                  <p className={cn('text-xs', tk.muted)}>{lbl}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── AVATAR UPLOAD DIALOG ── */}
        {uploadDialogOpen && user?.uid && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setUploadDialogOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              className={cn(
                'relative rounded-2xl p-6 max-w-sm w-full mx-4',
                isLight ? 'bg-white' : 'bg-navy-800 border border-white/10'
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn('font-serif text-lg font-bold', isLight ? 'text-navy-900' : 'text-white')}>
                  Ubah Avatar
                </h3>
                <button
                  onClick={() => setUploadDialogOpen(false)}
                  className={cn(
                    'p-1 rounded-lg transition-colors',
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload component */}
              <AvatarUploadDialog
                userId={user.uid}
                onUploadSuccess={(newUrl) => {
                  setAvatarUrl(newUrl);
                  setUploadDialogOpen(false);
                }}
                isLight={isLight}
              />
            </motion.div>
          </motion.div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-5">

          {/* LEFT */}
          <div className="flex flex-col gap-5">

            {/* Stats */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Statistik Baca</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((s, i) => (
                  <StatCard
                    key={s.label}
                    stat={s}
                    index={i}
                    isLight={isLight}
                    textClass={tk.text}
                    mutedClass={tk.muted}
                  />
                ))}
              </div>

              <div className="mt-5">
                <p className={cn('text-xs font-semibold uppercase tracking-widest mb-3', tk.muted)}>Genre Favorit</p>
                <div className="flex flex-col gap-2">
                  {genreStats.map((g, i) => (
                    <div key={g.genre} className="flex items-center gap-3">
                      <span className={cn('text-xs w-20 flex-shrink-0', tk.text)}>{g.genre}</span>
                      <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                        <motion.div className="h-full bg-gold rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${Math.max(g.pct, 8)}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }} />
                      </div>
                      <span className={cn('text-xs w-10 text-right flex-shrink-0 tabular-nums', tk.muted)}>{g.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Survey preferences editor */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Preferensi Rekomendasi</h2>
                {!surveyEditing ? (
                  <button
                    onClick={() => setSurveyEditing(true)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                    <Edit3 className="w-3 h-3" /> Edit Minat
                  </button>
                ) : (
                  <button
                    onClick={() => setSurveyEditing(false)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all', tk.chip)}>
                    <X className="w-3 h-3" /> Tutup
                  </button>
                )}
              </div>

              {surveyEditing ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className={cn('text-xs mb-1.5', tk.muted)}>Jenis Kelamin</p>
                    <select
                      value={surveyGender}
                      onChange={(e) => setSurveyGender(e.target.value)}
                      className={cn('w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all', tk.input)}
                    >
                      <option value="">Pilih</option>
                      {genderOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className={cn('text-xs mb-1.5', tk.muted)}>Rentang Umur</p>
                    <select
                      value={surveyAge}
                      onChange={(e) => setSurveyAge(e.target.value)}
                      className={cn('w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all', tk.input)}
                    >
                      <option value="">Pilih</option>
                      {ageOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className={cn('text-xs mb-1.5', tk.muted)}>Genre Favorit</p>
                    <p className={cn('text-[11px] mb-2', tk.muted)}>
                      Pilih genre yang kamu suka. Klik lagi untuk membatalkan pilihan.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {GENRE_OPTIONS.map((genre) => {
                        const selected = surveyGenres.includes(genre.label);
                        return (
                          <motion.button
                            key={genre.label}
                            type="button"
                            onClick={() => toggleSurveyGenre(genre.label)}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                              selected ? tk.chipActive : tk.chipInactive
                            )}
                          >
                            <span className="text-base leading-none">{genre.emoji}</span>
                            <span className="truncate">{genre.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={saveSurveyPreferences}
                      disabled={surveySaving}
                      className="px-4 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light disabled:opacity-60 transition-colors"
                    >
                      {surveySaving ? 'Menyimpan...' : 'Simpan Preferensi'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {surveyGender && (
                    <span className={cn('px-2.5 py-1 rounded-xl border text-xs', tk.chip)}>
                      Gender: {surveyGender === '__SKIPPED__' ? 'belum ada preferensi' : surveyGender}
                    </span>
                  )}
                  {surveyAge && (
                    <span className={cn('px-2.5 py-1 rounded-xl border text-xs', tk.chip)}>
                      Umur: {surveyAge === '__SKIPPED__' ? 'belum ada preferensi' : surveyAge}
                    </span>
                  )}
                  {surveyGenres.slice(0, 8).map((genre) => (
                    <span key={genre} className={cn('px-2.5 py-1 rounded-xl border text-xs', tk.chip)}>
                      {genre === '__SKIPPED__' ? 'belum ada preferensi' : genre}
                    </span>
                  ))}
                  {!surveyGender && !surveyAge && surveyGenres.length === 0 && (
                    <p className={cn('text-xs', tk.muted)}>Belum ada preferensi tersimpan.</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Recent activity */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Aktivitas Terbaru</h2>
              <div className="flex flex-col gap-1">
                {recentActivity.map((a, i) => {
                  const src = coverSrc(a.coverId, a.coverUrl);
                  const ActIcon =
                    a.type === 'selesai' ? CheckCircle
                    : a.type === 'pinjam' ? BookOpen
                    : a.type === 'review' ? Star
                    : a.type === 'follow' ? UserPlus
                    : Heart;
                  const actColor =
                    a.type === 'selesai' ? 'text-emerald-400'
                    : a.type === 'pinjam' ? 'text-blue-400'
                    : a.type === 'review' ? 'text-yellow-400'
                    : a.type === 'follow' ? 'text-purple-400'
                    : 'text-rose-400';
                  const actLabel =
                    a.type === 'selesai' ? 'Selesai membaca'
                    : a.type === 'pinjam' ? 'Meminjam'
                    : a.type === 'review' ? 'Menulis ulasan'
                    : a.type === 'follow' ? 'Mengikuti'
                    : 'Menyimpan ke wishlist';
                  return (
                    <motion.div key={i}
                      className={cn('flex items-center gap-3 p-3 rounded-2xl transition-colors', tk.hover)}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.04 }}>
                      <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0', isLight ? 'bg-parchment-darker' : 'bg-navy-700/60')}>
                        <ActIcon className={cn('w-3.5 h-3.5', actColor)} />
                      </div>
                      <Link href={`/book/${a.key}`} className="flex-shrink-0">
                        <div className="w-8 h-12 rounded-lg overflow-hidden shadow">
                          {src && <img src={src} alt={a.book} className="w-full h-full object-cover" />}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs', tk.muted)}>{actLabel}</p>
                        <Link href={`/book/${a.key}`}>
                          <p className={cn('text-sm font-semibold leading-tight line-clamp-1 hover:text-gold transition-colors', tk.text)}>{a.book}</p>
                        </Link>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {a.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={cn('w-2.5 h-2.5', s <= a.rating! ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                            ))}
                          </div>
                        )}
                        <p className={cn('text-[10px]', tk.muted)}>{a.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex flex-col gap-5 mt-5 lg:mt-0">

            {/* Following preview */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn('font-serif text-lg font-bold', tk.text)}>Mengikuti</h2>
                <button onClick={() => openModal('following')}
                  className="text-gold text-xs font-semibold hover:underline">
                  Lihat semua
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {followingPreview.map((f, i) => (
                  <motion.div key={f.id} className="flex items-center gap-3"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 + i * 0.04 }}>
                    <AvatarImage
                      src={f.avatar_url}
                      alt={f.name}
                      initials={f.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      size="md"
                      className="w-9 h-9"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', tk.text)}>{f.name}</p>
                      <p className={cn('text-xs', tk.muted)}>{f.books} buku dibaca</p>
                    </div>
                    <Link
                      href={`/profile/@${f.username || f.id}`}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                      Profil
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Find friends */}
              <button
                onClick={() => openModal('suggestions')}
                className={cn('w-full mt-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                <UserPlus className="w-3.5 h-3.5" /> Temukan Teman Baca
              </button>
            </motion.div>

            {/* Quick links */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Pintasan</h2>
              <div className="flex flex-col gap-1.5">
                {[
                  { href: '/shelf',    icon: BookMarked,  label: 'Rak Buku',     sub: `${borrowedCount} buku`    },
                  { href: '/browse',   icon: TrendingUp,  label: 'Eksplor Buku', sub: 'Temukan bacaan baru'     },
                  { href: '/settings', icon: Edit3,       label: 'Pengaturan',   sub: 'Tema & preferensi'       },
                ].map(item => (
                  <Link key={item.href} href={item.href}>
                    <div className={cn('flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors cursor-pointer', tk.hover)}>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', isLight ? 'bg-parchment-darker' : 'bg-navy-700/60')}>
                        <item.icon className="w-4 h-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', tk.text)}>{item.label}</p>
                        <p className={cn('text-xs', tk.muted)}>{item.sub}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Following modal */}
      <FollowingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
        followingUsers={followingUsers}
        followerUsers={followerUsers}
        suggestionUsers={suggestionUsers}
        loadingIds={followLoadingIds}
        onToggleFollow={handleFollowToggle}
      />
    </div>
  );
}
