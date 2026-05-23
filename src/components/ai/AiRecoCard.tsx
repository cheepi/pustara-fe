'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, Users, BarChart2, X, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useBookCover } from '@/hooks/useBookCover';
import type { AiRecommendation } from '@/types/ai';

// ── Signal config ─────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
  content: {
    label: 'Konten',
    badgeBg: 'bg-blue-500/80',
    barColor: '#60a5fa',
    Icon: BookOpen,
    textColor: 'text-blue-400',
  },
  collab: {
    label: 'Kolaboratif',
    badgeBg: 'bg-emerald-500/80',
    barColor: '#34d399',
    Icon: Users,
    textColor: 'text-emerald-400',
  },
  social: {
    label: 'Sosial',
    badgeBg: 'bg-rose-500/80',
    barColor: '#fb7185',
    Icon: Users,
    textColor: 'text-rose-400',
  },
  trending: {
    label: 'Trending',
    badgeBg: 'bg-orange-500/80',
    barColor: '#fb923c',
    Icon: BookOpen,
    textColor: 'text-orange-400',
  },
} as const;

const SIGNAL_INFO = {
  content: {
    title: '📚 Kemiripan Konten',
    short: 'Dipilih karena genre, tema, atau gaya buku yang kamu suka.',
    description: 'Model mencocokkan metadata buku seperti genre, topik, kata kunci, dan kemiripan isi dengan riwayat minatmu.',
    tip: 'Tambah interaksi di topik favorit untuk menajamkan sinyal ini.',
  },
  collab: {
    title: '👥 Selera Komunitas',
    short: 'Dipilih dari pola pengguna lain dengan preferensi mirip.',
    description: 'Model collaborative filtering mencari pembaca dengan pola serupa, lalu merekomendasikan buku yang mereka sukai.',
    tip: 'Semakin banyak interaksi, semakin akurat pencocokan komunitasmu.',
  },
  social: {
    title: '🤝 Jaringan Sosial',
    short: 'Dipengaruhi aktivitas buku dari jejaring sosialmu.',
    description: 'Sinyal sosial mempertimbangkan buku yang sedang populer atau sering diulas oleh pengguna di sekitarmu.',
    tip: 'Ikuti pembaca baru untuk memperkaya variasi rekomendasi sosial.',
  },
  trending: {
    title: '📈 Tren Platform',
    short: 'Buku ini sedang naik dan banyak dibaca pengguna lain.',
    description: 'Model memberi bobot pada buku dengan momentum tinggi berdasarkan aktivitas platform terbaru.',
    tip: 'Gabungkan tren dengan preferensi pribadi untuk hasil lebih seimbang.',
  },
} as const;

const PHASE_INFO = {
  cold: {
    title: '❄️ Cold',
    short: 'Masih eksplorasi awal dari profil dan preferensi umum.',
    description:
      'Sinyal personal masih minim. Rekomendasi biasanya berbasis konten serupa, genre favorit, dan metadata buku.',
    tip: 'Beri feedback dengan baca/simpan/like supaya makin personal.',
  },
  mid: {
    title: '🌡️ Mid',
    short: 'Profil mulai kebentuk, sinyal personal sudah terbaca.',
    description:
      'Sistem mulai paham pola kamu dari interaksi sebelumnya, jadi hasil sudah lebih relevan dibanding fase awal.',
    tip: 'Tambah interaksi di genre berbeda untuk memperkaya variasi rekomendasi.',
  },
  warm: {
    title: '🔥 Warm',
    short: 'Rekomendasi paling personal dengan confidence lebih tinggi.',
    description:
      'Sinyal konten dan perilaku pengguna sudah cukup kuat, jadi ranking lebih stabil dan dekat dengan selera kamu.',
    tip: 'Tetap eksplor judul baru agar sistem tidak terlalu sempit ke pola lama.',
  },
} as const;

function getPhaseInfo(phase?: string) {
  const token = String(phase ?? '').toLowerCase();
  if (token.includes('warm') || token.includes('hot') || token.includes('🔥')) return PHASE_INFO.warm;
  if (token.includes('mid') || token.includes('🌡')) return PHASE_INFO.mid;
  return PHASE_INFO.cold;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  reco: AiRecommendation;
  index?: number;
  isLight: boolean;
  /**
   * Pre-fetched cover URL (from batch fetcher)
   * If provided, avoids N+1 queries for OpenLibrary covers
   */
  coverUrl?: string | null;
}

export function AiRecoCardSkeleton({ isLight }: { isLight: boolean }) {
  const skel = isLight ? 'bg-parchment-darker' : 'bg-navy-700/60';
  return (
    <div className="flex-shrink-0 w-44">
      <div className={cn('w-44 h-64 rounded-2xl animate-pulse mb-3', skel)} />
      <div className={cn('h-2.5 w-3/4 rounded animate-pulse mb-1.5', skel)} />
      <div className={cn('h-2 w-1/2 rounded animate-pulse', skel)} />
    </div>
  );
}

