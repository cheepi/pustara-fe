'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, BookOpen, BookCopy,
  Users, Flame, Heart, BarChart2, X,
  CircleCheckBig
} from 'lucide-react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import PopularCarousel from '@/components/shared/PopularCarousel';
import type { PopularBook } from '@/components/shared/PopularCarousel';
import Link from 'next/link';
import { useRecommendations } from '@/hooks/useRecommendations';
import AiRecoCard from '@/components/ai/AiRecoCard';

// DUMMY popular
const coverUrl = (id?: number, s = 'M') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

const DUMMY_POPULAR: PopularBook[] = [
  { key: 'd1', title: 'Laskar Pelangi',   author: 'Andrea Hirata',         coverId: 8231568,  genre: ['Fiksi','Drama'],           desc: 'Kisah persahabatan anak-anak Belitung yang penuh semangat mengejar pendidikan di tengah keterbatasan.',           year: '2005', pages: 529 },
  { key: 'd2', title: 'Bumi Manusia',      author: 'Pramoedya Ananta Toer', coverId: 8750787,  genre: ['Sastra','Sejarah'],         desc: 'Minke, pemuda pribumi terpelajar di era kolonial Belanda, berjuang menemukan jati diri dan keadilan.',               year: '1980', pages: 368 },
  { key: 'd3', title: 'Cantik Itu Luka',   author: 'Eka Kurniawan',         coverId: 12699828, genre: ['Fiksi','Realisme Magis'],   desc: 'Tiga generasi keluarga dalam lanskap Indonesia yang kacau — antara kecantikan, trauma, dan sejarah yang pelik.',       year: '2002', pages: 505 },
  { key: 'd4', title: 'Perahu Kertas',     author: 'Dee Lestari',           coverId: 7886745,  genre: ['Romance','Coming-of-age'],  desc: 'Kugy dan Keenan terhubung lewat mimpi dan seni, dalam kisah cinta yang tumbuh perlahan dan menyentuh hati.',           year: '2009', pages: 444 },
  { key: 'd5', title: 'Negeri 5 Menara',   author: 'Ahmad Fuadi',           coverId: 8913924,  genre: ['Inspiratif','Religi'],      desc: 'Alif meninggalkan kampung dan menemukan dunia yang lebih luas di pesantren Gontor bersama sahabat-sahabatnya.',         year: '2009', pages: 423 },
  { key: 'd6', title: 'Ayah',              author: 'Andrea Hirata',         coverId: 10521865, genre: ['Fiksi','Keluarga'],         desc: 'Sabari mencintai Marlena dengan cara paling tulus — kisah tentang cinta, pengorbanan, dan arti menjadi seorang ayah.',  year: '2015', pages: 382 },
];

const COMMUNITY = [
  { name:'Rina D.',  avatar:'R', rating:4, book:'Laskar Pelangi',  coverId:8231568,  key:'d1', text:'Buku yang sangat menginspirasi dan mengharukan! Membaca ini seperti ikut merasakan perjuangan mereka.',         time:'2 jam lalu'  },
  { name:'Budi S.',  avatar:'B', rating:5, book:'Bumi Manusia',    coverId:8750787,  key:'d2', text:'Pramoedya selalu berhasil memukau pembacanya. Karya terbaik sastra Indonesia yang pernah ada.',              time:'5 jam lalu'  },
  { name:'Sari A.',  avatar:'S', rating:5, book:'Cantik Itu Luka', coverId:12699828, key:'d3', text:'Masterpiece sastra Indonesia yang wajib dibaca. Realisme magis-nya benar-benar bikin kagum.',                time:'1 hari lalu' },
  { name:'Dika P.',  avatar:'D', rating:4, book:'Perahu Kertas',   coverId:7886745,  key:'d4', text:'Romantis, mengalir, dan sangat indah. Dee Lestari selalu tahu cara menyentuh hati pembaca.',                  time:'2 hari lalu' },
  { name:'Maya K.',  avatar:'M', rating:5, book:'Negeri 5 Menara', coverId:8913924,  key:'d5', text:'Man jadda wajada! Novel ini mengubah perspektifku tentang pendidikan dan ketekunan. Sangat recommendeed!',   time:'3 hari lalu' },
  { name:'Reza F.',  avatar:'R', rating:4, book:'Ayah',            coverId:10521865, key:'d6', text:'Andrea Hirata kembali dengan kisah yang memukau. Sabari adalah karakter paling lovable yang pernah kubaca.', time:'4 hari lalu' },
];

