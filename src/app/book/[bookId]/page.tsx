'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, BookOpen, Users, CheckCircle,
  X, BookMarked, Share2, Heart, Clock, ChevronRight, PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import ReviewModal from '@/components/shared/ReviewModal';
import { useSimilarBooks } from '@/hooks/useSimilarBooks';

const coverUrl = (id?: number, s = 'L') =>
  id ? `https://covers.openlibrary.org/b/id/${id}-${s}.jpg` : null;

// ── Dummy data ────────────────────────────────────────────────────────────────
interface BookDetail {
  key: string; title: string; author: string; coverId?: number;
  genre: string[]; rating: number; ratingCount: number;
  year: number; pages: number; available: number; total: number; queue: number;
  synopsis: string;
  relatedBooks: { key: string; title: string; author: string; coverId?: number }[];
  reviews: { name: string; avatar: string; rating: number; text: string }[];
}

type ModalState = 'none' | 'confirm' | 'success' | 'queue';

const DUMMY_BOOKS: Record<string, BookDetail> = {
  'd1': { key:'d1', title:'Laskar Pelangi', author:'Andrea Hirata', coverId:8231568, genre:['Fiksi','Drama'], rating:4.7, ratingCount:12840, year:2005, pages:529, available:3, total:6, queue:0, synopsis:'Laskar Pelangi adalah novel pertama karya Andrea Hirata yang diterbitkan oleh Bentang Pustaka pada tahun 2005. Novel ini menceritakan kisah sepuluh anak dari keluarga miskin yang bersekolah di sebuah sekolah SD dan SMP yang hampir roboh di Belitung.\n\nMereka adalah anak-anak yang penuh semangat dan cita-cita, meski hidup dalam keterbatasan. Di bawah bimbingan dua guru luar biasa, Bu Mus dan Pak Harfan, mereka berjuang untuk mendapatkan pendidikan yang layak.', relatedBooks:[{key:'d6',title:'Ayah',author:'Andrea Hirata',coverId:10521865},{key:'d2',title:'Bumi Manusia',author:'Pramoedya Ananta Toer',coverId:8750787},{key:'d3',title:'Cantik Itu Luka',author:'Eka Kurniawan',coverId:12699828}], reviews:[{name:'Rina D.',avatar:'R',rating:5,text:'Buku yang sangat menginspirasi! Andrea Hirata membawa kita ke dunia yang penuh warna dan harapan.'},{name:'Budi S.',avatar:'B',rating:4,text:'Kisah yang mengharukan tentang semangat belajar anak-anak Belitung. Highly recommended!'},{name:'Sari A.',avatar:'S',rating:5,text:'Membaca ini di tengah malam sambil nangis. Masterpiece sastra Indonesia.'}] },
  'd2': { key:'d2', title:'Bumi Manusia', author:'Pramoedya Ananta Toer', coverId:8750787, genre:['Sastra','Sejarah'], rating:4.9, ratingCount:9210, year:1980, pages:368, available:1, total:4, queue:3, synopsis:'Bumi Manusia adalah novel pertama dari tetralogi Pulau Buru karya Pramoedya Ananta Toer. Novel ini mengisahkan Minke, seorang pemuda pribumi terpelajar yang hidup di era kolonial Belanda pada awal abad ke-20.\n\nMelalui mata Minke, pembaca diajak melihat ketidakadilan kolonialisme, perjuangan identitas, dan cinta yang melampaui batas ras dan kelas sosial.', relatedBooks:[{key:'d1',title:'Laskar Pelangi',author:'Andrea Hirata',coverId:8231568},{key:'d3',title:'Cantik Itu Luka',author:'Eka Kurniawan',coverId:12699828},{key:'d5',title:'Negeri 5 Menara',author:'Ahmad Fuadi',coverId:8913924}], reviews:[{name:'Dika P.',avatar:'D',rating:5,text:'Pramoedya adalah maestro. Bumi Manusia adalah karya yang wajib dibaca setiap orang Indonesia.'},{name:'Maya K.',avatar:'M',rating:5,text:'Minke adalah karakter yang paling kompleks yang pernah kutemui dalam sastra Indonesia.'}] },
  'd3': { key:'d3', title:'Cantik Itu Luka', author:'Eka Kurniawan', coverId:12699828, genre:['Fiksi','Realisme Magis'], rating:4.6, ratingCount:7330, year:2002, pages:505, available:0, total:5, queue:4, synopsis:'Cantik Itu Luka adalah novel karya Eka Kurniawan yang menggabungkan realisme magis dengan sejarah Indonesia yang kelam. Novel ini berkisah tentang Dewi Ayu, seorang perempuan cantik yang bangkit dari kuburnya setelah dua puluh satu tahun.\n\nMelalui kisah tiga generasi keluarga Dewi Ayu, Eka Kurniawan mengeksplorasi tema kecantikan, kekerasan, trauma historis, dan nasib manusia.', relatedBooks:[{key:'d1',title:'Laskar Pelangi',author:'Andrea Hirata',coverId:8231568},{key:'d2',title:'Bumi Manusia',author:'Pramoedya Ananta Toer',coverId:8750787},{key:'d4',title:'Perahu Kertas',author:'Dee Lestari',coverId:7886745}], reviews:[{name:'Reza F.',avatar:'R',rating:5,text:'Realisme magis ala Eka Kurniawan benar-benar membuatku terpesona dari awal hingga akhir.'},{name:'Nisa W.',avatar:'N',rating:4,text:'Gelap, indah, dan membekas. Butuh waktu untuk mencerna kedalaman ceritanya.'}] },
  'd4': { key:'d4', title:'Perahu Kertas', author:'Dee Lestari', coverId:7886745, genre:['Romance','Coming-of-age'], rating:4.8, ratingCount:15200, year:2009, pages:444, available:4, total:6, queue:0, synopsis:'Perahu Kertas adalah novel karya Dee Lestari yang menceritakan kisah cinta antara Kugy dan Keenan — dua orang dengan mimpi besar yang bertemu di bangku kuliah.\n\nKugy, si penulis dongeng yang nyentrik, dan Keenan, pelukis berbakat yang terpaksa meninggalkan passionnya. Kisah mereka adalah tentang mengejar mimpi, menemukan cinta, dan belajar melepaskan.', relatedBooks:[{key:'d3',title:'Cantik Itu Luka',author:'Eka Kurniawan',coverId:12699828},{key:'d1',title:'Laskar Pelangi',author:'Andrea Hirata',coverId:8231568},{key:'d5',title:'Negeri 5 Menara',author:'Ahmad Fuadi',coverId:8913924}], reviews:[{name:'Lila S.',avatar:'L',rating:5,text:'Dee Lestari menulis cinta dengan cara yang begitu puitis dan tidak klise. Favorit sepanjang masa!'},{name:'Anto B.',avatar:'A',rating:4,text:'Romansa yang terasa nyata. Karakter Kugy sangat relatable dan menggemaskan.'}] },
  'd5': { key:'d5', title:'Negeri 5 Menara', author:'Ahmad Fuadi', coverId:8913924, genre:['Inspiratif','Religi'], rating:4.5, ratingCount:8760, year:2009, pages:423, available:2, total:4, queue:2, synopsis:'Negeri 5 Menara adalah novel pertama dari trilogi karya Ahmad Fuadi. Novel ini mengisahkan perjalanan Alif Fikri, seorang anak Minang yang terpaksa masuk pesantren Gontor meski ingin bersekolah di SMA biasa.\n\nDi Gontor, bersama lima sahabatnya yang masing-masing dari daerah berbeda, Alif belajar bahwa tekad dan doa bisa mengantarkan seseorang ke mana saja di dunia.', relatedBooks:[{key:'d1',title:'Laskar Pelangi',author:'Andrea Hirata',coverId:8231568},{key:'d2',title:'Bumi Manusia',author:'Pramoedya Ananta Toer',coverId:8750787},{key:'d6',title:'Ayah',author:'Andrea Hirata',coverId:10521865}], reviews:[{name:'Hendra T.',avatar:'H',rating:5,text:'Man jadda wajada. Novel ini mengubah cara pandangku tentang pendidikan dan tekad.'},{name:'Putri R.',avatar:'P',rating:4,text:'Sangat inspiratif! Ahmad Fuadi berhasil membawa pembaca ke dunia pesantren yang kaya.'}] },
  'd6': { key:'d6', title:'Ayah', author:'Andrea Hirata', coverId:10521865, genre:['Fiksi','Keluarga'], rating:4.7, ratingCount:6540, year:2015, pages:382, available:5, total:6, queue:0, synopsis:'Ayah adalah novel karya Andrea Hirata yang mengisahkan tentang Sabari, seorang pria sederhana yang mencintai Marlena dengan cara yang paling tulus dan setia.\n\nIni adalah kisah tentang cinta yang tak berbalas namun tak pernah padam, tentang pengorbanan seorang ayah, dan tentang bagaimana anak bisa menjadi cahaya dalam kegelapan hidup seseorang.', relatedBooks:[{key:'d1',title:'Laskar Pelangi',author:'Andrea Hirata',coverId:8231568},{key:'d4',title:'Perahu Kertas',author:'Dee Lestari',coverId:7886745},{key:'d5',title:'Negeri 5 Menara',author:'Ahmad Fuadi',coverId:8913924}], reviews:[{name:'Citra M.',avatar:'C',rating:5,text:'Andrea Hirata kembali dengan kisah yang memukau. Sabari adalah karakter yang paling lovable.'},{name:'Yudi P.',avatar:'Y',rating:4,text:'Membaca ini sambil teringat ayah saya. Sangat emosional dan indah.'}] },
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { ready } = useProtectedRoute();

  const bookKey = params?.bookId as string;
  const book    = DUMMY_BOOKS[bookKey];

  const { books: aiSimilar, loading: similarLoading } = useSimilarBooks(book?.title ?? '');
  
  const [modal,    setModal]    = useState<ModalState>('none');
  const [expanded, setExpanded] = useState(false);
  const [shared,   setShared]   = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // ── Persistent state via localStorage ────────────────────────────────────
  const WISHLIST_KEY = 'pustara_wishlist';
  const BORROWED_KEY = 'pustara_borrowed';

  const [wishlisted, setWishlisted] = useState(false);
  const [borrowed,   setBorrowed]   = useState(false);

  useEffect(() => {
    if (!book) return;
    const wl: string[] = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
    const br: string[] = JSON.parse(localStorage.getItem(BORROWED_KEY) || '[]');
    setWishlisted(wl.includes(book.key));
    setBorrowed(br.includes(book.key));
  }, [book?.key]);

  useEffect(() => {
    if (ready && !book) router.replace('/not-found');
  }, [ready, book, router]);

  useEffect(() => {
    if (!book) return;
    document.title = `Pustara | ${book.title}`;
    return () => { document.title = 'Pustara'; };
  }, [book?.title]);

  function toggleWishlist() {
    const wl: string[] = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
    const next = wishlisted
      ? wl.filter(k => k !== book.key)
      : [...wl, book.key];
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    setWishlisted(!wishlisted);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: book.title, text: `Baca "${book.title}" di Pustara!`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  function handleBorrow() { setModal('confirm'); }

  function handleConfirm() {
    const br: string[] = JSON.parse(localStorage.getItem(BORROWED_KEY) || '[]');
    if (!br.includes(book.key)) {
      localStorage.setItem(BORROWED_KEY, JSON.stringify([...br, book.key]));
    }
    setBorrowed(true);
    setModal('success');
  }

  function handleQueue() { setModal('queue'); }

  if (!ready || !book) return <PageSkeleton />;

  const src         = coverUrl(book.coverId, 'L');
  const isAvailable = book.available > 0;

  const borrowDate = new Date();
  const returnDate = new Date(borrowDate);
  returnDate.setDate(returnDate.getDate() + 7);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

  const tk = {
    bg:      isLight ? 'bg-parchment'            : 'bg-navy-900',
    surface: isLight ? 'bg-white'                : 'bg-navy-800/60',
    border:  isLight ? 'border-parchment-darker' : 'border-white/8',
    text:    isLight ? 'text-navy-900'           : 'text-white',
    muted:   isLight ? 'text-slate-500'          : 'text-slate-400',
    chip:    isLight ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white/5 border-white/15 text-white/70',
    modal:   isLight ? 'bg-white text-navy-900'  : 'bg-navy-800 text-white',
    modalMuted: isLight ? 'text-slate-500' : 'text-slate-400',
    modalSub:   isLight ? 'bg-slate-50'   : 'bg-navy-700/60',
    modalBtn:   isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/10 text-white/70 hover:bg-white/15',
  };

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* Back */}
        <motion.button onClick={() => router.back()}
          className={cn('flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors', tk.muted, 'hover:text-gold')}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </motion.button>

        <div className="lg:flex lg:gap-12 lg:items-start">

          {/* LEFT — cover + actions */}
          <motion.div className="lg:w-[300px] lg:flex-shrink-0"
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}>

            {/* Cover */}
            <div className="relative flex justify-center lg:justify-start mb-6 lg:mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gold/10 blur-2xl rounded-3xl scale-110 pointer-events-none" />
                <div className="relative w-48 lg:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gold/20">
                  {src
                    ? <img src={src} alt={book.title} className="w-full h-full object-cover" />
                    : <div className={cn('w-full h-full flex items-center justify-center', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                        <BookOpen className="w-12 h-12 text-gold/30" />
                      </div>
                  }
                </div>
              </div>
            </div>

            {/* Mobile title */}
            <div className="lg:hidden text-center mb-5">
              <h1 className={cn('font-serif text-2xl font-black leading-tight mb-1', tk.text)}>{book.title}</h1>
              <p className={cn('text-sm', tk.muted)}>{book.author}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-4 h-4', s <= Math.round(book.rating) ? 'text-gold fill-gold' : 'text-slate-600')} />
                ))}
                <span className="text-gold font-bold text-sm ml-1">{book.rating}</span>
                <span className={cn('text-xs', tk.muted)}>({book.ratingCount.toLocaleString()})</span>
              </div>
            </div>

            {/* Availability card */}
            <div className={cn('rounded-2xl border p-4 mb-4', tk.surface, tk.border)}>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn('rounded-xl p-3 text-center', isLight ? 'bg-parchment' : 'bg-navy-700/50')}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BookMarked className="w-3.5 h-3.5 text-gold" />
                    <span className={cn('text-[11px] font-medium', tk.muted)}>Tersedia</span>
                  </div>
                  <p className={cn('font-black text-lg font-serif', tk.text)}>
                    {book.available}<span className={cn('text-sm font-sans font-normal', tk.muted)}>/{book.total}</span>
                  </p>
                  <p className={cn('text-[10px] mt-0.5', tk.muted)}>e-book tersedia</p>
                </div>
                <div className={cn('rounded-xl p-3 text-center', isLight ? 'bg-parchment' : 'bg-navy-700/50')}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-gold" />
                    <span className={cn('text-[11px] font-medium', tk.muted)}>Antrean</span>
                  </div>
                  <p className={cn('font-black text-lg font-serif', tk.text)}>{book.queue}</p>
                  <p className={cn('text-[10px] mt-0.5', tk.muted)}>orang menunggu</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              {borrowed ? (
                /* Already borrowed — show Read button */
                <Link href={`/read/${book.key}`}>
                  <motion.button
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                    whileTap={{ scale: 0.98 }}>
                    <BookOpen className="w-4 h-4" />
                    Lanjut Membaca
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              ) : isAvailable ? (
                <motion.button
                  onClick={handleBorrow}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-navy-800 text-white hover:bg-navy-700 transition-colors shadow-lg shadow-navy-900/30"
                  whileTap={{ scale: 0.98 }}>
                  <BookOpen className="w-4 h-4" />
                  Pinjam Buku
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleQueue}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-lg"
                  whileTap={{ scale: 0.98 }}>
                  <Clock className="w-4 h-4" />
                  Masuk Antrean ({book.queue} menunggu)
                </motion.button>
              )}

              <div className="flex gap-2">
                <motion.button
                  onClick={toggleWishlist}
                  className={cn(
                    'flex-1 py-3 rounded-2xl text-sm font-medium border transition-all flex items-center justify-center gap-2',
                    wishlisted
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : cn(tk.surface, tk.border, tk.muted, 'hover:border-gold/40')
                  )}
                  whileTap={{ scale: 0.97 }}>
                  <Heart className={cn('w-4 h-4', wishlisted && 'fill-red-500 text-red-500')} />
                  {wishlisted ? 'Disimpan' : 'Simpan'}
                </motion.button>

                <motion.button
                  onClick={handleShare}
                  className={cn(
                    'flex-1 py-3 rounded-2xl text-sm font-medium border transition-all flex items-center justify-center gap-2',
                    shared
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : cn(tk.surface, tk.border, tk.muted, 'hover:border-gold/40')
                  )}
                  whileTap={{ scale: 0.97 }}>
                  <Share2 className="w-4 h-4" />
                  {shared ? 'Disalin!' : 'Bagikan'}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — info */}
          <motion.div className="flex-1 mt-8 lg:mt-0"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}>

            {/* Desktop title */}
            <div className="hidden lg:block mb-5">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {book.genre.map(g => (
                  <span key={g} className={cn('text-xs font-medium px-3 py-1 rounded-full border', tk.chip)}>{g}</span>
                ))}
              </div>
              <h1 className={cn('font-serif text-4xl xl:text-5xl font-black leading-tight mb-2', tk.text)}>
                {book.title}
              </h1>
              <p className={cn('text-base mb-4', tk.muted)}>{book.author}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={cn('w-4 h-4', s <= Math.round(book.rating) ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                  ))}
                </div>
                <span className="text-gold font-bold">{book.rating}</span>
                <span className={cn('text-sm', tk.muted)}>({book.ratingCount.toLocaleString()} ulasan)</span>
                <span className={cn('text-sm', tk.muted)}>· {book.year} · {book.pages} halaman</span>
              </div>
            </div>

            <div className={cn('h-px mb-6', isLight ? 'bg-parchment-darker' : 'bg-white/8')} />

            {/* Synopsis */}
            <section className="mb-8">
              <h2 className={cn('font-serif text-xl font-bold mb-3', tk.text)}>Sinopsis</h2>
              <div className={cn('rounded-2xl border p-5', tk.surface, tk.border)}>
                <p className={cn('text-sm leading-relaxed whitespace-pre-line', tk.muted)}>
                  {expanded ? book.synopsis : book.synopsis.slice(0, 240) + '...'}
                </p>
                <button onClick={() => setExpanded(e => !e)}
                  className="text-gold text-xs font-semibold mt-3 hover:underline">
                  {expanded ? 'Sembunyikan ↑' : 'Baca Selengkapnya →'}
                </button>
              </div>
            </section>

            {/* Reviews */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('font-serif text-xl font-bold', tk.text)}>Ulasan Pembaca</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReviewOpen(true)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                      isLight ? 'border-navy-200 text-navy-700 hover:bg-navy-50 hover:border-gold/40' : 'border-white/10 text-white/70 hover:bg-white/5 hover:border-gold/40'
                    )}>
                    <PenLine className="w-3.5 h-3.5" />
                    Tulis Ulasan
                  </button>
                  <Link href={`/book/${book.key}/reviews`}
                    className="text-gold text-xs font-semibold hover:underline">
                    Lihat Semua
                  </Link>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {book.reviews.slice(0, 2).map((r, i) => (
                  <motion.div key={i}
                    className={cn('rounded-2xl border p-4', tk.surface, tk.border)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                        {r.avatar}
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', tk.text)}>{r.name}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className={cn('text-sm leading-relaxed', tk.muted)}>{r.text}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Related books */}
            {/* <section>
              <h2 className={cn('font-serif text-xl font-bold mb-3', tk.text)}>Buku Serupa</h2>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {book.relatedBooks.map((rb, i) => (
                  <Link key={rb.key} href={`/book/${rb.key}`}>
                    <motion.div className="cursor-pointer group"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }} whileHover={{ y: -4 }}>
                      <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-2', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                        {rb.coverId && (
                          <img src={coverUrl(rb.coverId, 'M')!} alt={rb.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                      </div>
                      <p className={cn('text-xs font-medium leading-tight line-clamp-2', tk.text)}>{rb.title}</p>
                      <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{rb.author}</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section> */}
            <section>
              <h2 className={cn('font-serif text-xl font-bold mb-3', tk.text)}>Buku Serupa</h2>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {similarLoading
                  ? Array(4).fill(0).map((_, i) => (
                      <div key={i} className={cn('w-full aspect-[2/3] rounded-xl animate-pulse', isLight ? 'bg-parchment-darker' : 'bg-navy-700')} />
                    ))
                  : aiSimilar.length > 0
                    ? aiSimilar.map((rb) => {
                        const hue = (rb.title.charCodeAt(0) + (rb.title.charCodeAt(1) || 0)) % 360;
                        return (
                          <motion.div key={rb.book_id} className="cursor-pointer group"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -4 }}>
                            <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-2 flex items-center justify-center',
                              isLight ? 'bg-parchment-darker' : 'bg-navy-700')}
                              style={{ background: `hsl(${hue}, 35%, ${isLight ? '75%' : '25%'})` }}>
                              <BookOpen className="w-6 h-6 text-white/30" />
                            </div>
                            <p className={cn('text-xs font-medium leading-tight line-clamp-2', tk.text)}>{rb.title}</p>
                            <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{rb.authors}</p>
                          </motion.div>
                        );
                      })
                    : book.relatedBooks.map((rb, i) => (
                        // Fallback ke data statis jika AI tidak ada
                        <Link key={rb.key} href={`/book/${rb.key}`}>
                          <motion.div className="cursor-pointer group"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.04 }} whileHover={{ y: -4 }}>
                            <div className={cn('w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-2', isLight ? 'bg-parchment-darker' : 'bg-navy-700')}>
                              {rb.coverId && <img src={coverUrl(rb.coverId, 'M')!} alt={rb.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                            </div>
                            <p className={cn('text-xs font-medium leading-tight line-clamp-2', tk.text)}>{rb.title}</p>
                            <p className={cn('text-[10px] mt-0.5 truncate', tk.muted)}>{rb.author}</p>
                          </motion.div>
                        </Link>
                      ))
                }
              </div>
            </section>
          </motion.div>
        </div>
      </main>

      {/* ══ MODALS ══ */}
      <AnimatePresence>
        {modal !== 'none' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => modal !== 'success' && setModal('none')} />

            {/* ── CONFIRM ── */}
            {modal === 'confirm' && (
              <motion.div className={cn('relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl', tk.modal)}
                initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

                <button onClick={() => setModal('none')}
                  className={cn('absolute top-4 right-4 z-10 transition-colors', tk.modalMuted, 'hover:text-gold')}>
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 p-6 pb-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                    {src && <img src={src} alt={book.title} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider mb-1', tk.modalMuted)}>Konfirmasi Peminjaman</p>
                    <h3 className="font-serif text-lg font-black leading-tight">{book.title}</h3>
                    <p className={cn('text-sm mt-1', tk.modalMuted)}>{book.author}</p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className={cn('rounded-2xl p-4 space-y-2.5 mb-5', tk.modalSub)}>
                    {[
                      ['Durasi Peminjaman', '7 Hari'],
                      ['Akses Sampai',      fmt(returnDate)],
                      ['Format',            'PDF & ePub'],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className={cn('text-sm', tk.modalMuted)}>{l}</span>
                        <span className="text-sm font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setModal('none')}
                      className={cn('flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-colors', tk.modalBtn)}>
                      Batalkan
                    </button>
                    <motion.button onClick={handleConfirm}
                      className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white bg-navy-800 hover:bg-navy-700 transition-colors"
                      whileTap={{ scale: 0.97 }}>
                      Pinjam Sekarang
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── QUEUE ── */}
            {modal === 'queue' && (
              <motion.div className={cn('relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl', tk.modal)}
                initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

                <button onClick={() => setModal('none')}
                  className={cn('absolute top-4 right-4 z-10 transition-colors', tk.modalMuted, 'hover:text-gold')}>
                  <X className="w-5 h-5" />
                </button>

                <div className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="font-serif text-xl font-black mb-1">Buku Sedang Dipinjam</h3>
                  <p className={cn('text-sm leading-relaxed mb-4', tk.modalMuted)}>
                    Saat ini ada <strong>{book.queue} orang</strong> dalam antrean.
                    Kamu akan mendapat notifikasi ketika buku tersedia.
                  </p>
                  <div className={cn('rounded-2xl p-4 mb-5 text-left', tk.modalSub)}>
                    <p className={cn('text-xs font-semibold mb-1', tk.modalMuted)}>Estimasi Waktu Tunggu</p>
                    <p className="text-lg font-black text-amber-400">~{book.queue * 7} Hari</p>
                    <p className={cn('text-xs mt-0.5', tk.modalMuted)}>berdasarkan rata-rata peminjaman 7 hari</p>
                  </div>
                  <motion.button onClick={() => setModal('none')}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    whileTap={{ scale: 0.97 }}>
                    Masuk Antrean
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── SUCCESS ── */}
            {modal === 'success' && (
              <motion.div className={cn('relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 text-center', tk.modal)}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}>

                <motion.div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}>
                  <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
                </motion.div>

                <motion.h3 className="font-serif text-2xl font-black mb-2"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  Berhasil Dipinjam!
                </motion.h3>

                <motion.p className={cn('text-sm leading-relaxed mb-2', tk.modalMuted)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  <strong className="text-gold">{book.title}</strong> kini ada di rak bacamu.
                  Tersedia hingga {fmt(returnDate)}.
                </motion.p>

                <motion.div className="flex flex-col gap-2.5 mt-6"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <Link href={`/read/${book.key}`}>
                    <button className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors">
                      Mulai Membaca
                    </button>
                  </Link>
                  <button onClick={() => setModal('none')}
                    className={cn('w-full py-3 rounded-2xl text-sm font-medium transition-colors', tk.modalBtn)}>
                    Kembali ke Detail
                  </button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* ══ REVIEW MODAL ══ */}
      <ReviewModal
        bookTitle={book.title}
        bookKey={book.key}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}