import type { BookDetail, Review } from '@/types/book';
// ── Helpers ───────────────────────────────────────────────────────────────────
function dummyBook(b: Omit<BookDetail, 'external_key' | 'cover_id' | 'language' | 'is_active' | 'created_at' | 'updated_at' | 'file_url' | 'file_type' | 'total_pages'>): BookDetail {
  return {
    external_key: null,
    cover_id:     null,
    language:     'id',
    is_active:    true,
    created_at:   '',
    updated_at:   '',
    file_url:     null,
    file_type:    'pdf',
    total_pages:  null,
    ...b,
  };
}

function dummyReview(r: Omit<Review, 'id' | 'user_id' | 'book_id' | 'body' | 'created_at' | 'updated_at'> & { id?: string }): Review {
  return {
    id:         r.id ?? crypto.randomUUID(),
    user_id:    'dummy',
    book_id:    'dummy',
    body:       r.text ?? null,
    created_at: '',
    updated_at: '',
    ...r,
  };
}

// ── DUMMY_BOOKS ────────────────────────────────────────────────────────────────
// Ini fallback kalau BE belum jalan atau buku belum ada di DB.
// Key = UUID atau ID dummy (d1, d2, dst). Pas BE udah jalan, key ini bakal diganti UUID beneran.
export const DUMMY_BOOKS: Record<string, BookDetail> = {
  'd1': dummyBook({
    id: 'd1',
    title: 'Laskar Pelangi',
    authors: ['Andrea Hirata'],
    cover_url: 'https://covers.openlibrary.org/b/id/8231568-L.jpg',
    genres: ['Fiksi', 'Drama'],
    avg_rating: 4.9,
    rating_count: 18420,
    year: 2005,
    pages: 529,
    available: 5,
    total_stock: 5,
    queue: 0,
    description: 'Kisah persahabatan sepuluh anak Belitung yang berjuang mendapatkan pendidikan di SD Muhammadiyah yang hampir roboh. Novel ini mengalir dengan penuh emosi, humor, dan semangat pantang menyerah yang akan membuat pembaca tertawa dan menangis sekaligus.',
    reviews: [
      { id: 'd1', user_id: 'd1', name: 'Joseph R.', avatar: 'J', rating: 5, text: 'Buku ini benar-benar mengubah cara pandangku tentang pendidikan dan semangat belajar. Andrea Hirata berhasil membawa kita ke Belitung dengan sangat hidup dan penuh warna.', loc: 'Yogyakarta', likes: 142, time: '2 jam lalu' },
      { id: 'd2', user_id: 'd2', name: 'Lila S.', avatar: 'L', rating: 5, text: 'Sudah baca 3 kali dan masih nangis di bagian yang sama. Karya yang benar-benar abadi.', loc: 'Bali', likes: 49, time: '5 hari lalu' },
      { id: 'd3', user_id: 'd3', name: 'Hendra T.', avatar: 'H', rating: 4, text: 'Sangat menginspirasi! Kisah persahabatan yang tulus di tengah keterbatasan materi.', loc: 'Palembang', likes: 31, time: '1 minggu lalu' },
    ] as any,
  }),
  'd2': dummyBook({
    id: 'd2',
    title: 'Bumi Manusia',
    authors: ['Pramoedya Ananta Toer'],
    cover_url: 'https://covers.openlibrary.org/b/id/8750787-L.jpg',
    genres: ['Sastra', 'Sejarah'],
    avg_rating: 4.9,
    rating_count: 9210,
    year: 1980,
    pages: 368,
    available: 1,
    total_stock: 4,
    queue: 3,
    description: 'Bumi Manusia adalah novel pertama dari tetralogi Pulau Buru karya Pramoedya Ananta Toer. Melalui mata Minke, seorang pribumi terpelajar di era kolonial Belanda, pembaca diajak melihat ketidakadilan, cinta lintas batas, dan perjuangan menemukan jati diri.',
    reviews: [
      { name: 'Brando D.', avatar: 'B', rating: 5, text: 'Pramoedya adalah maestro sastra Indonesia. Minke adalah karakter yang paling kompleks dan manusiawi.', loc: 'Jakarta', likes: 98, time: '5 jam lalu' },
      { name: 'Maya K.', avatar: 'M', rating: 5, text: 'Membaca Bumi Manusia adalah pengalaman yang mengubah hidup. Setiap halaman penuh dengan kebijaksanaan.', loc: 'Medan', likes: 67, time: '2 hari lalu' },
    ] as any,
  }),
  'd3': dummyBook({
    id: 'd3',
    title: 'Cantik Itu Luka',
    authors: ['Eka Kurniawan'],
    cover_url: 'https://covers.openlibrary.org/b/id/10219665-L.jpg',
    genres: ['Fiksi', 'Sastra', 'Realisme Magis'],
    avg_rating: 4.8,
    rating_count: 5120,
    year: 2002,
    pages: 500,
    available: 2,
    total_stock: 3,
    queue: 1,
    description: 'Kisah tragis dan magis tentang Dewi Ayu dan keturunannya di kota fiktif Halimunda. Tiga generasi keluarga bergulat dengan kecantikan, trauma, dan sejarah kelam Indonesia yang penuh kekerasan dan ironi.',
    reviews: [
      { name: 'Sarah A.', avatar: 'S', rating: 5, text: 'Masterpiece sastra Indonesia yang wajib dibaca. Realisme magis-nya benar-benar bikin kagum.', loc: 'Bandung', likes: 87, time: '1 hari lalu' },
      { name: 'Citra M.', avatar: 'C', rating: 4, text: 'Sejarah yang dikemas dalam narasi yang gelap dan indah. Butuh waktu untuk mencerna kedalamannya, tapi sangat worth it.', loc: 'Bogor', likes: 29, time: '2 minggu lalu' },
    ] as any,
  }),
  'd4': dummyBook({
    id: 'd4',
    title: 'Perahu Kertas',
    authors: ['Dee Lestari'],
    cover_url: 'https://covers.openlibrary.org/b/id/7886745-L.jpg',
    genres: ['Romance', 'Coming-of-age'],
    avg_rating: 4.7,
    rating_count: 11340,
    year: 2009,
    pages: 444,
    available: 3,
    total_stock: 5,
    queue: 0,
    description: 'Kugy dan Keenan terhubung lewat mimpi dan seni, dalam kisah cinta yang tumbuh perlahan dan menyentuh hati. Dee Lestari menulis cinta dengan cara yang tidak klise — terasa nyata, mengalir, dan sangat indah.',
    reviews: [
      { name: 'Dika P.', avatar: 'D', rating: 4, text: 'Dee Lestari menulis cinta dengan cara yang tidak klise. Kugy dan Keenan adalah pasangan paling lovable dalam fiksi Indonesia modern.', loc: 'Surabaya', likes: 76, time: '2 hari lalu' },
      { name: 'Anto B.', avatar: 'A', rating: 4, text: 'Alur ceritanya mengalir dengan natural. Ini adalah romansa yang paling realistis yang pernah kubaca.', loc: 'Semarang', likes: 41, time: '1 minggu lalu' },
    ] as any,
  }),
  'd5': dummyBook({
    id: 'd5',
    title: 'Negeri 5 Menara',
    authors: ['Ahmad Fuadi'],
    cover_url: 'https://covers.openlibrary.org/b/id/8913924-L.jpg',
    genres: ['Inspiratif', 'Religi'],
    avg_rating: 4.7,
    rating_count: 7890,
    year: 2009,
    pages: 423,
    available: 4,
    total_stock: 4,
    queue: 0,
    description: 'Alif meninggalkan kampung halaman di Sumatera untuk belajar di Pondok Modern Gontor. Bersama sahabat-sahabatnya dari seluruh Indonesia, ia menemukan dunia yang lebih luas dan makna dari man jadda wajada — siapa bersungguh-sungguh pasti berhasil.',
    reviews: [
      { name: 'Maya K.', avatar: 'M', rating: 5, text: 'Man jadda wajada! Novel ini mengubah perspektifku tentang pendidikan dan ketekunan. Sangat recommended!', loc: 'Medan', likes: 63, time: '3 hari lalu' },
      { name: 'Yudi P.', avatar: 'Y', rating: 5, text: 'Pesantren Gontor dan persahabatan yang tulus. Novel ini membuatku ingin belajar lebih keras lagi dalam hidup.', loc: 'Solo', likes: 24, time: '3 minggu lalu' },
    ] as any,
  }),
  'd6': dummyBook({
    id: 'd6',
    title: 'Ayah',
    authors: ['Andrea Hirata'],
    cover_url: 'https://covers.openlibrary.org/b/id/10521865-L.jpg',
    genres: ['Fiksi', 'Keluarga'],
    avg_rating: 4.6,
    rating_count: 4320,
    year: 2015,
    pages: 382,
    available: 3,
    total_stock: 3,
    queue: 0,
    description: 'Sabari mencintai Marlena dengan cara paling tulus — tanpa pamrih, tanpa syarat. Kisah tentang cinta, pengorbanan, dan arti sejati menjadi seorang ayah yang ditulis dengan gaya khas Andrea Hirata: puitis, hangat, dan penuh humor pahit.',
    reviews: [
      { name: 'Reza F.', avatar: 'R', rating: 4, text: 'Andrea Hirata kembali dengan kisah yang memukau. Sabari adalah karakter paling lovable yang pernah kubaca.', loc: 'Makassar', likes: 54, time: '4 hari lalu' },
    ] as any,
  }),
};

