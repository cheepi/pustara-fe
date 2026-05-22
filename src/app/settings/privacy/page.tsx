'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, Lock, Eye, EyeOff, Smartphone, LogOut,
  ChevronRight, AlertTriangle, CheckCircle, X, Loader2,
  KeyRound, Trash2, Bell, Globe, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { getSessions, fetchWithSessionCheck, type Session } from '@/lib/sessions';
import { getOrCreateDeviceId } from '@/lib/deviceDetection';
import Navbar from '@/components/layout/Navbar';

// ── Coming Soon Badge ─────────────────────────────────────────────────────────
function ComingSoonBadge() {
  return (
    <motion.div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-opacity-40 backdrop-blur-sm"
      style={{
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
      <span className="text-[10px] font-semibold tracking-widest uppercase text-purple-300">
        Segera Hadir
      </span>
    </motion.div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
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
  icon: Icon, label, sub, on, onToggle, iconColor = 'text-gold', comingSoon = false, disabled = false,
}: {
  icon: React.ElementType; label: string; sub?: string;
  on: boolean; onToggle: () => void; iconColor?: string; comingSoon?: boolean; disabled?: boolean;
}) {
  return (
    <motion.div 
      className={cn('flex items-center gap-3 px-4 py-3.5', comingSoon && 'opacity-60')}
      initial={comingSoon ? { opacity: 0.6 } : undefined}
      animate={comingSoon ? { opacity: 0.6 } : undefined}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface2)' }}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
          {comingSoon && <ComingSoonBadge />}
        </div>
        {sub && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} disabled={disabled || comingSoon} />
    </motion.div>
  );
}

function ActionRow({
  icon: Icon, label, sub, onClick, danger = false, iconColor, comingSoon = false, disabled = false,
}: {
  icon: React.ElementType; label: string; sub?: string;
  onClick: () => void; danger?: boolean; iconColor?: string; comingSoon?: boolean; disabled?: boolean;
}) {
  return (
    <motion.button 
      onClick={onClick} 
      disabled={disabled || comingSoon}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left',
        !comingSoon && 'hover:opacity-80 active:scale-[0.99]',
        (disabled || comingSoon) && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface2)' }}>
        <Icon className={cn('w-4 h-4', iconColor ?? (danger ? 'text-red-400' : 'text-gold'))} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn('text-sm font-medium', danger ? 'text-red-400' : '')}
             style={!danger ? { color: 'var(--text)' } : undefined}>
            {label}
          </p>
          {comingSoon && <ComingSoonBadge />}
        </div>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      {!comingSoon && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />}
    </motion.button>
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

  // ── Privacy settings from backend ──
  const {
    settings: privacySettings,
    loading: privacyLoading,
    isUpdating: privacyUpdating,
    error: privacyError,
    updateSetting: updatePrivacySetting,
  } = usePrivacySettings();

  // Show error toast if privacy settings fail to load
  useEffect(() => {
    if (privacyError) {
      showToast(`Gagal memuat pengaturan privasi: ${privacyError}`, 'error');
    }
  }, [privacyError, showToast]);

  // Map backend settings to local variables for easier reading
  const activityVisible  = privacySettings?.activity_visible ?? true;
  const readingPublic    = privacySettings?.public_reading_list ?? true;
  const reviewsPublic    = privacySettings?.public_reviews ?? true;

  // ── Security toggles ──
  const [loginAlerts, setLoginAlerts] = useState(true);

  // ── Modal state ──
  const [modal, setModal] = useState<
    'change-password' | 'forgot-password' | 'sessions' | 'delete-account' | 'logout-all' | null
  >(null);

  // ── Password management hook ──
  const {
    changePassword,
    changePasswordLoading,
    changePasswordError,
    clearChangePasswordError,
    sendResetEmail,
    resetEmailLoading,
    resetEmailError,
    resetEmailSent,
    clearResetEmailError,
    validatePassword,
  } = usePasswordManagement();

  // ── Change password form ──
  const [oldPw,     setOldPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);

  // ── Forgot password form ──
  const [resetEmail, setResetEmail] = useState('');
  const [resetShownMessage, setResetShownMessage] = useState(false);

  // ── Delete confirm ──
  const [deleteInput, setDeleteInput] = useState('');

  // ── Active sessions ──
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const currentDeviceId = useMemo(() => getOrCreateDeviceId(), []);

  // ── Determine current device by persistent device_id ──
  const currentSessionId = useMemo(() => {
    if (sessions.length === 0) return null;

    const exactMatch = sessions.find(
      (session) => session.device_id && session.device_id === currentDeviceId
    );
    if (exactMatch) return exactMatch.id;

    // Fallback for legacy sessions without device_id.
    return sessions.reduce((latest, session) => {
      const latestTime = new Date(latest.last_active).getTime();
      const currentTime = new Date(session.last_active).getTime();
      return currentTime > latestTime ? session : latest;
    }).id;
  }, [currentDeviceId, sessions]);

  // ── Change password handler ──
  async function handleChangePassword() {
    clearChangePasswordError();
    if (!newPw || newPw.length < 6) return;
    if (newPw !== confirmPw) {
      // Error is handled in the validation
      return;
    }
    if (!user?.email) return;

    try {
      await changePassword(user.email, oldPw, newPw);
      
      // Success - reset form and close modal
      setModal(null);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Kata sandi berhasil diperbarui! 🔒', 'success');
    } catch (error) {
      // Error is already in changePasswordError state
      console.error('[ChangePassword] Error:', error);
    }
  }

  // ── Forgot password handler ──
  async function handleForgotPassword() {
    clearResetEmailError();
    
    if (!resetEmail) {
      return;
    }

    try {
      await sendResetEmail(resetEmail);
      
      // Success - show message
      showToast('Email reset kata sandi telah dikirim! Periksa inbox Anda.', 'success');
      setResetShownMessage(true);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setModal(null);
        setResetEmail('');
        setResetShownMessage(false);
      }, 2000);
    } catch (error) {
      // Error is already in resetEmailError state
      console.error('[ForgotPassword] Error:', error);
    }
  }

  // ── Logout all sessions handler ──
  async function handleLogoutAll() {
    setLogoutAllLoading(true);
    try {
      // Get Firebase ID token
      const currentUser = auth?.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;
      
      if (!token) {
        showToast('Gagal mendapatkan token autentikasi', 'error');
        setLogoutAllLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const result = await fetchWithSessionCheck(
        `${apiUrl}/auth/logout-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        },
        showToast
      );

      // Check untuk SESSION_REVOKED atau error
      if (!result.success || result.error === 'SESSION_REVOKED') {
        showToast('Gagal keluar dari semua perangkat', 'error');
        console.error('[logout-all] Error:', result);
        return;
      }

      // Success - clear sessions and show toast
      setSessions([]);
      showToast('Berhasil keluar dari semua perangkat', 'success');

      // Sign out from Firebase and redirect
      setTimeout(async () => {
        try {
          if (auth) {
            await signOut(auth);
          }
          router.replace('/catalog');
        } catch (error) {
          console.error('[logout-all redirect] Error:', error);
        }
      }, 1000);
    } catch (error) {
      showToast('Terjadi kesalahan', 'error');
      console.error('[logout-all] Exception:', error);
    } finally {
      setLogoutAllLoading(false);
    }
  }

  // ── Input style helper ──
  const inputCls = cn(
    'w-full px-4 py-3 border rounded-xl text-sm outline-none transition-all',
    isLight
      ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-100'
      : 'bg-navy-700/60 border-white/10 text-white placeholder-white/30 focus:border-gold/50 focus:ring-2 focus:ring-gold/10'
  );

  const [activeSessions, setActiveSessions] = useState(sessions);

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
              onClick={() => {
                clearChangePasswordError();
                setOldPw('');
                setNewPw('');
                setConfirmPw('');
                setModal('change-password');
              }}
            />
            <ToggleRow
              icon={Bell}
              label="Notifikasi Login"
              sub="Kirim email saat ada login dari perangkat baru"
              on={loginAlerts}
              onToggle={() => {}}
              iconColor="text-blue-400"
              comingSoon
            />
            <ActionRow
              icon={Globe}
              label="Sesi Aktif"
              sub="Kelola perangkat yang terhubung dengan akun Anda"
              onClick={async () => {
                setSessionsLoading(true);
                const data = await getSessions(showToast);
                setSessions(data);
                setSessionsLoading(false);
                setModal('sessions');
              }}
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
              onToggle={async () => {
                await updatePrivacySetting('activity_visible', !activityVisible);
                showToast(!activityVisible ? 'Aktivitas kini terlihat' : 'Aktivitas disembunyikan', 'success');
              }}
              disabled={privacyLoading || privacyUpdating}
            />
            <ToggleRow
              icon={Eye}
              label="Daftar Bacaan Publik"
              sub="Rak bukumu terlihat oleh semua pengguna"
              on={readingPublic}
              onToggle={async () => {
                await updatePrivacySetting('public_reading_list', !readingPublic);
                showToast(!readingPublic ? 'Daftar bacaan kini publik' : 'Daftar bacaan disembunyikan', 'success');
              }}
              disabled={privacyLoading || privacyUpdating}
            />
            <ToggleRow
              icon={Eye}
              label="Ulasan Publik"
              sub="Ulasanmu muncul di halaman komunitas"
              on={reviewsPublic}
              onToggle={async () => {
                await updatePrivacySetting('public_reviews', !reviewsPublic);
                showToast(!reviewsPublic ? 'Ulasan kini publik' : 'Ulasan disembunyikan', 'success');
              }}
              disabled={privacyLoading || privacyUpdating}
            />
          </Section>

          {/* ── ZONA BERBAHAYA ── */}
          <Section title="Zona Berbahaya" delay={0.2}>
            <ActionRow
              icon={LogOut}
              label="Keluar dari Semua Perangkat"
              sub="Mengakhiri semua sesi aktif"
              onClick={() => setModal('logout-all')}
              disabled={logoutAllLoading}
              danger
            />
            <ActionRow
              icon={Trash2}
              label="Hapus Akun"
              sub="Tindakan ini tidak dapat dibatalkan"
              onClick={() => setModal('delete-account')}
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
            {newPw.length > 0 && (() => {
              const validation = validatePassword(newPw);
              const strength = newPw.length < 6 ? 0 : newPw.length < 8 ? 1 : newPw.length < 12 ? 2 : 3;
              const colors = ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400'];
              return (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i <= strength ? colors[strength] : 'bg-slate-200 dark:bg-slate-700'
                      )} style={i <= strength ? undefined : { background: 'var(--border)' }} />
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {validation.message}
                  </p>
                </div>
              );
            })()}
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
            {changePasswordError && (
              <motion.div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{changePasswordError.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleChangePassword}
            disabled={changePasswordLoading || !oldPw || !newPw || !confirmPw || newPw !== confirmPw}
            className="w-full py-3 rounded-xl bg-navy-800 text-white text-sm font-semibold
                       hover:bg-navy-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
            {changePasswordLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memperbarui...</> : 'Perbarui Kata Sandi'}
          </button>

          {/* Forgot password link */}
          <button
            onClick={() => {
              clearResetEmailError();
              setResetEmail(user?.email || '');
              setResetShownMessage(false);
              setModal('forgot-password');
            }}
            className="w-full py-2 text-xs font-medium text-gold/80 hover:text-gold transition-colors text-center">
            Lupa kata sandi?
          </button>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — LUPA KATA SANDI
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'forgot-password'} onClose={() => setModal(null)} title="Lupa Kata Sandi?">
        {resetEmailSent && resetShownMessage ? (
          <motion.div
            className="flex flex-col gap-4 items-center text-center py-4"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Email Reset Terkirim!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Kami telah mengirimkan tautan reset kata sandi ke <strong>{resetEmail}</strong>.
              </p>
            </div>
            <div className="w-full p-3 rounded-xl border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Klik tautan dalam email untuk membuat kata sandi baru. Tautan berlaku selama 24 jam.
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Jendela ini akan ditutup dalam beberapa detik...</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Masukkan email akun Anda dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
            </p>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="nama@example.com"
                  className={cn(inputCls, 'pl-10')} />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {resetEmailError && (
                <motion.div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{resetEmailError.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleForgotPassword}
              disabled={resetEmailLoading || !resetEmail}
              className="w-full py-3 rounded-xl bg-gold/90 text-slate-900 text-sm font-semibold
                         hover:bg-gold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {resetEmailLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
              ) : (
                <><Mail className="w-4 h-4" /> Kirim Tautan Reset</>
              )}
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setResetEmail('');
                  clearResetEmailError();
                  setModal('change-password');
                }}
                className="text-xs font-medium transition-colors hover:text-gold"
                style={{ color: 'var(--muted)' }}>
                Ingat kata sandi? Kembali ke ubah kata sandi
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — SESI AKTIF
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'sessions'} onClose={() => setModal(null)} title="Sesi Aktif">
        {sessionsLoading ? (
          <motion.div
            className="flex flex-col gap-3 items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Memuat sesi aktif...</p>
          </motion.div>
        ) : sessions.length === 0 ? (
          <motion.div
            className="flex flex-col gap-4 items-center text-center py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Tidak ada sesi aktif</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-3">
            <AnimatePresence>
              {sessions.map((session, idx) => {
                const isCurrentDevice = session.id === currentSessionId;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 rounded-lg border"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {session.device_name}
                      </p>
                      {isCurrentDevice && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                          }}
                        >
                          Perangkat Ini
                        </motion.div>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {session.ip_address}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      {new Date(session.last_active).toLocaleString('id-ID')}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </Modal>



      {/* ══════════════════════════════════════════
          MODAL — HAPUS AKUN
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'delete-account'} onClose={() => setModal(null)} title="Hapus Akun">
        <motion.div
          className="flex flex-col gap-4 items-center text-center py-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>
              Yakin Ingin Menghapus Akun?
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Tindakan ini akan menghapus semua data Anda secara permanen. Anda tidak dapat mengurungkan tindakan ini.
            </p>
          </div>
          <div className="w-full p-3 rounded-xl border border-red-500/20 bg-red-500/10 mt-2 text-left">
            <p className="text-xs leading-relaxed text-red-400">
              Konfirmasi: ketik <strong>hapus {user?.email || 'akun'}</strong> di bawah lalu tekan tombol "Hapus Akun".
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={`Ketik hapus ${user?.email || 'akun'}`}
              className={cn(inputCls, 'mt-2')}
            />
          </div>

          <div className="flex w-full gap-3 mt-4">
            <button
              onClick={() => setModal(null)}
              className="flex-1 py-3 rounded-xl border text-sm font-semibold transition hover:opacity-80"
            >Batal</button>
            <button
              onClick={async () => {
                const requiredText = `hapus ${user?.email || 'akun'}`;
                if (deleteInput !== requiredText) {
                  showToast(`Ketik "${requiredText}" sebagai konfirmasi`, 'error');
                  return;
                }

                try {
                  const token = await auth?.currentUser?.getIdToken();
                  if (!token) {
                    showToast('Gagal mendapatkan token autentikasi', 'error');
                    return;
                  }

                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                  const res = await fetch(`${apiUrl}/auth/delete-account`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ confirm: true }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok || json.success === false) {
                    showToast(json.error || json.message || 'Gagal menghapus akun', 'error');
                    return;
                  }

                  showToast('Akun berhasil dihapus', 'success');
                  // Sign out locally and redirect
                  if (auth) await signOut(auth);
                  router.replace('/');
                } catch (err) {
                  console.error('[delete-account] Error:', err);
                  showToast('Terjadi kesalahan saat menghapus akun', 'error');
                }
              }}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold transition hover:opacity-90"
            >Hapus Akun</button>
          </div>
        </motion.div>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL — KELUAR SEMUA PERANGKAT
      ══════════════════════════════════════════ */}
      <Modal open={modal === 'logout-all'} onClose={() => setModal(null)} title="Konfirmasi Keluar">
        <motion.div
          className="flex flex-col gap-4 items-center text-center py-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <LogOut className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>
              Akhiri Semua Sesi?
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Anda akan dikeluarkan dari semua perangkat yang terhubung ke akun ini, termasuk perangkat yang sedang Anda gunakan sekarang.
            </p>
          </div>
          <div className="flex w-full gap-3 mt-4">
            <button
              onClick={() => setModal(null)}
              className="flex-1 py-3 rounded-xl border text-sm font-semibold transition hover:opacity-80"
              disabled={logoutAllLoading}
            >
              Batal
            </button>
            <button
              onClick={handleLogoutAll}
              disabled={logoutAllLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold transition hover:opacity-90 flex items-center justify-center gap-2"
            >
              {logoutAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Keluar'}
            </button>
          </div>
        </motion.div>
      </Modal>

    </div>
  );
}