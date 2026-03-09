'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import CatalogView from '@/components/catalog/CatalogView';

export default function CatalogPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && user) {
      // Udah login → ke home personal
      router.replace('/');
    }
  }, [user, loading, router]);

  // Kalau loading atau udah login (lagi redirect), tampil skeleton sebentar
  if (loading) return <CatalogSkeleton />;

  // Belum login → tampil catalog publik
  return <CatalogView />;
}

function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="font-serif text-2xl text-gold/40 tracking-widest">PUSTARA</span>
    </div>
  );
}
