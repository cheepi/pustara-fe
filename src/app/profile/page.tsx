'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Star, Flame, TrendingUp, Heart,
  CheckCircle, Edit3, X, Check,
  UserPlus, BookMarked, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
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
import { formatRelativeTime, getMyReadingSessions } from '@/lib/reading';
import type { RecommendedUser } from '@/types/user';

const coverSrc = (coverId?: number, coverUrl?: string) =>
  coverUrl || (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null);

type ActivityItem = {
  type: 'selesai' | 'pinjam' | 'wishlist';
  book: string;
  author: string;
  coverId?: number;
  coverUrl?: string;
  key: string;
  rating: number | null;
  time: string;
};

type FollowingPreviewItem = {
  id: string;
  name: string;
  avatar: string;
  books: number;
};

export default function ProfilePage() {
  const { theme } = useTheme();
  const { user }  = useAuthStore();
  const isLight   = theme === 'light';

  const [editing,   setEditing]   = useState(false);
  const [name,      setName]      = useState(user?.displayName || 'Pembaca Pustara');
  const [bio,       setBio]       = useState('Pecinta sastra Indonesia 📚 | Membaca adalah perjalanan tanpa batas.');
  const [draftName, setDraftName] = useState(name);
  const [draftBio,  setDraftBio]  = useState(bio);
  const [saving, setSaving] = useState(false);
  const [profileCounts, setProfileCounts] = useState({ followers: 0, following: 0, wishlist: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [followingPreview, setFollowingPreview] = useState<FollowingPreviewItem[]>([]);
  const [followingUsers, setFollowingUsers] = useState<RecommendedUser[]>([]);
  const [followerUsers, setFollowerUsers] = useState<RecommendedUser[]>([]);
  const [suggestionUsers, setSuggestionUsers] = useState<RecommendedUser[]>([]);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState([
    { label: 'Buku Dibaca', value: 0, icon: BookOpen, color: 'text-gold' },
    { label: 'Streak', value: '0', suffix: 'hari', icon: Flame, color: 'text-orange-400' },
    { label: 'Ulasan', value: 0, icon: Star, color: 'text-blue-400' },
    { label: 'Wishlist', value: 0, icon: Heart, color: 'text-rose-400' },
  ]);
  const [genreStats, setGenreStats] = useState<Array<{ genre: string; count: number; pct: number }>>([]);

  // Modal state — which tab to open
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTab,  setModalTab]        = useState<'following' | 'followers' | 'suggestions'>('following');

  function openModal(tab: 'following' | 'followers' | 'suggestions') {
    setModalTab(tab);
    setModalOpen(true);
  }

  useEffect(() => { document.title = 'Pustara | Profil'; }, []);
  useEffect(() => {
    setName(user?.displayName || 'Pembaca Pustara');
    setDraftName(user?.displayName || 'Pembaca Pustara');
  }, [user]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getMyProfile(),
      getMyReadingSessions('reading', 20),
      getMyReadingSessions('finished', 20),
      getRecommendedUsers(3),
      getMyFollowingUsers(30),
      getMyFollowersUsers(30),
    ])
      .then(([profile, readingNow, finished, suggestions, following, followers]) => {
        if (!active || !profile) return;

        setName(profile.name || 'Pembaca Pustara');
        setDraftName(profile.name || 'Pembaca Pustara');
        setBio(profile.bio || 'Pecinta sastra Indonesia 📚 | Membaca adalah perjalanan tanpa batas.');
        setDraftBio(profile.bio || 'Pecinta sastra Indonesia 📚 | Membaca adalah perjalanan tanpa batas.');

        setProfileCounts({
          followers: Number(profile.followers_count ?? 0),
          following: Number(profile.following_count ?? 0),
          wishlist: Number(profile.liked_books?.length ?? 0),
        });

        const finishedCount = Math.max(Number(profile.total_read ?? 0), finished.length);
        const streak = Math.max(0, Number(profile.reading_streak ?? 0));
        const ulasan = finishedCount;

        setStats([
          { label: 'Buku Dibaca', value: finishedCount, icon: BookOpen, color: 'text-gold' },
          { label: 'Streak', value: String(streak), suffix: 'hari', icon: Flame, color: 'text-orange-400' },
          { label: 'Ulasan', value: ulasan, icon: Star, color: 'text-blue-400' },
          { label: 'Wishlist', value: Number(profile.liked_books?.length ?? 0), icon: Heart, color: 'text-rose-400' },
        ]);

        const allGenres = [
          ...(profile.currently_reading ?? []).flatMap((book) => Array.isArray(book.genres) ? book.genres : []),
          ...(profile.liked_books ?? []).flatMap((book) => Array.isArray(book.genres) ? book.genres : []),
        ]
          .map((genre) => String(genre).trim())
          .filter(Boolean);

        const genreMap = new Map<string, number>();
        for (const genre of allGenres) {
          genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1);
        }

        const totalGenres = allGenres.length || 1;
        const topGenres = Array.from(genreMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([genre, count]) => ({
            genre,
            count,
            pct: Math.max(4, Math.round((count / totalGenres) * 100)),
          }));

        setGenreStats(topGenres);

        const liveRecent: ActivityItem[] = [
          ...readingNow.slice(0, 2).map((session) => ({
            type: 'pinjam' as const,
            book: session.title,
            author: session.authors,
            key: session.book_id,
            coverUrl: session.cover_url,
            rating: null,
            time: formatRelativeTime(session.last_read_at || session.started_at),
          })),
          ...finished.slice(0, 3).map((session) => ({
            type: 'selesai' as const,
            book: session.title,
            author: session.authors,
            key: session.book_id,
            coverUrl: session.cover_url,
            rating: null,
            time: formatRelativeTime(session.finished_at || session.last_read_at),
          })),
          ...(profile.liked_books ?? []).slice(0, 2).map((book) => ({
            type: 'wishlist' as const,
            book: book.title,
            author: Array.isArray(book.authors) ? String(book.authors[0] ?? 'Unknown Author') : 'Unknown Author',
            key: book.id,
            coverUrl: book.cover_url || undefined,
            rating: null,
            time: formatRelativeTime(book.liked_at ?? undefined),
          })),
        ].slice(0, 6);

        setRecentActivity(liveRecent);

        setFollowingPreview(
          following.slice(0, 4).map((item) => {
            const displayName = item.display_name?.trim() || item.name?.trim() || item.username?.trim() || 'Pustara User';
            return {
              id: item.id,
              name: displayName,
              avatar: displayName.charAt(0).toUpperCase() || 'P',
              books: Number(item.total_read ?? 0),
            };
          })
        );

        setFollowingUsers(following);
        setFollowerUsers(followers);
        setSuggestionUsers(suggestions);
      })
      .catch(() => {
        // keep local fallback
      });

    return () => {
      active = false;
    };
  }, []);

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const email    = user?.email || 'user@email.com';
  const joinDate = 'Bergabung Maret 2026';

  async function saveEdit() {
    if (saving) return;
    setSaving(true);

    try {
      const updated = await updateMyProfile({
        name: draftName,
        bio: draftBio,
      });

      if (updated) {
        setName(updated.name || draftName);
        setBio(updated.bio || draftBio);
        setDraftName(updated.name || draftName);
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

  const tk = {
    surface:  isLight ? 'bg-white border-parchment-darker'     : 'bg-navy-800/50 border-white/8',
    text:     isLight ? 'text-navy-900'                         : 'text-white',
    muted:    isLight ? 'text-slate-500'                        : 'text-slate-400',
    input:    isLight
      ? 'bg-slate-50 border-slate-200 text-navy-900 focus:border-navy-400'
      : 'bg-navy-700/60 border-white/10 text-white focus:border-gold/50',
    chip:     isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/10 text-white/60',
    hover:    isLight ? 'hover:bg-parchment' : 'hover:bg-white/5',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* ── PROFILE HEADER ── */}
        <motion.div className={cn('rounded-3xl border p-6 mb-5 relative overflow-hidden', tk.surface)}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row gap-5 items-start">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/30 flex items-center justify-center shadow-lg">
                <span className="font-serif font-black text-gold text-2xl lg:text-3xl">{initials}</span>
              </div>
              {editing && (
                <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-gold text-navy-900 flex items-center justify-center shadow-md hover:bg-gold-light transition-colors">
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
                      <h1 className={cn('font-serif text-2xl lg:text-3xl font-black', tk.text)}>{name}</h1>
                      <button onClick={() => setEditing(true)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all mt-1', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                        <Edit3 className="w-3 h-3" /> Edit Profil
                      </button>
                    </div>
                    <p className={cn('text-sm mt-1 max-w-md', tk.muted)}>{bio}</p>
                    <p className={cn('text-xs mt-2', tk.muted)}>{email} · {joinDate}</p>
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
                  <motion.div key={s.label}
                    className={cn('rounded-2xl p-3.5 text-center', isLight ? 'bg-parchment' : 'bg-navy-700/40')}
                    initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 + i * 0.04 }}>
                    <s.icon className={cn('w-5 h-5 mx-auto mb-2', s.color)} />
                    <p className={cn('font-serif font-black text-2xl', tk.text)}>
                      {s.value}{s.suffix && <span className={cn('text-sm font-sans font-normal ml-0.5', tk.muted)}>{s.suffix}</span>}
                    </p>
                    <p className={cn('text-[11px] mt-0.5', tk.muted)}>{s.label}</p>
                  </motion.div>
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
                          initial={{ width: 0 }} animate={{ width: `${g.pct}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }} />
                      </div>
                      <span className={cn('text-xs w-6 text-right flex-shrink-0', tk.muted)}>{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Recent activity */}
            <motion.div className={cn('rounded-3xl border p-5', tk.surface)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Aktivitas Terbaru</h2>
              <div className="flex flex-col gap-1">
                {recentActivity.map((a, i) => {
                  const src = coverSrc(a.coverId, a.coverUrl);
                  const ActIcon = a.type === 'selesai' ? CheckCircle : a.type === 'pinjam' ? BookOpen : Heart;
                  const actColor = a.type === 'selesai' ? 'text-emerald-400' : a.type === 'pinjam' ? 'text-blue-400' : 'text-rose-400';
                  const actLabel = a.type === 'selesai' ? 'Selesai membaca' : a.type === 'pinjam' ? 'Meminjam' : 'Menyimpan ke wishlist';
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
                    <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                      {f.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', tk.text)}>{f.name}</p>
                      <p className={cn('text-xs', tk.muted)}>{f.books} buku dibaca</p>
                    </div>
                    <button
                      onClick={() => openModal('following')}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
                      Profil
                    </button>
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
                  { href: '/shelf',    icon: BookMarked,  label: 'Rak Buku',     sub: `${stats[0].value} buku`  },
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