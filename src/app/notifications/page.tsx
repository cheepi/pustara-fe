'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BookOpen, Heart, Users, Star, CheckCheck, Trash2, BookMarked, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

type NotifType = 'borrow' | 'due' | 'like' | 'follow' | 'review' | 'system';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  avatar?: string;
  bookCover?: number;
}

const INITIAL: Notif[] = [
  {
    id: 'n1', type: 'due', read: false,
    title: 'Tenggat Pengembalian Besok',
    body: '"Laskar Pelangi" harus dikembalikan besok, 21 Mar 2026. Perpanjang sekarang sebelum terlambat.',
    time: '1 jam lalu', bookCover: 8231568,
  },
  {
    id: 'n2', type: 'borrow', read: false,
    title: 'Peminjaman Berhasil',
    body: '"Bumi Manusia" oleh Pramoedya Ananta Toer kini tersedia di rak bacamu. Selamat membaca!',
    time: '3 jam lalu', bookCover: 8750787,
  },
  {
    id: 'n3', type: 'like', read: false,
    title: 'Ameliana menyukai ulasanmu',
    body: 'Ulasanmu tentang "Cantik Itu Luka" mendapat 12 suka baru hari ini.',
    time: '5 jam lalu', avatar: 'A',
  },
  {
    id: 'n4', type: 'follow', read: false,
    title: 'Pengikut Baru',
    body: 'Syifa Nuraini mulai mengikuti aktivitas membacamu.',
    time: 'Kemarin', avatar: 'S',
  },
  {
    id: 'n5', type: 'review', read: true,
    title: 'Budi membalas ulasanmu',
    body: '"Setuju banget! Minke adalah karakter terkompleks dalam sastra Indonesia." — Budi S.',
    time: '2 hari lalu', avatar: 'B',
  },
  {
    id: 'n6', type: 'borrow', read: true,
    title: 'Antrean Tersedia',
    body: '"Perahu Kertas" yang kamu antrikan kini tersedia. Pinjam sebelum 24 jam atau antrean hangus!',
    time: '3 hari lalu', bookCover: 7886745,
  },
  {
    id: 'n7', type: 'system', read: true,
    title: 'Fitur Baru: AI Rekomendasi',
    body: 'Pustara kini punya rekomendasi buku berbasis AI. Coba sekarang dan temukan bacaan berikutnya!',
    time: '1 minggu lalu',
  },
  {
    id: 'n8', type: 'review', read: true,
    title: 'Ulasanmu ditampilkan',
    body: 'Ulasanmu untuk "Negeri 5 Menara" dipilih sebagai ulasan unggulan minggu ini. 🎉',
    time: '1 minggu lalu', bookCover: 8913924,
  },
];

const TABS = [
  { id: 'all',    label: 'Semua'    },
  { id: 'unread', label: 'Belum Dibaca' },
  { id: 'borrow', label: 'Peminjaman'  },
  { id: 'social', label: 'Sosial'      },
];

function typeIcon(type: NotifType, dark: boolean) {
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

function typeBg(type: NotifType) {
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

  const [notifs, setNotifs] = useState<Notif[]>(INITIAL);
  const [tab, setTab]       = useState('all');

  if (!ready) return <PageSkeleton />;

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = notifs.filter(n => {
    if (tab === 'unread') return !n.read;
    if (tab === 'borrow') return n.type === 'borrow' || n.type === 'due';
    if (tab === 'social') return n.type === 'like' || n.type === 'follow' || n.type === 'review';
    return true;
  });

  function markAllRead() {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }

  function deleteNotif(id: string) {
    setNotifs(ns => ns.filter(n => n.id !== id));
  }

  const tk = {
    text:    dark ? 'text-white'      : 'text-navy-900',
    muted:   dark ? 'text-slate-400'  : 'text-slate-500',
    surface: dark ? 'bg-navy-800/60 border-white/8' : 'bg-white border-parchment-darker',
    chip:    dark ? 'bg-navy-700/50 border-navy-500/60 text-slate-300' : 'bg-white border-parchment-darker text-slate-600',
    chipAct: 'bg-gold/15 border-gold/40 text-gold',
    unread:  dark ? 'bg-navy-700/80'  : 'bg-blue-50/60',
  };

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
          {filtered.length === 0 ? (
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
                  onClick={() => markRead(n.id)}
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
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                    n.bookCover ? 'overflow-hidden' : typeBg(n.type)
                  )}>
                    {n.bookCover ? (
                      <img
                        src={`https://covers.openlibrary.org/b/id/${n.bookCover}-S.jpg`}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : n.avatar ? (
                      <span className={cn(
                        'w-full h-full rounded-xl flex items-center justify-center font-bold text-sm',
                        typeBg(n.type),
                        dark ? 'text-white' : 'text-navy-800'
                      )}>
                        {n.avatar}
                      </span>
                    ) : (
                      typeIcon(n.type, dark)
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