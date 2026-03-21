// 'use client';
// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Check } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { useAuth } from '@/hooks/useAuth';
// import { useTheme } from '@/components/theme/ThemeProvider';

// const GENRES = [
//   'Fiksi', 'Fiksi Ilmiah', 'Misteri', 'Self-Help',
//   'Sejarah', 'Nonfiksi', 'Romansa', 'Teenlit',
//   'Biografi', 'Sains', 'Filsafat', 'Anak',
// ];

// type Gender = 'Laki-Laki' | 'Perempuan' | 'Tidak ingin diketahui' | '';
// type AgeRange = '< 20 Tahun' | '21 - 30 Tahun' | '31 - 40 Tahun' | '> 40 Tahun' | '';

// export default function PersonalizationPage() {
//   const router = useRouter();
//   const { user }  = useAuth();
//   const { theme } = useTheme();
//   const isLight = theme === 'light';

//   const [gender, setGender]   = useState<Gender>('');
//   const [age, setAge]         = useState<AgeRange>('');
//   const [genres, setGenres]   = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError]     = useState('');

//   function toggleGenre(g: string) {
//     setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
//   }

//   async function handleNext() {
//     if (!user) { setError('User tidak valid'); return; }
//     setLoading(true);
//     setError('');
//     try {
//       const token = await user.getIdToken();
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
//       const response = await fetch(`${apiUrl}/survey/save`, {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           favoriteGenre: genres.join(',') || null,
//           age: age || null,
//           gender: gender || null,
//         }),
//       });
//       const data = await response.json();
//       if (!data.success) throw new Error(data.error || 'Gagal menyimpan preferensi');
//       localStorage.setItem('pustara_personalized', 'true');
//       localStorage.setItem('pustara_prefs', JSON.stringify({ gender, age, genres }));
//       router.replace('/catalog');
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleSkip() {
//     localStorage.setItem('pustara_personalized', 'true');
//     router.replace('/catalog');
//   }

//   const canProceed = gender !== '' || age !== '' || genres.length > 0;

//   // ── Token classes ──
//   const bg       = isLight ? 'bg-white'      : 'bg-navy-900';
//   const heading  = isLight ? 'text-navy-800'  : 'text-white';
//   const subText  = isLight ? 'text-slate-600' : 'text-slate-400';
//   const label    = isLight ? 'text-navy-800'  : 'text-white/80';
//   const logo     = isLight ? 'bg-navy-800'    : 'bg-navy-700';
//   const logoText = isLight ? 'text-navy-800 font-bold' : 'text-white/80 font-bold';
//   const footer   = isLight ? 'bg-white border-slate-100' : 'bg-navy-900 border-white/10';

//   const radioActive   = isLight ? 'border-navy-700 bg-navy-50 text-navy-800'  : 'border-gold bg-gold/10 text-white';
//   const radioInactive = isLight ? 'border-slate-200 bg-white text-slate-700 hover:border-navy-300' : 'border-white/10 bg-navy-800/60 text-white/70 hover:border-white/25';
//   const radioDotActive   = isLight ? 'border-navy-700 bg-navy-700' : 'border-gold bg-gold';
//   const radioDotInactive = isLight ? 'border-slate-300' : 'border-white/25';

//   const chipActive   = isLight ? 'border-navy-700 bg-navy-700 text-white'  : 'border-gold bg-gold/20 text-gold';
//   const chipInactive = isLight ? 'border-slate-200 bg-white text-slate-700 hover:border-navy-300' : 'border-white/10 bg-navy-800/60 text-white/70 hover:border-white/25';
//   const chipBoxActive   = isLight ? 'border-white bg-white' : 'border-gold bg-gold';
//   const chipBoxInactive = isLight ? 'border-slate-300'      : 'border-white/25';
//   const checkColor  = isLight ? 'text-navy-700' : 'text-navy-900';

//   const skipBtn = isLight
//     ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
//     : 'border-white/10 text-white/50 hover:bg-white/5';

//   return (
//     <main className={cn('min-h-screen max-w-sm mx-auto flex flex-col', bg)}>
//       {/* Header */}
//       <div className="px-6 pt-12 pb-4">
//         <div className="flex items-center gap-3 mb-6">
//           <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', logo)}>
//             <span className="font-serif text-gold font-black text-xs">P</span>
//           </div>
//           <span className={cn('font-serif tracking-wider text-sm', logoText)}>PUSTARA</span>
//         </div>

//         <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
//           <h1 className={cn('text-xl font-bold', heading)}>Personalisasi PustarAI</h1>
//           <p className={cn('text-sm mt-1 leading-relaxed', subText)}>
//             Bantu sistem rekomendasi AI kami memberikan rekomendasi yang tepat untukmu
//           </p>
//         </motion.div>

//         <AnimatePresence>
//           {error && (
//             <motion.div
//               initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
//               className={cn(
//                 'mt-4 p-3 border rounded-lg text-sm',
//                 isLight
//                   ? 'bg-red-50 border-red-200 text-red-600'
//                   : 'bg-red-900/20 border-red-500/30 text-red-400'
//               )}>
//               {error}
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* Scrollable content */}
//       <div className="flex-1 overflow-y-auto px-6 pb-32">
//         <motion.div className="space-y-7"
//           initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

