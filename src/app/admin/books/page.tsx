'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { AlertTriangle, BookOpen, LogOut, RefreshCw, Shield, Upload, Trash2, Plus } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

interface UploadedBook {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
  createdAt: string;
  file_url?: string;
}

function formatDateID(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminBooksPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [books, setBooks] = useState<UploadedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    genres: '',
    description: '',
    year: '',
    pages: '',
    language: 'id',
    isbn: '',
    external_key: '',
    total_stock: '5',
    available: '5',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const tk = {
    text: dark ? 'text-white' : 'text-navy-900',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    card: dark ? 'bg-navy-800/50 border-white/10' : 'bg-white border-parchment-darker',
    input: dark
      ? 'bg-navy-700/70 border-white/10 text-white'
      : 'bg-white border-parchment-darker text-navy-900',
    btnGhost: dark
      ? 'border-white/15 text-white/80 hover:bg-white/10'
      : 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      setBooks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      router.replace('/');
    } catch (err) {
      setError('Logout failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.authors.trim()) {
      setError('Authors are required');
      return;
    }

    if (!formData.genres.trim()) {
      setError('Genres are required');
      return;
    }

    if (!formData.isbn.trim()) {
      setError('ISBN is required');
      return;
    }

    if (!formData.total_stock || parseInt(formData.total_stock) < 1) {
      setError('Total stock must be at least 1');
      return;
    }

    if (!formData.available || parseInt(formData.available) < 0) {
      setError('Available stock cannot be negative');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = await auth?.currentUser?.getIdToken();
      const formDataToSend = new FormData();

      formDataToSend.append('title', formData.title);
      formDataToSend.append('authors', formData.authors);
      formDataToSend.append('genres', formData.genres);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('pages', formData.pages);
      formDataToSend.append('language', formData.language);
      formDataToSend.append('isbn', formData.isbn);
      formDataToSend.append('external_key', formData.external_key);
      formDataToSend.append('total_stock', formData.total_stock);
      formDataToSend.append('available', formData.available);
      formDataToSend.append('bookFile', selectedFile);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/books`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      setSuccess('Book uploaded successfully! 🎉');
      
      // Reset form
      setFormData({
        title: '',
        authors: '',
        genres: '',
        description: '',
        year: '',
        pages: '',
        language: 'id',
        isbn: '',
        external_key: '',
        total_stock: '5',
        available: '5',
      });
      setSelectedFile(null);

      // Refresh books list
      await fetchBooks();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Delete failed');
      
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setSuccess('Book deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-semibold uppercase tracking-widest">Admin</span>
            </div>
            <h1 className={cn('font-serif text-3xl font-black', tk.text)}>Kelola Buku</h1>
            <p className={cn('text-sm mt-1', tk.muted)}>Upload dan kelola koleksi buku digital Pustara</p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <div className={cn(
            'mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2',
            dark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
          )}>
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className={cn(
            'mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2',
            dark ? 'bg-green-500/10 border-green-500/30 text-green-200' : 'bg-green-50 border-green-300 text-green-900'
          )}>
            {success}
          </div>
        )}

        {/* Upload Form */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('mb-8 rounded-2xl border p-6', tk.card)}
        >
          <h2 className={cn('text-xl font-bold mb-4 flex items-center gap-2', tk.text)}>
            <Plus className="w-5 h-5 text-gold" />
            Upload Buku Baru
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Contoh: Laskar Pelangi"
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                required
              />
            </div>

            {/* Authors */}
            <div>
              <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                Penulis (pisahkan dengan koma) *
              </label>
              <input
                type="text"
                name="authors"
                value={formData.authors}
                onChange={handleInputChange}
                placeholder="Contoh: Andrea Hirata, Penulis Lainnya"
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                required
              />
            </div>

            {/* Genres */}
            <div>
              <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                Genre (pisahkan dengan koma) *
              </label>
              <input
                type="text"
                name="genres"
                value={formData.genres}
                onChange={handleInputChange}
                placeholder="Contoh: Fiksi, Drama, Pendidikan"
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
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
                placeholder="Sinopsis buku..."
                rows={3}
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
              />
            </div>

            {/* ISBN & External Key */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  ISBN *
                </label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  placeholder="978-9793061621"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                  required
                />
              </div>
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  External Key (Opsional)
                </label>
                <input
                  type="text"
                  name="external_key"
                  value={formData.external_key}
                  onChange={handleInputChange}
                  placeholder="eksternal-ref-123"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                />
              </div>
            </div>

            {/* Year & Pages */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Tahun
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="2024"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
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
                  placeholder="250"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Total Stok *
                </label>
                <input
                  type="number"
                  name="total_stock"
                  value={formData.total_stock}
                  onChange={handleInputChange}
                  placeholder="5"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                  Stok Tersedia *
                </label>
                <input
                  type="number"
                  name="available"
                  value={formData.available}
                  onChange={handleInputChange}
                  placeholder="5"
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                File PDF *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', tk.input)}
                required
              />
              {selectedFile && (
                <p className={cn('text-xs mt-2', tk.muted)}>
                  ✓ File dipilih: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-gold hover:bg-gold-light text-navy-900 font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Buku
                </>
              )}
            </button>
          </form>
        </motion.section>

        {/* Books List */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={cn('text-xl font-bold mb-4 flex items-center gap-2', tk.text)}>
            <BookOpen className="w-5 h-5 text-gold" />
            Buku yang Diupload ({books.length})
          </h2>

          {loading ? (
            <div className={cn('rounded-2xl border p-8 text-center', tk.card)}>
              <p className={tk.muted}>Memuat data...</p>
            </div>
          ) : books.length === 0 ? (
            <div className={cn('rounded-2xl border p-8 text-center', tk.card)}>
              <p className={tk.muted}>Belum ada buku yang diupload</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn('border-b', dark ? 'bg-white/5' : 'bg-slate-50')}>
                    <th className={cn('px-4 py-3 text-left text-xs font-semibold', tk.text)}>Judul</th>
                    <th className={cn('px-4 py-3 text-left text-xs font-semibold', tk.text)}>Penulis</th>
                    <th className={cn('px-4 py-3 text-left text-xs font-semibold', tk.text)}>Genre</th>
                    <th className={cn('px-4 py-3 text-left text-xs font-semibold', tk.text)}>Tanggal Upload</th>
                    <th className={cn('px-4 py-3 text-center text-xs font-semibold', tk.text)}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id} className={cn('border-b transition', dark ? 'hover:bg-white/5' : 'hover:bg-slate-50')}>
                      <td className={cn('px-4 py-3 text-sm font-medium', tk.text)}>{book.title}</td>
                      <td className={cn('px-4 py-3 text-sm', tk.muted)}>
                        {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                      </td>
                      <td className={cn('px-4 py-3 text-sm', tk.muted)}>
                        {Array.isArray(book.genres) ? book.genres.join(', ') : book.genres}
                      </td>
                      <td className={cn('px-4 py-3 text-sm', tk.muted)}>
                        {formatDateID(book.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 transition text-xs font-medium"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
