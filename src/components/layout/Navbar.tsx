'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Compass, Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ComboLogo from '../icons/ComboLogo';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const pathname = usePathname();
  const isLight = theme === 'light';

  const NAV = [
    { href: '/',       label: 'Beranda', icon: Home },
    { href: '/browse', label: 'Eksplor', icon: Compass },
  ];

  const txtPrimary   = isLight ? 'text-navy-800'      : 'text-white';
  const txtSecondary = isLight ? 'text-navy-500'      : 'text-white/60';
  const hoverBg      = isLight ? 'hover:bg-navy-100'  : 'hover:bg-white/10';
  const activeBg     = isLight ? 'bg-navy-100'        : 'bg-white/15';
  const hoverTxt     = isLight ? 'hover:text-navy-900': 'hover:text-white';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto mx-3 lg:mx-16 mt-3 rounded-2xl
                        backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
             style={{
               WebkitBackdropFilter: 'blur(24px)',
               backdropFilter: 'blur(24px)',
               background: isLight ? 'rgba(250,250,248,0.85)' : 'rgba(255,255,255,0.10)',
               borderColor: isLight ? 'rgba(232,228,220,0.8)' : 'rgba(255,255,255,0.20)',
             }}>
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-3" style={{ height: '52px' }}>

            {/* Logo */}
            <Link href="/" className="flex mt-2 -ml-8 lg:-mx-4 flex-shrink-0">
              <ComboLogo className="h-[55px]" />
            </Link>

            {/* Nav links — hanya kalau sudah login */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 ml-3">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link key={label} href={href} className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                    pathname === href
                      ? `${txtPrimary} ${activeBg}`
                      : `${txtSecondary} ${hoverTxt} ${hoverBg}`
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                ))}
              </nav>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              {user ? (
                <>
                  {/* Bell */}
                  <button className={cn('relative p-2 rounded-xl transition-colors', txtSecondary, hoverTxt, hoverBg)}>
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold" />
                  </button>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button onClick={() => setDropOpen(!dropOpen)}
                      className={cn('flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors', txtPrimary, hoverBg)}>
                      <div className="w-7 h-7 rounded-full bg-gold/30 border border-gold/40
                                      flex items-center justify-center font-bold text-xs text-gold">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className={cn('hidden md:block text-sm font-medium max-w-[80px] truncate', txtPrimary)}>
                        {user.displayName?.split(' ')[0] || 'Akun'}
                      </span>
                      <ChevronDown className={cn(
                        'hidden md:block w-3.5 h-3.5 transition-transform duration-200',
                        isLight ? 'text-navy-400' : 'text-white/40',
                        dropOpen && 'rotate-180'
                      )} />
                    </button>

                    {dropOpen && (
                      <>
                        <div className="fixed inset-0 z-[45]" onClick={() => setDropOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-52 z-[46] overflow-hidden
                                        rounded-2xl shadow-xl border border-slate-200 bg-white">
                          <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-slate-900 text-sm font-semibold truncate">{user.displayName || 'Pengguna'}</p>
                            <p className="text-slate-400 text-xs truncate">{user.email}</p>
                          </div>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                            Profil Saya
                          </button>
                          <Link href="/settings" onClick={() => setDropOpen(false)}
                            className="block w-full px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                            Pengaturan
                          </Link>
                          <div className="border-t border-slate-100 mx-2" />
                          <button onClick={() => { setDropOpen(false); signOut(auth); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                            Keluar
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hamburger — hanya kalau login */}
                  <button onClick={() => setMenuOpen(!menuOpen)}
                    className={cn('md:hidden p-2 rounded-xl transition-colors', txtSecondary, hoverTxt, hoverBg)}>
                    {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                /* Belum login — logo + Masuk doang */
                <Link href="/auth/login"
                  className={cn(
                    'px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all',
                    isLight
                      ? 'bg-navy-800 text-white border-navy-700 hover:bg-navy-700'
                      : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
                  )}>
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu — hanya kalau login */}
      {user && menuOpen && (
        <div className="fixed inset-0 z-40 pt-24 px-6 md:hidden"
             style={{
               backdropFilter: 'blur(24px)',
               WebkitBackdropFilter: 'blur(24px)',
               background: isLight ? 'rgba(250,250,248,0.97)' : 'rgba(13,24,41,0.97)',
             }}
             onClick={() => setMenuOpen(false)}>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label }) => (
              <Link key={label} href={href}
                className={cn(
                  'px-4 py-4 font-medium text-lg border-b transition-colors',
                  isLight
                    ? 'text-navy-800 border-navy-100 hover:text-gold'
                    : 'text-white border-white/10 hover:text-gold'
                )}>
                {label}
              </Link>
            ))}
            <Link href="/settings"
              className={cn(
                'px-4 py-4 font-medium text-lg border-b transition-colors',
                isLight
                  ? 'text-navy-800 border-navy-100 hover:text-gold'
                  : 'text-white border-white/10 hover:text-gold'
              )}>
              Pengaturan
            </Link>
          </nav>
        </div>
      )}

      <div className="h-[68px]" />
    </>
  );
}