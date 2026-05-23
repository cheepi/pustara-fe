'use client';
 
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, RefreshCw, AlertTriangle, Trash2, Pencil, X, Plus,
  Search, Check, Upload, ToggleLeft, ToggleRight, ChevronLeft,
  ChevronRight, BookMarked, Star, Eye,
  FileText, Loader,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { uploadPdfFile } from '@/lib/supabase-admin';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { clearTopPicksCache } from '@/lib/browse';
 
// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
 
const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 12;
 
const GENRE_COLORS: Record<string, { bg: string; text: string }> = {
  'Fiksi': { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  'Self-Help': { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-300' },
  'Fiksi Sains': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  'Memoir': { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300' },
  'Fiksi Sejarah': { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300' },
  'Misteri': { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
  'Non-Fiksi': { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-300' },
};
 
const LANGUAGES = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
 
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
  updated_at?: string;
}
 
interface BookForm {
  title: string;
  authors: string; 
  genres: string; 
  description: string;
  year: string;
  pages: string;
  isbn: string;
  language: string;
  total_stock: string;
  available: string;
  is_active: boolean;
}
 
const EMPTY_FORM: BookForm = {
  title: '', authors: '', genres: '', description: '',
  year: '', pages: '', isbn: '',
  language: 'id', total_stock: '5', available: '5', is_active: true,
};
 
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
 
function formatDate(s: string | null | undefined) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
 
function getGenreBadge(genre: string) {
  return GENRE_COLORS[genre] ?? { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-300' };
}
 
async function getToken() {
  return auth?.currentUser?.getIdToken();
}
 
// ─────────────────────────────────────────────────────────────────────────────
// BookModal
// ─────────────────────────────────────────────────────────────────────────────
 
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
 
  const [form, setForm] = useState<BookForm>(
    isEdit
      ? {
          title: book.title,
          authors: Array.isArray(book.authors) ? book.authors.join(', ') : '',
          genres: Array.isArray(book.genres) ? book.genres.join(', ')  : '',
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
 
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setFileErr('Hanya file PDF'); return; }
    if (f.size > 50 * 1024 * 1024)   { setFileErr('Maksimal 50MB'); return; }
    setFile(f); setFileErr(null);
  };
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
 
  const set = (key: keyof BookForm, val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())   return setErr('Judul wajib diisi');
    if (!form.authors.trim()) return setErr('Penulis wajib diisi');
    if (!isEdit && !file)     return setErr('File PDF wajib diupload untuk buku baru');
 
    setSaving(true);
    setErr(null);
 
    try {
      const token = await getToken();

      const authorsArr = form.authors.split(',').map(a => a.trim()).filter(Boolean);
      const genresArr = form.genres.split(',').map(g => g.trim()).filter(Boolean);
      const payload = {
        title: form.title.trim(),
        authors: authorsArr,
        genres: genresArr,
        description: form.description.trim(),
        year: form.year.trim(),
        pages: form.pages.trim(),
        isbn: form.isbn.trim(),
        language: form.language,
        total_stock: form.total_stock,
        available: form.available,
        is_active: form.is_active,
      };

      if (!isEdit) {
        const createRes = await fetch(`${API}/admin/books`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!createRes.ok) {
          const d = await createRes.json().catch(() => ({}));
          throw new Error(d.message || 'Gagal membuat buku');
        }

        const created = await createRes.json();
        const newId = created?.data?.id ?? created?.id;

        if (file && newId) {
          const fileUrlToSend = await uploadPdfFile(file, newId);

          const updateRes = await fetch(`${API}/admin/books/${newId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_url: fileUrlToSend }),
          });

          if (!updateRes.ok) {
            const d = await updateRes.json().catch(() => ({}));
            throw new Error(d.message || 'Gagal update file PDF');
          }
        }

        onSaved();
        onClose();
        return;
      }
 
      // Edit mode: update metadata first
      const updateRes = await fetch(`${API}/admin/books/${book.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!updateRes.ok) {
        const d = await updateRes.json().catch(() => ({}));
        throw new Error(d.message || 'Gagal memperbarui buku');
      }

      // If file is provided, upload it and update file_url
      if (file && book.id) {
        const fileUrlToSend = await uploadPdfFile(file, book.id);

        const fileUpdateRes = await fetch(`${API}/admin/books/${book.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file_url: fileUrlToSend }),
        });

        if (!fileUpdateRes.ok) {
          const d = await fileUpdateRes.json().catch(() => ({}));
          throw new Error(d.message || 'Gagal update file PDF');
        }
      }

      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.96        }}
        className={cn(
          'w-full max-w-5xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col',
          tk.card
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: dark ? 'var(--surface)' : 'white' }}
        >
          <h3 className={cn('font-bold text-lg', tk.text)}>
            {isEdit ? 'Edit Buku' : 'Tambah Buku Baru'}
          </h3>
          <button onClick={onClose} className={cn('p-1.5 rounded-lg hover:opacity-70 transition', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Form */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Form side */}
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
 
          {/* Error banner */}
          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border',
                  dark
                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {err}
              </motion.div>
            )}
          </AnimatePresence>
 
          {/* File upload */}
          <div
            className={cn(
              'p-4 rounded-xl border border-dashed cursor-pointer transition',
              dark ? 'border-gold/30 bg-gold/5 hover:bg-gold/10' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'
            )}
            onClick={() => fileRef.current?.click()}
          >
            <p className={cn('text-sm font-semibold mb-2', dark ? 'text-gold' : 'text-amber-700')}>
              File PDF Buku {isEdit && !file ? '(Opsional: Upload jika ingin ganti)' : '*'}
            </p>
            <div className="flex items-center gap-3">
              <Upload className={cn('w-5 h-5 flex-shrink-0', dark ? 'text-gold' : 'text-amber-600')} />
              <span className={cn('text-sm', tk.muted)}>
                {file ? file.name : 'Klik untuk pilih file PDF (maks. 50MB)'}
              </span>
            </div>
            {isEdit && book.file_url && !file && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" /> Buku ini sudah memiliki file PDF di database.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
 
          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Judul — full width */}
            <div className="col-span-2">
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Judul *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Masukkan judul buku"
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Penulis — full width */}
            <div className="col-span-2">
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Penulis * (pisah koma)</label>
              <input
                type="text"
                value={form.authors}
                onChange={e => set('authors', e.target.value)}
                placeholder="Nama Penulis, Penulis Lain"
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Genre */}
            <div className="col-span-2">
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Genre (pisah koma)</label>
              <input
                type="text"
                value={form.genres}
                onChange={e => set('genres', e.target.value)}
                placeholder="Fiksi, Sastra, ..."
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* ISBN */}
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={e => set('isbn', e.target.value)}
                placeholder="978-..."
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Tahun Terbit */}
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Tahun Terbit</label>
              <input
                type="number"
                value={form.year}
                onChange={e => set('year', e.target.value)}
                placeholder="2023"
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Halaman */}
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Jumlah Halaman</label>
              <input
                type="number"
                value={form.pages}
                onChange={e => set('pages', e.target.value)}
                placeholder="350"
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Total Stok */}
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Total Stok</label>
              <input
                type="number"
                value={form.total_stock}
                onChange={e => set('total_stock', e.target.value)}
                placeholder="5"
                min={0}
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
 
            {/* Tersedia */}
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Tersedia</label>
              <input
                type="number"
                value={form.available}
                onChange={e => set('available', e.target.value)}
                placeholder="5"
                min={0}
                className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>
          </div>
 
          {/* Deskripsi */}
          <div>
            <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Deskripsi / Sinopsis</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Sinopsis atau deskripsi buku..."
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm resize-none transition focus:outline-none focus:ring-2 focus:ring-gold/40',
                tk.input
              )}
            />
          </div>
 
          {/* Bahasa + Toggle Aktif */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', tk.muted)}>Bahasa</label>
              <select
                value={form.language}
                onChange={e => set('language', e.target.value)}
                className={cn('rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
 
            <label className="flex items-center gap-2 cursor-pointer mt-4" onClick={() => set('is_active', !form.is_active)}>
              <div className={cn(
                'w-10 h-5 rounded-full relative transition-colors',
                form.is_active ? 'bg-gold' : dark ? 'bg-white/20' : 'bg-slate-300'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
              <span className={cn('text-sm font-medium', tk.text)}>Buku Aktif</span>
            </label>
          </div>
 
          {/* Upload PDF (opsional, hanya mode new) */}
          {!isEdit && (
            <div>
              <label className={cn('block text-sm font-semibold mb-2', tk.text)}>
                File PDF <span className={cn('font-normal text-xs', tk.muted)}>(opsional, bisa diupload nanti)</span>
              </label>
              <label className={cn(
                'block w-full px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition',
                file
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : dark ? 'border-white/15 hover:border-gold/40' : 'border-slate-300 hover:border-gold/40'
              )}>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className={cn('w-4 h-4', file ? 'text-emerald-400' : 'text-gold')} />
                  <span className={file ? 'text-emerald-400 font-medium' : tk.muted}>
                    {file ? `${file.name} (${(file.size/1024/1024).toFixed(1)}MB)` : 'Klik untuk pilih file PDF (maks. 50MB)'}
                  </span>
                </div>
              </label>
              {fileErr && <p className="text-red-400 text-xs mt-1">{fileErr}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
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
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><Check className="w-4 h-4" /> {isEdit ? 'Simpan Perubahan' : 'Tambah Buku'}</>
              }
            </button>
          </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// UploadPdfModal: upload file PDF ke buku yang belum punya file
// ─────────────────────────────────────────────────────────────────────────────

function UploadPdfModal({
  book, dark, tk, onClose, onSaved,
}: {
  book: AdminBook;
  dark: boolean;
  tk: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setErr('Hanya file PDF'); return; }
    if (f.size > 50 * 1024 * 1024) { setErr('Maksimal 50MB'); return; }
    setFile(f);
    setErr(null);
  };

  const handleSubmit = async () => {
    if (!file) { setErr('Pilih file PDF dulu'); return; }
    setLoading(true); setErr(null);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const fileUrl = await uploadPdfFile(file, book.id);

      const res = await fetch(`${API}/admin/books/${book.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Gagal update DB');
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn('w-full max-w-md rounded-2xl border shadow-2xl', tk.card)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className={cn('font-bold text-base', tk.text)}>Upload File PDF</h3>
            <p className={cn('text-xs mt-0.5 truncate max-w-[280px]', tk.muted)} title={book.title}>
              {book.title}
            </p>
          </div>
          <button onClick={onClose} className={cn('p-1 rounded-lg hover:opacity-70', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Drop zone */}
          <label className={cn(
            'block w-full px-6 py-10 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
            file
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : dark
                ? 'border-white/20 hover:border-gold/40 hover:bg-white/5'
                : 'border-slate-300 hover:border-gold/40 hover:bg-gold/5'
          )}>
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col items-center gap-2 text-center">
              <FileText className={cn('w-8 h-8', file ? 'text-emerald-400' : 'text-gold')} />
              {file ? (
                <>
                  <p className={cn('text-sm font-semibold', file ? 'text-emerald-400' : tk.text)}>
                    {file.name}
                  </p>
                  <p className="text-xs text-emerald-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <p className={cn('text-sm font-semibold', tk.text)}>Klik atau drop file PDF</p>
                  <p className={cn('text-xs', tk.muted)}>Maksimal 50MB</p>
                </>
              )}
            </div>
          </label>

          {previewUrl && (
            <div className={cn('overflow-hidden rounded-xl border', dark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50')}>
              <div className={cn('flex items-center justify-between px-3 py-2 border-b text-xs', dark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-500')}>
                <span className="font-semibold">Preview file terpilih</span>
                <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}</span>
              </div>
              <iframe src={`${previewUrl}#toolbar=1`} className="h-72 w-full border-none bg-black" title="Preview PDF terpilih" />
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={cn('flex-1 py-2.5 rounded-xl border text-sm font-semibold transition', tk.btnGhost)}
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !file}
              className="flex-1 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader className="w-4 h-4 animate-spin" /> Mengupload...</>
                : <><Upload className="w-4 h-4" /> Upload PDF</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteBookModal({
  title,
  dark,
  tk,
  onClose,
  onSoftDelete,
  onPermanentDelete,
  softLoading,
  permanentLoading,
}: {
  title: string;
  dark: boolean;
  tk: Record<string, string>;
  onClose: () => void;
  onSoftDelete: () => void;
  onPermanentDelete: () => void;
  softLoading: boolean;
  permanentLoading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn('w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden', tk.card)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-book-title"
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)', background: dark ? 'var(--surface)' : 'white' }}
        >
          <h3 id="delete-book-title" className={cn('font-bold text-base', tk.text)}>Konfirmasi Hapus</h3>
          <button type="button" onClick={onClose} className={cn('p-1 rounded-lg hover:opacity-70', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border',
              dark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
            )}>
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn('text-sm uppercase tracking-[0.16em] font-semibold mb-1', dark ? 'text-red-300' : 'text-red-600')}>
                Tindakan permanen
              </p>
              <p className={cn('text-sm leading-relaxed', tk.text)}>
                Buku ini akan disembunyikan dari katalog dan dinonaktifkan sebagai soft delete.
              </p>
            </div>
          </div>

          <div className={cn('rounded-2xl border px-4 py-4', dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')}>
            <p className={cn('text-xs uppercase tracking-widest mb-1.5', tk.muted)}>Buku yang akan dihapus</p>
            <p className={cn('font-semibold text-base leading-snug', tk.text)} title={title}>
              {title}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className={cn('py-2.5 rounded-xl border text-sm font-semibold transition', tk.btnGhost)}
              disabled={softLoading || permanentLoading}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSoftDelete}
              disabled={softLoading || permanentLoading}
              className="py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
            >
              {softLoading ? <><Loader className="w-4 h-4 animate-spin" /> Menonaktifkan...</> : 'Nonaktifkan saja'}
            </button>
            <button
              type="button"
              onClick={onPermanentDelete}
              disabled={softLoading || permanentLoading}
              className="sm:col-span-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {permanentLoading ? <><Loader className="w-4 h-4 animate-spin" /> Menghapus permanen...</> : <><Trash2 className="w-4 h-4" /> Hapus permanen</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewPdfModal: Preview PDF files inline
// ─────────────────────────────────────────────────────────────────────────────

function PreviewPdfModal({
  book, dark, tk, onClose,
}: {
  book: AdminBook | null;
  dark: boolean;
  tk: Record<string, string>;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function loadPreview() {
      if (!book?.file_url) {
        if (mounted) {
          setPreviewError('File PDF belum tersedia.');
          setLoadingPreview(false);
        }
        return;
      }

      try {
        setLoadingPreview(true);
        setPreviewError(null);

        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch(`${API}/admin/books/${book.id}/file`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || 'Gagal memuat preview PDF');
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (mounted) setPreviewUrl(objectUrl);
      } catch (error) {
        if (mounted) {
          setPreviewError(error instanceof Error ? error.message : 'Gagal memuat preview PDF');
        }
      } finally {
        if (mounted) setLoadingPreview(false);
      }
    }

    void loadPreview();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book?.file_url, book?.id]);

  if (!book) {
    return null;
  }
  const previewBook = book;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn(
          'w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden',
          tk.card
        )}
        style={{ height: 'min(90vh, 800px)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: dark ? 'var(--surface)' : 'white' }}
        >
          <div className="min-w-0">
            <h3 className={cn('font-bold text-lg line-clamp-1', tk.text)}>{previewBook.title}</h3>
            <p className={cn('text-xs mt-0.5', tk.muted)}>
              {Array.isArray(previewBook.authors) ? previewBook.authors.join(', ') : previewBook.authors}
            </p>
          </div>
          <button onClick={onClose} className={cn('p-1.5 rounded-lg hover:opacity-70 transition flex-shrink-0', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 min-h-0 overflow-hidden bg-black/40">
          {loadingPreview ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-white/60">
                <Loader className="w-8 h-8 animate-spin text-gold" />
                <p className="text-sm">Memuat preview PDF...</p>
              </div>
            </div>
          ) : previewError ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-white/70">
                <FileText className="mx-auto mb-3 w-8 h-8 text-amber-400" />
                <p className="mb-2 text-sm font-semibold text-white">Preview tidak tersedia</p>
                <p className="text-xs text-white/50">{previewError}</p>
              </div>
            </div>
          ) : (
            <iframe
              src={`${previewUrl ?? ''}#toolbar=0`}
              className="w-full h-full border-none"
              allow="fullscreen"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PustakrewPickModal
// ─────────────────────────────────────────────────────────────────────────────

interface PickBook { id: string; title: string; authors: string[]; cover_url: string | null; avg_rating: number | null; }

function PustakrewPickModal({
  dark, tk, onClose, onSaved,
}: {
  dark: boolean;
  tk: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentPicks, setCurrentPicks] = useState<PickBook[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<PickBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const getToken = async () => auth?.currentUser?.getIdToken() ?? '';

  // Load current picks on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/books/top-picks`);
        const json = await res.json();
        const picks: PickBook[] = Array.isArray(json?.data) ? json.data : [];
        setCurrentPicks(picks);
        setSelectedIds(picks.map((b) => b.id));
      } catch {
        // gagal load; mulai dari kosong
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounce search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ search: searchQ.trim(), limit: '10' });
        const token = await getToken();
        const res = await fetch(`${API}/admin/books?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setSearchResults(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const toggle = (book: PickBook) => {
    setSelectedIds((prev) => {
      if (prev.includes(book.id)) return prev.filter((id) => id !== book.id);
      if (prev.length >= 3) { setErr('Maksimal 3 buku'); return prev; }
      setErr(null);
      // Sync current picks list buat preview
      setCurrentPicks((p) => p.find((b) => b.id === book.id) ? p : [...p, book]);
      return [...prev, book.id];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) { setErr('Pilih minimal 1 buku'); return; }
    setSaving(true); setErr(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/books/top-picks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ book_ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal menyimpan');
      clearTopPicksCache();
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const orderedPicks = selectedIds
    .map((id) => currentPicks.find((b) => b.id === id))
    .filter(Boolean) as PickBook[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn('w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto', tk.card)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: dark ? 'var(--surface)' : 'white' }}>
          <div>
            <h3 className={cn('font-bold text-lg', tk.text)}>Pustakrew's Pick</h3>
            <p className={cn('text-xs mt-0.5', tk.muted)}>Pilih 1–3 buku untuk ditampilkan di halaman Browse</p>
          </div>
          <button onClick={onClose} className={cn('p-1 rounded-lg hover:opacity-70', tk.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Current selection preview */}
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', tk.muted)}>
              Pilihan Saat Ini ({selectedIds.length}/3)
            </p>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
                ))}
              </div>
            ) : orderedPicks.length === 0 ? (
              <p className={cn('text-sm', tk.muted)}>Belum ada pilihan. Cari dan pilih buku di bawah.</p>
            ) : (
              <div className="space-y-2">
                {orderedPicks.map((book, i) => (
                  <div key={book.id} className={cn('flex items-center gap-3 p-2.5 rounded-xl border', tk.card)}>
                    <span className="text-gold font-bold text-sm w-5 text-center">#{i + 1}</span>
                    {book.cover_url && (
                      <img src={book.cover_url} alt="" className="w-8 h-10 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold truncate', tk.text)}>{book.title}</p>
                      <p className={cn('text-xs truncate', tk.muted)}>
                        {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(book)}
                      className="text-red-400 hover:text-red-500 p-1"
                      title="Hapus dari picks"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', tk.muted)}>Cari Buku</p>
            <div className="relative">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cari judul atau penulis..."
                className={cn('w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>

            {searchQ.trim() && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {searching ? (
                  <p className={cn('text-sm text-center py-3', tk.muted)}>Mencari...</p>
                ) : searchResults.length === 0 ? (
                  <p className={cn('text-sm text-center py-3', tk.muted)}>Tidak ditemukan</p>
                ) : (
                  searchResults.map((book) => {
                    const selected = selectedIds.includes(book.id);
                    return (
                      <button
                        key={book.id}
                        onClick={() => toggle(book)}
                        disabled={!selected && selectedIds.length >= 3}
                        className={cn(
                          'w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition',
                          selected
                            ? 'border-gold/60 bg-gold/10'
                            : cn('hover:bg-white/5', tk.card),
                          !selected && selectedIds.length >= 3 && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        {book.cover_url && (
                          <img src={book.cover_url} alt="" className="w-7 h-9 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium truncate', tk.text)}>{book.title}</p>
                          <p className={cn('text-xs truncate', tk.muted)}>
                            {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                          </p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-gold flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className={cn('flex-1 py-2.5 rounded-xl border text-sm font-semibold transition', tk.btnGhost)}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selectedIds.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><Check className="w-4 h-4" /> Simpan Picks</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvailabilityBar
// ─────────────────────────────────────────────────────────────────────────────
 
function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct   = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = pct === 0 ? 'bg-red-500' : (pct < 40 || available === 1) ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-20 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{available}/{total}</span>
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
 
export default function AdminBooksPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
 
  const tk = {
    text: dark ? 'text-white'         : 'text-navy-900',
    muted: dark ? 'text-slate-400'     : 'text-slate-500',
    card: dark ? 'bg-navy-800/50 border-white/10'       : 'bg-white border-parchment-darker',
    input: dark ? 'bg-navy-700/70 border-white/10 text-white placeholder:text-slate-500'
    : 'bg-white border-parchment-darker text-navy-900 placeholder:text-slate-400',
    btnGhost: dark ? 'border-white/15 text-white/80 hover:bg-white/10'
    : 'border-slate-300 text-slate-700 hover:bg-slate-100',
    row: dark ? 'hover:bg-white/5' : 'hover:bg-slate-50/70',
  };
 
  // ── State ──────────────────────────────────────────────────────────────────
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
  const [uploadingBook, setUploadingBook] = useState<AdminBook | null>(null);
  const [deletingBook, setDeletingBook] = useState<AdminBook | null>(null);
  const [deletingMode, setDeletingMode] = useState<'soft' | 'permanent' | null>(null);
  const [showPicksModal, setShowPicksModal] = useState(false);
  const [previewingBook, setPreviewingBook] = useState<AdminBook | null>(null);
  const [pickPreviews, setPickPreviews] = useState<{ id: string; cover_url: string | null; title: string }[]>([]);

  useEffect(() => {
    fetch(`${API}/books/top-picks`)
      .then(r => r.json())
      .then(json => setPickPreviews(Array.isArray(json?.data) ? json.data : []))
      .catch(() => {});
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async (page = 1, q = search, silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (q.trim()) params.set('search', q.trim());
 
      const res = await fetch(`${API}/admin/books?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data buku');
 
      const data = await res.json();
      setBooks(data.data ?? []);
      setCurrentPage(Number(data?.pagination?.page ?? page));
      setTotalPages(Math.max(1, Number(data?.pagination?.total_pages ?? 1)));
      setTotalItems(Number(data?.pagination?.total_items ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);
 
  useEffect(() => {
    fetchBooks(currentPage);
  }, [currentPage, fetchBooks]);
 
  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };
 
  const clearSearch = () => {
    setSearch('');
    setSearchInput('');
    setCurrentPage(1);
  };
 
  const handleDelete = async (id: string, title: string, mode: 'soft' | 'permanent') => {
    setDeletingMode(mode);
    try {
      const token = await getToken();
      const url = mode === 'permanent'
        ? `${API}/admin/books/${id}/permanent`
        : `${API}/admin/books/${id}`;
      const res = await fetch(url, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Hapus gagal');
      }
      const nextPage = books.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      await fetchBooks(nextPage, search, true);
      flashSuccess(mode === 'permanent'
        ? `"${title}" berhasil dihapus permanen.`
        : `"${title}" berhasil dinonaktifkan.`);
      setDeletingBook(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal');
    } finally {
      setDeletingMode(null);
    }
  };
 
  const handleSaved = async () => {
    flashSuccess('Buku berhasil disimpan!');
    await fetchBooks(currentPage, search, true);
  };
 
  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };
 
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-3 pb-10 md:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* ── Page Header ───────────────────────────────────────────────────── */}
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
              title="Refresh"
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
  
        {/* ── Action Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 overflow-visible">
          <button
            onClick={() => setShowPicksModal(true)}
            className={cn('rounded-2xl border p-4 flex items-center gap-4 text-left transition hover:ring-2 hover:ring-gold/40 overflow-visible relative z-10', tk.card)}
          >
            {/* Icon */}
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              dark ? 'bg-white/10' : 'bg-parchment'
            )}>
              <Star className="w-5 h-5 text-gold" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-bold', tk.text)}>Update Pustakrew's Pick</p>
              {pickPreviews.length > 0 ? (
                <p className={cn('text-xs mt-0.5 truncate', tk.muted)}>
                  {pickPreviews.map(b => b.title).join(' · ')}
                </p>
              ) : (
                <p className={cn('text-xs mt-0.5', tk.muted)}>Belum ada picks — klik untuk set</p>
              )}
            </div>

            {/* Fan covers */}
            {pickPreviews.length > 0 && (
              <div className="absolute right-4 top-[-36px] md:bottom-0 flex items-center">
                {pickPreviews.slice(0, 3).map((b, i) => (
                  <img
                    key={b.id}
                    src={b.cover_url ?? ''}
                    alt={b.title}
                    className="w-10 h-16 md:w-14 md:h-20 object-cover rounded-lg shadow-lg border-2"
                    style={{
                      borderColor: dark ? 'rgba(255,255,255,0.15)' : 'white',
                      marginLeft: i === 0 ? 0 : '-18px',
                      zIndex: 3 - i,
                      transform: `rotate(${[-6, 0, 6][i]}deg) translateY(${[4, 0, 4][i]}px)`,
                    }}
                  />
                ))}
              </div>
            )}
          </button>
  
          {/* Tambah Buku */}
          <button
            onClick={() => setEditingBook('new')}
            className="rounded-2xl border border-gold/40 bg-gold/10 hover:bg-gold/20 p-4 flex items-center gap-4 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center flex-shrink-0 group-hover:brightness-110 transition">
              <BookMarked className="w-5 h-5 text-navy-900" />
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-bold', tk.text)}>Tambah Buku Baru</p>
              <p className={cn('text-xs mt-0.5', tk.muted)}>Tambahkan data buku secara manual</p>
            </div>
          </button>
        </div>
  
        {/* ── Status Banner ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1,  y:  0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2',
                error
                  ? (dark ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-300 text-red-700')
                  : (dark ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-300 text-green-700')
              )}
            >
              {error
                ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                : <Check className="w-4 h-4 flex-shrink-0" />
              }
              {error || success}
            </motion.div>
          )}
        </AnimatePresence>
  
        {/* ── Search ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="mb-5 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
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
              onClick={clearSearch}
              className={cn('px-3 py-2.5 rounded-xl border text-sm transition', tk.btnGhost)}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
  
        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className={cn('rounded-2xl border overflow-hidden', tk.card)}>
          {loading ? (
            <div className="p-8 space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-xl"
                  style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className={cn('w-10 h-10 mx-auto mb-3 opacity-30', tk.muted)} />
              <p className={cn('text-sm', tk.muted)}>
                {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada buku dalam sistem'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr
                      className="border-b text-xs font-semibold uppercase tracking-wider"
                      style={{ borderColor: 'var(--border)', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}
                    >
                      {['Buku', 'Genre', 'Stok & Tersedia', 'Status', 'Rating', 'File', 'Ditambah', 'Aksi'].map(h => (
                        <th key={h} className={cn('px-4 py-3 text-left', tk.muted)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book, i) => {
                      const genres = Array.isArray(book.genres) ? book.genres : [];
                      const genresFirst = genres.slice(0, 2);
                      const rating = Number(book.avg_rating ?? 0);
                      return (
                        <motion.tr
                          key={book.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn('border-b transition-colors', tk.row)}
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {/* Buku */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <div className={cn('text-sm font-semibold line-clamp-1', tk.text)}>{book.title}</div>
                            <div className={cn('text-xs mt-0.5 line-clamp-1', tk.muted)}>
                              {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                            </div>
                            {book.isbn && <div className={cn('text-[10px] mt-0.5 font-mono', tk.muted)}>ISBN {book.isbn}</div>}
                          </td>
                          {/* Genre */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {genresFirst.map(g => {
                                const s = getGenreBadge(g);
                                return <span key={g} className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', s.bg, s.text)}>{g}</span>;
                              })}
                              {genres.length > 2 && (
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', tk.muted, dark ? 'bg-white/10' : 'bg-slate-100')}>
                                  +{genres.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Stok */}
                          <td className="px-4 py-3">
                            <div className={cn('text-sm font-semibold', tk.text)}>
                              {book.available}<span className={cn('font-normal', tk.muted)}>/{book.total_stock}</span>
                            </div>
                            <AvailabilityBar available={book.available} total={book.total_stock} />
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1',
                              book.is_active ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-400'
                            )}>
                              {book.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                              {book.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          {/* Rating */}
                          <td className="px-4 py-3">
                            {rating > 0 ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                                <span className={cn('text-sm font-semibold', tk.text)}>{rating.toFixed(1)}</span>
                              </div>
                            ) : <span className={cn('text-xs', tk.muted)}>—</span>}
                          </td>
                          {/* File */}
                          <td className="px-4 py-3">
                            {book.file_url ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 text-[11px] font-semibold">
                                <FileText className="w-3 h-3" />Ada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-semibold">
                                <FileText className="w-3 h-3" />Kosong
                              </span>
                            )}
                          </td>
                          {/* Ditambah */}
                          <td className={cn('px-4 py-3 text-xs whitespace-nowrap', tk.muted)}>{formatDate(book.created_at)}</td>
                          {/* Aksi */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setEditingBook(book)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition text-xs font-semibold">
                                <Pencil className="w-3 h-3" />Edit
                              </button>
                              {!book.file_url && (
                                <button onClick={() => setUploadingBook(book)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition text-xs font-semibold">
                                  <Upload className="w-3 h-3" />PDF
                                </button>
                              )}
                              {book.file_url && (
                                <button onClick={() => setPreviewingBook(book)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition text-xs font-semibold">
                                  <Eye className="w-3 h-3" />Preview
                                </button>
                              )}
                              <button onClick={() => setDeletingBook(book)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-semibold">
                                <Trash2 className="w-3 h-3" />Hapus
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE: cards ──────────────────────────── */}
              <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                {books.map((book, i) => {
                  const genres = Array.isArray(book.genres) ? book.genres : [];
                  const rating = Number(book.avg_rating ?? 0);
                  return (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 flex gap-3"
                    >
                      {/* Cover placeholder / inisial */}
                      <div className={cn(
                        'w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold',
                        dark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-400'
                      )}>
                        {book.cover_url
                          ? <img src={book.cover_url} alt="" className="w-full h-full object-cover rounded-lg" />
                          : book.title.slice(0, 2).toUpperCase()
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('text-sm font-bold line-clamp-1', tk.text)}>{book.title}</p>
                            <p className={cn('text-xs line-clamp-1', tk.muted)}>
                              {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
                            </p>
                          </div>
                          {/* Status badge */}
                          <span className={cn(
                            'flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            book.is_active ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-400'
                          )}>
                            {book.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {genres.slice(0, 2).map(g => {
                            const s = getGenreBadge(g);
                            return <span key={g} className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', s.bg, s.text)}>{g}</span>;
                          })}
                          {rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] text-gold font-semibold">
                              <Star className="w-3 h-3 fill-gold" />{rating.toFixed(1)}
                            </span>
                          )}
                          <span className={cn('text-[11px]', tk.muted)}>
                            {book.available}/{book.total_stock} tersedia
                          </span>
                          {!book.file_url && (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                              No PDF
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-2.5">
                          <button onClick={() => setEditingBook(book)}
                            className="flex-1 py-1.5 rounded-lg bg-blue-500/15 text-blue-500 text-xs font-semibold flex items-center justify-center gap-1">
                            <Pencil className="w-3 h-3" />Edit
                          </button>
                          {!book.file_url && (
                            <button onClick={() => setUploadingBook(book)}
                              className="flex-1 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-semibold flex items-center justify-center gap-1">
                              <Upload className="w-3 h-3" />Upload PDF
                            </button>
                          )}
                          {book.file_url && (
                            <button onClick={() => setPreviewingBook(book)}
                              className="flex-1 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-semibold flex items-center justify-center gap-1">
                              <Eye className="w-3 h-3" />Preview
                            </button>
                          )}
                          <button onClick={() => setDeletingBook(book)}
                            className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold flex items-center justify-center gap-1">
                            <Trash2 className="w-3 h-3" />Hapus
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
  
          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {!loading && totalPages > 1 && (
            <div
              className="px-5 py-4 flex items-center justify-between border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className={cn('text-xs', tk.muted)}>
                Halaman {currentPage} dari {totalPages} · {totalItems} buku
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={cn(
                    'p-1.5 rounded-lg border text-xs transition',
                    currentPage <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80',
                    tk.btnGhost
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
  
                {/* Page numbers: show up to 5 pages centered around current */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                  .reduce<(number | '…')[]>((acc, n, i, arr) => {
                    if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className={cn('px-1 text-xs', tk.muted)}>…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setCurrentPage(n as number)}
                        className={cn(
                          'w-8 h-8 rounded-lg border text-xs font-semibold transition',
                          n === currentPage
                            ? 'bg-gold border-gold text-navy-900'
                            : cn('hover:opacity-80', tk.btnGhost)
                        )}
                      >
                        {n}
                      </button>
                    )
                  )
                }
  
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={cn(
                    'p-1.5 rounded-lg border text-xs transition',
                    currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80',
                    tk.btnGhost
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
  
        {/* ── Book Modal ────────────────────────────────────────────────────── */}
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

        {/* Pustakrew's Pick Modal */}
        <AnimatePresence>
          {showPicksModal && (
            <PustakrewPickModal
              dark={dark}
              tk={tk}
              onClose={() => setShowPicksModal(false)}
              onSaved={() => {
                flashSuccess("Pustakrew's Pick berhasil diperbarui!");
                setShowPicksModal(false);
                fetch(`${API}/books/top-picks`)
                  .then(r => r.json())
                  .then(json => setPickPreviews(Array.isArray(json?.data) ? json.data : []))
                  .catch(() => {});
              }}
            />
          )}
        </AnimatePresence>

        {/* Upload PDF Modal */}
        <AnimatePresence>
          {uploadingBook && (
            <UploadPdfModal
              book={uploadingBook}
              dark={dark}
              tk={tk}
              onClose={() => setUploadingBook(null)}
              onSaved={async () => {
                setUploadingBook(null);
                flashSuccess(`File PDF untuk "${uploadingBook.title}" berhasil diupload!`);
                await fetchBooks(currentPage, search, true);
              }}
            />
          )}
        </AnimatePresence>

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {deletingBook && (
            <DeleteBookModal
              title={deletingBook.title}
              dark={dark}
              tk={tk}
              onClose={() => setDeletingBook(null)}
              onSoftDelete={() => handleDelete(deletingBook.id, deletingBook.title, 'soft')}
              onPermanentDelete={() => handleDelete(deletingBook.id, deletingBook.title, 'permanent')}
              softLoading={deletingMode === 'soft'}
              permanentLoading={deletingMode === 'permanent'}
            />
          )}
        </AnimatePresence>

        {/* Preview PDF Modal */}
        <AnimatePresence>
          {previewingBook && (
            <PreviewPdfModal
              book={previewingBook}
              dark={dark}
              tk={tk}
              onClose={() => setPreviewingBook(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}