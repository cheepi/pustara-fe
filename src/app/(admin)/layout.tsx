'use client';

import { notFound } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AdminTopNav from '@/components/admin/AdminTopNav';

/**
 * Admin Layout — route group (admin)
 * URL: /dashboard-all-things, /books-management, /upload-book
 *
 * Behaviour:
 *  loading=true          → spinner (auth belum resolved)
 *  role='admin'          → render children ✅
 *  role='reader'/'null'  → notFound() 🚫
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuthStore();

  // Still resolving — show spinner
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Auth resolved but not admin → 404
  if (role !== 'admin') {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AdminTopNav />
      <main className="pt-20 md:pt-24">{children}</main>
    </div>
  );
}

// 'use client';

// import { useAuthStore } from '@/store/authStore';
// import { notFound } from 'next/navigation';
// import { cn } from '@/lib/utils';
// import { useTheme } from '@/components/theme/ThemeProvider';
// // import AdminSidebar from '@/components/admin/AdminSidebar';

// export default function AdminLayout({ children }: { children: React.ReactNode }) {
//   const { loading, role } = useAuthStore();
//   const { theme } = useTheme();
//   const dark = theme === 'dark';

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