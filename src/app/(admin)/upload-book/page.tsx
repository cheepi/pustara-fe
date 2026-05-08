'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Plus,
  X,
  ChevronDown,
  AlertTriangle,
  Check,
  Loader,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { uploadPdfFile, } from '@/lib/supabase-admin';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface BookOption {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
  description: string | null;
  year: number | null;
  pages: number | null;
  isbn: string | null;
  language: string;
  total_stock: number;
  available: number;
}

type FormMode = 'select' | 'edit' | 'new';

export default function AdminUploadPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const dark = theme === 'dark';

  // Books list & dropdown
  const [books, setBooks] = useState<BookOption[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('select');
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    authors: [] as string[],
    genres: [] as string[],
    description: '',
    year: '',
    pages: '',
    isbn: '',
    language: 'id',
    total_stock: '5',
    available: '5',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Theme tokens
  const tk = {
    text: dark ? 'text-white' : 'text-navy-900',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    bg: dark ? 'bg-navy-900' : 'bg-parchment',
    surface: dark ? 'bg-navy-800/50 border-white/10' : 'bg-white border-parchment-darker',
    input: dark ? 'bg-navy-700/70 border-white/10 text-white placeholder:text-slate-400' : 'bg-white border-parchment-darker text-navy-900',
    btnPrimary: 'bg-gold hover:bg-gold/90 text-navy-900 font-semibold',
    btnSecondary: dark ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  // Fetch books without file_url from Backend API
  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    setError(null);
    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/books/without-file`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch books from backend');
      }

      const { data } = await response.json();
      setBooks(data as BookOption[]);
      setFilteredBooks(data as BookOption[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch books';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBooksLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle search/filter
  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (!value.trim()) {
      setFilteredBooks(books);
    } else {
      const query = value.toLowerCase();
      setFilteredBooks(
        books.filter(
          (b) =>
            b.title.toLowerCase().includes(query) ||
            b.authors.some((a) => a.toLowerCase().includes(query))
        )
      );
    }
  };

  // Select book from dropdown
  const handleSelectBook = (book: BookOption) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      authors: book.authors || [],
      genres: book.genres || [],
      description: book.description || '',
      year: book.year ? String(book.year) : '',
      pages: book.pages ? String(book.pages) : '',
      isbn: book.isbn || '',
      language: book.language || 'id',
      total_stock: String(book.total_stock),
      available: String(book.available),
    });
    setDropdownOpen(false);
    setSearchInput('');
    setFormMode('edit');
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
  };

  // Reset to select mode
  const handleBackToSelect = () => {
    setFormMode('select');
    setSelectedBook(null);
    setFormData({
      title: '',
      authors: [],
      genres: [],
      description: '',
      year: '',
      pages: '',
      isbn: '',
      language: 'id',
      total_stock: '5',
      available: '5',
    });
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setSearchInput('');
  };

  // Switch to "add new book" mode
  const handleAddNewBook = () => {
    setFormMode('new');
    setSelectedBook(null);
    setFormData({
      title: '',
      authors: [],
      genres: [],
      description: '',
      year: '',
      pages: '',
      isbn: '',
      language: 'id',
      total_stock: '5',
      available: '5',
    });
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setDropdownOpen(false);
    setSearchInput('');
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'authors' || name === 'genres') {
      // Split by comma and trim
      const arrayValue = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      setFormData((prev) => ({ ...prev, [name]: arrayValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diizinkan');
      showToast('Hanya file PDF yang diizinkan', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('Ukuran file maksimal 100MB');
      showToast('Ukuran file maksimal 100MB', 'error');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Judul buku diperlukan');
      return false;
    }

    if (formData.authors.length === 0 || !formData.authors[0].trim()) {
      setError('Minimal satu penulis diperlukan');
      return false;
    }

    if (formData.genres.length === 0 || !formData.genres[0].trim()) {
      setError('Minimal satu genre diperlukan');
      return false;
    }

    if (!selectedFile) {
      setError('File PDF diperlukan');
      return false;
    }

    return true;
  };

  // Submit form
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   if (!validateForm()) {
  //     showToast(error || 'Validasi gagal', 'error');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     // Get auth token
  //     const token = await auth?.currentUser?.getIdToken();

  //     // 1. Upload PDF to Supabase Storage
  //     let fileUrl: string;
  //     try {
  //       const bookId = selectedBook?.id || `new-${Date.now()}`;
  //       fileUrl = await uploadPdfFile(selectedFile!, bookId);
  //       showToast('File berhasil diupload', 'success');
  //     } catch (uploadErr) {
  //       throw new Error(
  //         `Gagal upload file: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`
  //       );
  //     }

  //     // 2. Update or Create book in database
  //     const bookPayload = {
  //       title: formData.title,
  //       authors: formData.authors,
  //       genres: formData.genres,
  //       description: formData.description || null,
  //       year: formData.year ? parseInt(formData.year, 10) : null,
  //       pages: formData.pages ? parseInt(formData.pages, 10) : null,
  //       isbn: formData.isbn || null,
  //       language: formData.language,
  //       total_stock: parseInt(formData.total_stock, 10),
  //       available: parseInt(formData.available, 10),
  //     };

  //     if (formMode === 'edit' && selectedBook) {
  //       // Update existing book
  //       await updateBookWithFile(selectedBook.id, bookPayload, fileUrl);
  //       showToast(`Buku "${formData.title}" berhasil diupdate dengan file!`, 'success');
  //     } else {
  //       // Create new book
  //       const newBook = await createNewBook(
  //         {
  //           ...bookPayload,
  //           is_active: true,
  //         } as any,
  //         fileUrl
  //       );
  //       showToast(`Buku baru "${formData.title}" berhasil dibuat!`, 'success');
  //     }

  //     // Reset form
  //     setSuccess(`Buku "${formData.title}" berhasil disimpan!`);
  //     setFormMode('select');
  //     setSelectedBook(null);
  //     setFormData({
  //       title: '',
  //       authors: [],
  //       genres: [],
  //       description: '',
  //       year: '',
  //       pages: '',
  //       isbn: '',
  //       language: 'id',
  //       total_stock: '5',
  //       available: '5',
  //     });
  //     setSelectedFile(null);

  //     // Refetch books
  //     await fetchBooks();
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
  //     setError(message);
  //     showToast(message, 'error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast(error || 'Validasi gagal', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await auth?.currentUser?.getIdToken();

      // 1. Upload PDF ke Supabase Storage (Dapet path 'pdfs/xxx.pdf')
      const bookId = selectedBook?.id || `new-${Date.now()}`;
      const fileUrl = await uploadPdfFile(selectedFile!, bookId);
      showToast('File PDF berhasil diupload', 'success');

      // 2. Siapin data buat dikirim ke Backend Express
      const bookPayload = {
        title: formData.title,
        authors: formData.authors,
        genres: formData.genres,
        description: formData.description || null,
        year: formData.year ? parseInt(formData.year, 10) : null,
        pages: formData.pages ? parseInt(formData.pages, 10) : null,
        isbn: formData.isbn || null,
        language: formData.language,
        total_stock: parseInt(formData.total_stock, 10),
        available: parseInt(formData.available, 10),
        file_url: fileUrl, // Path file masuk ke sini
        is_active: true
      };

      // 3. Tembak Backend Express buat nyimpen ke Neon DB
      // Cari bagian ini di handleSubmit lu:
      if (formMode === 'edit' && selectedBook) {
        // Pastiin URL-nya /admin/books/ bukan /books/ doang
        const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/books/${selectedBook.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(bookPayload)
        });
        if (!updateRes.ok) throw new Error('Gagal update metadata di database Neon');
        showToast(`Buku "${formData.title}" berhasil diupdate!`, 'success');
      } else {
        const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/books`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(bookPayload)
        });
        if (!createRes.ok) throw new Error('Gagal bikin buku baru di database Neon');
        showToast(`Buku baru "${formData.title}" berhasil dibuat!`, 'success');
      }

      setSuccess(`Buku "${formData.title}" selesai diproses!`);
      setFormMode('select');
      setSelectedBook(null);
      setFormData({
        title: '', authors: [], genres: [], description: '',
        year: '', pages: '', isbn: '', language: 'id',
        total_stock: '5', available: '5',
      });
      setSelectedFile(null);
      await fetchBooks();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      router.replace('/');
    } catch (err) {
      showToast('Logout gagal', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', tk.bg)}>
        <Loader className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen transition-colors duration-300', tk.bg)}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12 pb-20">
        {/* Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className={cn('text-3xl font-black font-serif', tk.text)}>Upload Buku</h1>
            <button
              onClick={handleLogout}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', tk.btnSecondary)}
            >
              Logout
            </button>
          </div>
          <p className={tk.muted}>Kelola metadata buku dan upload file PDF ke database</p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3"
            >
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-sm font-medium">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <motion.div
          className={cn('rounded-2xl border p-8', tk.surface)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {formMode === 'select' ? (
            // Select Mode - Dropdown
            <div className="space-y-6">
              <div>
                <label className={cn('block text-sm font-semibold mb-3', tk.text)}>
                  Buku yang Belum Memiliki File PDF
                </label>

                {booksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-gold" />
                  </div>
                ) : books.length === 0 ? (
                  <div className={cn('p-6 rounded-xl text-center border-2 border-dashed', tk.input)}>
                    <p className={tk.muted}>Semua buku sudah memiliki file PDF</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Dropdown Trigger */}
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-colors',
                        tk.input
                      )}
                    >
                      <span className={selectedBook ? tk.text : tk.muted}>
                        {selectedBook ? selectedBook.title : 'Cari judul buku...'}
                      </span>
                      <ChevronDown
                        className={cn('w-4 h-4 transition-transform', dropdownOpen && 'rotate-180')}
                      />
                    </button>

                    {/* Search Input */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            'absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border p-3',
                            tk.surface
                          )}
                        >
                          <input
                            type="text"
                            placeholder="Cari berdasarkan judul atau penulis..."
                            value={searchInput}
                            onChange={(e) => handleSearch(e.target.value)}
                            className={cn(
                              'w-full px-3 py-2 rounded-lg border mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold',
                              tk.input
                            )}
                            autoFocus
                          />

                          {/* Dropdown List */}
                          <div className="max-h-80 overflow-y-auto space-y-1">
                            {filteredBooks.length === 0 ? (
                              <p className={cn('text-sm text-center py-4', tk.muted)}>
                                Tidak ada buku yang cocok
                              </p>
                            ) : (
                              filteredBooks.map((book) => (
                                <button
                                  key={book.id}
                                  onClick={() => handleSelectBook(book)}
                                  className={cn(
                                    'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                                    dark
                                      ? 'hover:bg-white/10 text-white'
                                      : 'hover:bg-gold/10 text-navy-900'
                                  )}
                                >
                                  <p className="font-medium">{book.title}</p>
                                  <p className={cn('text-xs', tk.muted)}>
                                    {book.authors.join(', ')}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Add New Book Button */}
              <div className={cn('border-t pt-6', dark ? 'border-white/10' : 'border-parchment-darker')}>
                <button
                  onClick={handleAddNewBook}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors',
                    dark
                      ? 'border-white/20 text-white/80 hover:bg-white/5 hover:border-gold/40'
                      : 'border-slate-300 text-slate-700 hover:bg-gold/5 hover:border-gold/40'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Tambah Buku Baru
                </button>
              </div>
            </div>
          ) : (
            // Edit or New Mode - Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToSelect}
                className={cn('text-sm font-medium flex items-center gap-1 transition-colors', tk.muted)}
              >
                ← Kembali
              </button>

              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Mode: <span className="text-gold">{formMode === 'edit' ? 'Edit Buku' : 'Buku Baru'}</span>
                </label>
              </div>

              {/* Title */}
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Judul Buku *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                  placeholder="Judul Buku"
                  required
                />
              </div>

              {/* Authors */}
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Penulis * <span className={cn('text-xs', tk.muted)}>(pisahkan dengan koma)</span>
                </label>
                <input
                  type="text"
                  name="authors"
                  value={formData.authors.join(', ')}
                  onChange={handleInputChange}
                  className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                  placeholder="Penulis 1, Penulis 2"
                  required
                />
              </div>

              {/* Genres */}
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Genre * <span className={cn('text-xs', tk.muted)}>(pisahkan dengan koma)</span>
                </label>
                <input
                  type="text"
                  name="genres"
                  value={formData.genres.join(', ')}
                  onChange={handleInputChange}
                  className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                  placeholder="Genre 1, Genre 2"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors resize-none', tk.input)}
                  placeholder="Deskripsi singkat tentang buku..."
                />
              </div>

              {/* Year & Pages */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    Jumlah Halaman
                  </label>
                  <input
                    type="number"
                    name="pages"
                    value={formData.pages}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                    placeholder="300"
                  />
                </div>
              </div>

              {/* ISBN & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    ISBN
                  </label>
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                    placeholder="978-3-16-148410-0"
                  />
                </div>
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    Bahasa
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>

              {/* Stock & Available */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    Total Stok
                  </label>
                  <input
                    type="number"
                    name="total_stock"
                    value={formData.total_stock}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                    min="1"
                  />
                </div>
                <div>
                  <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    name="available"
                    value={formData.available}
                    onChange={handleInputChange}
                    className={cn('w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gold transition-colors', tk.input)}
                    min="0"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className={cn('block text-sm font-semibold mb-3', tk.text)}>
                  File PDF * {selectedFile && <span className="text-gold">✓</span>}
                </label>
                <label
                  className={cn(
                    'block w-full px-6 py-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
                    selectedFile
                      ? 'bg-emerald-50 border-emerald-200'
                      : dark
                        ? 'border-white/20 hover:border-gold/40 hover:bg-white/5'
                        : 'border-slate-300 hover:border-gold/40 hover:bg-gold/5'
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className={cn('w-8 h-8', selectedFile ? 'text-emerald-600' : 'text-gold')} />
                    {selectedFile ? (
                      <>
                        <p className={cn('font-semibold text-sm', selectedFile ? 'text-emerald-700' : tk.text)}>
                          {selectedFile.name}
                        </p>
                        <p className={cn('text-xs', 'text-emerald-600')}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={cn('font-semibold text-sm', tk.text)}>
                          Klik atau drag file PDF di sini
                        </p>
                        <p className={cn('text-xs', tk.muted)}>
                          Maksimal 100MB
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBackToSelect}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl border font-semibold transition-colors',
                    tk.btnSecondary
                  )}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all',
                    loading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gold hover:bg-gold/90 text-navy-900'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sedang Memproses...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {formMode === 'edit' ? 'Update Buku & Upload File' : 'Simpan Buku & Upload File'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
