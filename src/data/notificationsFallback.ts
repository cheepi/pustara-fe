import type { NotificationItem } from '@/types/notifications';

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1', type: 'due', read: false,
    title: 'Tenggat Pengembalian Besok',
    body: '"Laskar Pelangi" harus dikembalikan besok, 21 Mar 2026. Perpanjang sekarang sebelum terlambat.',
    time: '1 jam lalu', bookCover: '8231568',
    user_id: 'user1', book_id: 'book1', actor_id: 'system', created_at: new Date().toISOString(),
  },
  {
    id: 'n2', type: 'borrow', read: false,
    title: 'Peminjaman Berhasil',
    body: '"Bumi Manusia" oleh Pramoedya Ananta Toer kini tersedia di rak bacamu. Selamat membaca!',
    time: '3 jam lalu', bookCover: '8750787',
    user_id: 'user1', book_id: 'book2', actor_id: 'system', created_at: new Date().toISOString(),
  },
  {
    id: 'n3', type: 'like', read: false,
    title: 'Annabeth menyukai ulasanmu',
    body: 'Ulasanmu tentang "Cantik Itu Luka" mendapat 12 suka baru hari ini.',
    time: '5 jam lalu', avatar: 'A',
    user_id: 'user1', book_id: 'book3', actor_id: 'annabeth', created_at: new Date().toISOString(),
  },
  {
    id: 'n4', type: 'follow', read: false,
    title: 'Pengikut Baru',
    body: 'Shayla J. mulai mengikuti aktivitas membacamu.',
    time: 'Kemarin', avatar: 'S',
    user_id: 'user1', book_id: 'book4', actor_id: 'shayla', created_at: new Date().toISOString(),
  },
  {
    id: 'n5', type: 'review', read: true,
    title: 'Brandon membalas ulasanmu',
    body: '"Setuju banget! Minke adalah karakter terkompleks dalam sastra Indonesia." — Brandon S.',
    time: '2 hari lalu', avatar: 'B',
    user_id: 'user1', book_id: 'book5', actor_id: 'brandon', created_at: new Date().toISOString(),
  },
  {
    id: 'n6', type: 'borrow', read: true,
    title: 'Antrean Tersedia',
    body: '"Perahu Kertas" yang kamu antrikan kini tersedia. Pinjam sebelum 24 jam atau antrean hangus!',
    time: '3 hari lalu', bookCover: '7886745',
    user_id: 'user1', book_id: 'book6', actor_id: 'system', created_at: new Date().toISOString(),
  },
  {
    id: 'n7', type: 'system', read: true,
    title: 'Fitur Baru: AI Rekomendasi',
    body: 'Pustara kini punya rekomendasi buku berbasis AI. Coba sekarang dan temukan bacaan berikutnya!',
    time: '1 minggu lalu',
    user_id: 'user1', book_id: 'book7', actor_id: 'system', created_at: new Date().toISOString(),
  },
  {
    id: 'n8', type: 'review', read: true,
    title: 'Ulasanmu ditampilkan',
    body: 'Ulasanmu untuk "Negeri 5 Menara" dipilih sebagai ulasan unggulan minggu ini.',
    time: '1 minggu lalu', bookCover: '8913924',
    user_id: 'user1', book_id: 'book8', actor_id: 'system', created_at: new Date().toISOString(),
  },
];
