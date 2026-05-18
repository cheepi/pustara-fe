export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AdminLayoutClient from './AdminLayoutClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

// Previous client-only implementation moved to AdminLayoutClient.tsx so the
// route segment can opt out of static prerendering safely.

// 'use client';

// import { useAuthStore } from '@/store/authStore';
// import { notFound } from 'next/navigation';
// import { cn } from '@/lib/utils';
// import { useTheme } from '@/components/theme/ThemeProvider';
// // import AdminSidebar from '@/components/admin/AdminSidebar';

// export default function AdminLayout({ children }: { children: React.ReactNode }) {
//   const { loading, role } = useAuthStore();

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
//           <p className="text-sm text-slate-500">Memverifikasi akses...</p>
//         </div>
//       </div>
//     );
//   }

//   if (role !== 'admin') notFound();

//   return (
//     <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
//       {/* <AdminSidebar /> */}
//       <main className="flex-1 ml-56 min-h-screen">
//         {children}
//       </main>
//     </div>
//   );
// }