'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { shouldGoToPersonalization } from '@/lib/survey';

// Routes yang butuh login (non-admin)
const PROTECTED    = ['/shelf', '/profile', '/settings', '/ai-reco', '/community', '/read'];
// Routes khusus admin — layout (admin)/layout.tsx juga protect ini
const ADMIN_ROUTES = ['/dashboard', '/books', '/upload'];
// Routes yang TIDAK boleh diakses kalau sudah login
const AUTH_ONLY    = ['/auth/login', '/auth/register'];

/**
 * Sync user to backend AND get role in one call.
 * verify-token now returns { data: { role: 'admin' | 'reader' } }
 * Also sends persistent device_id for reliable session matching
 */
async function syncAndGetRole(token: string): Promise<'reader' | 'admin'> {
  try {
    // Get persistent device_id from localStorage (creates one if missing)
    const { getOrCreateDeviceId } = await import('@/lib/deviceDetection');
    const deviceId = getOrCreateDeviceId();
    console.log('[AuthProvider] Using persistent device_id:', deviceId);

    const res = await fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        device_id: deviceId,  // NEW: persistent device identifier for session matching
      }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.warn('[AuthProvider] verify-token: non-JSON response');
      return 'reader';
    }
    if (!res.ok) {
      console.warn('[AuthProvider] verify-token failed:', res.status);
      return 'reader';
    }
    const json = await res.json();
    const role = json?.data?.role || 'reader';
    console.log('[AuthProvider] syncAndGetRole →', role, json);
    return role as 'reader' | 'admin';
  } catch (e) {
    console.error('[AuthProvider] syncAndGetRole error:', e);
    return 'reader';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { setUser, resolveAuth } = useAuthStore();

  useEffect(() => {
    if (!auth) {
      resolveAuth(null);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        const token = await user.getIdToken();

        // Single call: sync user to backend + get role
        const role = await syncAndGetRole(token);
        resolveAuth(role);   // atomic: role + loading=false

        if (role === 'admin') {
          // Admin di auth-only atau root → kirim ke dashboard
          if (AUTH_ONLY.includes(pathname) || pathname === '/') {
            router.replace('/dashboard-all-things');
          }
          return;
        }

        // Non-admin coba akses admin routes → layout handles via notFound()
        // Non-admin di halaman auth → cek personalization
        if (AUTH_ONLY.includes(pathname)) {
          const needPersonalization = await shouldGoToPersonalization(token);
          router.replace(needPersonalization ? '/auth/personalization' : '/catalog');
          return;
        }

        // Cegah akses /auth/personalization kalau sudah pernah ngisi/skip
        if (pathname === '/auth/personalization') {
          const needPersonalization = await shouldGoToPersonalization(token);
          if (!needPersonalization) router.replace('/catalog');
        }
      } else {
        // Tidak login
        resolveAuth(null);

        const isAdminRoute = ADMIN_ROUTES.some(p => pathname.startsWith(p));
        const isProtected = PROTECTED.some((p) => {
          // Keep `/profile` protected only when visiting the personal `/profile` page,
          // but allow `/profile/@username` to be publicly viewable.
          if (p === '/profile') return pathname === '/profile';
          return pathname.startsWith(p);
        });

        if (isProtected || isAdminRoute) {
          router.replace('/auth/login');
        }
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}