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
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // 📝 Sync user ke Azure SQL via backend
        try {
          const token = await user.getIdToken();
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
          
          const response = await fetch(`${apiUrl}/auth/verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            console.log('✅ User synced to Azure SQL');
          } else {
            console.warn('⚠️ Failed to sync user to database');
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }

        // Redirect setelah sync
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