// ── Skeleton card untuk loading state ─────────────────────────────────────
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

// ── HomePage ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user }   = useAuthStore();
  const { theme }  = useTheme();
  const isLight    = theme === 'light';
  const firstName  = user?.displayName?.split(' ')[0] || 'Pembaca';

  // AI recommendations
  const { recommendations: aiReco, loading: aiLoading } = useRecommendations();

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
                { icon: BookCopy, val: '3',  label: 'Dipinjam'  },
                { icon: Flame,    val: '12', label: 'Hari streak' },
                { icon: CircleCheckBig, val: '24', label: 'Selesai' },
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

      {/* BACAAN POPULER */}
      <section className="mt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Bacaan Populer</h2>
          <Link href="/popular" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <PopularCarousel books={DUMMY_POPULAR} isLight={isLight} />
      </section>

      {/* ── REKOMENDASI PUSTARAI ── */}
      <section className="mt-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Rekomendasi PustarAI</h2>
          </div>
          <Link href="/recommendations/chat" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <div className="flex gap-4 px-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
          {aiLoading
            ? Array(5).fill(0).map((_, i) => <AiRecoCardSkeleton key={i} isLight={isLight} />)
            : aiReco.length > 0
              ? aiReco.map((reco, i) => (
                  <AiRecoCard key={reco.book_id} reco={reco} index={i} isLight={isLight} />
                ))
              : (
                // Fallback kalau AI tidak merespons
                <p className="text-sm px-1 py-8" style={{ color: 'var(--muted)' }}>
                  Rekomendasi belum tersedia. Pastikan server AI berjalan.
                </p>
              )
          }
        </div>
      </section>

      {/* KOMUNITAS */}
      <section className="max-w-7xl mx-auto px-4 mt-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gold" />
            <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text)' }}>Koleksi Komunitas</h2>
          </div>
          <Link href="/community" className="text-gold text-xs font-medium hover:underline">Lihat semua →</Link>
        </div>
        <CommunitySection reviews={COMMUNITY} isLight={isLight} />
      </section>
    </div>
  );
}

// ── Community ──────────────────────────────────────────────────────────────
function CommunitySection({ reviews, isLight }: { reviews: typeof COMMUNITY; isLight: boolean }) {
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  return (
    <>
      <div className="lg:hidden flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {reviews.map((r, i) => <CommunityCard key={i} review={r} index={i} isLight={isLight} liked={!!liked[i]} onLike={() => setLiked(l => ({ ...l, [i]: !l[i] }))} />)}
      </div>
      <div className="hidden lg:grid grid-cols-3 gap-3">
        {reviews.map((r, i) => <CommunityCard key={i} review={r} index={i} isLight={isLight} liked={!!liked[i]} onLike={() => setLiked(l => ({ ...l, [i]: !l[i] }))} />)}
      </div>
    </>
  );
}

function CommunityCard({ review, index, isLight, liked, onLike }: {
  review: typeof COMMUNITY[0]; index: number; isLight: boolean; liked: boolean; onLike: () => void;
}) {
  const src = coverUrl(review.coverId);
  return (
    <motion.div className="flex-shrink-0 w-64 lg:w-auto rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }} whileHover={{ y: -2 }}>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
          {review.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{review.name}</p>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn('w-2.5 h-2.5', s <= review.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{review.time}</span>
          </div>
        </div>
        <Link href={`/book/${review.key}`} className="flex-shrink-0">
          <div className="w-8 h-12 rounded-lg overflow-hidden shadow">
            {src && <img src={src} alt={review.book} className="w-full h-full object-cover" />}
          </div>
        </Link>
      </div>

      <Link href={`/book/${review.key}`}>
        <p className="text-xs font-semibold text-gold/80 hover:text-gold mb-1.5 transition-colors">{review.book}</p>
      </Link>
      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--muted)' }}>{review.text}</p>

      <motion.button onClick={onLike}
        className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', liked ? 'text-rose-400' : '')}
        style={!liked ? { color: 'var(--muted)' } : {}} whileTap={{ scale: 0.9 }}>
        <motion.div animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.3 }}>
          <Heart className={cn('w-3.5 h-3.5', liked && 'fill-rose-400')} />
        </motion.div>
        {liked ? 'Disukai' : 'Suka'}
      </motion.button>
    </motion.div>
  );
}