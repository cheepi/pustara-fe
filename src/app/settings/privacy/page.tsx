'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, Lock, Eye, EyeOff, Smartphone, LogOut,
  ChevronRight, AlertTriangle, CheckCircle, X, Loader2,
  KeyRound, Trash2, Download, Bell, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Navbar from '@/components/layout/Navbar';

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 disabled:opacity-40',
        on ? 'bg-gold' : 'bg-slate-300 dark:bg-slate-600'
      )}
      style={{ background: on ? undefined : 'var(--border)' }}
    >
      <motion.span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
        animate={{ left: on ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      className="mb-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--muted)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden divide-y" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderColor: 'var(--border)',
        ['--tw-divide-color' as any]: 'var(--border)',
      }}>
        {children}
      </div>
    </motion.section>
  );
}

// ── Row variants ───────────────────────────────────────────────────────────────
function ToggleRow({
  icon: Icon, label, sub, on, onToggle, iconColor = 'text-gold',
}: {
  icon: React.ElementType; label: string; sub?: string;
  on: boolean; onToggle: () => void; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface2)' }}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

function ActionRow({
  icon: Icon, label, sub, onClick, danger = false, iconColor,
}: {
  icon: React.ElementType; label: string; sub?: string;
  onClick: () => void; danger?: boolean; iconColor?: string;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left hover:opacity-80 active:scale-[0.99]">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface2)' }}>
        <Icon className={cn('w-4 h-4', iconColor ?? (danger ? 'text-red-400' : 'text-gold'))} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-red-400' : '')}
           style={!danger ? { color: 'var(--text)' } : undefined}>
          {label}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
    </button>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

          {/* Backdrop */}
          <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose} />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden z-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{title}</p>
              <button onClick={onClose} className="p-1.5 rounded-lg transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PrivacySecurityPage() {
  const router   = useRouter();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { user }  = useAuthStore();
  const isLight   = theme === 'light';

  // ── Privacy toggles ──
  const [activityVisible,  setActivityVisible]  = useState(true);
  const [readingPublic,    setReadingPublic]     = useState(false);
  const [reviewsPublic,    setReviewsPublic]     = useState(true);
  const [followersVisible, setFollowersVisible]  = useState(true);
  const [dataUsage,        setDataUsage]         = useState(true);
  const [personalizedAds,  setPersonalizedAds]   = useState(false);

  // ── Security toggles ──
  const [twoFactor,   setTwoFactor]   = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // ── Modal state ──
  const [modal, setModal] = useState<
    'change-password' | 'sessions' | 'delete-account' | 'download-data' | null
  >(null);

  // ── Change password form ──
  const [oldPw,     setOldPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');

  // ── Delete confirm ──
  const [deleteInput, setDeleteInput] = useState('');

  // ── Download ──
  const [dlLoading, setDlLoading] = useState(false);
  const [dlDone,    setDlDone]    = useState(false);

  // ── Change password handler ──
  async function handleChangePassword() {
    setPwError('');
    if (!newPw || newPw.length < 6) { setPwError('Kata sandi minimal 6 karakter.'); return; }
    if (newPw !== confirmPw)         { setPwError('Konfirmasi kata sandi tidak cocok.'); return; }
    if (!user?.email)                { setPwError('Akun tidak valid.'); return; }

    setPwLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, oldPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setModal(null);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      showToast('Kata sandi berhasil diperbarui!', 'success');
    } catch (e: any) {
      const msg =
        e.code === 'auth/wrong-password'    ? 'Kata sandi lama salah.' :
        e.code === 'auth/too-many-requests'  ? 'Terlalu banyak percobaan. Coba lagi nanti.' :
        e.code === 'auth/requires-recent-login' ? 'Sesi kadaluarsa. Silakan login ulang.' :
        'Gagal memperbarui kata sandi.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  // ── Download data handler ──
  async function handleDownload() {
    setDlLoading(true);
    // Simulate async export
    await new Promise(r => setTimeout(r, 2000));
    setDlLoading(false);
    setDlDone(true);
    showToast('Data berhasil diekspor!', 'success');
  }

  // ── Input style helper ──
  const inputCls = cn(
    'w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all',
    isLight
      ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-100'
      : 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50 focus:ring-2 focus:ring-gold/10'
  );

  const sessions = [
    { device: 'Chrome · Windows 11', loc: 'Jakarta, ID', time: 'Aktif sekarang', current: true },
    { device: 'Safari · iPhone 15',  loc: 'Bandung, ID', time: '2 jam lalu',     current: false },
    { device: 'Firefox · macOS',     loc: 'Depok, ID',   time: '3 hari lalu',    current: false },
  ];
  const [activeSessions, setActiveSessions] = useState(sessions);

  function addToast(arg0: string, arg1: string) {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-lg mx-auto px-4 pt-6 pb-20">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors hover:text-gold"
            style={{ color: 'var(--muted)' }}>
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black" style={{ color: 'var(--text)' }}>
                Privasi & Keamanan
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Kendalikan data dan keamanan akunmu</p>
            </div>
          </div>
        </motion.div>

        {/* ── KEAMANAN AKUN ── */}
        <div className="mt-6">
          <Section title="Keamanan Akun" delay={0.05}>
            <ActionRow
              icon={KeyRound}
              label="Ubah Kata Sandi"
              sub="Perbarui kata sandi secara berkala"
              onClick={() => { setPwError(''); setModal('change-password'); }}
            />
            <ToggleRow
              icon={Smartphone}
              label="Verifikasi Dua Langkah"
              sub="Tambahkan lapisan keamanan ekstra saat login"
              on={twoFactor}
              onToggle={() => {
                setTwoFactor(v => !v);
                addToast(!twoFactor ? '2FA diaktifkan ✓' : '2FA dinonaktifkan', !twoFactor ? 'success' : 'info');
              }}
            />
            <ToggleRow
              icon={Bell}
              label="Notifikasi Login"
              sub="Kirim email saat ada login dari perangkat baru"
              on={loginAlerts}
              onToggle={() => {
                setLoginAlerts(v => !v);
                addToast(!loginAlerts ? 'Notifikasi login diaktifkan' : 'Notifikasi login dimatikan', 'info');
              }}
              iconColor="text-blue-400"
            />
            <ActionRow
              icon={Globe}
              label="Sesi Aktif"
              sub={`${activeSessions.length} perangkat aktif`}
              onClick={() => setModal('sessions')}
              iconColor="text-emerald-400"
            />
          </Section>

          {/* ── PRIVASI PROFIL ── */}
          <Section title="Privasi Profil" delay={0.1}>
            <ToggleRow
              icon={Eye}
              label="Aktivitas Terlihat"
              sub="Pengguna lain dapat melihat aktivitas bacamu"
              on={activityVisible}
              onToggle={() => { setActivityVisible(v => !v); addToast('Preferensi disimpan', 'info'); }}
            />
            <ToggleRow
              icon={Eye}
              label="Daftar Bacaan Publik"
              sub="Rak bukumu terlihat oleh semua pengguna"
              on={readingPublic}
              onToggle={() => { setReadingPublic(v => !v); addToast('Preferensi disimpan', 'info'); }}
            />
            <ToggleRow
              icon={Eye}
              label="Ulasan Publik"
              sub="Ulasanmu muncul di halaman komunitas"
              on={reviewsPublic}
              onToggle={() => { setReviewsPublic(v => !v); addToast('Preferensi disimpan', 'info'); }}
            />
            <ToggleRow
              icon={Eye}
              label="Daftar Pengikut Publik"
              sub="Siapa saja bisa melihat daftar mengikuti & pengikutmu"
              on={followersVisible}
              onToggle={() => { setFollowersVisible(v => !v); addToast('Preferensi disimpan', 'info'); }}
              iconColor="text-purple-400"
            />
          </Section>

          {/* ── DATA & PERSONALISASI ── */}
          <Section title="Data & Personalisasi" delay={0.15}>
            <ToggleRow
              icon={Shield}
              label="Personalisasi AI"
              sub="Izinkan PustarAI menggunakan riwayat baca untuk rekomendasi"
              on={dataUsage}
              onToggle={() => { setDataUsage(v => !v); addToast('Preferensi disimpan', 'info'); }}
            />
            <ToggleRow
              icon={Shield}
              label="Iklan Dipersonalisasi"
              sub="Tampilkan iklan berdasarkan minat dan aktivitasmu"
              on={personalizedAds}
              onToggle={() => { setPersonalizedAds(v => !v); addToast('Preferensi disimpan', 'info'); }}
              iconColor="text-orange-400"
            />
            <ActionRow
              icon={Download}
              label="Unduh Data Saya"
              sub="Ekspor semua data akun dalam format JSON"
              onClick={() => { setDlDone(false); setModal('download-data'); }}
              iconColor="text-sky-400"
            />
          </Section>

          {/* ── ZONA BERBAHAYA ── */}
          <Section title="Zona Berbahaya" delay={0.2}>
            <ActionRow
              icon={LogOut}
              label="Keluar dari Semua Perangkat"
              sub="Mengakhiri semua sesi aktif"
              onClick={async () => {
                await signOut(auth);
                router.replace('/catalog');
              }}
              danger
            />
            <ActionRow
              icon={Trash2}
              label="Hapus Akun"
              sub="Tindakan ini tidak dapat dibatalkan"
              onClick={() => { setDeleteInput(''); setModal('delete-account'); }}
              danger
            />
          </Section>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          MODAL — UBAH KATA SANDI
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'change-password'} onClose={() => setModal(null)} title="Ubah Kata Sandi">
        <div className="flex flex-col gap-3">
          {/* Old password */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Kata Sandi Lama
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPw} onChange={e => setOldPw(e.target.value)}
                placeholder="••••••••"
                className={cn(inputCls, 'pr-10')} />
              <button type="button" onClick={() => setShowOld(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)' }}>
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 6 karakter"
                className={cn(inputCls, 'pr-10')} />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)' }}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPw.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      newPw.length >= i * 3
                        ? newPw.length < 6 ? 'bg-red-400' : newPw.length < 9 ? 'bg-amber-400' : 'bg-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700'
                    )} style={newPw.length < i * 3 ? { background: 'var(--border)' } : undefined} />
                  ))}
                </div>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {newPw.length < 6 ? 'Terlalu pendek' : newPw.length < 9 ? 'Cukup' : 'Kuat'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type="password"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className={inputCls} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {pwError && (
              <motion.div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{pwError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleChangePassword}
            disabled={pwLoading || !oldPw || !newPw || !confirmPw}
            className="w-full py-3 rounded-xl bg-navy-800 text-white text-sm font-semibold
                       hover:bg-navy-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
            {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memperbarui...</> : 'Perbarui Kata Sandi'}
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — SESI AKTIF
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'sessions'} onClose={() => setModal(null)} title="Sesi Aktif">
        <div className="flex flex-col gap-3">
          {activeSessions.map((s, i) => (
            <motion.div key={i}
              className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'var(--surface)' }}>
                <Smartphone className="w-4 h-4 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{s.device}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.loc} · {s.time}</p>
                {s.current && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sesi ini
                  </span>
                )}
              </div>
              {!s.current && (
                <button
                  onClick={() => {
                    setActiveSessions(prev => prev.filter((_, j) => j !== i));
                    addToast('Sesi diakhiri', 'info');
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}

          {activeSessions.length > 1 && (
            <button
              onClick={() => {
                setActiveSessions(prev => prev.filter(s => s.current));
                addToast('Semua sesi lain diakhiri', 'success');
              }}
              className="w-full py-2.5 rounded-xl border border-red-400/20 text-red-400 text-sm font-semibold
                         hover:bg-red-400/10 transition-all">
              Akhiri Semua Sesi Lain
            </button>
          )}
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — UNDUH DATA
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'download-data'} onClose={() => setModal(null)} title="Unduh Data Saya">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            Ekspor semua data akunmu termasuk profil, riwayat baca, ulasan, wishlist, dan preferensi AI dalam format JSON.
          </p>

          <div className="rounded-xl p-3 border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
            {['Profil & preferensi', 'Riwayat baca & pinjaman', 'Ulasan & rating', 'Wishlist', 'Data PustarAI'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs" style={{ color: 'var(--text)' }}>{item}</span>
              </div>
            ))}
          </div>

          {dlDone ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400 font-medium">Data berhasil diekspor! Cek email kamu.</p>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              disabled={dlLoading}
              className="w-full py-3 rounded-xl bg-navy-800 text-white text-sm font-semibold
                         hover:bg-navy-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {dlLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan ekspor...</>
                : <><Download className="w-4 h-4" /> Mulai Unduh</>
              }
            </button>
          )}
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — HAPUS AKUN
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'delete-account'} onClose={() => setModal(null)} title="Hapus Akun">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">
              Tindakan ini <strong>tidak dapat dibatalkan</strong>. Semua data, riwayat baca, ulasan, dan preferensi AI akan dihapus secara permanen.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
              Ketik <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>HAPUS</span> untuk konfirmasi
            </label>
            <input
              value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="HAPUS"
              className={inputCls} />
          </div>

          <button
            disabled={deleteInput !== 'HAPUS'}
            onClick={async () => {
              // In real app: call user.delete() after re-auth
              await signOut(auth);
              router.replace('/catalog');
            }}
            className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-semibold
                       hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Hapus Akun Secara Permanen
          </button>
        </div>
      </Modal>

    </div>
  );
}