//           {/* Gender */}
//           <section>
//             <h2 className={cn('font-semibold text-sm mb-3', label)}>Jenis Kelamin</h2>
//             <div className="flex flex-col gap-2">
//               {(['Laki-Laki', 'Perempuan', 'Tidak ingin diketahui'] as Gender[]).map(g => (
//                 <button key={g} onClick={() => setGender(g)}
//                   className={cn(
//                     'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
//                     gender === g ? radioActive : radioInactive
//                   )}>
//                   <div className={cn(
//                     'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
//                     gender === g ? radioDotActive : radioDotInactive
//                   )}>
//                     {gender === g && <div className="w-2 h-2 rounded-full bg-white" />}
//                   </div>
//                   <span>{g === 'Laki-Laki' ? '👨' : g === 'Perempuan' ? '👩' : '🤐'}</span>
//                   <span>{g}</span>
//                 </button>
//               ))}
//             </div>
//           </section>

//           {/* Age */}
//           <section>
//             <h2 className={cn('font-semibold text-sm mb-3', label)}>Umur</h2>
//             <div className="flex flex-col gap-2">
//               {(['< 20 Tahun', '21 - 30 Tahun', '31 - 40 Tahun', '> 40 Tahun'] as AgeRange[]).map(a => (
//                 <button key={a} onClick={() => setAge(a)}
//                   className={cn(
//                     'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
//                     age === a ? radioActive : radioInactive
//                   )}>
//                   <div className={cn(
//                     'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
//                     age === a ? radioDotActive : radioDotInactive
//                   )}>
//                     {age === a && <div className="w-2 h-2 rounded-full bg-white" />}
//                   </div>
//                   <span>{a}</span>
//                 </button>
//               ))}
//             </div>
//           </section>

//           {/* Genres */}
//           <section>
//             <h2 className={cn('font-semibold text-sm mb-3', label)}>Genre Favorit</h2>
//             <div className="grid grid-cols-2 gap-2">
//               {GENRES.map(g => {
//                 const sel = genres.includes(g);
//                 return (
//                   <button key={g} onClick={() => toggleGenre(g)}
//                     className={cn(
//                       'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
//                       sel ? chipActive : chipInactive
//                     )}>
//                     <div className={cn(
//                       'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
//                       sel ? chipBoxActive : chipBoxInactive
//                     )}>
//                       {sel && <Check className={cn('w-3 h-3', checkColor)} />}
//                     </div>
//                     {g}
//                   </button>
//                 );
//               })}
//             </div>
//           </section>
//         </motion.div>
//       </div>

//       {/* Fixed bottom actions */}
//       <div className={cn(
//         'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm border-t px-6 py-4 flex gap-3',
//         footer
//       )}>
//         <button onClick={handleSkip} disabled={loading}
//           className={cn(
//             'flex-1 py-3.5 border rounded-xl text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50',
//             skipBtn
//           )}>
//           Lewati
//         </button>
//         <button onClick={handleNext} disabled={!canProceed || loading}
//           className="flex-1 py-3.5 bg-navy-700 text-white rounded-xl text-sm font-semibold
//                      hover:bg-navy-600 active:scale-[0.98] transition-all disabled:opacity-40
//                      disabled:cursor-not-allowed flex items-center justify-center gap-1">
//           {loading ? (
//             <>
//               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//               Menyimpan...
//             </>
//           ) : (
//             <>Lanjutkan <span>›</span></>
//           )}
//         </button>
//       </div>
//     </main>
//   );
// }

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme/ThemeProvider';
import ComboLogo from '@/components/icons/ComboLogo';

