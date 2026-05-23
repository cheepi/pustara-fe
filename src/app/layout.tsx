import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import FABGuard from '@/components/layout/FABGuard';

export const metadata: Metadata = {
  title: 'Pustara | Perpustakaan Digital Nusantara',
  description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
  icons: '/Logo.svg',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pustara",
  },
  openGraph: {
    title: 'Pustara | Perpustakaan Digital Nusantara',
    description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
    siteName: 'Pustara',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pustara',
    description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f6f1' }, 
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head />
      <body className="min-h-screen overflow-x-hidden overflow-y-auto no-scrollbar">
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col">
              <AuthProvider>{children}</AuthProvider>
              <FABGuard />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
