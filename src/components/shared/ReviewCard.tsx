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
import { motion } from 'framer-motion';
import { Star, Heart, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import AvatarImage from '@/components/shared/AvatarImage';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toggleReviewLike, getReviewLikeStatus } from '@/lib/reviewLikes';

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
  variant = 'default',
  index = 0,
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
        {/* Top row: avatar + name/stars + cover thumbnail */}
        <div className="flex items-start gap-2.5 mb-3">
          <AvatarImage
            src={avatarUrl || null}
            alt={name || '?'}
            initials={(name || '?').slice(0, 2).toUpperCase()}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold truncate leading-tight', tk.text)}>
              {name || '—'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-2.5 h-2.5',
                    s <= rating ? 'text-gold fill-gold' : isLight ? 'text-slate-300' : 'text-slate-700')} />
                ))}
              </div>
              {timeStr && (
                <span className={cn('text-[10px] leading-none', tk.muted)}>{timeStr}</span>
              )}
            </div>
          </div>

          {/* Book thumbnail — right-aligned */}
          {(bookId || bookCoverUrl) && (
            bookId
              ? (
                <Link href={`/book/${bookId}`} className="flex-shrink-0">
                  <div className={cn('w-9 h-12 rounded-lg overflow-hidden shadow-md', tk.coverBg)}>
                    {bookCoverUrl
                      ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" />
                      : <BookOpen className="w-3.5 h-3.5 text-gold/30 m-auto mt-3.5" />
                    }
                  </div>
                </Link>
              ) : (
                <div className={cn('flex-shrink-0 w-9 h-12 rounded-lg overflow-hidden shadow-md', tk.coverBg)}>
                  {bookCoverUrl
                    ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" />
                    : <BookOpen className="w-3.5 h-3.5 text-gold/30 m-auto mt-3.5" />
                  }
                </div>
              )
          )}
        </div>

        {/* Book title */}
        {bookTitle && (
          bookId
            ? (
              <Link href={`/book/${bookId}`}>
                <p className="text-xs font-semibold text-gold/80 hover:text-gold transition-colors mb-1 truncate">
                  {bookTitle}
                </p>
              </Link>
            ) : (
              <p className="text-xs font-semibold text-gold/80 mb-1 truncate">{bookTitle}</p>
            )
        )}

        {/* Review text */}
        <p className={cn('text-xs leading-relaxed line-clamp-2 mb-3', tk.muted)}>
          {text || '—'}
        </p>

        {/* Like */}
        <div className="flex-1" />
        <LikeButton />
      </motion.div>
    );
  }

  // ── DEFAULT variant ──────────────────────────────────────────────────────────
  // Used by: book detail, full reviews page, community feed
  const hasBookContext = Boolean(bookTitle || bookCoverUrl);

  return (
    <motion.div
      className={cn('rounded-2xl p-4', tk.surface)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {/* Reviewer header */}
      <div className="flex items-center gap-3 mb-3">
        <AvatarImage
          src={avatarUrl || null}
          alt={name || '?'}
          initials={(name || '?').slice(0, 2).toUpperCase()}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', tk.text)}>{name || '—'}</p>
          <p className={cn('text-xs', tk.muted)}>
            {timeStr && <span>{timeStr}</span>}
          </p>
        </div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={cn('w-3 h-3',
              s <= rating ? 'text-gold fill-gold' : isLight ? 'text-slate-200' : 'text-slate-700')} />
          ))}
        </div>
      </div>

      {/* Book context */}
      {hasBookContext && (
        <div className="flex gap-3 mb-3">
          {(bookCoverUrl || bookId) && (
            bookId
              ? (
                <Link href={`/book/${bookId}`} className="flex-shrink-0">
                  <div className={cn('w-12 h-16 rounded-xl overflow-hidden shadow-lg flex items-center justify-center', tk.coverBg)}>
                    {bookCoverUrl
                      ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" />
                      : <BookOpen className="w-4 h-4 text-gold/30" />
                    }
                  </div>
                </Link>
              ) : (
                <div className={cn('flex-shrink-0 w-12 h-16 rounded-xl overflow-hidden shadow-lg flex items-center justify-center', tk.coverBg)}>
                  {bookCoverUrl
                    ? <img src={bookCoverUrl} alt={bookTitle || ''} className="w-full h-full object-cover" />
                    : <BookOpen className="w-4 h-4 text-gold/30" />
                  }
                </div>
              )
          )}
          <div className="flex-1 min-w-0">
            {bookTitle && (
              bookId
                ? <Link href={`/book/${bookId}`}>
                    <p className={cn('text-sm font-bold hover:text-gold transition-colors', tk.text)}>{bookTitle}</p>
                  </Link>
                : <p className={cn('text-sm font-bold', tk.text)}>{bookTitle}</p>
            )}
            {bookAuthor && <p className={cn('text-xs mb-1', tk.muted)}>{bookAuthor}</p>}
            <p className={cn('text-sm leading-relaxed line-clamp-3', tk.muted)}>{text}</p>
          </div>
        </div>
      )}

      {/* Review text (no book context) */}
      {!hasBookContext && (
        <p className={cn('text-sm leading-relaxed mb-3', tk.muted)}>{text}</p>
      )}

      {/* Like */}
      <div className={cn('flex items-center pt-2', hasBookContext && 'border-t mt-1')}
        style={hasBookContext ? { borderColor: 'var(--border)' } : {}}>
        <LikeButton />
      </div>
    </motion.div>
  );
}
