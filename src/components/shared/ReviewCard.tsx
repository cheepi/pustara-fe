'use client';
/**
 * ReviewCard — shared review card component used across:
 *   - /book/[bookId]         (inline "Ulasan Pembaca" section)
 *   - /book/[bookId]/reviews (full reviews page)
 *   - /community             (community feed, with book context)
 *   - HomePage CommunityCard (compact card for horizontal scroll / grid)
 *
 * Manages its own like state internally with:
 *   - Initial status fetch from API (so liked state persists across refreshes)
 *   - Optimistic update + rollback on error
 *   - Unauthenticated users redirected to /auth/login
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, BookOpen, Edit, Trash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import AvatarImage from '@/components/shared/AvatarImage';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toggleReviewLike, getReviewLikeStatus } from '@/lib/reviewLikes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ReviewCardProps {
  /** Actual review UUID — required for like/unlike API call */
  reviewId?: string;
  /**
   * Reviewer display name.
   * Pass display_name from the backend (preferred over username for display).
   */
  name: string;
  avatarUrl?: string | null;
  rating: number;
  text: string;
  initialLikes?: number;
  /** Seed value — will be overridden by API fetch on mount if user is logged in */
  initialLiked?: boolean;
  /** ISO string or already-formatted string like "2 hari lalu" */
  time?: string;
  /** Location shown in book-page variant */
  loc?: string;
  /** Firebase UID of the review author for ownership checks */
  firebaseUid?: string;
  username?: string;

  // ── Book context (optional — shown on community & homepage) ──────────────────
  bookTitle?: string;
  bookAuthor?: string;
  /** Direct cover_url from books table */
  bookCoverUrl?: string | null;
  /** Book UUID — used for <Link href="/book/:bookId"> */
  bookId?: string;

  // ── Appearance ────────────────────────────────────────────────────────────────
  /**
   * `default` — standard card for book pages + community feed
   * `compact` — card for the homepage horizontal-scroll / 3-col grid
   */
  variant?: 'default' | 'compact';
  /** Stagger animation index */
  index?: number;

  onEdit?: (reviewId: string, rating: number, text: string) => void;
  onDeleted?: (reviewId: string) => void;
}

function formatRelativeTime(t: string | null | undefined): string {
  if (!t) return '';
  const parsed = Date.parse(String(t));
  if (Number.isNaN(parsed)) return String(t);
  const diff = Date.now() - parsed;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} dtk lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} minggu lalu`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} bln lalu`;
  return `${Math.floor(day / 365)} thn lalu`;
}

