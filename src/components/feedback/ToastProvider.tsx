'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

export type GlobalToastType = 'success' | 'error' | 'info';

interface GlobalToastItem {
  id: number;
  message: string;
  type: GlobalToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: GlobalToastType, durationMs?: number) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [toasts, setToasts] = useState<GlobalToastItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: GlobalToastType = 'info', durationMs = 3200) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, durationMs);
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  const toastLayer = (
    <div
      style={isMobile
        ? {
            position: 'fixed' as const,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '0.5rem',
            pointerEvents: 'none' as const,
            top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100vw - 2rem)',
            maxWidth: 'calc(100vw - 2rem)',
            alignItems: 'center',
          }
        : {
            position: 'fixed' as const,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column-reverse' as const,
            gap: '0.5rem',
            pointerEvents: 'none' as const,
            bottom: '24px',
            right: '24px',
            top: 'auto',
            left: 'auto',
            transform: 'none',
            width: '380px',
            maxWidth: '380px',
            alignItems: 'flex-end',
          }
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => {
          /* ── colour tokens per type × theme ── */
          const toneClass = toast.type === 'success'
            ? (isLight
                ? 'bg-white/95 border-emerald-200/80 text-emerald-900'
                : 'bg-[#0f1f1b]/90 border-emerald-400/25 text-emerald-50')
            : toast.type === 'error'
              ? (isLight
                  ? 'bg-white/95 border-red-200/80 text-red-900'
                  : 'bg-[#1f1010]/90 border-red-400/25 text-red-50')
              : (isLight
                  ? 'bg-white/95 border-slate-200/80 text-slate-900'
                  : 'bg-[#151722]/90 border-white/10 text-slate-50');

          /* ── multi-layer shadow: contact + spread + ambient + coloured glow ── */
          const shadowLight = toast.type === 'success'
            ? 'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05),0_12px_36px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(16,185,129,0.08),0_8px_24px_-4px_rgba(16,185,129,0.12)]'
            : toast.type === 'error'
              ? 'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05),0_12px_36px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(239,68,68,0.08),0_8px_24px_-4px_rgba(239,68,68,0.10)]'
              : 'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05),0_12px_36px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(100,116,139,0.06)]';
          const shadowDark = toast.type === 'success'
            ? 'shadow-[0_1px_3px_rgba(0,0,0,0.3),0_6px_16px_rgba(0,0,0,0.25),0_16px_48px_-8px_rgba(0,0,0,0.35),0_0_20px_-4px_rgba(16,185,129,0.20)]'
            : toast.type === 'error'
              ? 'shadow-[0_1px_3px_rgba(0,0,0,0.3),0_6px_16px_rgba(0,0,0,0.25),0_16px_48px_-8px_rgba(0,0,0,0.35),0_0_20px_-4px_rgba(239,68,68,0.18)]'
              : 'shadow-[0_1px_3px_rgba(0,0,0,0.3),0_6px_16px_rgba(0,0,0,0.25),0_16px_48px_-8px_rgba(0,0,0,0.35)]';

          const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertTriangle : Info;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={isMobile ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { opacity: 0, y: -12, scale: 0.95 } : { opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }}
              className={cn(
                'pointer-events-auto relative w-full overflow-hidden rounded-2xl border backdrop-blur-xl backdrop-saturate-150',
                isLight ? shadowLight : shadowDark,
                toneClass,
                'px-4 py-3.5 pr-12'
              )}
              role="status"
              aria-live="polite"
            >
              {/* ── progress bar ── */}
              <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-2xl bg-black/[0.04]">
                <motion.div
                  className={cn(
                    'h-full origin-left rounded-full',
                    toast.type === 'success'
                      ? (isLight ? 'bg-emerald-400/70' : 'bg-emerald-400/50')
                      : toast.type === 'error'
                        ? (isLight ? 'bg-red-400/70' : 'bg-red-400/50')
                        : (isLight ? 'bg-sky-400/70' : 'bg-sky-400/50')
                  )}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 3.2, ease: 'linear' }}
                />
              </div>

              <div className="flex items-center gap-3">
                {/* ── icon badge ── */}
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                  toast.type === 'success' && (isLight
                    ? 'bg-emerald-50 border-emerald-200/60 text-emerald-600'
                    : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400'),
                  toast.type === 'error' && (isLight
                    ? 'bg-red-50 border-red-200/60 text-red-600'
                    : 'bg-red-500/10 border-red-400/20 text-red-400'),
                  toast.type === 'info' && (isLight
                    ? 'bg-slate-50 border-slate-200/60 text-slate-600'
                    : 'bg-white/[0.06] border-white/10 text-slate-400')
                )}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </div>

                {/* ── message ── */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold leading-snug tracking-[-0.01em] break-words sm:text-sm">{toast.message}</p>
                </div>

                {/* ── close button ── */}
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className={cn(
                    'absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-90',
                    isLight
                      ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/80'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.08]'
                  )}
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted ? createPortal(toastLayer, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
