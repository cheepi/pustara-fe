'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserRound,
  Users,
  X,
  Trash2,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/components/theme/ThemeProvider';
import AvatarImage from '@/components/shared/AvatarImage';
import { cn } from '@/lib/utils';

type AdminUser = {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'admin' | 'reader';
  status: 'active' | 'suspended';
  totalRead: number;
  createdAt: string | null;
};

type AuditItem = {
  actor: string;
  action: string;
  detail: string;
  time: string | null;
};

type UserDraft = {
  lookup: string;
  role: 'admin' | 'reader';
  status: 'active' | 'suspended';
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
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

function normalizeComparable(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getInitials(value: string, fallback = 'U') {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || fallback;
}

function normalizeUser(raw: Record<string, unknown>): AdminUser {
  const email = String(raw.email ?? '').trim();
  const username = String(raw.username ?? '').trim() || (email ? email.split('@')[0] : 'pustara_user');
  const displayName = String(raw.displayName ?? raw.display_name ?? raw.name ?? '').trim()
    || (email ? email.split('@')[0] : username);
  const role = String(raw.role ?? 'reader') === 'admin' ? 'admin' : 'reader';
  const status = String(raw.status ?? 'active') === 'suspended' ? 'suspended' : 'active';

  return {
    uid: String(raw.uid ?? raw.firebase_uid ?? raw.id ?? ''),
    email,
    username,
    displayName,
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : (raw.avatar_url ? String(raw.avatar_url) : (raw.photoURL ? String(raw.photoURL) : null)),
    role,
    status,
    totalRead: Number(raw.totalRead ?? raw.total_read ?? 0),
    createdAt: raw.createdAt ? String(raw.createdAt) : (raw.created_at ? String(raw.created_at) : null),
  };
}

function UserModal({
  open,
  dark,
  mode,
  user,
  draft,
  saving,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  dark: boolean;
  mode: 'edit' | 'promote';
  user: AdminUser | null;
  draft: UserDraft;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onChange: (next: Partial<UserDraft>) => void;
  onSubmit: () => void;
}) {
  const title = mode === 'edit' ? 'Edit Pengguna' : 'Tambah Admin';
  const subtitle = mode === 'edit'
    ? 'Ubah role dan status pengguna ini'
    : 'Cari pengguna lalu promosikan menjadi admin Pustara';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={cn('w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto', dark ? 'bg-navy-800/55 border-white/10' : 'bg-[#f8f6f1] border-[#dacdac]')}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e0d4bb' }}>
              <div>
                <h3 className={cn('font-serif text-2xl font-black', dark ? 'text-white' : 'text-[#20263a]')}>{title}</h3>
                <p className={cn('text-sm mt-1', dark ? 'text-slate-400' : 'text-[#8e7d57]')}>{subtitle}</p>
              </div>
              <button type="button" onClick={onClose} className={cn('p-1.5 rounded-lg hover:opacity-70 transition', dark ? 'text-slate-300' : 'text-slate-600')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {mode === 'promote' && (
                <div>
                  <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', dark ? 'text-slate-400' : 'text-[#8e7d57]')}>Cari pengguna</label>
                  <input
                    type="text"
                    value={draft.lookup}
                    onChange={(event) => onChange({ lookup: event.target.value })}
                    placeholder="Masukkan email, username, atau UID"
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', dark ? 'bg-navy-700/70 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-parchment-darker text-navy-900 placeholder:text-slate-400')}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', dark ? 'text-slate-400' : 'text-[#8e7d57]')}>Role</label>
                  <select
                    value={draft.role}
                    onChange={(event) => onChange({ role: event.target.value === 'admin' ? 'admin' : 'reader' })}
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', dark ? 'bg-navy-700/70 border-white/10 text-white' : 'bg-white border-parchment-darker text-navy-900')}
                  >
                    <option value="reader">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div>
                  <label className={cn('text-xs font-semibold mb-1.5 block uppercase tracking-wide', dark ? 'text-slate-400' : 'text-[#8e7d57]')}>Status</label>
                  <select
                    value={draft.status}
                    onChange={(event) => onChange({ status: event.target.value === 'suspended' ? 'suspended' : 'active' })}
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', dark ? 'bg-navy-700/70 border-white/10 text-white' : 'bg-white border-parchment-darker text-navy-900')}
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>
              </div>

              {user && mode === 'edit' && (
                <div className={cn('rounded-2xl border px-4 py-3 flex items-center gap-3', dark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-[#dfd3bb]')}>
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} initials={getInitials(user.displayName || user.email)} size="md" />
                  <div className="min-w-0">
                    <p className={cn('font-semibold truncate', dark ? 'text-white' : 'text-[#20263a]')}>{user.displayName}</p>
                    <p className={cn('text-xs truncate', dark ? 'text-slate-400' : 'text-[#8e7d57]')}>{user.email}</p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border', dark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700')}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className={cn('flex-1 py-2.5 rounded-xl border text-sm font-semibold transition', dark ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100')}>
                  Batal
                </button>
                <button type="button" onClick={onSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Check className="w-4 h-4" /> {mode === 'edit' ? 'Simpan Perubahan' : 'Jadikan Admin'}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function UsersManagementPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const tk = {
    text: dark ? 'text-white' : 'text-[#20263a]',
    muted: dark ? 'text-slate-400' : 'text-[#8e7d57]',
    card: dark ? 'bg-navy-800/55 border-white/10' : 'bg-[#f8f6f1] border-[#dacdac]',
    soft: dark ? 'bg-white/5' : 'bg-[#f0ece2]',
    row: dark ? 'bg-white/5' : 'bg-white/75',
    input: dark ? 'bg-navy-700/70 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-parchment-darker text-navy-900 placeholder:text-slate-400',
    btnGhost: dark ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'reader'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'promote'>('edit');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState<UserDraft>({
    lookup: '',
    role: 'reader',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = normalizeComparable(search);
    return users.filter((user) => {
      const matchesQuery = !q || [user.displayName, user.username, user.email, user.uid]
        .some((value) => normalizeComparable(String(value || '')).includes(q));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const filteredAudit = useMemo(() => {
    return audit.filter((item) => normalizeComparable(item.actor).includes('admin pustara') || normalizeComparable(item.actor).includes('admin'));
  }, [audit]);

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Sesi admin belum tersedia');
      }

      const [usersResponse, overviewResponse] = await Promise.all([
        fetch(`${API_BASE}/admin/users?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/admin/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!usersResponse.ok) {
        throw new Error('Gagal memuat data pengguna');
      }

      if (!overviewResponse.ok) {
        throw new Error('Gagal memuat data audit');
      }

      const usersPayload = await usersResponse.json();
      const overviewPayload = await overviewResponse.json();

      setUsers(Array.isArray(usersPayload?.data) ? usersPayload.data.map((item: Record<string, unknown>) => normalizeUser(item)) : []);
      setAudit(Array.isArray(overviewPayload?.data?.recent_activity) ? overviewPayload.data.recent_activity : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetDraftFromUser = (user: AdminUser | null) => {
    setSelectedUser(user);
    setDraft({
      lookup: user?.email || user?.username || user?.uid || '',
      role: user?.role || 'reader',
      status: user?.status || 'active',
    });
  };

  const openEditModal = (user: AdminUser) => {
    setModalMode('edit');
    resetDraftFromUser(user);
    setFormError(null);
    setModalOpen(true);
  };

  const openPromoteModal = () => {
    setModalMode('promote');
    setSelectedUser(null);
    setDraft({
      lookup: '',
      role: 'admin',
      status: 'active',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setFormError(null);
  };

  const authedRequest = async (url: string, init: RequestInit = {}) => {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error('Sesi admin belum tersedia');
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...init, headers });
  };

  const matchPromoteTarget = () => {
    const lookup = normalizeComparable(draft.lookup);
    if (!lookup) return null;

    return users.find((user) => {
      const candidates = [user.uid, user.email, user.username, user.displayName];
      return candidates.some((candidate) => normalizeComparable(String(candidate || '')) === lookup)
        || candidates.some((candidate) => normalizeComparable(String(candidate || '')).includes(lookup));
    }) || null;
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);

    try {
      const target = modalMode === 'edit' ? selectedUser : matchPromoteTarget();
      if (!target) {
        throw new Error('Pengguna tidak ditemukan');
      }

      if (modalMode === 'edit') {
        const requests: Promise<Response>[] = [];
        if (draft.role !== target.role) {
          requests.push(authedRequest(`${API_BASE}/admin/users/${target.uid}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: draft.role }),
          }));
        }

        if (draft.status !== target.status) {
          requests.push(authedRequest(`${API_BASE}/admin/users/${target.uid}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: draft.status }),
          }));
        }

        const results = await Promise.all(requests);
        const failed = results.find((response) => !response.ok);
        if (failed) {
          const payload = await failed.json().catch(() => ({}));
          throw new Error(payload.error || payload.message || 'Gagal menyimpan perubahan');
        }
      } else {
        const roleResponse = await authedRequest(`${API_BASE}/admin/users/${target.uid}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role: 'admin' }),
        });

        if (!roleResponse.ok) {
          const payload = await roleResponse.json().catch(() => ({}));
          throw new Error(payload.error || payload.message || 'Gagal menaikkan role');
        }

        const statusResponse = await authedRequest(`${API_BASE}/admin/users/${target.uid}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'active' }),
        });

        if (!statusResponse.ok) {
          const payload = await statusResponse.json().catch(() => ({}));
          throw new Error(payload.error || payload.message || 'Gagal mengubah status');
        }
      }

      closeModal();
      await loadData(true);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Hapus pengguna "${user.displayName}" (@${user.username})? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const response = await authedRequest(`${API_BASE}/admin/users/${user.uid}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || 'Gagal menghapus pengguna');
      }
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna');
    }
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => user.role === 'admin').length;
  const totalSuspended = users.filter((user) => user.status === 'suspended').length;

  return (
    <div className="px-3 pb-10 md:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-5 py-5', tk.card)}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#c8a557] font-semibold">Admin Pustara</p>
              <h1 className={cn('font-serif text-4xl mt-1 font-black', tk.text)}>Daftar Pengguna Pustara</h1>
              <p className={cn('text-sm mt-1', tk.muted)}>Total {totalUsers} pengguna terdaftar</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={refreshing}
                className={cn('inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm border', tk.btnGhost)}
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openPromoteModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold text-navy-900 text-sm font-bold hover:brightness-110 transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Admin
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mt-5">
            {[
              { icon: Users, label: 'Total Pengguna', value: totalUsers },
              { icon: Shield, label: 'Admin', value: totalAdmins },
              { icon: UserRound, label: 'Suspended', value: totalSuspended },
            ].map((item) => (
              <div key={item.label} className={cn('rounded-2xl border px-4 py-4', tk.soft)}>
                <div className="flex items-center gap-3">
                  <item.icon className="w-7 h-7 text-[#9f7f35]" />
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider', tk.muted)}>{item.label}</p>
                    <p className={cn('text-3xl font-serif font-black leading-none mt-1', tk.text)}>{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-3 mt-5">
            <div className="relative flex-1">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', tk.muted)} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, username, email, atau UID..."
                className={cn('w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40', tk.input)}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'all' | 'admin' | 'reader')}
              className={cn('rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40 lg:w-44', tk.input)}
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="reader">User</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'suspended')}
              className={cn('rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-gold/40 lg:w-44', tk.input)}
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn('mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border', dark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700')}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e0d4bb' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={dark ? 'bg-white/5' : 'bg-[#f3ebda]'}>
                  <tr className={cn('text-left', tk.muted)}>
                    <th className="px-4 py-3 font-semibold">Pengguna</th>
                    <th className="px-4 py-3 font-semibold">Peran</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Bergabung</th>
                    <th className="px-4 py-3 font-semibold">Total Terbaca</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className={cn('border-t', dark ? 'border-white/5' : 'border-[#e8dfcf]')}>
                        <td className="px-4 py-4" colSpan={6}>
                          <div className="h-16 rounded-xl animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#efe7d7' }} />
                        </td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr className={cn('border-t', dark ? 'border-white/5' : 'border-[#e8dfcf]')}>
                      <td colSpan={6} className={cn('px-4 py-12 text-center', tk.muted)}>
                        Tidak ada pengguna yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className={cn('border-t transition-colors', dark ? 'border-white/5 hover:bg-white/5' : 'border-[#e8dfcf] hover:bg-white/70')}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarImage src={user.avatarUrl} alt={user.displayName} initials={getInitials(user.displayName || user.email)} size="md" />
                            <div className="min-w-0">
                              <p className={cn('font-semibold truncate', tk.text)}>{user.displayName}</p>
                              <p className={cn('text-xs truncate', tk.muted)}>{user.email}</p>
                              <p className={cn('text-[11px] truncate mt-0.5', tk.muted)}>@{user.username}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', user.role === 'admin' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300')}>
                            {user.role}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', user.status === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300')}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {user.status}
                          </span>
                        </td>

                        <td className={cn('px-4 py-4 whitespace-nowrap', tk.muted)}>{formatDate(user.createdAt)}</td>

                        <td className={cn('px-4 py-4 font-semibold', tk.text)}>{user.totalRead}</td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className={cn('p-2 rounded-lg border transition', tk.btnGhost)}
                              title="Edit pengguna"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(user)}
                              className={cn('p-2 rounded-lg border transition', tk.btnGhost, 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20')}
                              title="Hapus pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={cn('rounded-2xl border p-5', tk.card)}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className={cn('text-3xl font-serif font-black', tk.text)}>Log Audit Perubahan</h2>
              <p className={cn('text-sm', tk.muted)}>Riwayat aksi perubahan dari admin Pustara</p>
            </div>
            <div className={cn('rounded-full border px-3 py-1 text-xs font-semibold', dark ? 'border-white/10 text-slate-200 bg-white/5' : 'border-[#dccda6] text-[#665327] bg-[#f4ecda]')}>
              Admin only
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredAudit.length === 0 ? (
              <div className={cn('rounded-xl border px-4 py-6 text-sm text-center', dark ? 'bg-white/5 border-white/8 text-slate-400' : 'bg-white/70 border-[#dfd3bb] text-[#8e7d57]')}>
                Belum ada log perubahan dari Admin Pustara.
              </div>
            ) : (
              filteredAudit.map((item, index) => (
                <article key={`${item.actor}-${item.action}-${index}`} className={cn('rounded-xl border px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5', tk.row, dark ? 'border-white/8' : 'border-[#dfd3bb]')}>
                  <div>
                    <p className={cn('text-sm', tk.text)}>
                      <span className="font-semibold">{item.actor}</span>
                      <span className="ml-1">{item.action}</span>
                    </p>
                    <p className={cn('text-xs', tk.muted)}>{item.detail}</p>
                  </div>
                  <p className={cn('text-xs shrink-0', tk.muted)}>{formatDateTime(item.time)}</p>
                </article>
              ))
            )}
          </div>
        </motion.section>
      </div>

      <UserModal
        open={modalOpen}
        dark={dark}
        mode={modalMode}
        user={selectedUser}
        draft={draft}
        saving={saving}
        error={formError}
        onClose={closeModal}
        onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
        onSubmit={() => void handleSave()}
      />
    </div>
  );
}