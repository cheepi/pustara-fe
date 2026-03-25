'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Drop-in hook untuk semua protected pages.
 * Gantiin pattern:
 *   useEffect(() => { if (!authLoading && !user) router.replace('/auth/login'); }, [...])
 *
 * Usage:
 *   const { ready } = useProtectedRoute();
 *   if (!ready) return <PageSkeleton />;
 */
export function useProtectedRoute() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    // Tunggu Firebase selesai resolve dulu
    if (loading) return;
    if (!user) router.replace('/auth/login');
  }, [loading, user, router]);

  // ready = Firebase sudah resolve DAN user ada
  const ready = !loading && !!user;
  return { ready, user, loading };
}