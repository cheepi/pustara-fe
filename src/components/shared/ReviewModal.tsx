'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type User } from '@/lib/api';

interface Props {
  bookTitle: string;
  bookKey:   string;
  open:      boolean;
  onClose:   () => void;
  onSubmit?: (rating: number, text: string) => void;
}

const RATING_LABELS = ['', 'Kurang', 'Biasa', 'Bagus', 'Sangat Bagus', 'Luar Biasa!'];

export default function ReviewModal({ bookTitle, bookKey, open, onClose, onSubmit }: Props) {
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isLight = theme === 'light';

  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [text,        setText]        = useState('');
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [dbUser,      setDbUser]      = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // Get user record when modal opens and user is logged in
  useEffect(() => {
    if (open && user && !authLoading) {
      console.log('📝 ReviewModal: Fetching user for UID:', user.uid);
      setUserLoading(true);
      getCurrentUser()
        .then(userData => {
          console.log('✅ ReviewModal: Got user:', userData);
          setDbUser(userData);
          setUserLoading(false);
        })
        .catch(err => {
          console.error('❌ ReviewModal: Error fetching user:', err);
          setUserLoading(false);
        });
    }
  }, [open, user, authLoading]);

  function handleSubmit() {
    if (!rating || !text.trim()) return;
    if (!user || !dbUser) return;

    setLoading(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: dbUser.id,
        book_id: bookKey,
        rating: rating,
        review_text: text
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLoading(false);
          setSubmitted(true);
          onSubmit?.(rating, text);
        } else {
          throw new Error(data.message || 'Failed to submit review');
        }
      })
      .catch(err => {
        console.error('Review submission error:', err);
        alert('Gagal mengirim ulasan: ' + err.message);
        setLoading(false);
      });
  }

  function handleLoginClick() {
    onClose();
    router.push('/auth/signin');
  }

  function handleClose() {
    if (!submitted) {
      setRating(0);
      setHovered(0);
      setText('');
    }
    setSubmitted(false);
    onClose();
  }

  const tk = {
    bg:      isLight ? 'bg-white text-navy-900'   : 'bg-navy-800 text-white',
    muted:   isLight ? 'text-slate-500'            : 'text-slate-400',
    border:  isLight ? 'border-slate-200'          : 'border-white/10',
    input:   isLight
      ? 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold'
      : 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50',
    cancel:  isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/8 text-white/60 hover:bg-white/12',
  };

  const activeRating = hovered || rating;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose} />

          {/* Modal */}
          <motion.div
            className={cn('relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl', tk.bg)}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

            {/* Close */}
            <button onClick={handleClose}
              className={cn('absolute top-4 right-4 z-10 p-1.5 rounded-xl transition-colors', tk.muted, 'hover:text-gold')}>
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">

              {submitted ? (
                <motion.div key="success"
                  className="p-8 text-center"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>

                  <motion.div
                    className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}>
                    <Star className="w-8 h-8 text-white fill-white" />
                  </motion.div>

                  <h3 className="font-serif text-xl font-black mb-1">Ulasan Terkirim!</h3>
                  <p className={cn('text-sm mb-5', tk.muted)}>
                    Terima kasih sudah berbagi pendapat tentang <strong>{bookTitle}</strong>.
                  </p>
                  <button onClick={handleClose}
                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors">
                    Tutup
                  </button>
                </motion.div>

              ) : userLoading && user ? (
                /* ── LOADING STATE (Fetching user) ── */
                <motion.div key="loading"
                  className="p-8 text-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Header */}
                  <div className={cn('px-6 pt-6 pb-4 border-b', tk.border)}>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider mb-0.5', tk.muted)}>Tulis Ulasan</p>
                    <h3 className="font-serif text-lg font-black leading-tight line-clamp-1">{bookTitle}</h3>
                  </div>

                  <div className="px-6 py-12 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className={cn('text-sm', tk.muted)}>Memuat profil kamu...</p>
                  </div>
                </motion.div>

              ) : !user || authLoading ? (
                /* ── LOGIN REQUIRED STATE ── */
                <motion.div key="login-required"
                  className="p-8 text-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  <motion.div
                    className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Lock className="w-8 h-8 text-gold" />
                  </motion.div>

                  <h3 className="font-serif text-xl font-black mb-2">Login Diperlukan</h3>
                  <p className={cn('text-sm mb-6', tk.muted)}>
                    Silakan login untuk menulis ulasan tentang buku ini.
                  </p>

                  <div className="flex flex-col gap-3">
                    <button onClick={handleLoginClick}
                      className="w-full py-3 rounded-2xl bg-gold text-navy-900 font-bold text-sm hover:bg-gold/90 transition-colors">
                      Login Sekarang
                    </button>
                    <button onClick={handleClose}
                      className={cn('w-full py-3 rounded-2xl text-sm font-medium transition-colors', tk.cancel)}>
                      Batal
                    </button>
                  </div>
                </motion.div>

              ) : (
                /* ── FORM STATE ── */
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Header */}
                  <div className={cn('px-6 pt-6 pb-4 border-b', tk.border)}>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider mb-0.5', tk.muted)}>Tulis Ulasan</p>
                    <h3 className="font-serif text-lg font-black leading-tight line-clamp-1">{bookTitle}</h3>
                  </div>

                  <div className="px-6 py-5">

                    {/* Star rating */}
                    <div className="flex flex-col items-center mb-5">
                      <p className={cn('text-xs font-medium mb-3', tk.muted)}>Rating kamu</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s}
                            onClick={() => setRating(s)}
                            onMouseEnter={() => setHovered(s)}
                            onMouseLeave={() => setHovered(0)}
                            className="transition-transform hover:scale-110 active:scale-95">
                            <Star className={cn(
                              'w-9 h-9 transition-colors duration-100',
                              s <= activeRating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700'
                            )} />
                          </button>
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        {activeRating > 0 && (
                          <motion.p key={activeRating}
                            className="text-gold text-sm font-semibold mt-2"
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                            {RATING_LABELS[activeRating]}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Text input */}
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Ceritakan pengalamanmu membaca buku ini..."
                      rows={4}
                      maxLength={500}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-sm resize-none outline-none transition-all',
                        tk.input
                      )}
                    />
                    <div className={cn('text-right text-xs mt-1', tk.muted)}>
                      {text.length}/500
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleClose}
                        className={cn('flex-1 py-3 rounded-2xl text-sm font-medium transition-colors', tk.cancel)}>
                        Batal
                      </button>
                      <motion.button
                        onClick={handleSubmit}
                        disabled={!rating || !text.trim() || loading || !dbUser}
                        className={cn(
                          'flex-1 py-3 rounded-2xl text-sm font-bold transition-all',
                          rating && text.trim() && !loading && dbUser
                            ? 'bg-navy-800 text-white hover:bg-navy-700'
                            : isLight ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white/8 text-white/30 cursor-not-allowed'
                        )}
                        whileTap={rating && text.trim() && dbUser ? { scale: 0.97 } : {}}>
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mengirim...
                          </span>
                        ) : 'Kirim Ulasan'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}