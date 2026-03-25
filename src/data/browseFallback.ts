import type { BrowseBook, FriendActivityItem } from '@/types/browse';

export const BROWSE_POPULAR_BOOKS: BrowseBook[] = [
  { key: 'd1', title: 'Laskar Pelangi', author: 'Andrea Hirata', coverUrl: 'https://covers.openlibrary.org/b/id/8231568-M.jpg' },
  { key: 'd2', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', coverUrl: 'https://covers.openlibrary.org/b/id/8750787-M.jpg' },
  { key: 'd3', title: 'Cantik Itu Luka', author: 'Eka Kurniawan', coverUrl: 'https://covers.openlibrary.org/b/id/12699828-M.jpg' },
  { key: 'd4', title: 'Perahu Kertas', author: 'Dee Lestari', coverUrl: 'https://covers.openlibrary.org/b/id/7886745-M.jpg' },
  { key: 'd5', title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', coverUrl: 'https://covers.openlibrary.org/b/id/8913924-M.jpg' },
  { key: 'd6', title: 'Ayah', author: 'Andrea Hirata', coverUrl: 'https://covers.openlibrary.org/b/id/10521865-M.jpg' },
];

export const BROWSE_FRIEND_ACTIVITY: FriendActivityItem[] = [
  { user: 'Anna R.', avatar: 'A', action: 'sedang membaca', book: 'Laskar Pelangi', coverUrl: 'https://covers.openlibrary.org/b/id/8231568-S.jpg', key: 'd1', time: '2 jam lalu' },
  { user: 'Brandon S.', avatar: 'B', action: 'selesai membaca', book: 'Bumi Manusia', coverUrl: 'https://covers.openlibrary.org/b/id/8750787-S.jpg', key: 'd2', time: '5 jam lalu' },
  { user: 'Sarah A.', avatar: 'S', action: 'sedang membaca', book: 'Perahu Kertas', coverUrl: 'https://covers.openlibrary.org/b/id/7886745-S.jpg', key: 'd4', time: 'kemarin' },
  { user: 'Dika P.', avatar: 'D', action: 'baru meminjam', book: 'Cantik Itu Luka', coverUrl: 'https://covers.openlibrary.org/b/id/12699828-S.jpg', key: 'd3', time: '2 hari lalu' },
];
