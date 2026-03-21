'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Star, MessageCircle, Heart, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';

const coverUrl = (id?: number) => id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;

const ALL_REVIEWS = [
  { user:'Ameliana R.', avatar:'A', loc:'Yogyakarta', rating:5, book:'Laskar Pelangi',  author:'Andrea Hirata',         coverId:8231568,  key:'d1', text:'Buku ini benar-benar mengubah cara pandangku tentang pendidikan dan semangat belajar. Andrea Hirata berhasil membawa kita ke Belitung dengan sangat hidup.', likes:142, comments:23, time:'2 jam lalu' },
  { user:'Budi S.',     avatar:'B', loc:'Jakarta',    rating:5, book:'Bumi Manusia',    author:'Pramoedya Ananta Toer', coverId:8750787,  key:'d2', text:'Pramoedya adalah maestro sastra Indonesia. Minke adalah karakter yang paling kompleks dan manusiawi yang pernah kutemui dalam literatur Indonesia.', likes:98,  comments:17, time:'5 jam lalu' },
  { user:'Sari A.',     avatar:'S', loc:'Bandung',    rating:5, book:'Cantik Itu Luka', author:'Eka Kurniawan',         coverId:12699828, key:'d3', text:'Realisme magis yang gelap dan indah. Eka Kurniawan berhasil memadukan sejarah kelam Indonesia dengan narasi yang memukau dari awal hingga akhir.', likes:87,  comments:11, time:'1 hari lalu' },
  { user:'Dika P.',     avatar:'D', loc:'Surabaya',   rating:4, book:'Perahu Kertas',   author:'Dee Lestari',           coverId:7886745,  key:'d4', text:'Dee Lestari menulis cinta dengan cara yang tidak klise. Kugy dan Keenan adalah pasangan yang paling lovable dalam fiksi Indonesia modern.', likes:76,  comments:8,  time:'2 hari lalu' },
  { user:'Maya K.',     avatar:'M', loc:'Medan',      rating:5, book:'Negeri 5 Menara', author:'Ahmad Fuadi',           coverId:8913924,  key:'d5', text:'Man jadda wajada. Novel ini mengubah cara pandangku tentang tekad dan usaha. Wajib baca untuk semua usia.', likes:63,  comments:14, time:'3 hari lalu' },
  { user:'Reza F.',     avatar:'R', loc:'Makassar',   rating:4, book:'Ayah',            author:'Andrea Hirata',         coverId:10521865, key:'d6', text:'Sabari adalah karakter yang paling mengharukan. Kisah cintanya yang tak berbalas namun teguh adalah cerminan dari cinta yang paling murni.', likes:54,  comments:6,  time:'4 hari lalu' },
  { user:'Lila S.',     avatar:'L', loc:'Bali',       rating:5, book:'Laskar Pelangi',  author:'Andrea Hirata',         coverId:8231568,  key:'d1', text:'Sudah baca 3 kali dan masih nangis di bagian yang sama. Buku ini adalah karya yang benar-benar abadi.', likes:49,  comments:9,  time:'5 hari lalu' },
  { user:'Anto B.',     avatar:'A', loc:'Semarang',   rating:4, book:'Perahu Kertas',   author:'Dee Lestari',           coverId:7886745,  key:'d4', text:'Alur ceritanya mengalir dengan natural. Ini adalah romansa yang paling realistis yang pernah kubaca.', likes:41,  comments:5,  time:'1 minggu lalu' },
  { user:'Hendra T.',   avatar:'H', loc:'Palembang',  rating:4, book:'Laskar Pelangi',  author:'Andrea Hirata',         coverId:8231568,  key:'d1', text:'Sangat menginspirasi! Kisah persahabatan yang tulus di tengah keterbatasan materi membuat air mata tak terbendung.', likes:38, comments:7, time:'1 minggu lalu' },
  { user:'Putri R.',    avatar:'P', loc:'Malang',     rating:5, book:'Bumi Manusia',    author:'Pramoedya Ananta Toer', coverId:8750787,  key:'d2', text:'Membaca Bumi Manusia adalah pengalaman yang mengubah hidup. Setiap halaman penuh dengan kebijaksanaan tentang kemanusiaan.', likes:33, comments:4, time:'2 minggu lalu' },
  { user:'Citra M.',    avatar:'C', loc:'Bogor',      rating:4, book:'Cantik Itu Luka', author:'Eka Kurniawan',         coverId:12699828, key:'d3', text:'Sejarah yang dikemas dalam narasi yang gelap dan indah. Butuh waktu untuk mencerna kedalamannya, tapi sangat worth it.', likes:29, comments:3, time:'2 minggu lalu' },
  { user:'Yudi P.',     avatar:'Y', loc:'Solo',       rating:5, book:'Negeri 5 Menara', author:'Ahmad Fuadi',           coverId:8913924,  key:'d5', text:'Pesantren Gontor dan persahabatan yang tulus. Novel ini membuatku ingin belajar lebih keras lagi dalam hidup.', likes:24, comments:6, time:'3 minggu lalu' },
];

