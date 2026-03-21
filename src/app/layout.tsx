import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
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
    <html lang="id">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('pustara_theme');
            if (t === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <FABGuard />
        </ThemeProvider>
      </body>
    </html>
  );
}