export default function AiRecoCard({ reco, index = 0, isLight, coverUrl: propCoverUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [signalInfoOpen, setSignalInfoOpen] = useState(false);
  const [showSignalTooltip, setShowSignalTooltip] = useState(false);
  const [phaseInfoOpen, setPhaseInfoOpen] = useState(false);
  const [showPhaseTooltip, setShowPhaseTooltip] = useState(false);

  const hasPropCover = typeof propCoverUrl === 'string' && propCoverUrl.trim().length > 0;
  const { url: resolvedCoverSrc, loading: resolvedCoverLoading } = useBookCover({
    id: reco.book_id,
    title: reco.title,
    author: reco.authors,
    cover_url: reco.cover_url,
  });
  const coverSrc = hasPropCover ? propCoverUrl : resolvedCoverSrc;
  const coverLoading = hasPropCover ? false : resolvedCoverLoading;

  const phaseInfo = getPhaseInfo(reco.phase);

  const hybridScorePct = Number.isFinite(reco.hybrid_score)
    ? Math.max(0, Math.min(100, Math.round(reco.hybrid_score * 100)))
    : 0;
  const safeSignals = reco.signals && typeof reco.signals === 'object'
    ? reco.signals
    : { content: { score: 0, weight: 1, label: 'Konten' }, collab: { score: 0, weight: 0, label: 'Kolaboratif' } };

  const dominantSignalKey = (reco.dominant_signal in SIGNAL_CONFIG ? reco.dominant_signal : 'content') as keyof typeof SIGNAL_CONFIG;
  const sig = SIGNAL_CONFIG[dominantSignalKey] ?? SIGNAL_CONFIG.content;
  const signalInfo = SIGNAL_INFO[dominantSignalKey] ?? SIGNAL_INFO.content;
  const { Icon, label, badgeBg, barColor, textColor } = sig;

  // Normalised author string (title case)
  const authorDisplay = reco.authors
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <motion.div
      className="flex-shrink-0 w-44 relative"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      {/* ── Cover ── */}
      <Link href={`/book/${reco.book_id}`} className="block">
        <motion.div
          className={cn(
            'w-44 h-64 rounded-2xl overflow-hidden shadow-xl mb-3 relative',
            isLight ? 'bg-parchment-darker' : 'bg-navy-700',
          )}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Cover image */}
          {coverLoading && (
            <div className={cn('w-full h-full animate-pulse', isLight ? 'bg-parchment-darker' : 'bg-navy-700/80')} />
          )}
          {coverSrc && !coverLoading && (
            <img
              src={coverSrc}
              alt={reco.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Kalau image error, sembunyikan
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {/* Fallback kalau cover ga ada */}
          {!coverSrc && !coverLoading && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4">
              <BookOpen className="w-8 h-8 opacity-20" style={{ color: 'var(--text)' }} />
              <p className="text-[10px] text-center opacity-40 line-clamp-3 leading-tight" style={{ color: 'var(--text)' }}>
                {reco.title}
              </p>
            </div>
          )}

        </motion.div>
      </Link>

      {/* Signal badge + tooltip */}
      <div className="absolute top-2.5 left-2.5 z-30">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSignalInfoOpen(true);
          }}
          onMouseEnter={() => setShowSignalTooltip(true)}
          onMouseLeave={() => setShowSignalTooltip(false)}
          onFocus={() => setShowSignalTooltip(true)}
          onBlur={() => setShowSignalTooltip(false)}
          className={cn(
            'text-[10px] backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white inline-flex items-center gap-1 border border-white/20 hover:brightness-110 transition-colors font-bold',
            badgeBg,
          )}
        >
          <Icon className="w-2.5 h-2.5" />
          <span>{label}</span>
        </button>

        <AnimatePresence>
          {showSignalTooltip && (
            <motion.div
              className="absolute left-0 mt-1.5 w-52 rounded-xl p-2.5 text-[10px] leading-relaxed shadow-2xl z-40"
              style={{ background: 'rgba(8, 15, 26, 0.94)', border: '1px solid rgba(255,255,255,0.14)' }}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <p className="font-semibold text-white mb-1">{signalInfo.title}</p>
              <p className="text-slate-200">{signalInfo.short}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-2.5 right-2.5 z-30">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPhaseInfoOpen(true);
          }}
          onMouseEnter={() => setShowPhaseTooltip(true)}
          onMouseLeave={() => setShowPhaseTooltip(false)}
          onFocus={() => setShowPhaseTooltip(true)}
          onBlur={() => setShowPhaseTooltip(false)}
          className="text-[10px] bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white inline-flex items-center gap-1 border border-white/20 hover:bg-black/70 transition-colors"
        >
          <span>{reco.phase}</span>
          <Info className="w-2.5 h-2.5" />
        </button>

        <AnimatePresence>
          {showPhaseTooltip && (
            <motion.div
              className="absolute right-0 mt-1.5 w-52 rounded-xl p-2.5 text-[10px] leading-relaxed shadow-2xl z-40"
              style={{ background: 'rgba(8, 15, 26, 0.94)', border: '1px solid rgba(255,255,255,0.14)' }}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <p className="font-semibold text-white mb-1">{phaseInfo.title}</p>
              <p className="text-slate-200">{phaseInfo.short}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info ── */}
      <p className="text-xs font-semibold leading-tight line-clamp-1 mb-0.5" style={{ color: 'var(--text)' }}>
        {reco.title}
      </p>
      <p className="text-[10px] truncate mb-2" style={{ color: 'var(--muted)' }}>
        {authorDisplay}
      </p>

      {/* Primary reason */}
      <p className="text-[11px] leading-snug mb-1.5 line-clamp-2" style={{ color: 'var(--muted)' }}>
        ✦ {reco.reason_primary}
      </p>

      {/* Secondary reason */}
      {reco.reason_secondary && (
        <p className="text-[10px] leading-snug mb-2 line-clamp-1" style={{ color: 'var(--muted)' }}>
          ✧ {reco.reason_secondary}
        </p>
      )}

      {/* Signal button */}
      <button
        onClick={() => setOpen(true)}
        className={cn('flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-gold', textColor)}
      >
        <BarChart2 className="w-3 h-3" /> Lihat sinyal
      </button>

      {/* ── Modal Analisis ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    Analisis PustarAI
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                {/* Book preview */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={cn(
                    'w-12 h-16 rounded-xl overflow-hidden shadow flex-shrink-0',
                    isLight ? 'bg-parchment-darker' : 'bg-navy-700',
                  )}>
                    {coverSrc
                      ? <img src={coverSrc} alt={reco.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 opacity-20" style={{ color: 'var(--text)' }} />
                        </div>
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text)' }}>
                      {reco.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{authorDisplay}</p>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                      style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
                    >
                      {reco.phase} · {reco.dominant_signal ? `Sinyal dominan: ${label}` : 'Sinyal dominan: -'}
                    </span>
                  </div>
                </div>

                {/* Reasons */}
                <div className="mb-4 p-3 rounded-2xl" style={{ background: 'var(--surface2)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
                    ✦ {reco.reason_primary}
                  </p>
                  {reco.reason_secondary && (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      ✧ {reco.reason_secondary}
                    </p>
                  )}
                </div>

                {/* Breakdown Sinyal */}
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--muted)' }}
                >
                  Breakdown Sinyal
                </p>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(safeSignals).map(([key, sig]) => {
                    const cfg = SIGNAL_CONFIG[key as keyof typeof SIGNAL_CONFIG];
                    if (!cfg) return null;
                    const rawScore = Number(sig?.score);
                    const pct = Number.isFinite(rawScore)
                      ? Math.max(0, Math.min(100, Math.round(rawScore * 100)))
                      : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <cfg.Icon className={cn('w-3 h-3', cfg.textColor)} />
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                              {sig.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: 'var(--text)' }}>
                            {pct}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--surface2)' }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: cfg.barColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/book/${reco.book_id}`}
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full py-3 rounded-2xl bg-navy-800 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-navy-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" /> Lihat Detail Buku
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Info Phase ── */}
      <AnimatePresence>
        {phaseInfoOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPhaseInfoOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gold" />
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    Arti Phase Rekomendasi
                  </p>
                </div>
                <button
                  onClick={() => setPhaseInfoOpen(false)}
                  className="p-1 rounded-lg hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--surface2)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{phaseInfo.title}</span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{phaseInfo.short}</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
                  {phaseInfo.description}
                </p>
                <div className="rounded-2xl p-3" style={{ background: 'var(--surface2)' }}>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    💡 {phaseInfo.tip}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Info Signal ── */}
      <AnimatePresence>
        {signalInfoOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSignalInfoOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-gold" />
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    Arti Sinyal Rekomendasi
                  </p>
                </div>
                <button
                  onClick={() => setSignalInfoOpen(false)}
                  className="p-1 rounded-lg hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--surface2)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{signalInfo.title}</span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>{signalInfo.short}</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
                  {signalInfo.description}
                </p>
                <div className="rounded-2xl p-3" style={{ background: 'var(--surface2)' }}>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    💡 {signalInfo.tip}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}