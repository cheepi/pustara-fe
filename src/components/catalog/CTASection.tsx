// Ganti section CTA di CatalogView.tsx dengan ini
// (hapus section CTA lama dari <section className="max-w-7xl mx-auto px-4 mt-4 pb-12"> sampai akhir)
// lalu paste komponen ini di bawah CatalogView export, dan panggil <CTASection dark={dark} /> di dalam CatalogView

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Users, Star, ArrowRight, Zap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CTASection({ dark }: { dark: boolean }) {
  const bg   = dark ? 'bg-navy-800'   : 'bg-white';
  const bg2  = dark ? 'bg-navy-700'   : 'bg-parchment-dark';
  const text = dark ? 'text-white'    : 'text-navy-900';
  const sub  = dark ? 'text-slate-400': 'text-slate-500';
  const bdr  = dark ? 'border-white/8': 'border-parchment-darker';

  return (
    <section className="max-w-7xl mx-auto px-4 mt-4 pb-12">
      <div className={cn('h-px bg-gradient-to-r from-transparent via-current to-transparent mb-10 opacity-10', dark ? 'text-slate-400' : 'text-slate-300')} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}>

        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="text-gold text-xs font-semibold uppercase tracking-widest">Khusus Anggota</span>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-[auto] gap-3">

          {/* HERO CELL — spans 2 cols 2 rows */}
          <motion.div
            className={cn('col-span-2 row-span-2 rounded-3xl border p-7 flex flex-col justify-between relative overflow-hidden', bg, bdr)}
            whileHover={{ scale: 1.005 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <h2 className={cn('font-serif text-3xl lg:text-4xl font-black leading-[1.15] mb-3', text)}>
                Lebih dari<br />sekadar<br /><span className="text-gold">membaca.</span>
              </h2>
              <p className={cn('text-sm leading-relaxed max-w-xs', sub)}>
                Perpustakaan digital Indonesia dengan rekomendasi AI, rak pribadi, dan komunitas pembaca.
              </p>
            </div>
            <div className="flex gap-2.5 mt-6 flex-wrap">
              <Link href="/auth/register"
                className="flex items-center gap-2 px-5 py-2.5 bg-gold text-navy-900 rounded-2xl font-bold text-sm hover:bg-gold-light transition-colors">
                Daftar Gratis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/auth/login"
                className={cn('px-5 py-2.5 rounded-2xl font-semibold text-sm border transition-colors', dark ? 'border-white/15 text-white hover:bg-white/5' : 'border-navy-200 text-navy-800 hover:bg-parchment')}>
                Masuk
              </Link>
            </div>
          </motion.div>

          {/* PustarAI cell */}
          <motion.div
            className={cn('rounded-3xl border p-5 flex flex-col gap-3 relative overflow-hidden', bg2, bdr)}
            whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className={cn('font-semibold text-sm', text)}>PustarAI</p>
              <p className={cn('text-xs mt-0.5 leading-relaxed', sub)}>Rekomendasi personal yang makin pintar setiap kali kamu baca.</p>
            </div>
          </motion.div>

          {/* Stats — 10K */}
          <motion.div
            className={cn('rounded-3xl border p-5 flex flex-col justify-between', bg2, bdr)}
            whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
            <BookOpen className="w-5 h-5 text-gold/60" />
            <div>
              <p className={cn('font-serif text-3xl font-black', text)}>10K<span className="text-gold">+</span></p>
              <p className={cn('text-xs mt-0.5', sub)}>Judul buku</p>
            </div>
          </motion.div>

          {/* Community cell */}
          <motion.div
            className={cn('rounded-3xl border p-5 flex flex-col gap-3 relative overflow-hidden', bg2, bdr)}
            whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className={cn('font-semibold text-sm', text)}>Komunitas</p>
              <p className={cn('text-xs mt-0.5 leading-relaxed', sub)}>Ulasan, diskusi, dan rak buku publik dari sesama pembaca.</p>
            </div>
          </motion.div>

          {/* Stats — rating */}
          <motion.div
            className={cn('rounded-3xl border p-5 flex flex-col justify-between', bg2, bdr)}
            whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Star className="w-5 h-5 text-gold/60" />
            <div>
              <p className={cn('font-serif text-3xl font-black', text)}>4.8<span className="text-gold">/5</span></p>
              <p className={cn('text-xs mt-0.5', sub)}>Rating pengguna</p>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}