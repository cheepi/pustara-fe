'use client';

import { cn } from '@/lib/utils';
import type { GenreShelf } from '@/hooks/useGenreShelves';
import { GenreShelfRow } from './GenreShelfRow';

type ThemeKit = {
  text: string;
  muted: string;
};

export function GenreShelfSection({
  dark,
  tk,
  shelves,
  loading,
  error,
}: {
  dark: boolean;
  tk: ThemeKit;
  shelves: GenreShelf[];
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-5">
        {Array(3)
          .fill(0)
          .map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'p-4 rounded-2xl border animate-pulse',
                dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker'
              )}
            >
              <div className={cn('h-4 w-40 rounded mb-3', dark ? 'bg-white/10' : 'bg-slate-200')} />
              <div className="flex gap-3">
                {Array(5)
                  .fill(0)
                  .map((__, cardIdx) => (
                    <div
                      key={cardIdx}
                      className={cn('w-28 h-40 rounded-xl', dark ? 'bg-white/10' : 'bg-slate-200')}
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'rounded-2xl border p-4 text-sm',
          dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker',
          tk.muted
        )}
      >
        {error}
      </div>
    );
  }

  if (shelves.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl border p-4 text-sm',
          dark ? 'bg-navy-800/40 border-white/6' : 'bg-white border-parchment-darker',
          tk.muted
        )}
      >
        Kurasi genre belum tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {shelves.map((shelf, idx) => (
        <GenreShelfRow key={shelf.id} shelf={shelf} dark={dark} tk={tk} rowIndex={idx} />
      ))}
    </div>
  );
}