// ── DUMMY_ALL_REVIEWS ─────────────────────────────────────────────────────────
export const DUMMY_ALL_REVIEWS = [
  { user: 'Ana R.',     avatar: 'A', loc: 'Yogyakarta', rating: 5, book: 'Laskar Pelangi',   author: 'Andrea Hirata',         coverId: 8231568,  key: 'd1', text: 'Buku ini benar-benar mengubah cara pandangku tentang pendidikan dan semangat belajar. Andrea Hirata berhasil membawa kita ke Belitung dengan sangat hidup.', likes: 142, comments: 23, time: '2 jam lalu' },
  { user: 'Brandon S.', avatar: 'B', loc: 'Jakarta',    rating: 5, book: 'Bumi Manusia',     author: 'Pramoedya Ananta Toer', coverId: 8750787,  key: 'd2', text: 'Pramoedya adalah maestro sastra Indonesia. Minke adalah karakter yang paling kompleks dan manusiawi yang pernah kutemui dalam literatur Indonesia.', likes: 98, comments: 17, time: '5 jam lalu' },
  { user: 'Sarah A.',    avatar: 'S', loc: 'Bandung',    rating: 5, book: 'Cantik Itu Luka',  author: 'Eka Kurniawan',         coverId: 12699828, key: 'd3', text: 'Realisme magis yang gelap dan indah. Eka Kurniawan berhasil memadukan sejarah kelam Indonesia dengan narasi yang memukau dari awal hingga akhir.', likes: 87, comments: 11, time: '1 hari lalu' },
  { user: 'Dika P.',    avatar: 'D', loc: 'Surabaya',   rating: 4, book: 'Perahu Kertas',    author: 'Dee Lestari',           coverId: 7886745,  key: 'd4', text: 'Dee Lestari menulis cinta dengan cara yang tidak klise. Kugy dan Keenan adalah pasangan yang paling lovable dalam fiksi Indonesia modern.', likes: 76, comments: 8, time: '2 hari lalu' },
  { user: 'Maya K.',    avatar: 'M', loc: 'Medan',      rating: 5, book: 'Negeri 5 Menara',  author: 'Ahmad Fuadi',           coverId: 8913924,  key: 'd5', text: 'Man jadda wajada. Novel ini mengubah cara pandangku tentang tekad dan usaha. Wajib baca untuk semua usia.', likes: 63, comments: 14, time: '3 hari lalu' },
  { user: 'Reza F.',    avatar: 'R', loc: 'Makassar',   rating: 4, book: 'Ayah',             author: 'Andrea Hirata',         coverId: 10521865, key: 'd6', text: 'Sabari adalah karakter yang paling mengharukan. Kisah cintanya yang tak berbalas namun teguh adalah cerminan dari cinta yang paling murni.', likes: 54, comments: 6, time: '4 hari lalu' },
  { user: 'Lila S.',    avatar: 'L', loc: 'Bali',       rating: 5, book: 'Laskar Pelangi',   author: 'Andrea Hirata',         coverId: 8231568,  key: 'd1', text: 'Sudah baca 3 kali dan masih nangis di bagian yang sama. Buku ini adalah karya yang benar-benar abadi.', likes: 49, comments: 9, time: '5 hari lalu' },
  { user: 'Anto B.',    avatar: 'A', loc: 'Semarang',   rating: 4, book: 'Perahu Kertas',    author: 'Dee Lestari',           coverId: 7886745,  key: 'd4', text: 'Alur ceritanya mengalir dengan natural. Ini adalah romansa yang paling realistis yang pernah kubaca.', likes: 41, comments: 5, time: '1 minggu lalu' },
  { user: 'Hendra T.',  avatar: 'H', loc: 'Palembang',  rating: 4, book: 'Laskar Pelangi',   author: 'Andrea Hirata',         coverId: 8231568,  key: 'd1', text: 'Sangat menginspirasi! Kisah persahabatan yang tulus di tengah keterbatasan materi membuat air mata tak terbendung.', likes: 38, comments: 7, time: '1 minggu lalu' },
  { user: 'Putri R.',   avatar: 'P', loc: 'Malang',     rating: 5, book: 'Bumi Manusia',     author: 'Pramoedya Ananta Toer', coverId: 8750787,  key: 'd2', text: 'Membaca Bumi Manusia adalah pengalaman yang mengubah hidup. Setiap halaman penuh dengan kebijaksanaan tentang kemanusiaan.', likes: 33, comments: 4, time: '2 minggu lalu' },
  { user: 'Citra M.',   avatar: 'C', loc: 'Bogor',      rating: 4, book: 'Cantik Itu Luka',  author: 'Eka Kurniawan',         coverId: 12699828, key: 'd3', text: 'Sejarah yang dikemas dalam narasi yang gelap dan indah. Butuh waktu untuk mencerna kedalamannya, tapi sangat worth it.', likes: 29, comments: 3, time: '2 minggu lalu' },
  { user: 'Yudi P.',    avatar: 'Y', loc: 'Solo',       rating: 5, book: 'Negeri 5 Menara',  author: 'Ahmad Fuadi',           coverId: 8913924,  key: 'd5', text: 'Pesantren Gontor dan persahabatan yang tulus. Novel ini membuatku ingin belajar lebih keras lagi dalam hidup.', likes: 24, comments: 6, time: '3 minggu lalu' },
];

