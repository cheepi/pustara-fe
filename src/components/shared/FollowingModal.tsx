'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, UserCheck, UserPlus, BookOpen, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Person {
  name: string; avatar: string; loc: string;
  books: number; genres: string[]; bio: string;
  mutual?: number; isFollowing?: boolean;
}

const FOLLOWING: Person[] = [
  { name:'Annabeth C.', avatar:'A', loc:'Yogyakarta', books:31, genres:['Sastra','Fiksi'],       bio:'Pecinta sastra Indonesia dan buku sejarah.',           mutual:2 },
  { name:'Shayla J.',  avatar:'S', loc:'Bandung',    books:19, genres:['Romance','Teenlit'],    bio:'Membaca adalah cara terbaik berkeliling dunia.',       mutual:0 },
  { name:'Kayla M.', avatar:'K', loc:'Jakarta',    books:27, genres:['Sains','Filsafat'],     bio:'Scientist by day, book lover by night.',               mutual:1 },
  { name:'Dika Pratama',   avatar:'D', loc:'Surabaya',   books:14, genres:['Misteri','Thriller'],   bio:'If it has a plot twist, I have already read it.',      mutual:3 },
  { name:'Maya Kusuma',    avatar:'M', loc:'Medan',      books:22, genres:['Biografi','Sejarah'],   bio:'Belajar dari mereka yang sudah hidup lebih dulu.',     mutual:0 },
];

const FOLLOWERS: Person[] = [
  { name:'Reza Firmansyah',avatar:'R', loc:'Makassar',  books:9,  genres:['Fiksi','Drama'],        bio:'Baru mulai suka baca tahun ini, sudah 9 buku!',        isFollowing:true  },
  { name:'Lila Sari',      avatar:'L', loc:'Bali',      books:35, genres:['Sastra','Puisi'],       bio:'Poetry is my first language, prose is my second.',     isFollowing:false },
  { name:'Anto Brandonman',   avatar:'A', loc:'Semarang',  books:18, genres:['Romance','Fiksi'],      bio:'Kalau buku bisa bicara, saya akan mendengarkan.',      isFollowing:true  },
  { name:'Putri Rahayu',   avatar:'P', loc:'Malang',    books:26, genres:['Self-Help','Inspiratif'],bio:'Setiap buku adalah mentor yang diam.',                isFollowing:false },
];

const SUGGESTIONS: Person[] = [
  { name:'Hendra Tanjung', avatar:'H', loc:'Palembang', books:41, genres:['Sejarah','Sastra'],     bio:'Penggemar berat Pramoedya Ananta Toer.',               mutual:5 },
  { name:'Citra Maharani', avatar:'C', loc:'Bogor',     books:17, genres:['Romance','Teenlit'],    bio:'Kalau ada buku Dee Lestari yang belum kubaca, beritahu aku!', mutual:3 },
  { name:'Yudi Pratama',   avatar:'Y', loc:'Depok',     books:33, genres:['Filsafat','Sains'],     bio:'Membaca untuk memahami dunia yang semakin kompleks.',  mutual:2 },
];

const TABS = [
  { id: 'following',   label: 'Mengikuti', count: 12 },
  { id: 'followers',   label: 'Pengikut',  count: 38 },
  { id: 'suggestions', label: 'Saran',     count: null },
];

// ── Modal ─────────────────────────────────────────────────────────────────────
interface FollowingModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'following' | 'followers' | 'suggestions';
}

