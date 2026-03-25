import type { ShelfData } from '@/types/shelf';

export const SHELF_FALLBACK_DATA: ShelfData = {
  pinjaman: [
    { key: 'd1', title: 'Laskar Pelangi', author: 'Andrea Hirata', coverId: 8231568, genre: 'Fiksi', borrowedAt: '11 Mar 2026', dueDate: '18 Mar 2026', daysLeft: 0, progress: 68 },
    { key: 'd2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', coverId: 8750787, genre: 'Sastra', borrowedAt: '14 Mar 2026', dueDate: '21 Mar 2026', daysLeft: 3, progress: 22 },
    { key: 'd4', title: 'Perahu Kertas', author: 'Dee Lestari', coverId: 7886745, genre: 'Romance', borrowedAt: '15 Mar 2026', dueDate: '22 Mar 2026', daysLeft: 4, progress: 5 },
  ],
  dibaca: [
    { key: 'd1', title: 'Laskar Pelangi', author: 'Andrea Hirata', coverId: 8231568, genre: 'Fiksi', progress: 68, lastRead: '2 jam lalu', totalPages: 529, currentPage: 360 },
    { key: 'd3', title: 'Cantik Itu Luka', author: 'Eka Kurniawan', coverId: 12699828, genre: 'Fiksi', progress: 41, lastRead: 'Kemarin', totalPages: 505, currentPage: 207 },
    { key: 'd5', title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', coverId: 8913924, genre: 'Inspiratif', progress: 90, lastRead: '3 hari lalu', totalPages: 423, currentPage: 380 },
  ],
  wishlist: [
    { key: 'd3', title: 'Cantik Itu Luka', author: 'Eka Kurniawan', coverId: 12699828, genre: 'Fiksi', addedAt: '10 Mar 2026', available: true, rating: 4.6 },
    { key: 'd6', title: 'Ayah', author: 'Andrea Hirata', coverId: 10521865, genre: 'Keluarga', addedAt: '8 Mar 2026', available: true, rating: 4.7 },
    { key: 'd5', title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', coverId: 8913924, genre: 'Inspiratif', addedAt: '5 Mar 2026', available: false, rating: 4.5 },
    { key: 'd2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', coverId: 8750787, genre: 'Sastra', addedAt: '1 Mar 2026', available: true, rating: 4.9 },
  ],
  riwayat: [
    { key: 'd6', title: 'Ayah', author: 'Andrea Hirata', coverId: 10521865, genre: 'Keluarga', returnedAt: '5 Mar 2026', readDays: 6, userRating: 5 },
    { key: 'd5', title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', coverId: 8913924, genre: 'Inspiratif', returnedAt: '20 Feb 2026', readDays: 7, userRating: 4 },
    { key: 'd3', title: 'Cantik Itu Luka', author: 'Eka Kurniawan', coverId: 12699828, genre: 'Fiksi', returnedAt: '10 Feb 2026', readDays: 5, userRating: 5 },
    { key: 'd4', title: 'Perahu Kertas', author: 'Dee Lestari', coverId: 7886745, genre: 'Romance', returnedAt: '28 Jan 2026', readDays: 4, userRating: 4 },
  ],
};