// ── DUMMY_COMMUNITY_REVIEWS ───────────────────────────────────────────────────
export const DUMMY_COMMUNITY_REVIEWS = DUMMY_ALL_REVIEWS;

// ── DUMMY_REVIEWS_BY_BOOK ─────────────────────────────────────────────────────
export const DUMMY_REVIEWS_BY_BOOK: Record<string, Review[]> = {
  d1: [
    { name: 'Joseph R.', avatar: 'J', rating: 5, text: 'Buku ini benar-benar mengubah cara pandangku tentang pendidikan dan semangat belajar. Andrea Hirata berhasil membawa kita ke Belitung dengan sangat hidup dan penuh warna.', loc: 'Yogyakarta', likes: 142, time: '2 jam lalu' },
    { name: 'Lila S.', avatar: 'L', rating: 5, text: 'Sudah baca 3 kali dan masih nangis di bagian yang sama. Karya yang benar-benar abadi.', loc: 'Bali', likes: 49, time: '5 hari lalu' },
    { name: 'Hendra T.', avatar: 'H', rating: 4, text: 'Sangat menginspirasi! Kisah persahabatan yang tulus di tengah keterbatasan materi.', loc: 'Palembang', likes: 31, time: '1 minggu lalu' },
    { name: 'Putri R.', avatar: 'P', rating: 5, text: 'Belitung terasa sangat nyata setelah membaca ini. Penulisan Andrea sangat puitis.', loc: 'Malang', likes: 28, time: '2 minggu lalu' },
  ] as any,
  d2: [
    { name: 'Brando D.', avatar: 'B', rating: 5, text: 'Pramoedya adalah maestro sastra Indonesia. Minke adalah karakter yang paling kompleks dan manusiawi.', loc: 'Jakarta', likes: 98, time: '5 jam lalu' },
    { name: 'Maya K.', avatar: 'M', rating: 5, text: 'Membaca Bumi Manusia adalah pengalaman yang mengubah hidup. Setiap halaman penuh dengan kebijaksanaan.', loc: 'Medan', likes: 67, time: '2 hari lalu' },
    { name: 'Citra M.', avatar: 'C', rating: 4, text: 'Sejarah kolonial yang dikemas dalam romance yang indah. Wajib baca untuk semua orang Indonesia.', loc: 'Bogor', likes: 45, time: '1 minggu lalu' },
  ] as any,
  d3: [
    { name: 'Sarah A.', avatar: 'S', rating: 5, text: 'Masterpiece sastra Indonesia yang wajib dibaca. Realisme magis-nya benar-benar bikin kagum.', loc: 'Bandung', likes: 87, time: '1 hari lalu' },
    { name: 'Citra M.', avatar: 'C', rating: 4, text: 'Sejarah yang dikemas dalam narasi yang gelap dan indah. Butuh waktu untuk mencerna kedalamannya, tapi sangat worth it.', loc: 'Bogor', likes: 29, time: '2 minggu lalu' },
  ] as any,
  d4: [
    { name: 'Dika P.', avatar: 'D', rating: 4, text: 'Dee Lestari menulis cinta dengan cara yang tidak klise. Kugy dan Keenan adalah pasangan paling lovable dalam fiksi Indonesia modern.', loc: 'Surabaya', likes: 76, time: '2 hari lalu' },
    { name: 'Anto B.', avatar: 'A', rating: 4, text: 'Alur ceritanya mengalir dengan natural. Ini adalah romansa yang paling realistis yang pernah kubaca.', loc: 'Semarang', likes: 41, time: '1 minggu lalu' },
  ] as any,
  d5: [
    { name: 'Maya K.', avatar: 'M', rating: 5, text: 'Man jadda wajada! Novel ini mengubah perspektifku tentang pendidikan dan ketekunan. Sangat recommended!', loc: 'Medan', likes: 63, time: '3 hari lalu' },
    { name: 'Yudi P.', avatar: 'Y', rating: 5, text: 'Pesantren Gontor dan persahabatan yang tulus. Novel ini membuatku ingin belajar lebih keras lagi dalam hidup.', loc: 'Solo', likes: 24, time: '3 minggu lalu' },
  ] as any,
  d6: [
    { name: 'Reza F.', avatar: 'R', rating: 4, text: 'Andrea Hirata kembali dengan kisah yang memukau. Sabari adalah karakter paling lovable yang pernah kubaca.', loc: 'Makassar', likes: 54, time: '4 hari lalu' },
  ] as any,
};

