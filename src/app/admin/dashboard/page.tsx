'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { AlertTriangle, BookOpen, LogOut, RefreshCw, Shield, Users } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'reader';
  createdAt: string;
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

export default function AdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRoleUid, setPendingRoleUid] = useState<string | null>(null);

  const tk = {
    text: dark ? 'text-white' : 'text-navy-900',
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    card: dark ? 'bg-navy-800/50 border-white/10' : 'bg-white border-parchment-darker',
    cardHover: dark ? 'hover:bg-navy-800/70' : 'hover:bg-slate-50/80',
    skel: dark ? 'bg-navy-700/60' : 'bg-parchment-darker',
    tableHead: dark ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600',
    row: dark ? 'hover:bg-white/5' : 'hover:bg-slate-50/80',
    input: dark
      ? 'bg-navy-700/70 border-white/10 text-white'
      : 'bg-white border-parchment-darker text-navy-900',
    btnGhost: dark
      ? 'border-white/15 text-white/80 hover:bg-white/10'
      : 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const readers = total - admins;
    return { total, admins, readers };
  }, [users]);

  const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setLoading(true);
      const token = await auth!.currentUser?.getIdToken();
      const response = await fetch('/api/users', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setUsers([]);
        setError('Gagal memuat data pengguna.');
        return;
      }

      const data = await response.json();
      const nextUsers = Array.isArray(data?.data) ? data.data : [];
      setUsers(nextUsers);
    } catch {
      setUsers([]);
      setError('Terjadi kendala jaringan saat memuat pengguna.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleLogout() {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.replace('/');
    } catch {
      setError('Gagal logout. Coba lagi.');
    }
  }

  async function updateUserRole(uid: string, newRole: 'admin' | 'reader') {
    if (pendingRoleUid) return;

    const snapshot = users;
    setPendingRoleUid(uid);
    setUsers((prev) => prev.map((item) => (item.uid === uid ? { ...item, role: newRole } : item)));

    try {
      const token = await auth!.currentUser?.getIdToken();
      const response = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        setUsers(snapshot);
        setError('Gagal mengubah role pengguna.');
      }
    } catch {
      setUsers(snapshot);
      setError('Gagal mengubah role pengguna.');
    } finally {
      setPendingRoleUid(null);
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-semibold uppercase tracking-widest">Admin</span>
            </div>
            <h1 className={cn('font-serif text-3xl font-black', tk.text)}>Dashboard Pengguna</h1>
            <p className={cn('text-sm mt-1', tk.muted)}>Kelola role pengguna dan pantau statistik platform.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchUsers({ silent: true })}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
                tk.btnGhost
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              Muat Ulang
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold text-navy-900 text-xs font-bold hover:bg-gold-light transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </motion.div>

        {error && (
          <div className={cn('mb-5 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2', dark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900')}>
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Total Users', value: stats.total, icon: Users },
            { label: 'Admins', value: stats.admins, icon: Shield },
            { label: 'Readers', value: stats.readers, icon: BookOpen },
          ].map((card) => (
            <article
              key={card.label}
              className={cn('rounded-2xl border p-5 transition-all', tk.card, tk.cardHover)}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4 text-gold" />
                <span className={cn('text-xs uppercase tracking-wider font-semibold', tk.muted)}>{card.label}</span>
              </div>
              <p className={cn('font-serif text-3xl font-black', tk.text)}>{card.value}</p>
            </article>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn('rounded-2xl border overflow-hidden', tk.card)}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className={cn('text-lg font-bold flex items-center gap-2', tk.text)}>
              <Users className="w-4 h-4 text-gold" />
              Daftar Pengguna
            </h2>
          </div>

          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.9fr] gap-3 items-center">
                  <div className={cn('h-3 rounded', tk.skel)} />
                  <div className={cn('h-3 rounded', tk.skel)} />
                  <div className={cn('h-6 rounded-full', tk.skel)} />
                  <div className={cn('h-3 rounded', tk.skel)} />
                  <div className={cn('h-7 rounded-xl', tk.skel)} />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className={cn('p-10 text-center text-sm', tk.muted)}>Belum ada data pengguna.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px]">
                <thead className={tk.tableHead}>
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nama</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Gabung</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isPending = pendingRoleUid === user.uid;
                    return (
                      <tr key={user.id} className={cn('transition-colors border-t', tk.row)} style={{ borderColor: 'var(--border)' }}>
                        <td className={cn('px-5 py-3 text-sm', tk.text)}>{user.email}</td>
                        <td className={cn('px-5 py-3 text-sm', tk.text)}>{user.displayName || '-'}</td>
                        <td className="px-5 py-3 text-sm">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider',
                              user.role === 'admin'
                                ? (dark ? 'bg-gold/20 text-gold' : 'bg-gold/15 text-navy-700')
                                : (dark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-700')
                            )}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className={cn('px-5 py-3 text-sm', tk.muted)}>{formatDateID(user.createdAt)}</td>
                        <td className="px-5 py-3 text-sm">
                          <select
                            value={user.role}
                            disabled={isPending}
                            onChange={(e) => updateUserRole(user.uid, e.target.value as 'admin' | 'reader')}
                            className={cn('px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-60', tk.input)}
                          >
                            <option value="reader">Reader</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
