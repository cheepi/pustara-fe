'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, RefreshCw, AlertTriangle, X, Search, ChevronLeft,
  ChevronRight, Users, Clock, CheckCircle, AlertCircle, RotateCcw,
  Calendar, TrendingUp, Eye,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 25;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminLoan {
  loan_id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  extended: boolean;
  status: 'active' | 'overdue' | 'returned';
  days_left: number | null;
  book_id: string;
  book_title: string;
  book_authors: string[];
  book_genres: string[];
  book_cover_url: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string | null;
  progress_percentage: number | null;
  current_page: number | null;
  total_pages: number | null;
}

interface LoanStats {
  active: number;
  overdue: number;
  returned: number;
  extended: number;
  new_this_week: number;
}

interface BookBorrower {
  loan_id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  status: string;
  days_left: number | null;
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar: string | null;
  progress_percentage: number | null;
  current_page: number | null;
  total_pages: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(s: string | null | undefined) {
  if (!s) return '-';
  const d = new Date(s);
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dedupeLoans<T extends { loan_id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const row of rows) {
    const key = String(row.loan_id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

async function getToken() {
  return auth?.currentUser?.getIdToken();
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  if (status === 'returned') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
      <CheckCircle className="w-3 h-3" /> Dikembalikan
    </span>
  );
  if (status === 'overdue') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-600 dark:text-red-300">
      <AlertCircle className="w-3 h-3" /> Terlambat {daysLeft !== null ? `(${Math.abs(daysLeft)}h)` : ''}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-300">
      <Clock className="w-3 h-3" /> Aktif {daysLeft !== null ? `• ${daysLeft}h lagi` : ''}
    </span>
  );
}

// ─── BookBorrowersModal ───────────────────────────────────────────────────────

function BookBorrowersModal({
  bookId, bookTitle, dark, tk, onClose,
}: {
  bookId: string; bookTitle: string; dark: boolean; tk: Record<string, string>; onClose: () => void;
}) {
  const [borrowers, setBorrowers] = useState<BookBorrower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await fetch(`${API}/admin/loans/by-book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setBorrowers(dedupeLoans<BookBorrower>(Array.isArray(json.data) ? json.data : []));
      setLoading(false);
    })();
  }, [bookId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn('w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[85vh] flex flex-col', tk.card)}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c8a557]">Peminjam Buku</p>
            <h3 className={cn('font-bold text-lg', tk.text)}>{bookTitle}</h3>
          </div>
          <button onClick={onClose} className={cn('p-1.5 rounded-lg hover:opacity-70', tk.muted)}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
            ))
          ) : borrowers.length === 0 ? (
            <div className={cn('text-center py-10 text-sm', tk.muted)}>Belum ada riwayat peminjaman untuk buku ini.</div>
          ) : (
            borrowers.map((b) => (
              <div key={b.loan_id} className={cn('flex items-center gap-3 p-3 rounded-xl border', dark ? 'border-white/8 bg-white/3' : 'border-[#e8dfcf] bg-white/60')}>
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', dark ? 'bg-white/10 text-white' : 'bg-navy-100 text-navy-700')}>
                  {b.user_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', tk.text)}>{b.user_name}</p>
                  <p className={cn('text-xs truncate', tk.muted)}>{b.user_email}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <StatusBadge status={b.status} daysLeft={b.days_left} />
                  <p className={cn('text-[10px]', tk.muted)}>Pinjam: {formatDate(b.borrowed_at)}</p>
                  {b.progress_percentage !== null && (
                    <p className={cn('text-[10px]', tk.muted)}>Progress: {b.progress_percentage}%</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className={cn('text-xs', tk.muted)}>{borrowers.length} total riwayat peminjaman</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoansManagementPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const tk = {
    card: dark ? 'bg-navy-800/55 border-white/10' : 'bg-[#f8f6f1] border-[#dacdac]',
    text: dark ? 'text-white' : 'text-[#20263a]',
    muted: dark ? 'text-slate-400' : 'text-[#8e7d57]',
    input: dark ? 'bg-navy-700/60 border-white/10 text-white placeholder-white/30' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400',
    btnGhost: dark ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
    row: dark ? 'hover:bg-white/5' : 'hover:bg-white/50',
  };

  const [loans, setLoans] = useState<AdminLoan[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drillBook, setDrillBook] = useState<{ id: string; title: string } | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const fetchData = useCallback(async (page = 1, status = statusFilter, q = search, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const offset = (page - 1) * PAGE_SIZE;

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        status,
        ...(q ? { search: q } : {}),
      });

      const [loansRes, statsRes] = await Promise.all([
        fetch(`${API}/admin/loans?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/loans/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!loansRes.ok) throw new Error('Gagal memuat data peminjaman');

      const loansJson = await loansRes.json();
      const statsJson = statsRes.ok ? await statsRes.json() : null;

      const uniqueLoans = dedupeLoans<AdminLoan>(Array.isArray(loansJson.data) ? loansJson.data : []);
      setLoans(uniqueLoans);
      setTotal(loansJson.pagination?.total ?? uniqueLoans.length);
      if (statsJson?.data) setStats(statsJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void fetchData(1, statusFilter, search);
    setCurrentPage(1);
  }, [statusFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleForceReturn = async (loanId: string, bookTitle: string) => {
    if (!confirm(`Kembalikan paksa pinjaman buku "${bookTitle}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setReturningId(loanId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/loans/${loanId}/return`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Gagal mengembalikan');
      }
      flashSuccess(`Pinjaman "${bookTitle}" berhasil dikembalikan paksa.`);
      await fetchData(currentPage, statusFilter, search, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengembalikan');
    } finally {
      setReturningId(null);
    }
  };

  const statCards = [
    { label: 'Aktif',        value: stats?.active       ?? '-', icon: BookOpen,    color: 'text-blue-500' },
    { label: 'Terlambat',    value: stats?.overdue      ?? '-', icon: AlertCircle, color: 'text-red-500' },
    { label: 'Dikembalikan', value: stats?.returned     ?? '-', icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Minggu Ini',   value: stats?.new_this_week ?? '-', icon: TrendingUp,  color: 'text-amber-500' },
  ];

  const STATUS_TABS = [
    { id: 'all' as const, label: 'Semua' },
    { id: 'active' as const, label: 'Aktif' },
    { id: 'overdue' as const, label: 'Terlambat' },
    { id: 'returned' as const, label: 'Dikembalikan' },
  ];

  return (
    <div className="px-3 pb-10 md:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-6 py-5', tk.card)}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#c8a557] font-semibold">Admin Pustara</p>
              <h1 className={cn('font-serif text-4xl font-black mt-1', tk.text)}>Manajemen Peminjaman</h1>
              <p className={cn('text-sm mt-1', tk.muted)}>Monitor, cari, dan kelola seluruh aktivitas peminjaman buku</p>
            </div>
            <button onClick={() => fetchData(currentPage, statusFilter, search, true)}
              disabled={refreshing}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition self-start', tk.btnGhost)}>
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              {refreshing ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </motion.div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={cn('rounded-2xl border p-4 flex items-center gap-3', tk.card)}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', dark ? 'bg-white/8' : 'bg-white')}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className={cn('text-2xl font-black font-serif', tk.text)}>{value}</p>
                <p className={cn('text-xs', tk.muted)}>{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Filters + Table ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={cn('rounded-2xl border', tk.card)}>

          {/* Filter Bar */}
          <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
            {/* Tabs */}
            <div className={cn('flex rounded-xl p-1', dark ? 'bg-white/5' : 'bg-slate-100')}>
              {STATUS_TABS.map(tab => (
                <button key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition',
                    statusFilter === tab.id
                      ? (dark ? 'bg-white/15 text-white' : 'bg-white text-navy-900 shadow-sm')
                      : tk.muted
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="Cari judul buku, nama, atau email..."
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

          {/* Status Banner */}
          <AnimatePresence>
            {(error || successMsg) && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }} />
                ))}
              </div>
            ) : loans.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className={cn('w-10 h-10 mx-auto mb-3 opacity-30', tk.muted)} />
                <p className={cn('text-sm', tk.muted)}>Tidak ada peminjaman yang cocok.</p>
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-xs font-semibold uppercase tracking-wider"
                    style={{ borderColor: 'var(--border)', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}>
                    {['Buku', 'Peminjam', 'Tanggal Pinjam', 'Jatuh Tempo', 'Progress', 'Status', 'Aksi'].map(h => (
                      <th key={h} className={cn('px-4 py-3 text-left', tk.muted)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan, i) => (
                    <motion.tr key={`${loan.loan_id}-${loan.book_id}-${loan.user_id}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn('border-b transition-colors', tk.row)}
                      style={{ borderColor: 'var(--border)' }}>

                      {/* Buku */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          {loan.book_cover_url && (
                            <img src={loan.book_cover_url} alt="" className="w-8 h-12 object-cover rounded-md shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={cn('text-sm font-semibold line-clamp-1', tk.text)}>{loan.book_title}</p>
                            <p className={cn('text-xs line-clamp-1', tk.muted)}>
                              {Array.isArray(loan.book_authors) ? loan.book_authors.join(', ') : loan.book_authors}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Peminjam */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className={cn('text-sm font-semibold truncate', tk.text)}>{loan.user_name}</p>
                        <p className={cn('text-xs truncate', tk.muted)}>{loan.user_email}</p>
                      </td>

                      {/* Tanggal */}
                      <td className={cn('px-4 py-3 text-sm whitespace-nowrap', tk.muted)}>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(loan.borrowed_at)}</span>
                      </td>

                      {/* Jatuh Tempo */}
                      <td className={cn('px-4 py-3 text-sm whitespace-nowrap', loan.status === 'overdue' ? 'text-red-500' : tk.muted)}>
                        {formatDate(loan.due_at)}
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        {loan.progress_percentage !== null ? (
                          <div className="w-20">
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className={tk.muted}>{loan.progress_percentage}%</span>
                              <span className={tk.muted}>{loan.current_page}/{loan.total_pages}</span>
                            </div>
                            <div className={cn('h-1.5 rounded-full', dark ? 'bg-white/10' : 'bg-slate-200')}>
                              <div className="h-full rounded-full bg-gold"
                                style={{ width: `${Math.min(loan.progress_percentage ?? 0, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className={cn('text-xs', tk.muted)}>-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={loan.status} daysLeft={loan.days_left} />
                        {loan.extended && (
                          <span className={cn('block text-[10px] mt-0.5', tk.muted)}>diperpanjang</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDrillBook({ id: loan.book_id, title: loan.book_title })}
                            title="Lihat semua peminjam buku ini"
                            className={cn('p-1.5 rounded-lg border transition text-xs', tk.btnGhost)}>
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          {loan.status !== 'returned' && (
                            <button
                              onClick={() => handleForceReturn(loan.loan_id, loan.book_title)}
                              disabled={returningId === loan.loan_id}
                              title="Kembalikan paksa"
                              className={cn('p-1.5 rounded-lg border transition',
                                dark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50')}>
                              {returningId === loan.loan_id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <RotateCcw className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchData(p, statusFilter, search); }}
                  className={cn('p-2 rounded-xl border transition disabled:opacity-40', tk.btnGhost)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={currentPage === totalPages}
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchData(p, statusFilter, search); }}
                  className={cn('p-2 rounded-xl border transition disabled:opacity-40', tk.btnGhost)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Book Borrowers Modal */}
      <AnimatePresence>
        {drillBook && (
          <BookBorrowersModal
            bookId={drillBook.id}
            bookTitle={drillBook.title}
            dark={dark}
            tk={tk}
            onClose={() => setDrillBook(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}