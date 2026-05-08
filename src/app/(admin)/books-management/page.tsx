'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, RefreshCw, AlertTriangle, Trash2, Pencil, X, Plus, Search, Check,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 12;

interface AdminBook {
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
  is_active: boolean;
  avg_rating: number | null;
  cover_url: string | null;
  file_url: string | null;
  file_path?: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  title: '',
  authors: '',
  genres: '',
  description: '',
  year: '',
  pages: '',
  isbn: '',
  language: 'id',
  total_stock: '5',
  available: '5',
  is_active: true,
};

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BookModal({
  book,
  dark,
  tk,
  onClose,
  onSaved,
}: {
  book: AdminBook | null;
  dark: boolean;
  tk: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = book !== null;
  const [form, setForm] = useState(
    isEdit
      ? {
          title: book.title,
          authors: Array.isArray(book.authors) ? book.authors.join(', ') : '',
          genres: Array.isArray(book.genres) ? book.genres.join(', ') : '',
          description: book.description ?? '',
          year: book.year ? String(book.year) : '',
          pages: book.pages ? String(book.pages) : '',
          isbn: book.isbn ?? '',
          language: book.language ?? 'id',
          total_stock: String(book.total_stock ?? 5),
          available: String(book.available ?? 5),
          is_active: book.is_active ?? true,
        }
      : EMPTY_FORM
  );
  
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (key: string, val: string | boolean) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setErr('Hanya file PDF yang diizinkan');
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        setErr('Ukuran file maksimal 50MB');
        return;
      }
      setFile(selected);
      setErr(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setErr('Judul wajib diisi');
    if (!form.authors.trim()) return setErr('Penulis wajib diisi');
    if (!isEdit && !file) return setErr('File PDF wajib diupload untuk buku baru');

    setSaving(true);
    setErr(null);

    try {
      const token = await auth?.currentUser?.getIdToken();
      
      const formData = new FormData();
      formData.append('title', form.title.trim());
      const authorsArr = form.authors.split(',').map((a) => a.trim()).filter(Boolean);
      formData.append('authors', `{${authorsArr.map((a) => `"${a}"`).join(',')}}`);
      const genresArr = form.genres.split(',').map((g) => g.trim()).filter(Boolean);
      formData.append('genres', `{${genresArr.map((g) => `"${g}"`).join(',')}}`);
      if (form.description) formData.append('description', form.description.trim());
      if (form.year) formData.append('year', form.year);
      if (form.pages) formData.append('pages', form.pages);
      if (form.isbn) formData.append('isbn', form.isbn.trim());
      formData.append('language', form.language);
      formData.append('total_stock', form.total_stock);
      formData.append('available', form.available);
      formData.append('is_active', String(form.is_active));

      if (file) {
        formData.append('bookFile', file);
      }

      const url = isEdit ? `${API}/admin/books/${book.id}` : `${API}/admin/books`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || `${method} failed`);
      }

      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const fields: { label: string; name: keyof typeof form; type?: string; placeholder?: string }[] = [
    { label: 'Judul *', name: 'title', placeholder: 'Masukkan judul buku' },
    { label: 'Penulis * (pisah koma)', name: 'authors', placeholder: 'Nama Penulis, Penulis Lain' },
    { label: 'Genre (pisah koma)', name: 'genres', placeholder: 'Fiksi, Sastra, ...' },
    { label: 'ISBN', name: 'isbn', placeholder: '978-...' },
    { label: 'Tahun Terbit', name: 'year', type: 'number', placeholder: '2023' },
    { label: 'Jumlah Halaman', name: 'pages', type: 'number', placeholder: '350' },
    { label: 'Total Stok', name: 'total_stock', type: 'number', placeholder: '5' },
    { label: 'Tersedia', name: 'available', type: 'number', placeholder: '5' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn('w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto', tk.card)}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: dark ? 'var(--surface)' : 'white' }}>
          <h3 className={cn('font-bold text-lg', tk.text)}>
            {isEdit ? 'Edit Buku' : 'Tambah Buku Baru'}
          </h3>
          <button onClick={onClose} className={cn('p-1 rounded-lg hover:opacity-70 transition', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}

          <div className="col-span-2 p-4 rounded-xl border border-dashed border-gold/50 bg-gold/5">
            <label className={cn('text-sm font-semibold mb-2 block text-gold')}>File PDF Buku {isEdit && !file ? '(Opsional - Upload jika ingin ganti)' : '*'}</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className={cn('w-full text-sm', tk.text, 'file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-gold file:text-navy-900 hover:file:brightness-110 cursor-pointer')}
            />
            {isEdit && book.file_url && !file && (
               <p className="text-xs text-green-500 mt-2">✓ Buku ini sudah memiliki file PDF di database.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {fields.map(({ label, name, type, placeholder }) => (
              <div key={name} className={name === 'title' || name === 'authors' || name === 'genres' ? 'col-span-2' : ''}>
                <label className={cn('text-xs font-semibold mb-1.5 block', tk.muted)}>{label}</label>
                <input
                  type={type || 'text'}
                  value={form[name] as string}
                  onChange={(e) => set(name, e.target.value)}
                  placeholder={placeholder}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40',
                    tk.input
                  )}
                />
              </div>
            ))}
          </div>

          <div>
            <label className={cn('text-xs font-semibold mb-1.5 block', tk.muted)}>Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Sinopsis atau deskripsi buku..."
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm resize-none transition focus:outline-none focus:ring-2 focus:ring-gold/40',
                tk.input
              )}
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block', tk.muted)}>Bahasa</label>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                className={cn('rounded-xl border px-3 py-2.5 text-sm', tk.input)}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-4">
              <div
                onClick={() => set('is_active', !form.is_active)}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors cursor-pointer',
                  form.is_active ? 'bg-gold' : dark ? 'bg-white/20' : 'bg-slate-300'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
              <span className={cn('text-sm font-medium', tk.text)}>Buku Aktif</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 py-2.5 rounded-xl border text-sm font-semibold transition', tk.btnGhost)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan Buku'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminBooksPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [books, setBooks] = useState<AdminBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [editingBook, setEditingBook] = useState<AdminBook | null | 'new'>(null);

  const tk = {
    text: dark ? 'text-white' : 'text-navy-900',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    card: dark ? 'bg-navy-800/50 border-white/10' : 'bg-white border-parchment-darker',
    input: dark ? 'bg-navy-700/70 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-parchment-darker text-navy-900 placeholder:text-slate-400',
    btnGhost: dark ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  const fetchBooks = useCallback(async (page = 1, q = search, silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (q.trim()) params.set('search', q.trim());
      const res = await fetch(`${API}/books?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat buku');
      const data = await res.json();
      setBooks(data.data || []);
      setCurrentPage(Number(data?.pagination?.page || page));
      setTotalPages(Math.max(1, Number(data?.pagination?.total_pages || 1)));
      setTotalItems(Number(data?.pagination?.total_items || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchBooks(currentPage); }, [currentPage, fetchBooks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus "${title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/books/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Hapus gagal');
      const next = books.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(next);
      await fetchBooks(next, search, true);
      setSuccess(`"${title}" berhasil dihapus.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal');
    }
  };

  const handleSaved = async () => {
    setSuccess('Buku berhasil disimpan!');
    await fetchBooks(currentPage, search, true);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="px-8 py-8 min-h-screen">
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">Admin</span>
          </div>
          <h1 className={cn('font-serif text-3xl font-black', tk.text)}>Kelola Buku</h1>
          <p className={cn('text-sm mt-1', tk.muted)}>
            {totalItems > 0 ? `${totalItems} buku dalam sistem` : 'Kelola koleksi buku digital Pustara'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBooks(currentPage, search, true)}
            className={cn('p-2.5 rounded-xl border transition', tk.btnGhost)}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setEditingBook('new')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Buku Baru
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2',
              error
                ? dark ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-300 text-red-800'
                : dark ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-300 text-green-800'
            )}
          >
            {error ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSearch} className="mb-5 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul atau penulis..."
            className={cn(
              'w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40',
              tk.input
            )}
          />
        </div>
        <button type="submit" className={cn('px-4 py-2.5 rounded-xl border text-sm font-semibold transition', tk.btnGhost)}>
          Cari
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setCurrentPage(1); }}
            className={cn('px-3 py-2.5 rounded-xl border text-sm transition', tk.btnGhost)}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      <div className={cn('rounded-2xl border overflow-hidden', tk.card)}>
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className={cn('w-10 h-10 mx-auto mb-3 opacity-30', tk.muted)} />
            <p className={cn('text-sm', tk.muted)}>
              {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada buku'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr
                  className="border-b text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: 'var(--border)', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}
                >
                  {['Judul', 'Penulis', 'Genre', 'Stok', 'Status', 'Upload', 'Aksi'].map((h) => (
                    <th key={h} className={cn('px-4 py-3 text-left', tk.muted)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className={cn('text-sm font-semibold line-clamp-1', tk.text)}>{book.title}</div>
                      {book.isbn && <div className={cn('text-xs mt-0.5', tk.muted)}>ISBN: {book.isbn}</div>}
                    </td>
                    <td className={cn('px-4 py-3 text-sm line-clamp-1 max-w-[160px]', tk.muted)}>
                      {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(book.genres) ? book.genres : []).slice(0, 2).map((g) => (
                          <span key={g} className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            dark ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'
                          )}>{g}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', tk.text)}>{book.available}</span>
                      <span className={cn('text-xs', tk.muted)}>/{book.total_stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold',
                        book.is_active
                          ? 'bg-green-500/15 text-green-500'
                          : 'bg-red-500/15 text-red-400'
                      )}>
                        {book.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className={cn('px-4 py-3 text-xs', tk.muted)}>
                      {book.created_at ? formatDate(book.created_at) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingBook(book)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition text-xs font-semibold"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(book.id, book.title)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-semibold"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
            <p className={cn('text-xs', tk.muted)}>
              Halaman {currentPage} dari {totalPages} · {totalItems} buku
            </p>
            <div className="flex items-center gap-2">
              {[
                { label: '← Sebelumnya', action: () => setCurrentPage((p) => Math.max(1, p - 1)), disabled: currentPage <= 1 },
                { label: 'Berikutnya →', action: () => setCurrentPage((p) => Math.min(totalPages, p + 1)), disabled: currentPage >= totalPages },
              ].map(({ label, action, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                    disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80',
                    tk.btnGhost
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingBook !== null && (
          <BookModal
            book={editingBook === 'new' ? null : editingBook}
            dark={dark}
            tk={tk}
            onClose={() => setEditingBook(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}