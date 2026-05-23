'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BookOpen, Heart, Users, Star, CheckCheck, Trash2, BookMarked, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import type { NotificationItem } from '@/types/notifications';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
} from '@/lib/notifications';
import { NotificationType } from '@/types/database';
import AvatarImage from '@/components/shared/AvatarImage';

const TABS = [
  { id: 'all',    label: 'Semua'    },
  { id: 'unread', label: 'Belum Dibaca' },
  { id: 'borrow', label: 'Peminjaman'  },
  { id: 'social', label: 'Sosial'      },
];

function typeIcon(type: NotificationType, dark: boolean) {
  const base = 'w-5 h-5';
  switch (type) {
    case 'borrow': return <BookOpen   className={cn(base, 'text-gold')}        />;
    case 'due':    return <BookMarked className={cn(base, 'text-red-400')}      />;
    case 'like':   return <Heart      className={cn(base, 'text-rose-400')}     />;
    case 'follow': return <Users      className={cn(base, 'text-sky-400')}      />;
    case 'review': return <Star       className={cn(base, 'text-amber-400')}    />;
    case 'system': return <Bell       className={cn(base, 'text-purple-400')}   />;
  }
}

function typeBg(type: NotificationType) {
  switch (type) {
    case 'borrow': return 'bg-gold/15';
    case 'due':    return 'bg-red-400/15';
    case 'like':   return 'bg-rose-400/15';
    case 'follow': return 'bg-sky-400/15';
    case 'review': return 'bg-amber-400/15';
    case 'system': return 'bg-purple-400/15';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { ready } = useProtectedRoute();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [tab, setTab]       = useState('all');
  const [loading, setLoading] = useState(true);

  const tk = {
    text:    dark ? 'text-white'      : 'text-navy-900',
    muted:   dark ? 'text-slate-400'  : 'text-slate-500',
    surface: dark ? 'bg-navy-800/60 border-white/8' : 'bg-white border-parchment-darker',
    chip:    dark ? 'bg-navy-700/50 border-navy-500/60 text-slate-300' : 'bg-white border-parchment-darker text-slate-600',
    chipAct: 'bg-gold/15 border-gold/40 text-gold',
    unread:  dark ? 'bg-navy-700/80'  : 'bg-blue-50/60',
  };

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((items) => {
        if (active) setNotifs(items);
      })
      .catch(() => {
        if (active) setNotifs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!ready) return <PageSkeleton />;

  if (loading) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
        <Navbar />

        <main className="max-w-2xl mx-auto px-4 pt-6 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="flex-1">
              <div className="h-7 w-40 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-24 rounded mt-2 animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
          </div>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 h-10 w-24 rounded-xl animate-pulse"
                style={{ background: 'var(--surface2)' }}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className={cn('h-24 rounded-2xl border animate-pulse', tk.surface)}
                style={{ animationDelay: `${idx * 0.06}s` }}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = notifs.filter(n => {
    if (tab === 'unread') return !n.read;
    if (tab === 'borrow') return n.type === 'borrow' || n.type === 'due';
    if (tab === 'social') return n.type === 'like' || n.type === 'follow' || n.type === 'review';
    return true;
  });

  async function markAllRead() {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      fetchNotifications().then(setNotifs).catch(() => {});
    }
  }

  async function markRead(id: string) {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await markNotificationRead(id);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      fetchNotifications().then(setNotifs).catch(() => {});
    }
  }

  async function deleteNotif(id: string) {
    setNotifs(ns => ns.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      fetchNotifications().then(setNotifs).catch(() => {});
    }
  }

  async function openNotif(n: NotificationItem) {
    await markRead(n.id);
    if (n.book_id) router.push(`/book/${n.book_id}`);
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()}
            className={cn('p-2 rounded-xl transition-colors', tk.muted, 'hover:text-gold')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className={cn('font-serif text-2xl font-black', tk.text)}>Notifikasi</h1>
            {unreadCount > 0 && (
              <p className={cn('text-xs mt-0.5', tk.muted)}>{unreadCount} belum dibaca</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all', tk.chip, 'hover:border-gold/40 hover:text-gold')}>
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                tab === t.id ? tk.chipAct : tk.chip
              )}>
              {t.label}
              {t.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-gold text-navy-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className={cn('h-24 rounded-2xl border animate-pulse', tk.surface)} />
              ))}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gold/40" />
              </div>
              <p className={cn('font-semibold', tk.text)}>Tidak ada notifikasi</p>
              <p className={cn('text-sm mt-1', tk.muted)}>
                {tab === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Belum ada aktivitas di kategori ini.'}
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((n, idx) => (
                <motion.div key={n.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, scale: 0.96 }}
                  transition={{ delay: idx * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => openNotif(n)}
                  className={cn(
                    'group relative flex gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all',
                    tk.surface,
                    !n.read && tk.unread,
                    'hover:border-gold/30'
                  )}>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-gold" />
                  )}

                  {/* Icon or avatar */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center',
                    n.bookCover ? 'overflow-hidden' : ''
                  )}>
                    {n.bookCover ? (
                      <img
                        src={`https://covers.openlibrary.org/b/id/${n.bookCover}-S.jpg`}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : n.avatar_url ? (
                      n.actor_username ? (
                        <Link href={`/profile/@${n.actor_username}`} className="block w-full h-full" aria-label={`Buka profil ${n.title}`}>
                          <AvatarImage 
                            src={n.avatar_url}
                            alt="User avatar"
                            initials="U"
                            size="sm"
                          />
                        </Link>
                      ) : (
                        <AvatarImage 
                          src={n.avatar_url}
                          alt="User avatar"
                          initials="U"
                          size="sm"
                        />
                      )
                    ) : (
                      <div className={cn('w-full h-full rounded-xl flex items-center justify-center', typeBg(n.type))}>
                        {typeIcon(n.type, dark)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={cn('text-sm font-semibold leading-snug mb-0.5', tk.text)}>
                      {n.title}
                    </p>
                    <p className={cn('text-xs leading-relaxed line-clamp-2', tk.muted)}>
                      {n.body}
                    </p>
                    <p className={cn('text-[11px] mt-1.5 font-medium', 'text-gold/70')}>
                      {n.time}
                    </p>
                  </div>

                  {/* Delete btn — visible on hover */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    className={cn(
                      'absolute bottom-3.5 right-3.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all',
                      dark ? 'text-slate-500 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                    )}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
