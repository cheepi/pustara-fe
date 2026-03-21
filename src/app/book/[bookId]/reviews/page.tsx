'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowLeft, Heart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';

const coverUrl = (id?: number) => id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

const BOOKS_META: Record<string, { title: string; author: string; coverId: number; rating: number; ratingCount: number }> = {
  d1: { title:'Laskar Pelangi',  author:'Andrea Hirata',         coverId:8231568,  rating:4.7, ratingCount:12840 },
  d2: { title:'Bumi Manusia',    author:'Pramoedya Ananta Toer', coverId:8750787,  rating:4.9, ratingCount:9210  },
  d3: { title:'Cantik Itu Luka', author:'Eka Kurniawan',         coverId:12699828, rating:4.6, ratingCount:7330  },
  d4: { title:'Perahu Kertas',   author:'Dee Lestari',           coverId:7886745,  rating:4.8, ratingCount:15200 },
  d5: { title:'Negeri 5 Menara', author:'Ahmad Fuadi',           coverId:8913924,  rating:4.5, ratingCount:8760  },
  d6: { title:'Ayah',            author:'Andrea Hirata',         coverId:10521865, rating:4.7, ratingCount:6540  },
};

const REVIEWS_BY_BOOK: Record<string, Review[]> = {
  d1: [
    { user:'Ameliana R.', avatar:'A', loc:'Yogyakarta', rating:5, text:'Buku ini benar-benar mengubah cara pandangku tentang pendidikan dan semangat belajar. Andrea Hirata berhasil membawa kita ke Belitung dengan sangat hidup dan penuh warna.', likes:142, time:'2 jam lalu' },
    { user:'Lila S.',     avatar:'L', loc:'Bali',       rating:5, text:'Sudah baca 3 kali dan masih nangis di bagian yang sama. Karya yang benar-benar abadi.', likes:49, time:'5 hari lalu' },
    { user:'Hendra T.',   avatar:'H', loc:'Palembang',  rating:4, text:'Sangat menginspirasi! Kisah persahabatan yang tulus di tengah keterbatasan materi.', likes:31, time:'1 minggu lalu' },
    { user:'Putri R.',    avatar:'P', loc:'Malang',     rating:5, text:'Belitung terasa sangat nyata setelah membaca ini. Penulisan Andrea sangat puitis.', likes:28, time:'2 minggu lalu' },
    { user:'Yoga D.',     avatar:'Y', loc:'Bandung',    rating:4, text:'Membaca ini di saat hujan adalah pengalaman tersendiri. Sangat hangat dan mengharukan.', likes:19, time:'3 minggu lalu' },
    { user:'Nisa W.',     avatar:'N', loc:'Surabaya',   rating:5, text:'10/10 tidak ada kata yang bisa mendeskripsikan betapa bagusnya buku ini.', likes:15, time:'1 bulan lalu' },
  ],
  d2: [
    { user:'Budi S.',     avatar:'B', loc:'Jakarta',    rating:5, text:'Pramoedya adalah maestro sastra Indonesia. Minke adalah karakter yang paling kompleks dan manusiawi.', likes:98, time:'5 jam lalu' },
    { user:'Maya K.',     avatar:'M', loc:'Medan',      rating:5, text:'Membaca Bumi Manusia adalah pengalaman yang mengubah hidup. Setiap halaman penuh dengan kebijaksanaan.', likes:67, time:'2 hari lalu' },
    { user:'Citra M.',    avatar:'C', loc:'Bogor',      rating:4, text:'Sejarah kolonial yang dikemas dalam romance yang indah. Wajib baca untuk semua orang Indonesia.', likes:45, time:'1 minggu lalu' },
    { user:'Rafi A.',     avatar:'R', loc:'Jogja',      rating:5, text:'Minke dan Annelies — kisah cinta yang melampaui batas ras dan kelas. Sangat memilukan dan indah.', likes:38, time:'2 minggu lalu' },
  ],
};

const getReviews = (key: string): Review[] => REVIEWS_BY_BOOK[key] ?? [
  { user:'Pengguna Pustara', avatar:'P', loc:'Indonesia', rating:5, text:'Buku yang sangat bagus! Sangat direkomendasikan untuk semua pembaca.', likes:34, time:'3 hari lalu' },
  { user:'Pembaca Setia',    avatar:'S', loc:'Jakarta',   rating:4, text:'Cerita yang mengalir dengan indah. Tidak bisa berhenti membaca!', likes:21, time:'1 minggu lalu' },
  { user:'Ahmad R.',         avatar:'A', loc:'Bandung',   rating:5, text:'Salah satu buku terbaik yang pernah kubaca. Sangat merekomendasikan!', likes:18, time:'2 minggu lalu' },
];

interface Review { user: string; avatar: string; loc: string; rating: number; text: string; likes: number; time: string; }

const RATING_FILTERS = ['Semua', '5 ★', '4 ★', '3 ★', '2 ★', '1 ★'];
const PAGE_SIZE = 3;