const GENRES = [
  { label: 'Fiksi', emoji: '📖' },
  { label: 'Fiksi Ilmiah', emoji: '🚀' },
  { label: 'Misteri', emoji: '🔍' },
  { label: 'Self-Help', emoji: '💡' },
  { label: 'Sejarah', emoji: '🏛️' },
  { label: 'Nonfiksi', emoji: '📰' },
  { label: 'Romansa', emoji: '💝' },
  { label: 'Teenlit', emoji: '✨' },
  { label: 'Biografi', emoji: '👤' },
  { label: 'Sains', emoji: '🔬' },
  { label: 'Filsafat', emoji: '🧠' },
  { label: 'Anak', emoji: '🌈' },
];

type Gender = 'Laki-Laki' | 'Perempuan' | 'Tidak ingin diketahui' | '';
type AgeRange = '< 20 Tahun' | '21 - 30 Tahun' | '31 - 40 Tahun' | '> 40 Tahun' | '';

const GENDER_OPTIONS: { value: Gender; emoji: string; label: string }[] = [
  { value: 'Laki-Laki', emoji: '👨', label: 'Laki-Laki' },
  { value: 'Perempuan', emoji: '👩', label: 'Perempuan' },
  { value: 'Tidak ingin diketahui', emoji: '🤐', label: 'Tidak ingin diketahui' },
];

const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: '< 20 Tahun', label: '< 20 Tahun' },
  { value: '21 - 30 Tahun', label: '21 – 30 Tahun' },
  { value: '31 - 40 Tahun', label: '31 – 40 Tahun' },
  { value: '> 40 Tahun', label: '> 40 Tahun' },
];

// Stagger animation helpers
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

