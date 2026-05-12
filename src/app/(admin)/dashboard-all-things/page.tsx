'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpen, Clock3, Download, RefreshCw, Users } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';

type TopBook = {
  id: string;
  title: string;
  total: number;
  primary_genre: string;
};

type CategoryPoint = {
  label: string;
  value: number;
};

type GrowthPoint = {
  day: string;
  users: number;
  newUsers: number;
};

type ActivityItem = {
  actor: string;
  action: string;
  detail: string;
  time: string | null;
};

type DashboardOverview = {
  metrics: {
    total_books: number;
    active_users: number;
    active_loans: number;
    new_users_7d: number;
  };
  top_books: TopBook[];
  category_distribution: CategoryPoint[];
  daily_growth: GrowthPoint[];
  recent_activity: ActivityItem[];
};

const BAR_COLORS = ['#24456f', '#5b8ea2', '#7264a6', '#c87652', '#cd6464', '#9282d0', '#e1be5b', '#95bf68', '#5caf83', '#6f9ccf'];

function formatDateTimeLabel(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboardAllThings() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const firstName = auth.currentUser?.displayName?.split(' ')?.[0] || 'Admin';
  const [categoryFilter, setCategoryFilter] = useState('Semua Kategori');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [hoveredGrowthIndex, setHoveredGrowthIndex] = useState<number | null>(null);

  const token = {
    card: dark ? 'bg-navy-800/55 border-white/10' : 'bg-[#f8f6f1] border-[#dacdac]',
    text: dark ? 'text-white' : 'text-[#20263a]',
    muted: dark ? 'text-slate-400' : 'text-[#8e7d57]',
    soft: dark ? 'bg-white/5' : 'bg-[#f0ece2]',
    row: dark ? 'bg-white/5' : 'bg-white/70',
  };

  const fetchDashboard = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const firebaseToken = await auth?.currentUser?.getIdToken();

      if (!apiBase || !firebaseToken) {
        throw new Error('Konfigurasi API atau sesi admin tidak tersedia');
      }

      const response = await fetch(`${apiBase}/admin/dashboard/overview`, {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal memuat data dashboard admin');
      }

      const payload = await response.json();
      setDashboard(payload?.data || null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const categories = dashboard?.category_distribution || [];
  const growth = dashboard?.daily_growth || [];
  const activities = dashboard?.recent_activity || [];
  const rawTopBooks = dashboard?.top_books || [];

  const categoryOptions = useMemo(() => {
    const labels = categories.map((item) => item.label).filter(Boolean);
    return ['Semua Kategori', ...labels];
  }, [categories]);

  const topBooks = useMemo(() => {
    if (categoryFilter === 'Semua Kategori') return rawTopBooks;
    return rawTopBooks.filter((item) => item.primary_genre === categoryFilter);
  }, [rawTopBooks, categoryFilter]);

  const topBookSeries = topBooks.length > 0 ? topBooks : rawTopBooks;
  const maxTopBook = useMemo(() => {
    if (topBookSeries.length === 0) return 1;
    return Math.max(...topBookSeries.map((item) => Number(item.total) || 0), 1);
  }, [topBookSeries]);

  const maxUsers = useMemo(() => {
    if (growth.length === 0) return 1;
    return Math.max(...growth.map((item) => Number(item.users) || 0), 1);
  }, [growth]);

  const maxNewUsers = useMemo(() => {
    if (growth.length === 0) return 1;
    return Math.max(...growth.map((item) => Number(item.newUsers) || 0), 1);
  }, [growth]);

  const donutGradient = useMemo(() => {
    const total = categories.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (total <= 0) return '#d5c6a2 0% 100%';

    let cursor = 0;
    return categories
      .map((item, index) => {
        const value = Number(item.value) || 0;
        const start = (cursor / total) * 100;
        cursor += value;
        const end = (cursor / total) * 100;
        return `${BAR_COLORS[index % BAR_COLORS.length]} ${start}% ${end}%`;
      })
      .join(', ');
  }, [categories]);

  const metrics = dashboard?.metrics || {
    total_books: 0,
    active_users: 0,
    active_loans: 0,
    new_users_7d: 0,
  };

  const handleExportActivity = () => {
    if (activities.length === 0) return;

    downloadCsv('pustara-activity.csv', [
      ['Waktu', 'Actor', 'Aksi', 'Detail'],
      ...activities.map((item) => [
        formatDateTimeLabel(item.time),
        item.actor,
        item.action,
        item.detail,
      ]),
    ]);
  };

  return (
    <div className="px-3 pb-10 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-5 py-5', token.card)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#c8a557] font-semibold">Selamat Datang Kembali</p>
              <h1 className={cn('font-serif text-4xl mt-1 font-black', token.text)}>Admin {firstName}!</h1>
              <p className={cn('text-sm mt-1', token.muted)}>Lihat performa dan analitik Pustara melalui dashboard</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchDashboard(true)}
              disabled={refreshing}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm border',
                dark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-[#d7c8a7] text-[#665327] hover:bg-[#f4ecda]'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </motion.section>

        {error && (
          <div className={cn('rounded-xl border px-4 py-3 text-sm flex items-center gap-2', dark ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-300 text-red-700')}>
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { icon: BookOpen, label: 'Total Buku', value: formatNumber(metrics.total_books) },
            { icon: Users, label: 'Pengguna Aktif', value: formatNumber(metrics.active_users) },
            { icon: Clock3, label: 'Aktif Meminjam', value: formatNumber(metrics.active_loans) },
            { icon: Users, label: 'Pengguna Baru (7 Hari)', value: formatNumber(metrics.new_users_7d) },
          ].map((item) => (
            <div key={item.label} className={cn('rounded-2xl border px-4 py-4', token.card)}>
              <div className="flex items-center gap-3">
                <item.icon className="w-7 h-7 text-[#9f7f35]" />
                <div>
                  <p className={cn('text-xs font-semibold uppercase tracking-wider', token.muted)}>{item.label}</p>
                  <p className={cn('text-4xl font-serif font-black leading-none mt-1', token.text)}>{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('rounded-2xl border p-5', token.card)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div>
              <h2 className={cn('text-3xl font-serif font-black', token.text)}>Top 10 Buku Populer</h2>
              <p className={cn('text-sm', token.muted)}>Top 10 buku yang paling banyak dipinjam</p>
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={cn('rounded-lg border px-3 py-1.5 text-sm', dark ? 'bg-navy-900 border-white/15 text-slate-200' : 'bg-[#efe6d3] border-[#d7c7a7] text-[#5f4c24]')}
            >
              {categoryOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="h-[260px] animate-pulse rounded-xl" style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#ece4d3' }} />
          ) : (
            <div className="h-[290px] grid grid-cols-10 gap-3 items-end border-t border-dashed pt-5" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#decfae' }}>
              {topBookSeries.map((book, index) => (
                <div key={book.id} className="flex flex-col items-center gap-2">
                  <div className="w-full max-w-10 rounded-t-md relative" style={{ height: `${(book.total / maxTopBook) * 200}px` }}>
                    <div className="absolute inset-0 rounded-t-md" style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} />
                  </div>
                  <p className={cn('text-[10px] text-center leading-tight', token.muted)}>{book.title}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className={cn('rounded-2xl border p-5', token.card)}
          >
            <h2 className={cn('text-3xl font-serif font-black', token.text)}>Distribusi Kategori Buku</h2>
            <p className={cn('text-sm mb-4', token.muted)}>Persebaran jumlah buku dalam setiap kategori</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-40 w-40 rounded-full grid place-items-center" style={{ background: `conic-gradient(${donutGradient})` }}>
                <div className={cn('h-20 w-20 rounded-full', token.soft)} />
              </div>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div key={category.label} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAR_COLORS[index % BAR_COLORS.length] }} />
                    <span className={cn('min-w-20', token.text)}>{category.label}</span>
                    <span className={token.muted}>{category.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className={cn('rounded-2xl border p-5', token.card)}
          >
            <h2 className={cn('text-3xl font-serif font-black', token.text)}>Pertumbuhan Pengguna</h2>
            <p className={cn('text-sm mb-4', token.muted)}>Total pengguna terdaftar (grafik batang) vs pengguna baru per hari (grafik garis)</p>

            <div className="h-[190px] border-t border-dashed pt-4" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#decfae' }}>
              <div className="h-full grid grid-cols-6 gap-4 items-end relative">
                <div className="absolute left-0 right-0 bottom-0 h-[1px]" style={{ background: dark ? 'rgba(255,255,255,0.12)' : '#d6c9aa' }} />
                <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 600 200" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#c8a557"
                    strokeWidth="3"
                    points={growth.map((item, index) => `${index * 120 + 50},${180 - (item.newUsers / maxNewUsers) * 120}`).join(' ')}
                  />
                </svg>

                {growth.map((item, index) => {
                  const isHovered = hoveredGrowthIndex === index;
                  
                  // KUNCINYA DI SINI: Cek apakah bar ada di ujung kanan atau kiri
                  const isMepetKanan = index >= growth.length - 2;
                  const isMepetKiri = index <= 1;

                  let deltaValue = 0;
                  let isPositive = true;
                  
                  if (index > 0) {
                    const prev = growth[index - 1];
                    const delta = item.users - Number(prev?.users || 0);
                    isPositive = delta >= 0;
                    deltaValue = Math.abs(delta);
                  }

                  return (
                    <div
                      key={item.day}
                      className="flex flex-col items-center justify-end gap-2 z-10 group relative"
                      onMouseEnter={() => setHoveredGrowthIndex(index)}
                      onMouseLeave={() => setHoveredGrowthIndex(null)}
                    >
                      <div 
                        className="w-12 rounded-t-md transition-all duration-200 group-hover:scale-y-[1.03]" 
                        style={{ 
                          height: `${(item.users / maxUsers) * 130}px`,
                          backgroundColor: isHovered 
                            ? BAR_COLORS[index % BAR_COLORS.length] 
                            : (dark ? 'rgba(255,255,255,0.1)' : '#cfd5db')
                        }} 
                      />
                      <span className={cn('text-[10px]', token.muted)}>{item.day}</span>

                      {/* Tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              'absolute bottom-full mb-2 z-20 w-max min-w-[130px] rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-sm pointer-events-none',
                              dark ? 'bg-navy-900/95 border-white/10' : 'bg-white border-[#dccda6]',
                              isMepetKanan ? 'right-0' : isMepetKiri ? 'left-0' : 'left-1/2 -translate-x-1/2'
                            )}
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#c8a557]">
                              {item.day}
                            </div>
                            <div className={cn('mt-1 flex items-center gap-2 font-serif text-xl font-black', token.text)}>
                              <span>{formatNumber(item.users)}</span>
                              {index > 0 && (
                                <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', isPositive ? 'text-emerald-600' : 'text-rose-500')}>
                                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                  {formatNumber(deltaValue)}
                                </span>
                              )}
                            </div>
                            <div className={cn('text-[11px] mt-0.5 whitespace-nowrap', token.muted)}>
                              {index === 0 ? 'Data awal' : `${isPositive ? 'naik' : deltaValue === 0 ? 'tetap' : 'turun'} dibanding kemarin`}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className={cn('rounded-2xl border p-5', token.card)}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className={cn('text-3xl font-serif font-black', token.text)}>Aktivitas Terbaru</h2>
              <p className={cn('text-sm', token.muted)}>Aksi admin/pustakawan terbaru</p>
            </div>
            <button
              type="button"
              onClick={handleExportActivity}
              disabled={activities.length === 0}
              className={cn('inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm border disabled:opacity-50 disabled:cursor-not-allowed', dark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-[#d7c8a7] text-[#665327] hover:bg-[#f4ecda]')}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="space-y-2.5">
            {activities.map((item, index) => (
              <article key={`${item.actor}-${item.action}-${index}`} className={cn('rounded-xl border px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5', token.row, dark ? 'border-white/8' : 'border-[#dfd3bb]')}>
                <div>
                  <p className={cn('text-sm', token.text)}>
                    <span className="font-semibold">{item.actor}</span>
                    <span className="ml-1">{item.action}</span>
                  </p>
                  <p className={cn('text-xs', token.muted)}>{item.detail}</p>
                </div>
                <p className={cn('text-xs shrink-0', token.muted)}>{formatDateTimeLabel(item.time)}</p>
              </article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}