export default function ReviewsPage() {
  const params  = useParams();
  const router  = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bookKey = (params?.bookId as string) ?? 'd1';
  const meta    = BOOKS_META[bookKey] ?? BOOKS_META['d1'];
  const reviews = getReviews(bookKey);

  const [filter,  setFilter]  = useState('Semua');
  const [liked,   setLiked]   = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = `Pustara | Ulasan ${meta.title}`; }, [meta.title]);

  // Reset visible ketika filter berubah
  useEffect(() => { setVisible(PAGE_SIZE); }, [filter]);

  const filtered  = filter === 'Semua' ? reviews : reviews.filter(r => r.rating === parseInt(filter));
  const displayed = filtered.slice(0, visible);
  const hasMore   = visible < filtered.length;

  function handleLoadMore() {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE_SIZE, filtered.length));
      setLoading(false);
    }, 400);
  }

  // Rating distribution
  const dist = [5,4,3,2,1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    pct:   Math.round(reviews.filter(r => r.rating === s).length / reviews.length * 100),
  }));

  const tk = {
    text:    isLight ? 'text-navy-900' : 'text-white',
    muted:   isLight ? 'text-slate-500' : 'text-slate-400',
    surface: isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/50 border-white/8',
    chip:    isLight ? 'bg-white border-parchment-darker text-slate-600' : 'bg-navy-700/50 border-white/10 text-white/60',
    chipAct: 'bg-gold text-navy-900 border-gold',
    bar:     isLight ? 'bg-parchment-darker' : 'bg-navy-700',
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-20">

        {/* Back */}
        <motion.button onClick={() => router.back()}
          className={cn('flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors', tk.muted, 'hover:text-gold')}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Buku
        </motion.button>

        {/* Book header */}
        <motion.div className={cn('flex gap-4 p-4 rounded-2xl border mb-6', tk.surface)}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link href={`/book/${bookKey}`} className="flex-shrink-0">
            <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg">
              <img src={coverUrl(meta.coverId)!} alt={meta.title} className="w-full h-full object-cover" />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className={cn('font-serif text-xl font-black leading-tight', tk.text)}>{meta.title}</h1>
            <p className={cn('text-sm mt-0.5 mb-3', tk.muted)}>{meta.author}</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-4 h-4',
                    s <= Math.round(meta.rating) ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                ))}
              </div>
              <span className="text-gold font-bold">{meta.rating}</span>
              <span className={cn('text-xs', tk.muted)}>({meta.ratingCount.toLocaleString()} ulasan)</span>
            </div>
          </div>
        </motion.div>

        {/* Rating distribution */}
        <motion.div className={cn('rounded-2xl border p-5 mb-6', tk.surface)}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <h2 className={cn('font-serif text-lg font-bold mb-4', tk.text)}>Distribusi Rating</h2>
          <div className="flex flex-col gap-2">
            {dist.map(d => (
              <div key={d.stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-14 flex-shrink-0">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <span className={cn('text-xs', tk.text)}>{d.stars}</span>
                </div>
                <div className={cn('flex-1 h-2 rounded-full overflow-hidden', tk.bar)}>
                  <motion.div className="h-full bg-gold rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }} />
                </div>
                <span className={cn('text-xs w-8 text-right flex-shrink-0', tk.muted)}>{d.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          {RATING_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all',
                filter === f ? tk.chipAct : tk.chip)}>
              {f}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className={cn('text-xs mb-4', tk.muted)}>
          Menampilkan {displayed.length} dari {filtered.length} ulasan
        </p>

        {/* Reviews */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {displayed.map((r, i) => {
              const isLiked = liked.has(i);
              return (
                <motion.div key={i}
                  className={cn('rounded-2xl border p-4', tk.surface)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i < PAGE_SIZE ? i * 0.04 : 0 }}>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                      {r.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', tk.text)}>{r.user}</p>
                      <p className={cn('text-xs', tk.muted)}>{r.loc} · {r.time}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-3 h-3',
                          s <= r.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                      ))}
                    </div>
                  </div>

                  <p className={cn('text-sm leading-relaxed mb-3', tk.muted)}>{r.text}</p>

                  {/* Actions — no reply */}
                  <button
                    onClick={() => setLiked(l => {
                      const n = new Set(l);
                      isLiked ? n.delete(i) : n.add(i);
                      return n;
                    })}
                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                      isLiked ? 'text-rose-400' : tk.muted, 'hover:text-rose-400')}>
                    <Heart className={cn('w-3.5 h-3.5', isLiked && 'fill-rose-400')} />
                    {r.likes + (isLiked ? 1 : 0)}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Load more button */}
        {hasMore && (
          <motion.div className="mt-6 flex justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-2xl border text-sm font-semibold transition-all',
                isLight
                  ? 'bg-white border-parchment-darker text-navy-700 hover:border-gold/50 hover:text-gold'
                  : 'bg-navy-800/50 border-white/10 text-white/70 hover:border-gold/40 hover:text-gold',
                loading && 'opacity-60 cursor-not-allowed'
              )}>
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Memuat...</>
                : <><ChevronDown className="w-4 h-4" /> Muat {Math.min(PAGE_SIZE, filtered.length - visible)} ulasan lagi</>
              }
            </button>
          </motion.div>
        )}

        {/* All loaded */}
        {!hasMore && displayed.length > PAGE_SIZE && (
          <p className={cn('text-center text-xs mt-8', tk.muted)}>Semua ulasan sudah ditampilkan 🎉</p>
        )}

      </main>
    </div>
  );
}