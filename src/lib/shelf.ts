import { SHELF_FALLBACK_DATA } from '@/data/shelfFallback';
import type { ShelfData } from '@/types/shelf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchShelfData(): Promise<ShelfData> {
  const endpoints = ['/shelf/me', '/users/me/shelf', '/shelf'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const data = json?.data ?? json;

      if (data && typeof data === 'object') {
        return {
          pinjaman: Array.isArray(data.pinjaman) ? data.pinjaman : SHELF_FALLBACK_DATA.pinjaman,
          dibaca: Array.isArray(data.dibaca) ? data.dibaca : SHELF_FALLBACK_DATA.dibaca,
          wishlist: Array.isArray(data.wishlist) ? data.wishlist : SHELF_FALLBACK_DATA.wishlist,
          riwayat: Array.isArray(data.riwayat) ? data.riwayat : SHELF_FALLBACK_DATA.riwayat,
        };
      }
    } catch {
      // try next endpoint
    }
  }

  return SHELF_FALLBACK_DATA;
}
