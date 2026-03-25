'use client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import Navbar from '@/components/layout/Navbar';

/**
 * Skeleton placeholder ditampilkan saat auth state masih loading.
 * Prevents the "white flash" / "blank page flash" sebelum redirect.
 */
export function PageSkeleton({ navbar = true }: { navbar?: boolean }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const pulse = dark ? 'bg-navy-700/60 animate-pulse' : 'bg-slate-200/80 animate-pulse';

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      {navbar && <Navbar />}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className={cn('h-8 w-48 rounded-xl mb-6', pulse)} />

        {/* Content rows */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {[100, 80, 90].map((w, i) => (
            <div key={i} className={cn('h-5 rounded-lg', pulse)} style={{ width: `${w}%` }} />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i}>
              <div className={cn('w-full aspect-[2/3] rounded-2xl mb-2', pulse)} />
              <div className={cn('h-3 w-3/4 rounded mb-1', pulse)} />
              <div className={cn('h-3 w-1/2 rounded', pulse)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Minimal dots loader — untuk auth/loading state tanpa navbar */
export function DotsLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-gold/50 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}