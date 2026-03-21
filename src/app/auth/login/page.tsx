'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/icons/Logo';
import Wordmark from '@/components/icons/Wordmark';
import ComboLogo from '@/components/icons/ComboLogo';

// Floating orb particles — purely CSS/motion, no external images needed
const ORBS = [
  { w: 180, h: 180, x: '8%',  y: '12%', delay: 0,   dur: 7  },
  { w: 120, h: 120, x: '62%', y: '6%',  delay: 1.2, dur: 9  },
  { w: 90,  h: 90,  x: '78%', y: '55%', delay: 0.5, dur: 6  },
  { w: 140, h: 140, x: '20%', y: '65%', delay: 2.0, dur: 8  },
  { w: 70,  h: 70,  x: '50%', y: '40%', delay: 0.8, dur: 10 },
  { w: 100, h: 100, x: '85%', y: '80%', delay: 1.8, dur: 7  },
];

// Animated book spines stacked vertically, drifting up
const BOOKS = [
  { color: '#1e3456', accent: '#c9a84c', h: 130, w: 36, rot: -8,  x: '15%', delay: 0    },
  { color: '#0d2e1a', accent: '#a3c98e', h: 155, w: 32, rot: 4,   x: '28%', delay: 0.9  },
  { color: '#2d1a0e', accent: '#e8b86d', h: 110, w: 38, rot: -3,  x: '58%', delay: 0.4  },
  { color: '#1a1a2e', accent: '#9b87f5', h: 140, w: 30, rot: 7,   x: '72%', delay: 1.5  },
  { color: '#0a2a2a', accent: '#6ec6c6', h: 120, w: 34, rot: -5,  x: '44%', delay: 1.1  },
  { color: '#2a1a30', accent: '#d4a0d4', h: 160, w: 28, rot: 6,   x: '86%', delay: 0.2  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const p = localStorage.getItem('pustara_personalized');
      router.replace(p ? '/' : '/auth/personalization');
    } catch (err: any) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNew = getAdditionalUserInfo(result)?.isNewUser;
      const p = localStorage.getItem('pustara_personalized');
      router.replace(isNew || !p ? '/auth/personalization' : '/');
    } catch (err: any) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex">

      {/* ══ DESKTOP LEFT PANEL ══ */}
      <div className="hidden lg:flex flex-col w-[55%] bg-navy-900 relative overflow-hidden p-12">

        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

        {/* Floating gold orbs */}
        {ORBS.map((o, i) => (
          <motion.div key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: o.w, height: o.h,
              left: o.x, top: o.y,
              background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 60%, transparent 100%)',
              filter: 'blur(32px)',
            }}
            animate={{ y: [0, -22, 0], scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Animated floating books */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {BOOKS.map((b, i) => (
            <motion.div key={i}
              className="absolute rounded-sm shadow-2xl"
              style={{
                left: b.x, bottom: '-10%',
                width: b.w, height: b.h,
                background: b.color,
                rotate: b.rot,
                borderLeft: `3px solid ${b.accent}`,
                borderTop: `1px solid rgba(255,255,255,0.08)`,
              }}
              animate={{ y: [0, -420], opacity: [0, 0.7, 0.7, 0] }}
              transition={{
                duration: 12,
                delay: b.delay,
                repeat: Infinity,
                repeatDelay: 3,
                ease: 'easeInOut',
                times: [0, 0.1, 0.85, 1],
              }}>
              {/* Spine title lines */}
              <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1.5 px-1.5">
                <div className="h-0.5 w-full rounded-full opacity-30" style={{ background: b.accent }} />
                <div className="h-0.5 w-3/4 rounded-full opacity-20" style={{ background: b.accent }} />
                <div className="h-0.5 w-1/2 rounded-full opacity-20" style={{ background: b.accent }} />
              </div>
              {/* Bottom accent */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <div className="w-4 h-4 rounded-full opacity-25" style={{ background: b.accent }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col h-full">
          <Link href="/" className="w-fit">
            <ComboLogo className="h-11 w-auto" />
          </Link>

          <div className="mt-auto mb-10">
            <motion.p className="text-gold/60 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              Perpustakaan Digital Nusantara
            </motion.p>
            <motion.h1 className="font-serif text-5xl xl:text-[3.5rem] font-black text-white leading-[1.15] mb-5"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.34, 1.2, 0.64, 1] }}>
              Ribuan buku,<br /><span className="text-gold">satu tempat.</span>
            </motion.h1>
            <motion.p className="text-slate-400 text-base leading-relaxed max-w-xs"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              Perpustakaan digital milik masyarakat Indonesia.
            </motion.p>
          </div>

          <motion.div className="flex gap-8 mb-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {[['10K+','Judul Buku'],['500+','Penulis'],['50K+','Pembaca']].map(([v,l]) => (
              <div key={l}>
                <div className="font-serif text-2xl font-black text-gold">{v}</div>
                <div className="text-slate-500 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="p-4 bg-white/5 border border-white/10 rounded-2xl max-w-xs backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-gold fill-gold" />)}
            </div>
            <p className="text-slate-300 text-sm italic">"Pustara bikin gue semangat baca lagi!"</p>
            <p className="text-slate-500 text-xs mt-2">— Pengguna dari Yogyakarta</p>
          </motion.div>
        </div>
      </div>

      {/* ══ RIGHT ══ */}
      <div className="flex-1 flex flex-col bg-navy-900">

        {/* Mobile header */}
        <div className="lg:hidden relative overflow-hidden bg-navy-900 flex-shrink-0 pt-10 pb-12 px-6 min-h-[260px] flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(201,168,76,0.12)_0%,transparent_65%)]" />
          <div className="absolute -right-10 top-1/5 -translate-y-1/2 pointer-events-none z-0">
            <Logo className="w-72 h-72 blur-[7px]" />
          </div>
          <Link href="/" className="relative z-10 flex items-center gap-1.5 text-slate-400 text-sm mb-auto w-fit hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Wordmark />
            <h1 className="text-2xl font-bold text-white mb-1">Selamat Datang</h1>
            <p className="text-slate-500 text-sm">Masuk ke akun untuk kembali membaca</p>
          </motion.div>
        </div>

        {/* Form card */}
        <motion.div
          className="z-10 flex-1 bg-white rounded-[2rem] lg:rounded-none mb-8 mx-4 lg:m-0
                     flex flex-col justify-center px-6 pb-4 lg:px-14 xl:px-20"
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          <div className="w-full max-w-sm mx-auto lg:mx-0">
            <div className="hidden lg:block mb-8">
              <h2 className="font-serif text-3xl font-black text-navy-900 mb-1">Selamat datang</h2>
              <p className="text-slate-500 text-sm">
                Belum punya akun?{' '}
                <Link href="/auth/register" className="text-navy-700 font-semibold hover:underline">Daftar gratis</Link>
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div className={cn(
                'relative flex items-center border rounded-2xl transition-all duration-200 bg-slate-50',
                focusedField === 'email' ? 'border-navy-500 ring-2 ring-navy-200/50 bg-white' : 'border-slate-200'
              )}>
                <Mail className={cn('absolute left-4 w-4 h-4 transition-colors', focusedField === 'email' ? 'text-navy-600' : 'text-slate-400')} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 pr-4 py-3.5 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none rounded-2xl"
                  required />
              </div>

              <div className={cn(
                'relative flex items-center border rounded-2xl transition-all duration-200 bg-slate-50',
                focusedField === 'password' ? 'border-navy-500 ring-2 ring-navy-200/50 bg-white' : 'border-slate-200'
              )}>
                <Lock className={cn('absolute left-4 w-4 h-4 transition-colors', focusedField === 'password' ? 'text-navy-600' : 'text-slate-400')} />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Kata Sandi"
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 pr-11 py-3.5 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none rounded-2xl"
                  required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end -mt-1">
                <Link href="#" className="text-xs text-slate-500 hover:text-navy-700 hover:underline transition-colors">Lupa Sandi?</Link>
              </div>

              <motion.button type="submit" disabled={loading}
                className="w-full py-3.5 bg-navy-800 text-white rounded-2xl font-semibold text-sm hover:bg-navy-700 disabled:opacity-50 transition-colors relative overflow-hidden"
                whileTap={{ scale: 0.98 }}>
                <AnimatePresence mode="wait">
                  {loading
                    ? <motion.span key="l" className="flex items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memuat...
                      </motion.span>
                    : <motion.span key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Masuk</motion.span>
                  }
                </AnimatePresence>
              </motion.button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">atau</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <motion.button onClick={handleGoogle} disabled={loading}
              className="w-full py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 flex items-center justify-center gap-2.5 hover:bg-slate-50 hover:border-slate-300 transition-all"
              whileTap={{ scale: 0.98 }}>
              <GoogleIcon /> Masuk dengan Google
            </motion.button>

            <p className="text-center text-xs text-slate-400 mt-5">
              Belum memiliki akun?{' '}
              <Link href="/auth/register" className="text-navy-700 font-semibold hover:underline">Daftar</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function friendlyError(code: string) {
  const m: Record<string,string> = {
    'auth/user-not-found':    'Email tidak terdaftar.',
    'auth/wrong-password':    'Kata sandi salah.',
    'auth/invalid-email':     'Format email tidak valid.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/invalid-credential':'Email atau kata sandi salah.',
  };
  return m[code] || 'Terjadi kesalahan. Coba lagi.';
}



// 'use client';
// import { useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { motion, AnimatePresence } from 'framer-motion';
// import { signInWithEmailAndPassword, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
// import { auth, googleProvider } from '@/lib/firebase';
// import { Eye, EyeOff, Mail, Lock, ArrowLeft, Star } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import Logo from '@/components/icons/Logo';
// import Wordmark from '@/components/icons/Wordmark';
// import ComboLogo from '@/components/icons/ComboLogo';
// import { useTheme } from '@/components/theme/ThemeProvider';

// const ORBS = [
//   { w: 180, h: 180, x: '8%',  y: '12%', delay: 0,   dur: 7  },
//   { w: 120, h: 120, x: '62%', y: '6%',  delay: 1.2, dur: 9  },
//   { w: 90,  h: 90,  x: '78%', y: '55%', delay: 0.5, dur: 6  },
//   { w: 140, h: 140, x: '20%', y: '65%', delay: 2.0, dur: 8  },
//   { w: 70,  h: 70,  x: '50%', y: '40%', delay: 0.8, dur: 10 },
//   { w: 100, h: 100, x: '85%', y: '80%', delay: 1.8, dur: 7  },
// ];

// const BOOKS = [
//   { color: '#1e3456', accent: '#c9a84c', h: 130, w: 36, rot: -8,  x: '15%', delay: 0    },
//   { color: '#0d2e1a', accent: '#a3c98e', h: 155, w: 32, rot: 4,   x: '28%', delay: 0.9  },
//   { color: '#2d1a0e', accent: '#e8b86d', h: 110, w: 38, rot: -3,  x: '58%', delay: 0.4  },
//   { color: '#1a1a2e', accent: '#9b87f5', h: 140, w: 30, rot: 7,   x: '72%', delay: 1.5  },
//   { color: '#0a2a2a', accent: '#6ec6c6', h: 120, w: 34, rot: -5,  x: '44%', delay: 1.1  },
//   { color: '#2a1a30', accent: '#d4a0d4', h: 160, w: 28, rot: 6,   x: '86%', delay: 0.2  },
// ];

// export default function LoginPage() {
//   const router = useRouter();
//   const { theme } = useTheme();
//   const isLight = theme === 'light';

//   const [email, setEmail]       = useState('');
//   const [password, setPassword] = useState('');
//   const [showPw, setShowPw]     = useState(false);
//   const [loading, setLoading]   = useState(false);
//   const [error, setError]       = useState('');
//   const [focusedField, setFocusedField] = useState<string | null>(null);

//   async function handleLogin(e: React.FormEvent) {
//     e.preventDefault();
//     setError(''); setLoading(true);
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       const p = localStorage.getItem('pustara_personalized');
//       router.replace(p ? '/catalog' : '/auth/personalization');
//     } catch (err: any) { setError(friendlyError(err.code)); }
//     finally { setLoading(false); }
//   }

//   async function handleGoogle() {
//     setError(''); setLoading(true);
//     try {
//       await signInWithPopup(auth, googleProvider);
//       const p = localStorage.getItem('pustara_personalized');
//       router.replace(p ? '/catalog' : '/auth/personalization');
//     } catch (err: any) { setError(friendlyError(err.code)); }
//     finally { setLoading(false); }
//   }

//   // ── Token classes untuk form card (right side) ──
//   const card = isLight
//     ? 'bg-white'
//     : 'bg-navy-800';

//   const heading = isLight ? 'text-navy-900' : 'text-white';
//   const subText  = isLight ? 'text-slate-500' : 'text-slate-400';
//   const linkCls  = isLight ? 'text-navy-700'  : 'text-gold';

//   const inputWrap = (focused: boolean) => cn(
//     'relative flex items-center border rounded-2xl transition-all duration-200',
//     isLight
//       ? focused
//         ? 'bg-white border-navy-500 ring-2 ring-navy-200/50'
//         : 'bg-slate-50 border-slate-200'
//       : focused
//         ? 'bg-navy-700 border-gold/60 ring-2 ring-gold/20'
//         : 'bg-navy-700/60 border-white/10'
//   );

//   const inputCls = cn(
//     'w-full py-3.5 bg-transparent text-sm outline-none rounded-2xl',
//     isLight ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-white/30'
//   );

//   const iconColor = (focused: boolean) =>
//     focused
//       ? (isLight ? 'text-navy-600' : 'text-gold')
//       : (isLight ? 'text-slate-400' : 'text-white/30');

//   const divider = isLight ? 'bg-slate-100' : 'bg-white/10';
//   const dividerText = isLight ? 'text-slate-400' : 'text-white/30';

//   const forgotLink = isLight
//     ? 'text-slate-500 hover:text-navy-700'
//     : 'text-white/40 hover:text-white/70';

//   const googleBtn = isLight
//     ? 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
//     : 'border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20';

//   const registerLink = isLight ? 'text-slate-400' : 'text-white/40';

//   return (
//     <main className="min-h-screen flex">

//       {/* ══ DESKTOP LEFT PANEL ══ */}
//       <div className="hidden lg:flex flex-col w-[55%] bg-navy-900 relative overflow-hidden p-12">

//         {/* Grain */}
//         <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
//           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

//         {/* Grid */}
//         <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
//           style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

//         {/* Floating orbs */}
//         {ORBS.map((o, i) => (
//           <motion.div key={i}
//             className="absolute rounded-full pointer-events-none"
//             style={{
//               width: o.w, height: o.h, left: o.x, top: o.y,
//               background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 60%, transparent 100%)',
//               filter: 'blur(32px)',
//             }}
//             animate={{ y: [0, -22, 0], scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
//             transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }}
//           />
//         ))}

//         {/* Floating books */}
//         <div className="absolute inset-0 pointer-events-none overflow-hidden">
//           {BOOKS.map((b, i) => (
//             <motion.div key={i}
//               className="absolute rounded-sm shadow-2xl"
//               style={{ left: b.x, bottom: '-10%', width: b.w, height: b.h, background: b.color, rotate: b.rot, borderLeft: `3px solid ${b.accent}`, borderTop: `1px solid rgba(255,255,255,0.08)` }}
//               animate={{ y: [0, -420], opacity: [0, 0.7, 0.7, 0] }}
//               transition={{ duration: 12, delay: b.delay, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut', times: [0, 0.1, 0.85, 1] }}>
//               <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1.5 px-1.5">
//                 <div className="h-0.5 w-full rounded-full opacity-30" style={{ background: b.accent }} />
//                 <div className="h-0.5 w-3/4 rounded-full opacity-20" style={{ background: b.accent }} />
//                 <div className="h-0.5 w-1/2 rounded-full opacity-20" style={{ background: b.accent }} />
//               </div>
//               <div className="absolute bottom-3 left-0 right-0 flex justify-center">
//                 <div className="w-4 h-4 rounded-full opacity-25" style={{ background: b.accent }} />
//               </div>
//             </motion.div>
//           ))}
//         </div>

//         {/* Content */}
//         <div className="relative z-20 flex flex-col h-full">
//           <Link href="/" className="w-fit">
//             <ComboLogo className="h-11 w-auto" />
//           </Link>

//           <div className="mt-auto mb-10">
//             <motion.p className="text-gold/60 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4"
//               initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
//               Perpustakaan Digital Nusantara
//             </motion.p>
//             <motion.h1 className="font-serif text-5xl xl:text-[3.5rem] font-black text-white leading-[1.15] mb-5"
//               initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7, ease: [0.34, 1.2, 0.64, 1] }}>
//               Ribuan buku,<br /><span className="text-gold">satu tempat.</span>
//             </motion.h1>
//             <motion.p className="text-slate-400 text-base leading-relaxed max-w-xs"
//               initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
//               Perpustakaan digital milik masyarakat Indonesia.
//             </motion.p>
//           </div>

//           <motion.div className="flex gap-8 mb-10"
//             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
//             {[['10K+','Judul Buku'],['500+','Penulis'],['50K+','Pembaca']].map(([v,l]) => (
//               <div key={l}>
//                 <div className="font-serif text-2xl font-black text-gold">{v}</div>
//                 <div className="text-slate-500 text-xs mt-0.5">{l}</div>
//               </div>
//             ))}
//           </motion.div>

//           <motion.div className="p-4 bg-white/5 border border-white/10 rounded-2xl max-w-xs backdrop-blur-sm"
//             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
//             <div className="flex gap-0.5 mb-2">
//               {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-gold fill-gold" />)}
//             </div>
//             <p className="text-slate-300 text-sm italic">"Pustara bikin gue semangat baca lagi!"</p>
//             <p className="text-slate-500 text-xs mt-2">— Pengguna dari Yogyakarta</p>
//           </motion.div>
//         </div>
//       </div>

//       {/* ══ RIGHT — form ══ */}
//       <div className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>

//         {/* Mobile header */}
//         <div className="lg:hidden relative overflow-hidden flex-shrink-0 pt-10 pb-12 px-6 min-h-[260px] flex flex-col bg-navy-900">
//           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(201,168,76,0.12)_0%,transparent_65%)]" />
//           <div className="absolute -right-10 top-1/5 -translate-y-1/2 pointer-events-none z-0">
//             <Logo className="w-72 h-72 blur-[7px]" />
//           </div>
//           <Link href="/" className="relative z-10 flex items-center gap-1.5 text-slate-400 text-sm mb-auto w-fit hover:text-slate-200 transition-colors">
//             <ArrowLeft className="w-4 h-4" /> Kembali
//           </Link>
//           <motion.div className="relative z-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
//             <Wordmark />
//             <h1 className="text-2xl font-bold text-white mb-1">Selamat Datang</h1>
//             <p className="text-slate-500 text-sm">Masuk ke akun untuk kembali membaca</p>
//           </motion.div>
//         </div>

//         {/* Form card */}
//         <motion.div
//           className={cn(
//             'z-10 flex-1 rounded-[2rem] lg:rounded-none mb-8 mx-4 lg:m-0',
//             'flex flex-col justify-center px-6 pb-4 lg:px-14 xl:px-20',
//             card
//           )}
//           initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

//           <div className="w-full max-w-sm mx-auto lg:mx-0">
//             <div className="hidden lg:block mb-8">
//               <h2 className={cn('font-serif text-3xl font-black mb-1', heading)}>Selamat datang</h2>
//               <p className={cn('text-sm', subText)}>
//                 Belum punya akun?{' '}
//                 <Link href="/auth/register" className={cn('font-semibold hover:underline', linkCls)}>Daftar gratis</Link>
//               </p>
//             </div>

//             <AnimatePresence>
//               {error && (
//                 <motion.div
//                   className={cn(
//                     'mb-4 px-4 py-3 border text-sm rounded-xl',
//                     isLight
//                       ? 'bg-red-50 border-red-200 text-red-600'
//                       : 'bg-red-900/20 border-red-500/30 text-red-400'
//                   )}
//                   initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
//                   {error}
//                 </motion.div>
//               )}
//             </AnimatePresence>

//             <form onSubmit={handleLogin} className="flex flex-col gap-3">
//               {/* Email */}
//               <div className={inputWrap(focusedField === 'email')}>
//                 <Mail className={cn('absolute left-4 w-4 h-4 transition-colors', iconColor(focusedField === 'email'))} />
//                 <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
//                   onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
//                   className={cn(inputCls, 'pl-11 pr-4')} required />
//               </div>

//               {/* Password */}
//               <div className={inputWrap(focusedField === 'password')}>
//                 <Lock className={cn('absolute left-4 w-4 h-4 transition-colors', iconColor(focusedField === 'password'))} />
//                 <input type={showPw ? 'text' : 'password'} value={password}
//                   onChange={e => setPassword(e.target.value)} placeholder="Kata Sandi"
//                   onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
//                   className={cn(inputCls, 'pl-11 pr-11')} required />
//                 <button type="button" onClick={() => setShowPw(!showPw)}
//                   className={cn('absolute right-4 transition-colors', isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/60')}>
//                   {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>

//               <div className="flex justify-end -mt-1">
//                 <Link href="#" className={cn('text-xs transition-colors', forgotLink)}>Lupa Sandi?</Link>
//               </div>

//               <motion.button type="submit" disabled={loading}
//                 className="w-full py-3.5 bg-navy-800 text-white rounded-2xl font-semibold text-sm hover:bg-navy-700 disabled:opacity-50 transition-colors relative overflow-hidden"
//                 whileTap={{ scale: 0.98 }}>
//                 <AnimatePresence mode="wait">
//                   {loading
//                     ? <motion.span key="l" className="flex items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//                         <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memuat...
//                       </motion.span>
//                     : <motion.span key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Masuk</motion.span>
//                   }
//                 </AnimatePresence>
//               </motion.button>
//             </form>

//             <div className="flex items-center gap-3 my-4">
//               <div className={cn('flex-1 h-px', divider)} />
//               <span className={cn('text-xs font-medium', dividerText)}>atau</span>
//               <div className={cn('flex-1 h-px', divider)} />
//             </div>

//             <motion.button onClick={handleGoogle} disabled={loading}
//               className={cn(
//                 'w-full py-3 border rounded-2xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all',
//                 googleBtn
//               )}
//               whileTap={{ scale: 0.98 }}>
//               <GoogleIcon /> Masuk dengan Google
//             </motion.button>

//             <p className={cn('text-center text-xs mt-5', registerLink)}>
//               Belum memiliki akun?{' '}
//               <Link href="/auth/register" className={cn('font-semibold hover:underline', linkCls)}>Daftar</Link>
//             </p>
//           </div>
//         </motion.div>
//       </div>
//     </main>
//   );
// }

// function GoogleIcon() {
//   return (
//     <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
//       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
//       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
//       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
//       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
//     </svg>
//   );
// }

// function friendlyError(code: string) {
//   const m: Record<string,string> = {
//     'auth/user-not-found':    'Email tidak terdaftar.',
//     'auth/wrong-password':    'Kata sandi salah.',
//     'auth/invalid-email':     'Format email tidak valid.',
//     'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
//     'auth/invalid-credential':'Email atau kata sandi salah.',
//   };
//   return m[code] || 'Terjadi kesalahan. Coba lagi.';
// }

