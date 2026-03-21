'use client';
import { Moon, Sun, ChevronRight, User, Bell, Shield, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

type ThemeOption = 'dark' | 'light';

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: typeof Moon; desc: string }[] = [
  { value: 'dark',  label: 'Gelap',  icon: Moon, desc: 'Navy & gold — mode default'   },
  { value: 'light', label: 'Terang', icon: Sun,  desc: 'Parchment putih & hangat'      },
];

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { user }          = useAuthStore();
  const router            = useRouter();

  function handleThemeSelect(val: ThemeOption) {
    if (val !== theme) toggle();
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace('/catalog');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-lg mx-auto px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>
            Pengaturan
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Sesuaikan pengalaman membaca kamu
          </p>
        </motion.div>

        {/* ── TAMPILAN ── */}
        <motion.section className="mb-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}>
          <SectionLabel>Tampilan</SectionLabel>
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Mode Warna
              </p>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                  const active = theme === value;
                  return (
                    <button key={value} onClick={() => handleThemeSelect(value)}
                      className={cn(
                        'relative flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 transition-all text-left',
                        active ? 'border-gold bg-gold/10' : 'border-transparent hover:border-gold/30'
                      )}
                      style={!active ? { background: 'var(--surface2)' } : undefined}>
                      <div className={cn(
                        'w-full h-10 rounded-lg flex items-center justify-center',
                        value === 'dark' ? 'bg-navy-800' : 'bg-parchment'
                      )}>
                        <Icon className={cn('w-4 h-4', value === 'dark' ? 'text-gold' : 'text-navy-700')} />
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', active ? 'text-gold' : '')}
                           style={!active ? { color: 'var(--text)' } : undefined}>
                          {label}
                        </p>
                        <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--muted)' }}>
                          {desc}
                        </p>
                      </div>
                      {active && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── AKUN ── */}
        <motion.section className="mb-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}>
          <SectionLabel>Akun</SectionLabel>
          <div className="rounded-2xl overflow-hidden divide-y"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderColor: 'var(--border)' }}>

            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30
                                flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {user.displayName || 'Pengguna'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            <SettingsRow icon={User}   label="Profil Saya"        href="/profile"           />
            <SettingsRow icon={Bell}   label="Notifikasi"         href="/settings/notifications" />
            <SettingsRow icon={Shield} label="Privasi & Keamanan" href="/settings/privacy"   />
          </div>
        </motion.section>

        {/* ── TENTANG ── */}
        <motion.section className="mb-8"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}>
          <SectionLabel>Tentang</SectionLabel>
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3.5 flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text)' }}>Versi Aplikasi</p>
              <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>0.1.0-beta</p>
            </div>
          </div>
        </motion.section>

        {/* ── LOGOUT ── */}
        {user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <button onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-red-500
                         border border-red-500/20 hover:bg-red-500/10 transition-all active:scale-[0.98]">
              <span className="flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" />
                Keluar dari Akun
              </span>
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  );
}

function SettingsRow({ icon: Icon, label, href }: { icon: typeof User; label: string; href: string }) {
  return (
    <Link href={href}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:opacity-80 transition-opacity text-left">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: 'var(--surface2)' }}>
        <Icon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
      </div>
      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
      <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
    </Link>
  );
}