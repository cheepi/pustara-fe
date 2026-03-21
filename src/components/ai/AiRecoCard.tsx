'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, Users, BarChart2, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { fetchOpenLibraryCoverId } from '@/lib/api';
import type { AiRecommendation } from '@/store/aiStore';

// ── Cover helpers ─────────────────────────────────────────────────────────────

function olCoverUrl(id: string | null, size: 'S' | 'M' | 'L' = 'M') {
  return id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null;
}

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

// ── Hook: resolve cover ───────────────────────────────────────────────────────
// Priority: cover_url dari Neon → OpenLibrary by title → null

function useCover(reco: AiRecommendation) {
  const [coverId, setCoverId] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(
    // Kalau Neon punya cover_url langsung pakai
    (reco as AiRecommendation & { cover_url?: string }).cover_url ?? null,
  );
  const [coverLoading, setCoverLoading] = useState(false);

  useEffect(() => {
    // Kalau Neon sudah punya cover_url, skip fetch OpenLibrary
    const neonCover = (reco as AiRecommendation & { cover_url?: string }).cover_url;
    if (neonCover) return;

    setCoverLoading(true);
    fetchOpenLibraryCoverId(reco.title, reco.authors)
      .then((id) => {
        setCoverId(id);
        setCoverSrc(olCoverUrl(id, 'M'));
      })
      .finally(() => setCoverLoading(false));
  }, [reco.title, reco.authors]);

  return { coverSrc, coverLoading };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  reco: AiRecommendation;
  index?: number;
  isLight: boolean;
}

export default function AiRecoCard({ reco, index = 0, isLight }: Props) {
  const [open, setOpen] = useState(false);
  const { coverSrc, coverLoading } = useCover(reco);

  const sig = SIGNAL_CONFIG[reco.dominant_signal as keyof typeof SIGNAL_CONFIG]
    ?? SIGNAL_CONFIG.content;
  const { Icon, label, badgeBg, barColor, textColor } = sig;

  // Normalised author string (kapitalkan kata pertama tiap kata)
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
      <Link href={`/browse?q=${encodeURIComponent(reco.title)}`} className="block">
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

          {/* Signal badge kiri atas */}
          <div className={cn(
            'absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm text-white',
            badgeBg,
          )}>
            <Icon className="w-2.5 h-2.5" />
            {label}
          </div>

          {/* Phase badge kanan atas */}
          <div className="absolute top-2.5 right-2.5 text-[10px] bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white">
            {reco.phase}
          </div>
        </motion.div>
      </Link>

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
        <BarChart2 className="w-3 h-3" /> Lihat sinyal AI
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
                      {reco.phase} · Score: {(reco.hybrid_score * 100).toFixed(0)}%
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
                  {Object.entries(reco.signals).map(([key, sig]) => {
                    const cfg = SIGNAL_CONFIG[key as keyof typeof SIGNAL_CONFIG];
                    if (!cfg) return null;
                    const pct = Math.round(sig.score * 100);
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
                  href={`/browse?q=${encodeURIComponent(reco.title)}`}
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
    </motion.div>
  );
}