// ── TOP3_PUSTAKREW ─────────────────────────────────────────────────────────────
export const TOP3_PUSTAKREW = [
  {
    key: '68b90b9f-17b8-419a-bfc1-bdb12a44db30', title: 'Surga Anjing Liar', author: 'Adimas Immanuel',
    coverUrl: 'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1612586447i/56966631.jpg',
    rating: 4.2, genres: ['Fiksi', 'Psikologis'], year: 2020, pages: 228,
    desc: 'Potret kelam masyarakat desa di kaki gunung yang bergulat dengan ambisi, kekuasaan, dan batas moral yang mengabur.',
  },
  {
    key: 'f5b0c31e-1604-436f-8662-51a47d3ae945', title: 'Unwind', author: 'Neal Shusterman',
    coverUrl: 'https://covers.openlibrary.org/b/id/13347240-M.jpg',
    rating: 4.6, genres: ['Dystopia', 'Sci-Fi'], year: 2007, pages: 336,
    desc: 'Di dunia masa depan, orang tua bisa memilih untuk memisahkan organ anak remajanya secara paksa. Tiga remaja berjuang melarikan diri dari takdir ini.',
  },
  {
    key: 'd47805f4-7c21-4f74-8f39-906c7ad87b4f', title: 'Pulang', author: 'Leila S. Chudori',
    coverUrl: 'https://indonesiaexpat.id/wp-content/uploads/2023/04/pulang-leila-s-chudori1-e1680497479334.jpg',
    rating: 4.7, genres: ['Sastra', 'Sejarah'], year: 2012, pages: 464,
    desc: 'Kisah para eksil politik Indonesia di Paris pasca peristiwa 1965 yang terus dihantui trauma masa lalu dan kerinduan mendalam akan tanah air.',
  },
];

