'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, RefreshCw, AlertTriangle, X, Search,
  Star, Trash2, ChevronLeft, ChevronRight, CheckCircle,
  MessageSquare, ShieldAlert, ChevronDown, Loader,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 20;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminReview {
  review_id: string;
  rating: number;
  review_text: string;
  likes: number;
  created_at: string;
  book_id: string;
  book_title: string;
  book_cover_url: string | null;
  book_authors: string[];
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string | null;
}

interface AdminReport {
  report_id: string;
  reason: string;
  reported_at: string;
  review_id: string;
  review_text: string;
  rating: number;
  book_id: string;
  book_title: string;
  reviewer_name: string;
  reporter_name: string;
}

type BroadcastType = 'system' | 'informasi' | 'peringatan' | 'promo';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getToken() { return auth?.currentUser?.getIdToken(); }

function formatDate(s: string | null | undefined) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn('w-3 h-3', i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </div>
  );
}

// ─── Broadcast Section ───────────────────────────────────────────────────────

function BroadcastSection({ dark, tk }: { dark: boolean; tk: Record<string, string> }) {
  const [open, setOpen]             = useState(false);
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [type, setType]             = useState<BroadcastType>('system');
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState<{ success: boolean; msg: string } | null>(null);

  const TYPES: { value: BroadcastType; label: string }[] = [
    { value: 'system',     label: 'Informasi' },
    { value: 'peringatan', label: 'Peringatan' },
    { value: 'promo',      label: 'Promo' },
  ];

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal kirim broadcast');
      setResult({ success: true, msg: json.message });
      setTitle('');
      setBody('');
      setTimeout(() => { setResult(null); setOpen(false); }, 3000);
    } catch (e) {
      setResult({ success: false, msg: e instanceof Error ? e.message : 'Gagal kirim' });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border', tk.card)}>
      
      {/* Header row */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div>
          <h2 className={cn('font-bold text-xl', tk.text)}>Notifikasi Broadcast</h2>
          <p className={cn('text-sm mt-0.5', tk.muted)}>Kirimkan notifikasi ke seluruh pengguna Pustara</p>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition',
            open
              ? (dark ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-700 border border-slate-200')
              : 'bg-navy-800 dark:bg-gold text-white dark:text-navy-900 hover:brightness-110'
          )}>
          <Bell className="w-4 h-4" />
          {open ? 'Tutup' : 'Kirim Notifikasi'}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {/* Expandable form */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="px-6 pb-6 space-y-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="pt-4 grid gap-4">
                {/* Judul */}
                <div>
                  <label className={cn('text-sm font-semibold mb-1.5 block', tk.text)}>Judul Notifikasi</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Mis: Pembaruan Fitur Baru Pustara"
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className={cn('text-sm font-semibold mb-1.5 block', tk.text)}>Kategori</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as BroadcastType)}
                    className={cn('rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Isi Pesan */}
                <div>
                  <label className={cn('text-sm font-semibold mb-1.5 block', tk.text)}>Isi Pesan</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={4}
                    placeholder="Tulis isi pesan broadcast..."
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none', tk.input)}
                  />
                </div>
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={cn('px-3 py-2.5 rounded-xl text-sm flex items-center gap-2',
                      result.success
                        ? (dark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                        : (dark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700')
                    )}>
                    {result.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {result.msg}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end">
                <button
                  onClick={handleSend}
                  disabled={sending || !title.trim() || !body.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-800 dark:bg-gold text-white dark:text-navy-900 text-sm font-bold hover:brightness-110 transition disabled:opacity-50">
                  {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Mengirim...' : 'Kirim Broadcast'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Reports Section ──────────────────────────────────────────────────────────

function ReportsSection({ dark, tk }: { dark: boolean; tk: Record<string, string> }) {
  const [reports, setReports]       = useState<AdminReport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [feedback, setFeedback]     = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const flash = (id: string, success: boolean, msg: string) => {
    setFeedback({ id, success, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/reports`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setReports(Array.isArray(json.data) ? json.data : []);
    } catch (_) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchReports(); }, []);

  const handleDismiss = async (reportId: string) => {
    setActionId(reportId);
    try {
      const token = await getToken();
      await fetch(`${API}/admin/reports/${reportId}/dismiss`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(prev => prev.filter(r => r.report_id !== reportId));
      flash(reportId, true, 'Laporan diabaikan');
    } catch (_) {
      flash(reportId, false, 'Gagal mengabaikan');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (reportId: string, bookTitle: string) => {
    if (!confirm(`Hapus ulasan terkait buku "${bookTitle}"? Ini tidak bisa dibatalkan.`)) return;
    setActionId(reportId);
    try {
      const token = await getToken();
      await fetch(`${API}/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(prev => prev.filter(r => r.report_id !== reportId));
      flash(reportId, true, 'Ulasan berhasil dihapus');
    } catch (_) {
      flash(reportId, false, 'Gagal menghapus');
    } finally {
      setActionId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
      className={cn('rounded-2xl border', tk.card)}>

      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={cn('font-bold text-xl', tk.text)}>Aduan Pengguna</h2>
            <p className={cn('text-sm mt-0.5', tk.muted)}>Ulasan yang dilaporkan melanggar aturan kebijakan</p>
          </div>
          {reports.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-500">
              {reports.length} pending
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
          ))
        ) : reports.length === 0 ? (
          <div className="py-10 text-center">
            <ShieldAlert className={cn('w-9 h-9 mx-auto mb-2 opacity-30', tk.muted)} />
            <p className={cn('text-sm', tk.muted)}>Tidak ada aduan yang perlu ditinjau.</p>
          </div>
        ) : (
          reports.map(report => (
            <div key={report.report_id}
              className={cn('flex items-start gap-3 p-4 rounded-xl border transition', tk.row)}>

              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                  <span className={cn('text-sm font-bold', tk.text)}>{report.reviewer_name}</span>
                  <span className={cn('text-xs', tk.muted)}>memberi ulasan</span>
                  <span className={cn('text-xs font-semibold', tk.text)}>"{report.book_title}"</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-500">
                    {report.reason || 'Spam'}
                  </span>
                </div>
                {report.review_text && (
                  <p className={cn('text-xs line-clamp-2 uppercase font-medium', tk.muted)}>
                    {report.review_text}
                  </p>
                )}
                {report.reporter_name && (
                  <p className={cn('text-[10px] mt-1', tk.muted)}>
                    Dilaporkan oleh: {report.reporter_name} · {formatDate(report.reported_at)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDismiss(report.report_id)}
                  disabled={actionId === report.report_id}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition', tk.btnGhost)}>
                  {actionId === report.report_id ? <Loader className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Abaikan Laporan
                </button>
                <button
                  onClick={() => handleDelete(report.report_id, report.book_title)}
                  disabled={actionId === report.report_id}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                    dark ? 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25'
                         : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100')}>
                  {actionId === report.report_id ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Hapus Ulasan
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── All Reviews Section ──────────────────────────────────────────────────────

function AllReviewsSection({ dark, tk }: { dark: boolean; tk: Record<string, string> }) {
  const [reviews, setReviews]       = useState<AdminReview[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchReviews = useCallback(async (page = 1, q = search, rating = ratingFilter, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        ...(q ? { search: q } : {}),
        ...(rating !== 'all' ? { rating: String(rating) } : {}),
      });
      const res = await fetch(`${API}/admin/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal memuat');
      const json = await res.json();
      setReviews(Array.isArray(json.data) ? json.data : []);
      setTotal(json.pagination?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, [search, ratingFilter]);

  useEffect(() => {
    void fetchReviews(1, search, ratingFilter);
    setCurrentPage(1);
  }, [search, ratingFilter]);

  const handleDelete = async (review: AdminReview) => {
    if (!confirm(`Hapus ulasan dari "${review.user_name}"?`)) return;
    setDeletingId(review.review_id);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/reviews/${review.review_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      flash('Ulasan dihapus.');
      await fetchReviews(currentPage, search, ratingFilter, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const RATING_TABS = [
    { id: 'all' as const, label: 'Semua' },
    { id: 5, label: '⭐ 5' },
    { id: 4, label: '⭐ 4' },
    { id: 3, label: '⭐ 3' },
    { id: 2, label: '⭐ 2' },
    { id: 1, label: '⭐ 1' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className={cn('rounded-2xl border', tk.card)}>

      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className={cn('font-bold text-xl', tk.text)}>Semua Ulasan</h2>
            <p className={cn('text-sm mt-0.5', tk.muted)}>{total > 0 ? `${total} ulasan terdaftar` : 'Semua ulasan pengguna'}</p>
          </div>

          {/* Rating tabs */}
          <div className={cn('flex flex-wrap rounded-xl p-1 gap-0.5', dark ? 'bg-white/5' : 'bg-slate-100')}>
            {RATING_TABS.map(tab => (
              <button key={String(tab.id)}
                onClick={() => setRatingFilter(tab.id)}
                className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold transition',
                  ratingFilter === tab.id
                    ? (dark ? 'bg-white/15 text-white' : 'bg-white text-navy-900 shadow-sm')
                    : tk.muted)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="mt-3 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Cari judul buku atau nama user..."
              className={cn('w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)} />
          </div>
          <button type="submit" className={cn('px-3 py-2 rounded-xl border text-sm font-semibold', tk.btnGhost)}>Cari</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
              className={cn('px-3 py-2 rounded-xl border text-sm', tk.btnGhost)}>
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Status */}
      <AnimatePresence>
        {(error || successMsg) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn('mx-5 mt-4 px-4 py-2.5 rounded-xl border text-sm flex items-center gap-2',
              error
                ? (dark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                : (dark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
            )}>
            {error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            {error || successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review list */}
      <div className="p-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
          ))
        ) : reviews.length === 0 ? (
          <div className="py-14 text-center">
            <MessageSquare className={cn('w-9 h-9 mx-auto mb-2 opacity-30', tk.muted)} />
            <p className={cn('text-sm', tk.muted)}>Tidak ada ulasan.</p>
          </div>
        ) : (
          reviews.map((review, i) => (
            <motion.div key={review.review_id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn('flex gap-3 p-3 rounded-xl border transition', tk.row)}>

              {review.book_cover_url
                ? <img src={review.book_cover_url} alt="" className="w-10 h-14 object-cover rounded-lg shrink-0" />
                : <div className={cn('w-10 h-14 rounded-lg shrink-0 flex items-center justify-center', dark ? 'bg-white/8' : 'bg-slate-100')}>
                    <MessageSquare className={cn('w-4 h-4 opacity-40', tk.muted)} />
                  </div>
              }

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={cn('text-sm font-bold truncate', tk.text)}>{review.book_title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StarRow rating={review.rating} />
                      <span className={cn('text-xs', tk.muted)}>
                        oleh <span className="font-semibold">{review.user_name}</span> · {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(review)}
                    disabled={deletingId === review.review_id}
                    className={cn('shrink-0 p-1.5 rounded-lg border transition',
                      dark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50')}>
                    {deletingId === review.review_id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {review.review_text && (
                  <p className={cn('text-xs line-clamp-2 mt-1', tk.muted)}>{review.review_text}</p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className={cn('text-sm', tk.muted)}>
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} dari {total}
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1}
              onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchReviews(p); }}
              className={cn('p-2 rounded-xl border disabled:opacity-40', tk.btnGhost)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={currentPage === totalPages}
              onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchReviews(p); }}
              className={cn('p-2 rounded-xl border disabled:opacity-40', tk.btnGhost)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentsManagementPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const tk = {
    card: dark ? 'bg-navy-800/55 border-white/10' : 'bg-[#f8f6f1] border-[#dacdac]',
    text: dark ? 'text-white' : 'text-[#20263a]',
    muted: dark ? 'text-slate-400' : 'text-[#8e7d57]',
    input: dark
      ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400',
    btnGhost: dark
      ? 'border-white/10 text-slate-200 hover:bg-white/5'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50',
    row: dark ? 'hover:bg-white/5 border-white/8' : 'hover:bg-white/60 border-[#e8dfcf]',
  };

  return (
    <div className="px-3 pb-10 md:px-6 lg:px-8 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-6 py-5', tk.card)}>
          <p className="text-xs tracking-[0.16em] uppercase text-[#c8a557] font-semibold">Admin Pustara</p>
          <h1 className={cn('font-serif text-4xl font-black mt-1', tk.text)}>Manajemen Konten</h1>
          <p className={cn('text-sm mt-1', tk.muted)}>Broadcast notifikasi, tinjau aduan, dan moderasi ulasan pengguna</p>
        </motion.div>

        <BroadcastSection dark={dark} tk={tk} />
        <ReportsSection   dark={dark} tk={tk} />
        <AllReviewsSection dark={dark} tk={tk} />

      </div>
    </div>
  );
}