'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DraggableFAB from '@/components/layout/DraggableFAB';

const NO_FAB_PATHS = ['/auth', '/dashboard-all-things', '/books-management', '/upload-book', '/admin', 
  '/users-management', '/loans-management', '/contents-management',];

export default function FABGuard() {
  const { user, loading } = useAuthStore();
  const pathname = usePathname();

  // Ga show kalau: belum login, masih loading auth, atau di halaman tertentu
  const isExcluded = NO_FAB_PATHS.some((pathPrefix) => pathname.startsWith(pathPrefix));
  if (loading || !user || isExcluded) return null;

  return <DraggableFAB />;
}