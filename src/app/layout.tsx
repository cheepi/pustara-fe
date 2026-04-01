import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import FABGuard from '@/components/layout/FABGuard';

export const metadata: Metadata = {
  title: 'Pustara | Perpustakaan Digital Nusantara',
  description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
  icons: '/Logo.svg',
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head />
      <body className="min-h-screen overflow-x-hidden overflow-y-auto">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('pustara_theme');
                if (t === 'light') document.documentElement.classList.add('light');
              } catch(e) {}
            `,
          }}
        />
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-screen w-full flex flex-col">
              <AuthProvider>{children}</AuthProvider>
              <FABGuard />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}