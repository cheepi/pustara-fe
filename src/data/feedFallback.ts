import type { FeedItem } from '@/types/feed';

export const STATIC_SOCIAL_FEED: FeedItem[] = [
  {
    id: 'ac1', type: 'activity', time: '2 jam lalu',
    user: 'Anna R.', avatar: 'A', loc: 'Yogyakarta',
    action: 'selesai membaca', rating: 5,
    reviewText: 'Buku yang benar-benar mengubah cara pandangku. Andrea Hirata membawa kita ke Belitung dengan sangat hidup.',
    bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata', coverId: 8231568,
  },
  {
    id: 'no1', type: 'notif', time: '3 jam lalu',
    notifTitle: 'Tenggat Besok!',
    notifBody: '"Bumi Manusia" harus dikembalikan besok. Perpanjang sekarang.',
    bookKey: 'd2', coverId: 8750787,
  },
  {
    id: 'ac2', type: 'activity', time: 'Kemarin',
    user: 'Brandon S.', avatar: 'B', loc: 'Jakarta',
    action: 'sedang membaca',
    bookKey: 'd2', bookTitle: 'Bumi Manusia', bookAuthor: 'Pramoedya Ananta Toer', coverId: 8750787,
  },
  {
    id: 'ac3', type: 'activity', time: '2 hari lalu',
    user: 'Sarah A.', avatar: 'S', loc: 'Bandung',
    action: 'memberikan ulasan', rating: 5,
    reviewText: 'Realisme magis yang gelap dan indah. Eka Kurniawan memadukan sejarah kelam Indonesia dengan narasi yang memukau.',
    bookKey: 'd3', bookTitle: 'Cantik Itu Luka', bookAuthor: 'Eka Kurniawan', coverId: 12699828,
  },
  {
    id: 'no2', type: 'notif', time: '3 hari lalu',
    notifTitle: 'Antrean Tersedia!',
    notifBody: '"Perahu Kertas" yang kamu antrikan kini tersedia. Pinjam sebelum 24 jam.',
    bookKey: 'd4', coverId: 7886745,
  },
];

export const TRENDING_FALLBACK_FEED: FeedItem[] = [
  { id: 'tr1', type: 'trending', time: '1 jam lalu', bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata', coverId: 8231568, rank: 1 },
  { id: 'tr2', type: 'trending', time: 'Kemarin', bookKey: 'd4', bookTitle: 'Perahu Kertas', bookAuthor: 'Dee Lestari', coverId: 7886745, rank: 2 },
];
