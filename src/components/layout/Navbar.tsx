'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Menu, X, Compass, Library, Bell, Bird,
  ChevronDown, Search, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Wordmark from '../icons/Wordmark';
import Logo from '../icons/Logo';

const MotionLogo = motion(Logo);
export default function Navbar() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { user }          = useAuthStore();
  const { theme, toggle } = useTheme();
  const router            = useRouter();
  const pathname          = usePathname();
  const isLight           = theme === 'light';

  const NAV = [
    { href: '/browse', label: 'Eksplor',  icon: Compass },
    { href: '/feed',   label: 'Feed',     icon: Bird     },
    { href: '/shelf',  label: 'Rak Buku', icon: Library },
  ];

  // ── Token classes ──────────────────────────────────────────────────────────
  const txtSecondary = isLight ? 'text-navy-500'       : 'text-white/60';
  const hoverBg      = isLight ? 'hover:bg-navy-800/10' : 'hover:bg-white/10';
  const hoverTxt     = isLight ? 'hover:text-navy-900' : 'hover:text-white';

  // Active nav: solid enough to be visible on parchment light bg
  const activeClasses   = isLight
    ? 'text-navy-900 font-semibold'
    : 'bg-white/15 text-white font-semibold';
  const activeStyle     = isLight
    ? { background: 'rgba(15,23,42,0.10)', boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.08)' }
    : undefined;
  const inactiveClasses = cn('font-medium', txtSecondary, hoverTxt, hoverBg);

  // Dropdown
  const dropBg      = isLight
    ? 'bg-white border-slate-200 shadow-xl'
    : 'bg-navy-800 border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)]';
  const dropDivider = isLight ? 'divide-slate-100'  : 'divide-white/8';
  const dropHead    = isLight ? 'text-slate-900'    : 'text-white';
  const dropSub     = isLight ? 'text-slate-400'    : 'text-white/40';
  const dropItem    = isLight
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    : 'text-white/60 hover:text-white hover:bg-white/5';
  const dropLogout  = isLight ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-400/10';

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close overlays on route change
  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [pathname]);

  // Warm up heavy routes when browser is idle for snappier navigation.
  useEffect(() => {
    if (!user) return;

    const routes = ['/feed', '/shelf', '/browse', '/popular', '/notifications', '/profile'];
    const prefetchAll = () => {
      routes.forEach((route) => router.prefetch(route));
    };

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(prefetchAll);
      return () => {
        const cancel = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        cancel?.(id);
      };
    }

    const timeoutId = window.setTimeout(prefetchAll, 900);
    return () => window.clearTimeout(timeoutId);
  }, [router, user]);

  const firstName = user?.displayName?.split(' ')[0] || 'Akun';
  const initial   = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  async function handleConfirmLogout() {
    setLogoutConfirmOpen(false);
    await signOut(auth);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div
          className="pointer-events-auto ml-6 mr-3 mt-3 rounded-2xl lg:max-w-7xl lg:ml-[5vw] lg:mr-3 border"
          style={{
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background:   isLight ? 'rgba(250,250,248,0.78)' : 'rgba(13,24,41,0.72)',
            borderColor:  isLight ? 'rgba(200,194,184,0.55)' : 'rgba(255,255,255,0.10)',
            boxShadow:    isLight
              ? '0 4px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.03)'
              : '0 4px 32px rgba(0,0,0,0.4)',
            overflow: 'visible',
          }}>

          <div className="px-3 sm:px-4 flex items-center gap-2" style={{ height: '56px' }}>

            {/* ── Logo: icon overflows bar top/bottom, wordmark inside ── */}
            <Link href="/" className="flex items-center gap-1 flex-shrink-0 -ml-1">
            <MotionLogo
              className="w-auto drop-shadow-lg flex-shrink-0 relative z-10 focus:outline-none"
              style={{
                height: typeof window !== "undefined" && window.innerWidth < 768 ? "80px" : "86px",
                marginTop: typeof window !== "undefined" && window.innerWidth < 768 ? "0px" : "-10px",
                marginBottom: typeof window !== "undefined" && window.innerWidth < 768 ? "0px" : "-10px",
                marginLeft: typeof window !== "undefined" && window.innerWidth < 768 ? "-18px" : "-36px",
              }}
              whileHover={{ rotate: -12, scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            />
              <Wordmark isLight={isLight} className="hidden md:block h-4 w-auto flex-shrink-0" />
            </Link>

            {/* ── Desktop nav ───────────────────────────────────────────── */}
            {user && (
              <nav className="hidden md:flex items-center gap-0.5 ml-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link key={href} href={href}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all',
                        isActive ? activeClasses : inactiveClasses
                      )}
                      style={isActive ? activeStyle : undefined}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* ── Spacer ────────────────────────────────────────────────── */}
            <div className="flex-1" />

            {/* ── Desktop expandable search ─────────────────────────────── */}
            { user && (
              <form action="/browse"
                className="hidden md:flex items-center justify-end relative group flex-shrink-0"
                style={{ width: '36px', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
                onFocus={e      => { (e.currentTarget as HTMLFormElement).style.width = '220px'; }}
                onBlur={e       => { if (!e.currentTarget.contains(e.relatedTarget as Node)) (e.currentTarget as HTMLFormElement).style.width = '36px'; }}
              onMouseEnter={e => { (e.currentTarget as HTMLFormElement).style.width = '220px'; }}
              onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) (e.currentTarget as HTMLFormElement).style.width = '36px'; }}>

              <div className={cn(
                'absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200',
                'opacity-100 group-hover:opacity-0 group-focus-within:opacity-0',
                isLight ? 'bg-navy-800/10' : 'bg-white/10'
              )} />
              <Search className={cn(
                'absolute left-2.5 z-10 w-3.5 h-3.5 pointer-events-none transition-colors duration-200',
                isLight
                  ? 'text-navy-500 group-hover:text-navy-700 group-focus-within:text-navy-700'
                  : 'text-white/50 group-hover:text-white/80 group-focus-within:text-white/80'
              )} />
              <input type="search" name="q" placeholder="Cari buku..."
                className={cn(
                  'w-full pl-8 pr-3 py-1.5 rounded-xl text-sm border focus:outline-none transition-all duration-200',
                  'placeholder-transparent group-hover:placeholder-[unset] group-focus-within:placeholder-[unset]',
                  isLight
                    ? 'bg-transparent group-hover:bg-navy-800/10 group-focus-within:bg-navy-800/10 text-navy-800 border-transparent group-hover:border-navy-800/10 group-focus-within:border-navy-800/10'
                    : 'bg-transparent group-hover:bg-white/10 group-focus-within:bg-white/10 text-white border-transparent group-hover:border-white/15 group-focus-within:border-white/15'
                )} />
              </form>
            )}
            {/* ── Right cluster ─────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5">

              {user ? (
                <>
                  {/* Bell */}
                  <Link href="/notifications"
                    className={cn('relative p-2 rounded-xl transition-colors flex-shrink-0', txtSecondary, hoverTxt, hoverBg)}>
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold" />
                  </Link>

                  {/* Theme toggle — desktop only, mobile lives in burger menu */}
                  <button onClick={toggle}
                    className={cn('hidden md:flex p-2 rounded-xl transition-colors flex-shrink-0', txtSecondary, hoverTxt, hoverBg)}
                    aria-label="Toggle tema">
                    {isLight
                      ? <Moon className="w-4 h-4" />
                      : <Sun  className="w-4 h-4 text-gold/70" />}
                  </button>

                  {/* Mobile search trigger */}
                  {user && (
                    <button onClick={() => setSearchOpen(true)}
                      className={cn('md:hidden p-2 rounded-xl transition-colors flex-shrink-0', txtSecondary, hoverTxt, hoverBg)}>
                      <Search className="w-4 h-4" />
                    </button>
                  )}

                  {/* Profile dropdown — works on both mobile & desktop */}
                  <div className="relative">
                    <button
                      onClick={() => setDropOpen(v => !v)}
                      className={cn('flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-xl transition-colors flex-shrink-0', hoverBg)}>
                      <div className="w-7 h-7 rounded-full bg-gold/25 border border-gold/40 flex items-center justify-center font-bold text-xs text-gold flex-shrink-0">
                        {initial}
                      </div>
                      <span className={cn('hidden md:block text-sm max-w-[72px] truncate', isLight ? 'text-navy-800' : 'text-white')}>
                        {firstName}
                      </span>
                      <ChevronDown className={cn(
                        'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200',
                        isLight ? 'text-navy-400' : 'text-white/50',
                        dropOpen && 'rotate-180'
                      )} />
                    </button>

                    {dropOpen && (
                      <>
                        {/* Full-screen backdrop to catch outside clicks */}
                        <div className="fixed inset-0 z-[45]" onClick={() => setDropOpen(false)} />

                        {/* Dropdown panel — fixed so it's never clipped by any parent */}
                        <div
                          className={cn(
                            'fixed z-[46] w-52 overflow-hidden rounded-2xl border divide-y',
                            dropBg, dropDivider
                          )}
                          style={{
                            top: '72px',   // navbar height (56px) + mt-3 (12px) + gap (4px)
                            right: '12px', // matches the mx-3 of the navbar pill
                          }}>
                          <div className="px-4 py-3">
                            <p className={cn('text-sm font-semibold truncate', dropHead)}>{user.displayName || 'Pengguna'}</p>
                            <p className={cn('text-xs truncate mt-0.5', dropSub)}>{user.email}</p>
                          </div>
                          <div>
                            {[
                              { href: '/profile',          label: 'Profil Saya'        },
                              { href: '/settings',         label: 'Pengaturan'          },
                              { href: '/settings/privacy', label: 'Privasi & Keamanan' },
                            ].map(({ href, label }) => (
                              <Link key={href} href={href} onClick={() => setDropOpen(false)}
                                className={cn('block px-4 py-2.5 text-sm transition-colors', dropItem)}>
                                {label}
                              </Link>
                            ))}
                          </div>
                          <div>
                            <button onClick={() => { setDropOpen(false); setLogoutConfirmOpen(true); }}
                              className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors', dropLogout)}>
                              Keluar
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hamburger — mobile only */}
                  <button onClick={() => setMenuOpen(v => !v)}
                    className={cn('md:hidden p-2 rounded-xl transition-colors flex-shrink-0', txtSecondary, hoverTxt, hoverBg)}>
                    {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <>
                  {/* Theme toggle — always visible when guest */}
                  <button onClick={toggle}
                    className={cn('p-2 rounded-xl transition-colors flex-shrink-0', txtSecondary, hoverTxt, hoverBg)}
                    aria-label="Toggle tema">
                    {isLight
                      ? <Moon className="w-4 h-4" />
                      : <Sun  className="w-4 h-4 text-gold/70" />}
                  </button>
                  <Link href="/auth/login"
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all flex-shrink-0',
                      isLight
                        ? 'bg-navy-800 text-white border-navy-700 hover:bg-navy-700'
                        : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
                    )}>
                    Masuk
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          SEARCH OVERLAY
      ═══════════════════════════════════════ */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 z-[55]"
            style={{
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              background: isLight ? 'rgba(250,250,248,0.7)' : 'rgba(13,24,41,0.7)',
            }}
            onClick={() => setSearchOpen(false)} />

          <div className="fixed top-0 left-0 right-0 z-[56] px-3 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="rounded-2xl border overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
              style={{
                background:  isLight ? 'rgba(252,252,250,0.99)' : 'rgba(17,31,53,0.99)',
                borderColor: isLight ? 'rgba(232,228,220,0.9)'  : 'rgba(255,255,255,0.15)',
              }}>
              <form action="/browse" className="flex items-center gap-3 px-4" style={{ height: '56px' }}
                onSubmit={() => setSearchOpen(false)}>
                <Search className={cn('w-4 h-4 flex-shrink-0', isLight ? 'text-navy-400' : 'text-white/50')} />
                <input ref={searchRef} type="search" name="q" placeholder="Cari judul, penulis, atau genre..."
                  className={cn(
                    'flex-1 text-sm bg-transparent focus:outline-none',
                    isLight ? 'text-navy-800 placeholder-navy-400' : 'text-white placeholder-white/40'
                  )} />
                <button type="button" onClick={() => setSearchOpen(false)}
                  className={cn('p-1.5 rounded-lg transition-colors',
                    isLight ? 'text-navy-400 hover:text-navy-700 hover:bg-navy-100' : 'text-white/40 hover:text-white hover:bg-white/10')}>
                  <X className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════
          MOBILE MENU — bottom sheet style
      ═══════════════════════════════════════ */}
      {user && menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex flex-col"
          style={{
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            background: isLight ? 'rgba(250,250,248,0.98)' : 'rgba(13,24,41,0.98)',
          }}>

          {/* Tap to close zone */}
          <div className="flex-1" onClick={() => setMenuOpen(false)} />

          {/* Content panel */}
          <div className="px-4 pb-safe-or-8 pb-8">

            {/* User info pill */}
            <div className="flex items-center gap-3 px-4 py-3.5 mb-3 rounded-2xl" style={{ background: 'var(--surface2)' }}>
              <div className="w-10 h-10 rounded-full bg-gold/[0.25] border border-gold/40 flex items-center justify-center font-bold text-sm text-gold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{user.displayName || 'Pengguna'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.email}</p>
              </div>
            </div>

            {/* Secondary links */}
            <div className="flex flex-col gap-0.5 mb-3">
              {[
                { href: '/settings',         label: 'Pengaturan'         },
                { href: '/settings/privacy', label: 'Privasi & Keamanan' },
                { href: '/profile',          label: 'Profil Saya'        },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-2xl text-sm font-medium transition-all',
                    isLight ? 'text-navy-600 hover:bg-navy-800/[0.05]' : 'text-white/60 hover:bg-white/[0.06]'
                  )}>
                  {label}
                </Link>
              ))}

              {/* Theme toggle */}
              <button onClick={toggle}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all w-full text-left',
                  isLight ? 'text-navy-600 hover:bg-navy-800/[0.05]' : 'text-white/60 hover:bg-white/[0.06]'
                )}>
                {isLight
                  ? <><Moon className="w-4 h-4 flex-shrink-0" /> Mode Gelap</>
                  : <><Sun  className="w-4 h-4 flex-shrink-0 text-gold/70" /> Mode Terang</>}
              </button>
            </div>

            <div className="h-px mb-3" style={{ background: 'var(--border)' }} />

            {/* Logout */}
            <button onClick={() => { setMenuOpen(false); setLogoutConfirmOpen(true); }}
              className="w-full flex items-center px-4 py-3 rounded-2xl text-sm font-semibold text-red-400 hover:bg-red-400/[0.08] transition-all">
              Keluar dari Akun
            </button>
          </div>
        </div>
      )}

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setLogoutConfirmOpen(false)}
            aria-label="Tutup konfirmasi logout"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative w-full max-w-md rounded-2xl border p-5 shadow-[0_20px_40px_rgba(0,0,0,0.45)]',
              isLight ? 'bg-white border-slate-200' : 'bg-navy-900 border-white/15'
            )}
          >
            <p className={cn('text-base font-bold', isLight ? 'text-slate-900' : 'text-white')}>
              Konfirmasi logout
            </p>
            <p className={cn('text-sm mt-2', isLight ? 'text-slate-600' : 'text-slate-300')}>
              Kamu yakin ingin keluar dari akun sekarang?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-white/15 text-slate-200 hover:bg-navy-800'
                )}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-3.5 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-400 transition-colors"
              >
                Ya, logout
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-[72px]" />
    </>
  );
}