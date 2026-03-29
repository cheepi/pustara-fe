'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Heart, UserPlus, UserCheck, Users } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { getRecommendedUsers, getUserProfile, toggleFollowUser } from '@/lib/users';
import type { RecommendedUser, UserProfile } from '@/types/user';

export default function UserProfilePage() {
  const params = useParams();
  const profileId = String(params?.id || '');
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);

  useEffect(() => {
    if (!profileId) return;

    let active = true;
    setLoading(true);

    getUserProfile(profileId)
      .then((result) => {
        if (!active) return;
        setProfile(result);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  useEffect(() => {
    let active = true;
    getRecommendedUsers(6)
      .then((list) => {
        if (!active) return;
        setRecommendedUsers(list.filter((item) => item.id !== profileId));
      })
      .catch(() => {
        if (!active) return;
        setRecommendedUsers([]);
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  const initials = useMemo(() => {
    const source = profile?.name || 'Pustara User';
    return source
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  async function handleFollowToggle() {
    if (!profile || loadingAction) return;

    const action = profile.is_following ? 'unfollow' : 'follow';
    setLoadingAction(true);

    try {
      const result = await toggleFollowUser(profile.id, action);
      if (!result) return;

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          is_following: result.is_following,
          followers_count: result.target_followers_count,
        };
      });
    } finally {
      setLoadingAction(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (!profile) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className={cn('rounded-3xl border p-8 text-center', isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/40 border-white/10')}>
            <p className={cn('font-serif text-2xl font-black mb-2', isLight ? 'text-navy-900' : 'text-white')}>Profil tidak ditemukan</p>
            <p className={cn('text-sm', isLight ? 'text-slate-500' : 'text-slate-400')}>Pengguna dengan ID tersebut belum tersedia.</p>
          </div>
        </main>
      </div>
    );
  }

  const tk = {
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/10',
    text: isLight ? 'text-navy-900' : 'text-white',
    muted: isLight ? 'text-slate-500' : 'text-slate-400',
    chip: isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/10 text-white/70',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_320px] gap-5">
        <section className={cn('rounded-3xl border p-6', tk.surface)}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-20 h-20 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center font-serif font-black text-2xl text-gold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className={cn('font-serif text-3xl font-black truncate', tk.text)}>{profile.name}</h1>
                <p className={cn('text-sm truncate', tk.muted)}>@{profile.username || 'pustara-user'}</p>
                <p className={cn('text-sm mt-1', tk.muted)}>{profile.bio || 'Belum ada bio.'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={loadingAction}
              className={cn(
                'px-4 py-2 rounded-2xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-60',
                profile.is_following
                  ? isLight
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-white/10 text-white border border-white/20'
                  : 'bg-gold text-navy-900'
              )}
            >
              {profile.is_following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {loadingAction ? 'Memproses...' : profile.is_following ? 'Mengikuti' : 'Ikuti'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className={cn('rounded-2xl border p-3', tk.chip)}>
              <p className={cn('text-xs', tk.muted)}>Pengikut</p>
              <p className={cn('font-serif text-2xl font-black', tk.text)}>{profile.followers_count}</p>
            </div>
            <div className={cn('rounded-2xl border p-3', tk.chip)}>
              <p className={cn('text-xs', tk.muted)}>Mengikuti</p>
              <p className={cn('font-serif text-2xl font-black', tk.text)}>{profile.following_count}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className={cn('font-serif text-xl font-bold mb-3 flex items-center gap-2', tk.text)}>
              <BookOpen className="w-4 h-4 text-gold" />
              Sedang Dibaca
            </h2>
            {profile.currently_reading.length === 0 ? (
              <p className={cn('text-sm', tk.muted)}>Belum ada buku aktif.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {profile.currently_reading.map((book) => (
                  <Link key={book.id} href={`/book/${book.id}`}>
                    <div className={cn('rounded-2xl border p-3 transition-colors', isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5', tk.chip)}>
                      <p className={cn('text-sm font-semibold line-clamp-1', tk.text)}>{book.title}</p>
                      <p className={cn('text-xs line-clamp-1', tk.muted)}>{book.authors.join(', ') || 'Unknown'}</p>
                      <p className={cn('text-[11px] mt-1', tk.muted)}>{Math.round(book.progress_percentage || 0)}% selesai</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h2 className={cn('font-serif text-xl font-bold mb-3 flex items-center gap-2', tk.text)}>
              <Heart className="w-4 h-4 text-gold" />
              Buku Disukai
            </h2>
            {profile.liked_books.length === 0 ? (
              <p className={cn('text-sm', tk.muted)}>Belum ada buku yang disukai.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {profile.liked_books.map((book) => (
                  <Link key={book.id} href={`/book/${book.id}`}>
                    <div className={cn('rounded-2xl border p-3 transition-colors', isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5', tk.chip)}>
                      <p className={cn('text-sm font-semibold line-clamp-1', tk.text)}>{book.title}</p>
                      <p className={cn('text-xs line-clamp-1', tk.muted)}>{book.authors.join(', ') || 'Unknown'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className={cn('rounded-3xl border p-5 h-fit', tk.surface)}>
          <h2 className={cn('font-serif text-lg font-bold mb-3 flex items-center gap-2', tk.text)}>
            <Users className="w-4 h-4 text-gold" />
            Rekomendasi Ikuti
          </h2>
          <div className="flex flex-col gap-2">
            {recommendedUsers.length === 0 ? (
              <p className={cn('text-sm', tk.muted)}>Belum ada rekomendasi.</p>
            ) : (
              recommendedUsers.slice(0, 5).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link href={`/profile/${item.id}`}>
                    <div className={cn('rounded-2xl border p-3 transition-colors', isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5', tk.chip)}>
                      <p className={cn('text-sm font-semibold truncate', tk.text)}>{item.name}</p>
                      <p className={cn('text-xs line-clamp-1', tk.muted)}>{item.followers_count} pengikut • {item.total_read} buku</p>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
