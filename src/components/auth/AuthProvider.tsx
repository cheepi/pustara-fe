'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { shouldGoToPersonalization } from '@/lib/survey';

// Routes yang butuh login
const PROTECTED = ['/shelf', '/profile', '/settings', '/ai-reco', '/community', '/read'];
// Routes yang TIDAK boleh diakses kalau sudah login
const AUTH_ONLY  = ['/auth/login', '/auth/register', '/catalog'];

async function syncUserToBackend(token: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${apiUrl}/auth/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return;
    if (!res.ok) {
      const d = await res.json();
      console.warn('⚠️ Backend sync failed:', d?.error || res.status);
    }
  } catch {
    // Backend mati — ga crash app
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // setLoading(true) sudah dilakukan di initial store state
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false); // ← ini yang penting: SATU kali, setelah Firebase resolve

      if (user) {
        // Background sync — tidak nge-block UI
        user.getIdToken().then(syncUserToBackend);

        // Redirect kalau user masuk ke halaman auth
        if (AUTH_ONLY.includes(pathname)) {
          const token = await user.getIdToken();
          const needPersonalization = await shouldGoToPersonalization(token);
          router.replace(needPersonalization ? '/auth/personalization' : '/');
        }
      } else {
        // Redirect kalau user belum login coba akses protected route
        const isProtected = PROTECTED.some(p => pathname.startsWith(p));
        if (isProtected) {
          router.replace('/auth/login');
        }
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: cukup sekali saat mount

  return <>{children}</>;
}