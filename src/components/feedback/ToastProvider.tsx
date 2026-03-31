'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
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
  const idRef = useRef(0);

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

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[120] flex flex-col gap-2 pointer-events-none sm:max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn(
                'pointer-events-auto rounded-xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm',
                toast.type === 'success' && (isLight ? 'bg-emerald-50/95 border-emerald-200 text-emerald-700' : 'bg-emerald-500/18 border-emerald-400/40 text-emerald-200'),
                toast.type === 'error' && (isLight ? 'bg-red-50/95 border-red-200 text-red-700' : 'bg-red-500/20 border-red-400/40 text-red-200'),
                toast.type === 'info' && (isLight ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-navy-900 border-white/15 text-slate-200')
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 flex-shrink-0" />}
                <p className="text-sm font-semibold leading-relaxed">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