// ── DUMMY_STATIC_FEED ─────────────────────────────────────────────────────────
export const DUMMY_STATIC_FEED = [
  { id: 'tr1', type: 'trending', time: '1 jam lalu', bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata', coverId: 8231568, rank: 1 },
  { id: 'ac1', type: 'activity', time: '2 jam lalu', user: 'Andrea R.', avatar: 'A', loc: 'Yogyakarta', action: 'selesai membaca', rating: 5, reviewText: 'Buku yang benar-benar mengubah cara pandangku.', bookKey: 'd1', bookTitle: 'Laskar Pelangi', bookAuthor: 'Andrea Hirata', coverId: 8231568 },
  { id: 'no1', type: 'notif', time: '3 jam lalu', notifTitle: 'Tenggat Besok!', notifBody: '"Bumi Manusia" harus dikembalikan besok. Perpanjang sekarang.', bookKey: 'd2', coverId: 8750787 },
  { id: 'ac2', type: 'activity', time: 'Kemarin', user: 'Brandon S.', avatar: 'B', loc: 'Jakarta', action: 'sedang membaca', bookKey: 'd2', bookTitle: 'Bumi Manusia', bookAuthor: 'Pramoedya Ananta Toer', coverId: 8750787 },
  { id: 'tr2', type: 'trending', time: 'Kemarin', bookKey: 'd4', bookTitle: 'Perahu Kertas', bookAuthor: 'Dee Lestari', coverId: 7886745, rank: 4 },
];