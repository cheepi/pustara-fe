import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pustara | Eksplor',
};

export default function BrowseLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}