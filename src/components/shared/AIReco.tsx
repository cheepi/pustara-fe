'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { fetchOpenLibraryCoverId } from '@/lib/api';
import type { AiRecommendation } from '@/types/ai';

// ── Skeleton card untuk loading state ─────────────────────────────────────
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
