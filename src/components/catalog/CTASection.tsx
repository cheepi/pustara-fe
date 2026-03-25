'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Sparkles, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Typewriter from '@/components/shared/Typewriter';

// ─── Seamless Marquee — pure CSS, zero visible seam ───────────────────────────
const MARQUEE_ITEMS = [
  '📚 Rak Buku Pribadi', '✨ Rekomendasi AI', '💬 Komunitas Pembaca',
  '🔖 Bookmark & Catatan', '🏆 Reading Challenge', '📖 10.000+ Judul',
  '🌙 Mode Gelap', '📱 Tersedia di Mobile', '⭐ Rating & Ulasan',
  '🔥 Trending Mingguan', '🎯 Personalisasi Penuh', '💡 Diskusi Buku',
];

function Marquee({ reverse = false, id, dark }: { reverse?: boolean; id: string; dark: boolean }) {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  const dur = MARQUEE_ITEMS.length * 3.2;

  const keyframes = `
    @keyframes ${id} {
      from { transform: translateX(${reverse ? '-50%' : '0%'}); }
      to   { transform: translateX(${reverse ? '0%'   : '-50%'}); }
    }
  `;

  const pillCls = dark
    ? 'border-white/10 bg-white/5 text-white/50'
    : 'border-navy-200 bg-navy-50 text-navy-500';

  return (
    <div className="overflow-hidden whitespace-nowrap select-none"
      style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)', maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)' }}>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      <div className="inline-flex gap-3"
        style={{ animation: `${id} ${dur}s linear infinite`, willChange: 'transform' }}>
        {track.map((item, i) => (
          <span key={i} className={cn('inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border flex-shrink-0', pillCls)}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Terminal card ─────────────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { delay: 0,    text: '$ pustar init --user kamu',           color: 'text-emerald-400' },
  { delay: 900,  text: '✓ Profil dibuat',                     color: 'text-slate-400'   },
  { delay: 1600, text: '$ pustar ai recommend --mood santai', color: 'text-emerald-400' },
  { delay: 2600, text: '⚡ Menganalisis selera baca…',         color: 'text-slate-400'   },
  { delay: 3400, text: '→ "Filosofi Teras" — Pierre Grimes',  color: 'text-gold'        },
  { delay: 4000, text: '→ "Sapiens" — Yuval Noah Harari',     color: 'text-gold'        },
  { delay: 4600, text: '→ "Atomic Habits" — James Clear',     color: 'text-gold'        },
  { delay: 5400, text: '✓ Rak kamu siap. Selamat membaca!',   color: 'text-emerald-400' },
];

function Terminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => setVisible(v => [...v, i]), line.delay);
    });
  }, [inView]);

  return (
    <div ref={ref} className="rounded-2xl border font-mono text-xs overflow-hidden bg-[#0d1117] border-white/10">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-white/30 text-[10px]">pustar — zsh</span>
      </div>
      <div className="p-4 space-y-1.5 min-h-[160px]">
        {TERMINAL_LINES.map((line, i) => (
          <AnimatePresence key={i}>
            {visible.includes(i) && (
              <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }} className={cn('leading-relaxed', line.color)}>
                {line.text}
              </motion.p>
            )}
          </AnimatePresence>
        ))}
        {visible.length < TERMINAL_LINES.length && (
          <span className="inline-block w-2 h-3.5 bg-emerald-400/80 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// ─── Cursor orb ───────────────────────────────────────────────────────────────
function CursorOrb() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx.set(e.clientX - r.left);
      my.set(e.clientY - r.top);
    };
    el.addEventListener('mousemove', move);
    return () => el.removeEventListener('mousemove', move);
  }, [mx, my]);

  return (
    <motion.div ref={ref} className="absolute pointer-events-none w-64 h-64 rounded-full opacity-[0.07]"
      style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%', background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)' }} />
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [inView, target]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Main CTA ─────────────────────────────────────────────────────────────────
export function CTASection({ dark: _dark, isLight }: { dark?: boolean; isLight?: boolean }) {
  const dark = _dark ?? !isLight;
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-60px' });

  const card = dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-navy-200/60';
  const text = dark ? 'text-white' : 'text-navy-900';
  const sub  = dark ? 'text-white/50' : 'text-slate-500';

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 mt-6 pb-16 overflow-hidden">
      <div className={cn('h-px mb-14', dark ? 'bg-white/8' : 'bg-black/8')} />

      {/* ── HERO BLOCK ── */}
      <motion.div
        className={cn('relative rounded-3xl border overflow-hidden', dark ? 'border-white/10' : 'border-navy-200/60 shadow-[0_2px_24px_rgba(13,24,41,0.08)]')}
        initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)' }}>
        <CursorOrb />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />

        <div className="relative z-10 p-7 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* LEFT */}
            <div>
              <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6"
                initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.15 }}
                style={{ borderColor: 'rgba(245,200,66,0.3)', background: 'rgba(245,200,66,0.08)', color: '#f5c842' }}>
                <Sparkles className="w-3 h-3" /> Khusus Anggota
              </motion.div>

              <motion.h2 className={cn('font-serif text-4xl lg:text-5xl font-black leading-[1.1] mb-4', text)}
                initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                Baca lebih dalam.<br />
                <span className="text-gold relative">
                  Temukan lebih banyak.
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none">
                    <motion.path d="M2 6 Q75 2 150 5 Q225 8 298 4" stroke="#f5c842" strokeWidth="2.5" strokeLinecap="round"
                      initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
                      transition={{ delay: 0.9, duration: 0.7 }} />
                  </svg>
                </span>
              </motion.h2>

              <motion.p className={cn('text-sm leading-relaxed max-w-sm mb-7', sub)}
                initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.35 }}>
                Perpustakaan digital Indonesia — rekomendasi AI, rak pribadi, ulasan komunitas, dan tantangan membaca. Gratis selamanya.
              </motion.p>

              <motion.p className="text-xs mb-5 font-mono"
                initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}
                style={{ color: dark ? 'rgba(245,200,66,0.7)' : 'rgba(120,90,0,0.7)' }}>
                {inView && (
                  <Typewriter lines={['Temukan buku selanjutnya…', 'Bangun rak impianmu…', 'Diskusi dengan pembaca lain…', 'Dapat rekomendasi dari AI…']} />
                )}
              </motion.p>

              <motion.div className="flex gap-3 flex-wrap"
                initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.45 }}>
                <Link href="/auth/register"
                  className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-navy-900 bg-gold hover:bg-yellow-400 transition-all shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5">
                  Daftar Gratis <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/auth/login"
                  className={cn('px-6 py-3 rounded-2xl font-semibold text-sm border transition-all hover:-translate-y-0.5',
                    dark ? 'border-white/15 text-white/80 hover:bg-white/8 hover:text-white' : 'border-navy-200 text-navy-700 hover:bg-navy-50')}>
                  Sudah punya akun
                </Link>
              </motion.div>

              <motion.div className="flex gap-6 mt-8"
                initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}>
                {[
                  { icon: BookOpen, val: 10000, suffix: '+',  label: 'Judul'    },
                  { icon: Users,    val: 2400,  suffix: '+',  label: 'Pembaca'  },
                  { icon: Zap,      val: 4.8,   suffix: '/5', label: 'Rating'   },
                ].map(({ icon: Icon, val, suffix, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-gold/60" />
                    <div>
                      <p className={cn('text-base font-black leading-none', text)}>
                        {val < 100 ? <span>{val}{suffix}</span> : <Counter target={val} suffix={suffix} />}
                      </p>
                      <p className={cn('text-[10px] mt-0.5', sub)}>{label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* RIGHT — Terminal */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <Terminal />
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {[
                  { emoji: '⚡', label: 'PustarAI',  desc: 'Rekomendasi personal'  },
                  { emoji: '🔖', label: 'Rak Buku',  desc: 'Koleksi & wishlist'    },
                  { emoji: '💬', label: 'Komunitas', desc: 'Diskusi & ulasan'      },
                  { emoji: '🏆', label: 'Challenge', desc: 'Reading goals tahunan' },
                ].map(({ emoji, label, desc }, i) => (
                  <motion.div key={label}
                    className={cn(
                      'rounded-xl border px-3.5 py-3',
                      dark
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-parchment border-navy-200/60 shadow-sm'
                    )}
                    initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.07 }} whileHover={{ y: -2 }}>
                    <p className="text-base mb-0.5">{emoji}</p>
                    <p className={cn('text-xs font-semibold', text)}>{label}</p>
                    <p className={cn('text-[10px]', sub)}>{desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── MARQUEE STRIPS — seamless pure-CSS ── */}
      <motion.div
        className="mt-6 space-y-2 overflow-hidden rounded-2xl py-3"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.7 }}
        style={{
          background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(13,24,41,0.05)',
          border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(13,24,41,0.10)',
        }}>
        <Marquee id="mq-fwd" dark={dark} />
        <Marquee id="mq-rev" dark={dark} reverse />
      </motion.div>
    </section>
  );
}

export default CTASection;