export default function FollowingModal({ open, onClose, initialTab = 'following' }: FollowingModalProps) {
  const { theme } = useTheme();
  const isLight   = theme === 'light';

  const [tab,    setTab]    = useState<'following' | 'followers' | 'suggestions'>(initialTab);
  const [search, setSearch] = useState('');
  const [followed, setFollowed] = useState<Set<string>>(new Set(
    [...FOLLOWING.map(f => f.name), ...FOLLOWERS.filter(f => f.isFollowing).map(f => f.name)]
  ));

  // Sync initialTab when modal opens
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSearch('');
    }
  }, [open, initialTab]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else       document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function toggleFollow(name: string) {
    setFollowed(s => { const n = new Set(s); s.has(name) ? n.delete(name) : n.add(name); return n; });
  }

  const list = tab === 'following' ? FOLLOWING : tab === 'followers' ? FOLLOWERS : SUGGESTIONS;
  const filtered = list.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.loc.toLowerCase().includes(search.toLowerCase())
  );

  const tk = {
    text:    isLight ? 'text-navy-900'  : 'text-white',
    muted:   isLight ? 'text-slate-500' : 'text-slate-400',
    surface: isLight ? 'bg-white'       : 'bg-navy-900',
    card:    isLight ? 'bg-slate-50 border-parchment-darker' : 'bg-navy-800/60 border-white/8',
    input:   isLight
      ? 'bg-white border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold'
      : 'bg-navy-800 border-white/10 text-white placeholder-slate-500 focus:border-gold/50',
    chip:    isLight ? 'bg-white border-parchment-darker text-slate-600' : 'bg-navy-700/50 border-white/10 text-white/60',
    chipAct: 'bg-gold text-navy-900 border-gold',
    genre:   isLight ? 'bg-navy-50 border-navy-200 text-navy-600' : 'bg-white/5 border-white/10 text-white/50',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={cn(
              'relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col',
              tk.surface
            )}
            style={{ maxHeight: '88vh' }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className={cn('w-10 h-1 rounded-full', isLight ? 'bg-slate-200' : 'bg-white/20')} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
              <h2 className={cn('font-serif text-xl font-black', tk.text)}>Jaringan Pembaca</h2>
              <button
                onClick={onClose}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                  isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white/50'
                )}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pb-3 flex-shrink-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all',
                    tab === t.id ? tk.chipAct : tk.chip
                  )}>
                  {t.label}
                  {t.count !== null && (
                    <span className="opacity-60">{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative px-5 pb-3 flex-shrink-0">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama atau kota..."
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-2xl text-sm outline-none transition-all', tk.input)}
              />
            </div>

            {/* List — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {filtered.length === 0 ? (
                <div className={cn('text-center py-12 text-sm', tk.muted)}>
                  Tidak ada hasil untuk "{search}"
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filtered.map((u, i) => {
                    const isFollowing = followed.has(u.name);
                    return (
                      <motion.div
                        key={u.name}
                        className={cn('rounded-2xl border p-3.5', tk.card)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}>

                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-base text-gold flex-shrink-0">
                            {u.avatar}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={cn('font-semibold text-sm truncate', tk.text)}>{u.name}</p>
                                <p className={cn('text-xs', tk.muted)}>{u.loc}</p>
                              </div>

                              {/* Follow button */}
                              <motion.button
                                onClick={() => toggleFollow(u.name)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0',
                                  isFollowing
                                    ? isLight
                                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                                      : 'bg-white/10 border-white/15 text-white/60'
                                    : 'bg-gold border-gold text-navy-900 hover:bg-gold/90'
                                )}
                                whileTap={{ scale: 0.93 }}>
                                {isFollowing
                                  ? <><UserCheck className="w-3 h-3" /> Mengikuti</>
                                  : <><UserPlus  className="w-3 h-3" /> Ikuti</>
                                }
                              </motion.button>
                            </div>

                            {/* Bio */}
                            <p className={cn('text-xs mt-1.5 mb-2 leading-relaxed line-clamp-2', tk.muted)}>
                              {u.bio}
                            </p>

                            {/* Meta */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-gold" />
                                <span className={cn('text-xs', tk.muted)}>{u.books} buku</span>
                              </div>
                              {u.mutual != null && u.mutual > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-gold/60" />
                                  <span className={cn('text-xs', tk.muted)}>{u.mutual} teman bersama</span>
                                </div>
                              )}
                              {u.genres.map(g => (
                                <span key={g} className={cn('text-[10px] px-2 py-0.5 rounded-full border', tk.genre)}>
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}