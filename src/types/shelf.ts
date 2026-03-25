export interface RakBook {
  key: string;
  title: string;
  author: string;
  coverId?: number;
  genre: string;
  rating?: number;
}

export interface PinjamanBook extends RakBook {
  borrowedAt: string;
  dueDate: string;
  daysLeft: number;
  progress: number;
}

export interface RiwayatBook extends RakBook {
  returnedAt: string;
  readDays: number;
  userRating?: number;
}

export interface WishlistBook extends RakBook {
  addedAt: string;
  available: boolean;
}

export interface BacaanBook extends RakBook {
  progress: number;
  lastRead: string;
  totalPages: number;
  currentPage: number;
}

export interface ShelfData {
  pinjaman: PinjamanBook[];
  dibaca: BacaanBook[];
  wishlist: WishlistBook[];
  riwayat: RiwayatBook[];
}

export type ShelfTabId = 'dipinjam' | 'dibaca' | 'wishlist' | 'riwayat';