const TABS = ['Terbaru', 'Terpopuler', 'Diikuti'];
const PAGE_SIZE = 4;

export default function CommunityPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [tab,     setTab]     = useState('Terbaru');
  const [liked,   setLiked]   = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = 'Pustara | Komunitas'; }, []);

  // Reset ketika tab berubah
  useEffect(() => { setVisible(PAGE_SIZE); }, [tab]);

  const sorted = tab === 'Terpopuler'
    ? [...ALL_REVIEWS].sort((a, b) => b.likes - a.likes)
    : ALL_REVIEWS;

  const displayed  = sorted.slice(0, visible);
  const hasMore    = visible < sorted.length;

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    // Simulasi network delay — ganti dengan real API call nanti
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE_SIZE, sorted.length));
      setLoading(false);
    }, 500);
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

        <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">Komunitas</span>
          </div>
          <h1 className={cn('font-serif text-3xl lg:text-4xl font-black', tk.text)}>Koleksi Komunitas</h1>
          <p className={cn('text-sm mt-1', tk.muted)}>Ulasan & rekomendasi dari pembaca Pustara</p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          {[['50K+','Pembaca'],['120K+','Ulasan'],['98%','Positif']].map(([v,l]) => (
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

        {/* Feed */}
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {displayed.map((r, i) => {
              const src     = coverUrl(r.coverId);
              const isLiked = liked.has(i);
              return (
                <motion.div key={`${tab}-${i}`}
                  className={cn('rounded-3xl border p-5', tk.surface)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i < PAGE_SIZE ? i * 0.04 : 0, type: 'spring', stiffness: 400, damping: 32 }}>

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                      {r.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', tk.text)}>{r.user}</p>
                      <p className={cn('text-xs', tk.muted)}>{r.loc} · {r.time}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-3.5 h-3.5',
                          s <= r.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                      ))}
                    </div>
                  </div>

                  {/* Book + review */}
                  <div className="flex gap-4">
                    <Link href={`/book/${r.key}`} className="flex-shrink-0">
                      <div className="w-14 h-20 rounded-xl overflow-hidden shadow-lg">
                        {src && <img src={src} alt={r.book} className="w-full h-full object-cover" />}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/book/${r.key}`}>
                        <p className={cn('text-sm font-bold hover:text-gold transition-colors', tk.text)}>{r.book}</p>
                      </Link>
                      <p className={cn('text-xs mb-2', tk.muted)}>{r.author}</p>
                      <p className={cn('text-sm leading-relaxed', tk.muted)}>{r.text}</p>
                    </div>
                  </div>

                  {/* Actions — hapus Reply */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setLiked(l => {
                        const n = new Set(l);
                        isLiked ? n.delete(i) : n.add(i);
                        return n;
                      })}
                      className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                        isLiked ? 'text-rose-400' : tk.muted, 'hover:text-rose-400')}>
                      <Heart className={cn('w-4 h-4', isLiked && 'fill-rose-400')} />
                      {r.likes + (isLiked ? 1 : 0)}
                    </button>
                    {/* <span className={cn('flex items-center gap-1.5 text-xs', tk.muted)}>
                      <MessageCircle className="w-4 h-4" />{r.comments}
                    </span> */}
                    <Link href={`/book/${r.key}`}
                      className={cn('ml-auto flex items-center gap-1.5 text-xs font-medium hover:text-gold transition-colors', tk.muted)}>
                      <BookOpen className="w-3.5 h-3.5" /> Lihat Buku
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Infinite scroll trigger */}
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

      </main>
    </div>
  );
}