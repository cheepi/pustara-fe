'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, BookOpen } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

function FloatingBook({ delay, x, size, opacity }: { delay: number; x: string; size: number; opacity: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, bottom: '-10%', fontSize: size, opacity }}
      animate={{ y: [0, -900], rotate: [0, 15, -10, 20, -5, 0], opacity: [0, opacity, opacity, 0] }}
      transition={{ duration: 6 + delay, delay, repeat: Infinity, ease: 'easeOut' }}>
      📚
    </motion.div>
  );
}

function Eyeball({ mouseX, mouseY, eyeRef, isLight }: {
  mouseX: number; mouseY: number;
  eyeRef: React.RefObject<HTMLDivElement>;
  isLight: boolean;
}) {
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = eyeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = rect.width * 0.22;
    const ratio = Math.min(dist, maxR) / (dist || 1);
    setPupilPos({ x: dx * ratio, y: dy * ratio });
  }, [mouseX, mouseY, eyeRef]);

  return (
    <div ref={eyeRef}
      className={cn(
        'relative w-24 h-24 rounded-full border-4 flex items-center justify-center overflow-hidden',
        isLight
          ? 'bg-white border-navy-800 shadow-[0_8px_32px_rgba(0,0,0,0.18)]'
          : 'bg-navy-100 border-navy-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
      )}>
      <motion.div
        className="absolute w-12 h-12 rounded-full"
        style={{
          background: isLight
            ? 'radial-gradient(circle at 35% 35%, #4f7cac, #1a3a5c)'
            : 'radial-gradient(circle at 35% 35%, #c9a84c, #7a5c1a)',
        }}
        animate={{ x: pupilPos.x, y: pupilPos.y }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn('w-5 h-5 rounded-full', isLight ? 'bg-navy-900' : 'bg-navy-950')} />
        </div>
        <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-white/70" />
      </motion.div>
      <div className="absolute top-0 left-0 right-0 h-1/3 rounded-t-full bg-white/10 pointer-events-none" />
    </div>
  );
}

const EGG_MESSAGES = [
  null,
  'Iya tau, ini emg gerak ikutin kursor lo 👀 -Pustrakrew',
  'Udah berapa kali nih? Gapunya kerjaan? 😄',
  'Oke oke gue tau lo kesepian... balik ke beranda yuk',
  'Seriously, balik deh. Banyak buku bagus nunggu! 📚',
  '... lo masih di sini?? 🤨',
  'Oke fine. Gue nyerah. Lo menang. SELAMAT 🎉',
];

export default function NotFoundPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [mouse,      setMouse]      = useState({ x: 0, y: 0 });
  const [blink,      setBlink]      = useState(false);
  const [shookCount, setShookCount] = useState(0);
  const leftEyeRef  = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        schedule();
      }, 2000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  const eggMsg = EGG_MESSAGES[Math.min(shookCount, EGG_MESSAGES.length - 1)];

  const tk = {
    text:  isLight ? 'text-navy-900' : 'text-white',
    muted: isLight ? 'text-slate-500' : 'text-slate-400',
    bgOverlay: isLight ? 'bg-parchment' : 'bg-navy-950',
  };

  const BOOKS = [
    { delay: 0,   x: '5%',  size: 24, opacity: 0.15 },
    { delay: 1.2, x: '20%', size: 18, opacity: 0.10 },
    { delay: 2.4, x: '75%', size: 28, opacity: 0.12 },
    { delay: 0.8, x: '88%', size: 16, opacity: 0.08 },
    { delay: 3.1, x: '45%', size: 20, opacity: 0.10 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--bg)' }}>

      {/* Floating books */}
      {BOOKS.map((b, i) => <FloatingBook key={i} {...b} />)}

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(var(--text, #000) 1px, transparent 1px), linear-gradient(90deg, var(--text, #000) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

        {/* 4 👁👁 4 */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-5 cursor-pointer select-none"
          onClick={() => setShookCount(c => c + 1)}
          whileTap={{ scale: 0.96 }}>

          {/* Left 4 */}
          <motion.span
            className={cn('font-serif font-black leading-none', tk.text)}
            style={{ fontSize: 'clamp(64px, 14vw, 108px)' }}
            animate={shookCount > 0 ? { rotate: [0, -8, 8, -5, 5, 0] } : {}}
            transition={{ duration: 0.45 }}>
            4
          </motion.span>

          {/* Left eye */}
          <div className="relative">
            <motion.div
              className={cn('absolute top-0 left-0 right-0 rounded-t-full z-10 pointer-events-none')}
              style={{ height: '50%', background: 'var(--bg)' }}
              animate={{ scaleY: blink ? 1 : 0 }}
              transition={{ duration: 0.08 }}
            />
            <Eyeball mouseX={mouse.x} mouseY={mouse.y} eyeRef={leftEyeRef} isLight={isLight} />
          </div>

          {/* Right eye */}
          <div className="relative">
            <motion.div
              className="absolute top-0 left-0 right-0 rounded-t-full z-10 pointer-events-none"
              style={{ height: '50%', background: 'var(--bg)' }}
              animate={{ scaleY: blink ? 1 : 0 }}
              transition={{ duration: 0.08, delay: 0.03 }}
            />
            <Eyeball mouseX={mouse.x} mouseY={mouse.y} eyeRef={rightEyeRef} isLight={isLight} />
          </div>

          {/* Right 4 */}
          <motion.span
            className={cn('font-serif font-black leading-none', tk.text)}
            style={{ fontSize: 'clamp(64px, 14vw, 108px)' }}
            animate={shookCount > 0 ? { rotate: [0, 8, -8, 5, -5, 0] } : {}}
            transition={{ duration: 0.45 }}>
            4
          </motion.span>
        </motion.div>

        {/* Easter egg bubble */}
        <div className="h-10 mb-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {eggMsg && (
              <motion.div
                key={shookCount}
                initial={{ opacity: 0, scale: 0.85, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-medium border',
                  isLight
                    ? 'bg-gold/10 border-gold/30 text-navy-700'
                    : 'bg-gold/10 border-gold/25 text-gold/90'
                )}>
                {eggMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Copy */}
        <motion.h1
          className={cn('font-serif text-2xl font-black mb-2 mt-2', tk.text)}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          Halaman tidak ditemukan
        </motion.h1>
        <motion.p
          className={cn('text-sm leading-relaxed mb-8', tk.muted)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}>
          Buku yang kamu cari sepertinya sudah dipinjam seseorang,
          atau mungkin tidak pernah ada di rak ini. 📖
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}>
          <Link href="/" className="flex-1">
            <motion.div
              className={cn(
                'flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl text-sm font-semibold transition-all',
                isLight ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-gold text-navy-900 hover:bg-gold/90'
              )}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Home className="w-4 h-4" /> Ke Beranda
            </motion.div>
          </Link>

          <Link href="/browse" className="flex-1">
            <motion.div
              className={cn(
                'flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl border text-sm font-semibold transition-all',
                isLight
                  ? 'bg-white border-parchment-darker text-navy-700 hover:border-gold/50'
                  : 'bg-navy-800/50 border-white/10 text-white/80 hover:border-gold/40'
              )}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <BookOpen className="w-4 h-4" /> Eksplor Buku
            </motion.div>
          </Link>
        </motion.div>

        {/* Hint */}
        <motion.p
          className={cn('text-[11px] mt-6', tk.muted)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}>
          💡 Psst — coba klik angka 404 berkali-kali...
        </motion.p>
      </motion.div>
    </div>
  );
}