export default function PersonalizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [gender, setGender] = useState<Gender>('');
  const [age, setAge] = useState<AgeRange>('');
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleGenre(g: string) {
    setGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  }

  async function handleNext() {
    if (!user) { setError('User tidak valid'); return; }
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/survey/save`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favoriteGenre: genres.join(',') || null,
          age: age || null,
          gender: gender || null,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Gagal menyimpan preferensi');
      localStorage.setItem('pustara_personalized', 'true');
      localStorage.setItem('pustara_prefs', JSON.stringify({ gender, age, genres }));
      router.replace('/catalog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem('pustara_personalized', 'true');
    router.replace('/catalog');
  }

  const canProceed = gender !== '' || age !== '' || genres.length > 0;
  const totalSelected = (gender ? 1 : 0) + (age ? 1 : 0) + genres.length;

  // ── Token classes (unchanged from original) ──
  const bg = isLight ? 'bg-white' : 'bg-navy-900';
  const heading = isLight ? 'text-navy-800' : 'text-white';
  const subText = isLight ? 'text-slate-600' : 'text-slate-400';
  const label = isLight ? 'text-navy-800' : 'text-white/80';
  const logo = isLight ? 'bg-navy-800' : 'bg-navy-700';
  const logoText = isLight ? 'text-navy-800 font-bold' : 'text-white/80 font-bold';
  const footer = isLight ? 'bg-white border-slate-100' : 'bg-navy-900 border-white/10';
  const divider = isLight ? 'border-slate-100' : 'border-white/10';

  const radioActive = isLight ? 'border-navy-700 bg-navy-50 text-navy-800' : 'border-gold bg-gold/10 text-white';
  const radioInactive = isLight ? 'border-slate-200 bg-white text-slate-700 hover:border-navy-300' : 'border-white/10 bg-navy-800/60 text-white/70 hover:border-white/25';
  const radioDotActive = isLight ? 'border-navy-700 bg-navy-700' : 'border-gold bg-gold';
  const radioDotInactive = isLight ? 'border-slate-300' : 'border-white/25';

  const chipActive = isLight ? 'border-navy-700 bg-navy-700 text-white shadow-md shadow-navy-700/20' : 'border-gold bg-gold/20 text-gold shadow-md shadow-gold/10';
  const chipInactive = isLight ? 'border-slate-200 bg-white text-slate-700 hover:border-navy-300 hover:bg-slate-50' : 'border-white/10 bg-navy-800/60 text-white/70 hover:border-white/25 hover:bg-navy-800';
  const chipBoxActive = isLight ? 'border-white bg-white' : 'border-gold bg-gold';
  const chipBoxInactive = isLight ? 'border-slate-300' : 'border-white/25';
  const checkColor = isLight ? 'text-navy-700' : 'text-navy-900';

  const skipBtn = isLight
    ? 'border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
    : 'border-white/10 text-white/50 hover:bg-white/5 active:bg-white/10';

  const sectionCard = isLight
    ? 'bg-slate-50/70 border border-slate-100 rounded-2xl p-5'
    : 'bg-navy-800/40 border border-white/[0.06] rounded-2xl p-5';

  const sectionLabelTag = isLight
    ? 'text-[10px] font-bold tracking-widest uppercase text-navy-500'
    : 'text-[10px] font-bold tracking-widest uppercase text-gold/70';

  const progressBar = isLight ? 'bg-navy-700' : 'bg-gold';
  const progressTrack = isLight ? 'bg-slate-200' : 'bg-white/10';
  const progressText = isLight ? 'text-navy-600' : 'text-gold';

  return (
    // Outer shell: centers content on desktop, full-width on mobile
    <div className={cn('min-h-screen w-full flex items-start justify-center', bg)}>
      {/* ── Left decorative panel — desktop only ── */}
      <aside className={cn(
        'hidden lg:flex flex-col justify-between sticky top-0 h-screen w-[360px] xl:w-[420px] flex-shrink-0 border-r px-10 py-12',
        isLight ? 'border-slate-100 bg-navy-800' : 'border-white/10 bg-navy-950',
      )}>
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-12">
            <ComboLogo className='bg-white/15 p-2 rounded-xl'/>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-gold/70">Powered by PustarAI</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Temukan buku<br />
              <span className="text-gold">yang tepat</span><br />
              untukmu
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              PustarAI belajar dari preferensimu untuk memberikan rekomendasi buku yang benar-benar kamu suka.
            </p>
          </motion.div>

          {/* Steps indicator */}
          <motion.div
            className="mt-10 space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { label: 'Jenis Kelamin', done: gender !== '' },
              { label: 'Rentang Umur', done: age !== '' },
              { label: 'Genre Favorit', done: genres.length > 0 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                  step.done ? 'bg-gold' : 'bg-white/10 border border-white/20'
                )}>
                  {step.done
                    ? <Check className="w-3.5 h-3.5 text-navy-900" />
                    : <span className="text-[10px] text-white/40 font-bold">{i + 1}</span>
                  }
                </div>
                <span className={cn(
                  'text-sm transition-colors',
                  step.done ? 'text-white font-medium' : 'text-white/40'
                )}>{step.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom quote */}
        <div className="border-t border-white/10 pt-6">
          <BookOpen className="w-5 h-5 text-white/20 mb-3" />
          <p className="text-white/30 text-xs leading-relaxed italic">
            "A reader lives a thousand lives before he dies. The man who never reads lives only one."
          </p>
          <p className="text-white/20 text-[10px] mt-2">— George R.R. Martin</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={cn(
        'flex flex-col flex-1 min-h-screen',
        // On mobile: full width. On desktop: constrain to readable width
        'w-full lg:max-w-2xl xl:max-w-3xl',
      )}>
        {/* Mobile-only header */}
        <div className="lg:hidden px-6 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', logo)}>
              <span className="font-serif text-gold font-black text-xs">P</span>
            </div>
            <span className={cn('font-serif tracking-wider text-sm', logoText)}>PUSTARA</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className={cn('text-xl font-bold', heading)}>Personalisasi PustarAI</h1>
            <p className={cn('text-sm mt-1 leading-relaxed', subText)}>
              Bantu sistem rekomendasi AI kami memberikan rekomendasi yang tepat untukmu
            </p>
          </motion.div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block px-10 pt-12 pb-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className={cn('text-2xl xl:text-3xl font-bold', heading)}>Personalisasi Profilmu</h1>
            <p className={cn('text-sm mt-2 leading-relaxed', subText)}>
              Isi preferensimu agar PustarAI bisa memberikan rekomendasi buku yang tepat.
            </p>
          </motion.div>

          {/* Progress bar — desktop */}
          <div className="mt-5 flex items-center gap-3">
            <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', progressTrack)}>
              <motion.div
                className={cn('h-full rounded-full', progressBar)}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, (totalSelected / 6) * 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className={cn('text-xs font-semibold tabular-nums', progressText)}>
              {totalSelected} dipilih
            </span>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn(
                'mx-6 lg:mx-10 mt-4 p-3 border rounded-lg text-sm',
                isLight ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-900/20 border-red-500/30 text-red-400'
              )}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scrollable form content ── */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-36 lg:pb-28 pt-4">
          <motion.div
            className="space-y-6 lg:space-y-5"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* ── Gender ── */}
            <motion.section variants={itemVariants} className={sectionCard}>
              <div className="flex items-center gap-2 mb-4">
                <span className={sectionLabelTag}>Jenis Kelamin</span>
                {gender && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={cn('ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      isLight ? 'bg-navy-100 text-navy-700' : 'bg-gold/20 text-gold'
                    )}>
                    Dipilih ✓
                  </motion.span>
                )}
              </div>
              {/* 3 columns on desktop, 1 column on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GENDER_OPTIONS.map(g => (
                  <motion.button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200',
                      gender === g.value ? radioActive : radioInactive
                    )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      gender === g.value ? radioDotActive : radioDotInactive
                    )}>
                      {gender === g.value && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-white"
                        />
                      )}
                    </div>
                    <span>{g.emoji}</span>
                    <span className="truncate">{g.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            {/* Divider on desktop between sections */}
            <div className={cn('hidden lg:block border-t', divider)} />

            {/* ── Age ── */}
            <motion.section variants={itemVariants} className={sectionCard}>
              <div className="flex items-center gap-2 mb-4">
                <span className={sectionLabelTag}>Rentang Umur</span>
                {age && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={cn('ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      isLight ? 'bg-navy-100 text-navy-700' : 'bg-gold/20 text-gold'
                    )}>
                    Dipilih ✓
                  </motion.span>
                )}
              </div>
              {/* 2x2 grid on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {AGE_OPTIONS.map(a => (
                  <motion.button
                    key={a.value}
                    onClick={() => setAge(a.value)}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200',
                      age === a.value ? radioActive : radioInactive
                    )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      age === a.value ? radioDotActive : radioDotInactive
                    )}>
                      {age === a.value && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-white"
                        />
                      )}
                    </div>
                    <span>{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <div className={cn('hidden lg:block border-t', divider)} />

            {/* ── Genres ── */}
            <motion.section variants={itemVariants} className={sectionCard}>
              <div className="flex items-center gap-2 mb-4">
                <span className={sectionLabelTag}>Genre Favorit</span>
                {genres.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className={cn('ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      isLight ? 'bg-navy-100 text-navy-700' : 'bg-gold/20 text-gold'
                    )}>
                    {genres.length} dipilih ✓
                  </motion.span>
                )}
              </div>
              {/* 2 cols mobile, 3 cols tablet, 4 cols desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {GENRES.map(g => {
                  const sel = genres.includes(g.label);
                  return (
                    <motion.button
                      key={g.label}
                      onClick={() => toggleGenre(g.label)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200',
                        sel ? chipActive : chipInactive
                      )}>
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200',
                        sel ? chipBoxActive : chipBoxInactive
                      )}>
                        {sel && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check className={cn('w-3 h-3', checkColor)} />
                          </motion.div>
                        )}
                      </div>
                      <span>{g.emoji}</span>
                      <span className="truncate">{g.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        </div>

        {/* ── Fixed bottom footer ── */}
        <div className={cn(
          'fixed bottom-0 left-0 right-0 lg:sticky lg:bottom-auto border-t px-6 lg:px-10 py-4',
          footer,
          // On desktop, stick to bottom of main content area
          'lg:mt-auto'
        )}>
          {/* Mobile progress bar */}
          <div className={cn('lg:hidden mb-3 flex items-center gap-3')}>
            <div className={cn('flex-1 h-1 rounded-full overflow-hidden', progressTrack)}>
              <motion.div
                className={cn('h-full rounded-full', progressBar)}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, (totalSelected / 6) * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className={cn('text-xs font-semibold tabular-nums', progressText)}>
              {totalSelected} dipilih
            </span>
          </div>

          <div className="flex gap-3 lg:justify-end">
            <button
              onClick={handleSkip}
              disabled={loading}
              className={cn(
                'lg:w-auto flex-1 lg:flex-none lg:px-6 py-3.5 border rounded-xl text-sm font-medium',
                'active:scale-[0.98] transition-all disabled:opacity-50',
                skipBtn
              )}>
              Lewati
            </button>
            <motion.button
              onClick={handleNext}
              disabled={!canProceed || loading}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex-1 lg:flex-none lg:min-w-[180px] py-3.5 lg:px-8 rounded-xl text-sm font-semibold',
                'bg-navy-700 text-white hover:bg-navy-600 transition-all',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
                // Glow on active state
                canProceed && !loading && (isLight
                  ? 'shadow-lg shadow-navy-700/25'
                  : 'shadow-lg shadow-gold/10'
                )
              )}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  Lanjutkan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}