export default function ReviewCard({
  reviewId,
  name,
  avatarUrl,
  rating,
  text,
  initialLikes = 0,
  initialLiked = false,
  time,
  loc,
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  bookId,
  firebaseUid,
  username,
  variant = 'default',
  index = 0,
  onEdit,
  onDeleted,
}: ReviewCardProps) {
  const { theme } = useTheme();
  const { user }  = useAuth();
  const router    = useRouter();
  const isLight   = theme === 'light';

  const [liked,     setLiked]     = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [liking,    setLiking]    = useState(false);
  // Track whether we've fetched the real like status yet
  const [statusFetched, setStatusFetched] = useState(!user);
  const [currentRating, setCurrentRating] = useState(rating);
  const [currentText, setCurrentText] = useState(text || '');
  const [editOpen, setEditOpen] = useState(false);
  const [editRating, setEditRating] = useState(rating);
  const [editText, setEditText] = useState(text);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  useEffect(() => {
    setCurrentRating(rating);
    setCurrentText(text || '');
    setEditRating(rating);
    setEditText(text || '');
  }, [rating, text, reviewId]);

  // ── Fetch real like status on mount when user is logged in ────────────────────
  // This is what makes the heart stay pink after a page refresh.
  useEffect(() => {
    if (!user || !reviewId) {
      setStatusFetched(true);
      return;
    }
    getReviewLikeStatus(reviewId).then((result) => {
      setLiked(result.liked);
      setLikeCount(result.likes);
      setStatusFetched(true);
    });
    // Only run once on mount per reviewId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, user?.uid]);

  async function handleLike() {
    if (!user) { router.push('/auth/login'); return; }
    if (!reviewId || liking) return;

    const prevLiked = liked;
    const prevCount = likeCount;

    // Optimistic update
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setLiking(true);

    try {
      const result = await toggleReviewLike(reviewId);
      setLiked(result.liked);
      setLikeCount(result.likes);
    } catch {
      // Rollback
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  }

  async function handleEditSubmit() {
    if (!reviewId || !user) return;
    if (!editRating || !editText.trim()) return;

    setEditSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: editRating, body: editText.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || 'Gagal mengubah ulasan');
      setCurrentRating(editRating);
      setCurrentText(editText.trim());
      setEditOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal mengubah ulasan');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!reviewId || !user) return;
    setDeleteSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal menghapus');
      setDeleteOpen(false);
      onDeleted?.(reviewId);
    } catch (e) {
      alert('Gagal menghapus ulasan');
    } finally {
      setDeleteSaving(false);
    }
  }

  const timeStr = formatRelativeTime(time);

  const tk = {
    text:    isLight ? 'text-navy-900' : 'text-white',
    muted:   isLight ? 'text-slate-500' : 'text-slate-400',
    surface: isLight
      ? 'bg-white border border-slate-200'
      : 'bg-navy-800/60 border border-white/[0.07]',
    coverBg: isLight ? 'bg-slate-100' : 'bg-navy-700',
  };

  const LikeButton = ({ className }: { className?: string }) => (
    <motion.button
      onClick={handleLike}
      disabled={liking || !statusFetched}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'flex items-center gap-1 text-xs font-medium transition-colors select-none',
        liked ? 'text-rose-400' : tk.muted,
        'hover:text-rose-400',
        (liking || !statusFetched) && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <motion.span animate={{ scale: liked ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.25 }}>
        <Heart className={cn('w-3.5 h-3.5', liked && 'fill-rose-400')} />
      </motion.span>
      <span>{likeCount}</span>
    </motion.button>
  );

  // ── COMPACT variant ──────────────────────────────────────────────────────────
  // Used by: HomePage CommunitySection (mobile horizontal scroll + desktop 3-col grid)
  // NOTE: do NOT add w-64 here — the parent controls sizing (flex-shrink-0 w-64 for mobile,
  //       full grid cell for desktop).
  if (variant === 'compact') {
    return (
      <motion.div
        className={cn('h-full rounded-2xl p-4 flex flex-col gap-0', tk.surface)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
      >
        <div className="flex items-start gap-2.5 mb-3">
          {username ? (
            <Link href={`/profile/@${username}`} className="flex flex-1 min-w-0 items-start gap-2.5 cursor-pointer">
              <AvatarImage
                src={avatarUrl || null}
                alt={name || '?'}
                initials={(name || '?').slice(0, 2).toUpperCase()}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate leading-tight hover:text-gold transition-colors block', tk.text)}>{name || '—'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-2.5 h-2.5', s <= currentRating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                    ))}
                  </div>
                  {timeStr && <span className={cn('text-[10px] leading-none', tk.muted)}>{timeStr}</span>}
                </div>
              </div>
            </Link>
          ) : (
            <>
              <AvatarImage
                src={avatarUrl || null}
                alt={name || '?'}
                initials={(name || '?').slice(0, 2).toUpperCase()}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate leading-tight', tk.text)}>{name || '—'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-2.5 h-2.5', s <= currentRating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                    ))}
                  </div>
                  {timeStr && <span className={cn('text-[10px] leading-none', tk.muted)}>{timeStr}</span>}
                </div>
              </div>
            </>
          )}

          {(bookId || bookCoverUrl) && (
            bookId ? (
              <Link href={`/book/${bookId}`} className="flex-shrink-0">
                <div className={cn('w-9 h-12 rounded-lg overflow-hidden shadow-md', tk.coverBg)}>
                  {bookCoverUrl ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" /> : <BookOpen className="w-3.5 h-3.5 text-gold/30 m-auto mt-3.5" />}
                </div>
              </Link>
            ) : (
              <div className={cn('flex-shrink-0 w-9 h-12 rounded-lg overflow-hidden shadow-md', tk.coverBg)}>
                {bookCoverUrl ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" /> : <BookOpen className="w-3.5 h-3.5 text-gold/30 m-auto mt-3.5" />}
              </div>
            )
          )}
        </div>

        {bookTitle && (
          bookId ? (
            <Link href={`/book/${bookId}`}>
              <p className="text-xs font-semibold text-gold/80 hover:text-gold transition-colors mb-1 truncate">{bookTitle}</p>
            </Link>
          ) : (
            <p className="text-xs font-semibold text-gold/80 mb-1 truncate">{bookTitle}</p>
          )
        )}

        <p className={cn('text-xs leading-relaxed line-clamp-2 mb-3', tk.muted)}>{currentText || '—'}</p>

        <div className="flex-1" />
        <LikeButton />
      </motion.div>
    );
  }

  const hasBookContext = Boolean(bookTitle || bookCoverUrl);

  return (
    <>
      <motion.div
        className={cn('rounded-2xl p-4', tk.surface)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <div className="flex items-center gap-3 mb-3">
          {username ? (
            <Link href={`/profile/@${username}`} className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer">
              <AvatarImage src={avatarUrl || null} alt={name || '?'} initials={(name || '?').slice(0, 2).toUpperCase()} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold hover:text-gold transition-colors block truncate', tk.text)}>{name || '—'}</p>
                <p className={cn('text-xs', tk.muted)}>{timeStr && <span>{timeStr}</span>}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-3 h-3', s <= currentRating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <>
              <AvatarImage src={avatarUrl || null} alt={name || '?'} initials={(name || '?').slice(0, 2).toUpperCase()} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold', tk.text)}>{name || '—'}</p>
                <p className={cn('text-xs', tk.muted)}>{timeStr && <span>{timeStr}</span>}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-3 h-3', s <= currentRating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          {user && firebaseUid && user.uid === firebaseUid && (
            <div className="flex gap-2 ml-2 text-gray-500">
              <button
                onClick={() => {
                  setEditRating(currentRating);
                  setEditText(currentText);
                  setEditOpen(true);
                }}
                disabled={editSaving || deleteSaving}
                className="cursor-pointer hover:text-gold transition-colors disabled:opacity-50"
                aria-label="Edit review"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={editSaving || deleteSaving}
                className="cursor-pointer hover:text-red-500 transition-colors disabled:opacity-50"
                aria-label="Delete review"
              >
                <Trash size={16} />
              </button>
            </div>
          )}
        </div>

        {hasBookContext && (
          <div className="flex gap-3 mb-3">
            {(bookCoverUrl || bookId) && (
              bookId ? (
                <Link href={`/book/${bookId}`} className="flex-shrink-0">
                  <div className={cn('w-12 h-16 rounded-xl overflow-hidden shadow-lg flex items-center justify-center', tk.coverBg)}>
                    {bookCoverUrl ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-gold/30" />}
                  </div>
                </Link>
              ) : (
                <div className={cn('flex-shrink-0 w-12 h-16 rounded-xl overflow-hidden shadow-lg flex items-center justify-center', tk.coverBg)}>
                  {bookCoverUrl ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-gold/30" />}
                </div>
              )
            )}
            <div className="flex-1 min-w-0">
              {bookTitle && (bookId ? <Link href={`/book/${bookId}`}><p className={cn('text-sm font-bold hover:text-gold transition-colors', tk.text)}>{bookTitle}</p></Link> : <p className={cn('text-sm font-bold', tk.text)}>{bookTitle}</p>)}
              {bookAuthor && <p className={cn('text-xs mb-1', tk.muted)}>{bookAuthor}</p>}
              <p className={cn('text-sm leading-relaxed line-clamp-3', tk.muted)}>{currentText}</p>
            </div>
          </div>
        )}

        {!hasBookContext && <p className={cn('text-sm leading-relaxed mb-3', tk.muted)}>{currentText}</p>}

        <div className={cn('flex items-center pt-2', hasBookContext && 'border-t mt-1')} style={hasBookContext ? { borderColor: 'var(--border)' } : {}}>
          <LikeButton />
        </div>
      </motion.div>

      <AnimatePresence>
        {editOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !editSaving && setEditOpen(false)} />
            <motion.div className={cn('relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl', tk.surface)} initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <button onClick={() => !editSaving && setEditOpen(false)} className={cn('absolute top-4 right-4 z-10 p-1.5 rounded-xl transition-colors', tk.muted, 'hover:text-gold')} type="button"><X className="w-4 h-4" /></button>
              <div className={cn('px-6 pt-6 pb-4 border-b', isLight ? 'border-slate-200' : 'border-white/10')}>
                <p className={cn('text-xs font-semibold uppercase tracking-wider mb-0.5', tk.muted)}>Edit Ulasan</p>
                <h3 className="font-serif text-lg font-black leading-tight line-clamp-1">{bookTitle || name}</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex flex-col items-center mb-5">
                  <p className={cn('text-xs font-medium mb-3', tk.muted)}>Rating kamu</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} onClick={() => setEditRating(value)} className="transition-transform hover:scale-110 active:scale-95" type="button">
                        <Star className={cn('w-9 h-9 transition-colors duration-100', value <= editRating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={editText} onChange={(event) => setEditText(event.target.value)} placeholder="Ceritakan pengalamanmu membaca buku ini..." rows={4} maxLength={500} className={cn('w-full rounded-2xl border px-4 py-3 text-sm resize-none outline-none transition-all', isLight ? 'bg-slate-50 border-slate-200 text-navy-900 placeholder-slate-400 focus:border-gold' : 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50')} />
                <div className={cn('text-right text-xs mt-1', tk.muted)}>{editText.length}/500</div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => !editSaving && setEditOpen(false)} className={cn('flex-1 py-3 rounded-2xl text-sm font-medium transition-colors', isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/8 text-white/60 hover:bg-white/12')} type="button">Batal</button>
                  <motion.button onClick={handleEditSubmit} disabled={editSaving || !editRating || !editText.trim()} className="flex-1 py-3 rounded-2xl bg-gold text-navy-900 font-semibold text-sm hover:bg-gold-light transition-colors disabled:opacity-60" whileTap={{ scale: 0.98 }} type="button">{editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteSaving && setDeleteOpen(false)} />
            <motion.div className={cn('relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl', tk.surface)} initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <button onClick={() => !deleteSaving && setDeleteOpen(false)} className={cn('absolute top-4 right-4 z-10 p-1.5 rounded-xl transition-colors', tk.muted, 'hover:text-gold')} type="button"><X className="w-4 h-4" /></button>
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mb-4"><Trash className="w-6 h-6" /></div>
                <h3 className="font-serif text-xl font-black mb-2">Hapus ulasan?</h3>
                <p className={cn('text-sm leading-relaxed mb-5', tk.muted)}>Apakah Anda yakin ingin menghapus ulasan ini? Tindakan ini tidak bisa dibatalkan.</p>
                <div className="flex gap-3">
                  <button onClick={() => !deleteSaving && setDeleteOpen(false)} className={cn('flex-1 py-3 rounded-2xl text-sm font-medium transition-colors', isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/8 text-white/60 hover:bg-white/12')} type="button">Batal</button>
                  <motion.button onClick={handleDelete} disabled={deleteSaving} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-60" whileTap={{ scale: 0.98 }} type="button">{deleteSaving ? 'Menghapus...' : 'Hapus'}</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
