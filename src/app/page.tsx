'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import HomePage from '@/components/home/HomePage';
import ComboLogo from '@/components/icons/ComboLogo';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/catalog');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      // Pakai var(--bg) supaya loading screen ikut tema dark/light
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <ComboLogo />
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-gold/40 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <HomePage />;
}