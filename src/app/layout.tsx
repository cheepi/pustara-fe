import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'Pustara | Perpustakaan Digital Nusantara',
  description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
  icons: '/Logo.svg',
  openGraph: {
    title: 'Pustara | Perpustakaan Digital Nusantara',
    description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
    // url: 'https://pustara.id',
    siteName: 'Pustara',
    // images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pustara',
    description: 'Perpustakaan Digital Milik Masyarakat Indonesia',
    // images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}