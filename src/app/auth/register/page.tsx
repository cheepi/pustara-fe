'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Eye, EyeOff, Mail, Lock, User, Star } from 'lucide-react';
import Wordmark from '@/components/icons/Wordmark';
import ComboLogo from '@/components/icons/ComboLogo';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useCaptcha, CaptchaWidget } from '@/hooks/useCaptcha';

const ORBS = [
  { w: 160, h: 160, x: '5%',  y: '20%', delay: 0.3, dur: 8  },
  { w: 110, h: 110, x: '60%', y: '10%', delay: 0,   dur: 7  },
  { w: 85,  h: 85,  x: '80%', y: '60%', delay: 1.0, dur: 9  },
  { w: 130, h: 130, x: '25%', y: '70%', delay: 1.5, dur: 6  },
  { w: 75,  h: 75,  x: '48%', y: '42%', delay: 0.6, dur: 10 },
];

const BOOKS = [
  { color: '#1e3456', accent: '#c9a84c', h: 130, w: 36, rot: -8,  x: '15%', delay: 0    },
  { color: '#0d2e1a', accent: '#a3c98e', h: 155, w: 32, rot: 4,   x: '28%', delay: 0.9  },
  { color: '#2d1a0e', accent: '#e8b86d', h: 110, w: 38, rot: -3,  x: '58%', delay: 0.4  },
  { color: '#1a1a2e', accent: '#9b87f5', h: 140, w: 30, rot: 7,   x: '72%', delay: 1.5  },
  { color: '#0a2a2a', accent: '#6ec6c6', h: 120, w: 34, rot: -5,  x: '44%', delay: 1.1  },
  { color: '#2a1a30', accent: '#d4a0d4', h: 160, w: 28, rot: 6,   x: '86%', delay: 0.2  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { token: captchaToken, error: captchaError, captchaRef, reset: resetCaptcha } = useCaptcha();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!captchaToken) { setError('Verifikasi CAPTCHA diperlukan sebelum mendaftar.'); return; }
    if (password !== confirm) { setError('Kata sandi tidak cocok.'); return; }
    if (password.length < 6)  { setError('Kata sandi minimal 6 karakter.'); return; }
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const createResp = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      if (!createResp.ok) {
        const payload = await createResp.json().catch(() => ({}));
        setError(payload?.error || 'Pendaftaran gagal.');
        resetCaptcha();
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      router.replace('/auth/personalization');
    } catch (err: any) {
      setError(friendlyError(err.code));
      resetCaptcha();
    }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    if (!captchaToken) {
      setError('Verifikasi CAPTCHA diperlukan sebelum melanjutkan dengan Google.');
      return;
    }
    setError(''); setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace('/auth/personalization');
    } catch (err: any) {
      setError(friendlyError(err.code));
      resetCaptcha();
    }
    finally { setLoading(false); }
  }

  // ── Token classes ──
  const card     = isLight ? 'bg-white' : 'bg-navy-800';
  const heading  = isLight ? 'text-navy-900' : 'text-white';
  const subText  = isLight ? 'text-slate-500' : 'text-slate-400';
  const linkCls  = isLight ? 'text-navy-700'  : 'text-gold';
  const divider  = isLight ? 'bg-slate-100'  : 'bg-white/10';
  const divTxt   = isLight ? 'text-slate-400' : 'text-white/30';
  const googleBtn = isLight
    ? 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
    : 'border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20';
  const signInLink = isLight ? 'text-slate-400' : 'text-white/40';

  const inputBase = cn(
    'w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none transition-all',
    'focus:ring-2',
    isLight
      ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-navy-500 focus:ring-navy-200/50'
      : 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/60 focus:ring-gold/20'
  );

  const iconCls = isLight ? 'text-slate-400' : 'text-white/30';

  return (
    <main className="min-h-screen flex">

      {/* ══ DESKTOP LEFT PANEL ══ */}
      <div className="hidden lg:flex flex-col w-[55%] bg-navy-900 relative overflow-hidden p-12">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />

        {ORBS.map((o, i) => (
          <motion.div key={i} className="absolute rounded-full pointer-events-none"
            style={{ width: o.w, height: o.h, left: o.x, top: o.y,
              background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 60%, transparent 100%)',
              filter: 'blur(32px)' }}
            animate={{ y: [0, -22, 0], scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }} />
        ))}

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {BOOKS.map((b, i) => (
            <motion.div key={i} className="absolute rounded-sm shadow-2xl"
              style={{ left: b.x, bottom: '-10%', width: b.w, height: b.h, background: b.color, rotate: b.rot,
                borderLeft: `3px solid ${b.accent}`, borderTop: `1px solid rgba(255,255,255,0.08)` }}
              animate={{ y: [0, -420], opacity: [0, 0.7, 0.7, 0] }}
              transition={{ duration: 12, delay: b.delay, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut', times: [0, 0.1, 0.85, 1] }}>
              <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1.5 px-1.5">
                <div className="h-0.5 w-full rounded-full opacity-30" style={{ background: b.accent }} />
                <div className="h-0.5 w-3/4 rounded-full opacity-20" style={{ background: b.accent }} />
                <div className="h-0.5 w-1/2 rounded-full opacity-20" style={{ background: b.accent }} />
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <div className="w-4 h-4 rounded-full opacity-25" style={{ background: b.accent }} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative z-20 flex flex-col h-full">
          <Link href="/" className="w-fit"><ComboLogo className="h-11 w-auto" /></Link>
          <div className="mt-auto mb-10">
            <motion.p className="text-gold/60 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              Perpustakaan Digital Nusantara
            </motion.p>
            <motion.h1 className="font-serif text-5xl xl:text-[3.5rem] font-black text-white leading-[1.15] mb-5"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.34, 1.2, 0.64, 1] }}>
              Mulai perjalanan<br /><span className="text-gold">membacamu.</span>
            </motion.h1>
            <motion.p className="text-slate-400 text-base leading-relaxed max-w-xs"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              Bergabung dengan ribuan pembaca Indonesia di Pustara.
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
            <p className="text-slate-300 text-sm italic">"Rekomendasi PustarAI selalu tepat sasaran!"</p>
            <p className="text-slate-500 text-xs mt-2">— Pengguna dari Bandung</p>
          </motion.div>
        </div>
      </div>

      {/* ══ RIGHT — form ══ */}
      <div className={cn('flex-1 flex flex-col')} style={{ background: 'var(--bg)' }}>

        {/* Mobile header */}
        <div className="lg:hidden px-6 pt-12 pb-6">
          <Link href="/auth/login" className={cn('flex items-center gap-1 text-sm mb-6 transition-colors', isLight ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200')}>
            <span className="text-lg">←</span> Kembali
          </Link>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Wordmark />
            <h1 className={cn('text-2xl font-bold mb-1', heading)}>Selamat Datang</h1>
            <p className={cn('text-sm', subText)}>Daftar sekarang untuk meminjam buku</p>
          </motion.div>
        </div>

        {/* Form card */}
        <motion.div
          className={cn(
            'flex-1 px-6 pb-10 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20',
            'rounded-[2rem] lg:rounded-none mb-8 mx-4 lg:m-0',
            card
          )}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          <div className="w-full max-w-sm mx-auto lg:mx-0">
            <div className="hidden lg:block mb-8">
              <h2 className={cn('font-serif text-3xl font-black mb-1', heading)}>Buat akun baru</h2>
              <p className={cn('text-sm', subText)}>
                Sudah punya akun?{' '}
                <Link href="/auth/login" className={cn('font-semibold hover:underline', linkCls)}>Masuk</Link>
              </p>
            </div>

            {error && (
              <div className={cn(
                'mb-4 px-4 py-3 border text-sm rounded-xl',
                isLight
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-red-900/20 border-red-500/30 text-red-400'
              )}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="relative">
                <User className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', iconCls)} />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nama" className={inputBase} required />
              </div>

              <div className="relative">
                <Mail className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', iconCls)} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email" className={inputBase} required />
              </div>

              <div className="relative">
                <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', iconCls)} />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Kata Sandi"
                  className={cn(inputBase, 'pr-10')} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className={cn('absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors',
                    isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/60')}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', iconCls)} />
                <input type={showCf ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="Konfirmasi Kata Sandi"
                  className={cn(inputBase, 'pr-10')} required />
                <button type="button" onClick={() => setShowCf(!showCf)}
                  className={cn('absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors',
                    isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/30 hover:text-white/60')}>
                  {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-navy-700 text-white rounded-xl font-semibold text-sm
                           hover:bg-navy-600 active:scale-[0.98] transition-all disabled:opacity-60 mt-1">
                {loading ? 'Mendaftar...' : 'Daftar'}
              </button>

              <CaptchaWidget captchaRef={captchaRef} />
              {captchaError && <p className="text-xs text-red-500 -mt-1">{captchaError}</p>}
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className={cn('flex-1 h-px', divider)} />
              <span className={cn('text-xs', divTxt)}>Atau</span>
              <div className={cn('flex-1 h-px', divider)} />
            </div>

            <button onClick={handleGoogle} disabled={loading}
              className={cn(
                'w-full py-3 border rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-60',
                googleBtn
              )}>
              <GoogleIcon />
              Lanjutkan dengan Google
            </button>

            <p className={cn('text-center text-xs mt-5', signInLink)}>
              Sudah memiliki akun?{' '}
              <Link href="/auth/login" className={cn('font-semibold hover:underline', linkCls)}>Masuk</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Email sudah terdaftar.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Kata sandi terlalu lemah.',
  };
  return map[code] || 'Terjadi kesalahan. Coba lagi.';
}