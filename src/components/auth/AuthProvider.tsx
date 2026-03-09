'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // Udah login, lagi di auth pages atau catalog → ke home
        if (['/auth/login', '/auth/register', '/catalog'].includes(pathname)) {
          const personalized = localStorage.getItem('pustara_personalized');
          router.replace(personalized ? '/' : '/auth/personalization');
        }
      }
    });
    return unsub;
  }, [pathname, router, setUser, setLoading]);

  return <>{children}</>;
}
