'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Files, LayoutGrid, Moon, Sun, Users, ClipboardList, } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import Wordmark from '../icons/Wordmark';
import Logo from '../icons/Logo';

const MotionLogo = motion(Logo);

const NAV_ITEMS = [
  { href: '/dashboard-all-things', label: 'Dashboard', icon: LayoutGrid },
  { href: '/books-management', label: 'Buku', icon: BookOpen },
  { href: '/users-management', label: 'Pengguna', icon: Users },
  { href: '/loans-management', label: 'Pinjaman', icon: ClipboardList },
  { href: '/contents-management', label: 'Konten', icon: Files },
];

export default function AdminTopNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { user } = useAuthStore();

  const isDark = theme === 'dark';
  const firstName = user?.displayName?.split(' ')[0] || 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className="pointer-events-auto mx-3 mt-3 rounded-2xl lg:max-w-7xl lg:mx-auto border"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: isDark ? 'rgba(13,24,41,0.72)' : 'rgba(250,250,248,0.78)',
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(200,194,184,0.55)',
          boxShadow: isDark
            ? '0 4px 32px rgba(0,0,0,0.4)'
            : '0 4px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.03)',
        }}
      >
        <div className="px-3 sm:px-4 flex items-center gap-2" style={{ height: '56px' }}>
          
          {/* Logo sesuai dengan Navbar utama */}
          <Link href="/dashboard-all-things" className="flex items-center gap-1 flex-shrink-0 -ml-1">
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
            <Wordmark isLight={!isDark} className="hidden md:block h-4 w-auto flex-shrink-0" />
          </Link>

          {/* Navigasi Kiri (Diubah jadi flex di mobile, tapi teksnya disembunyiin) */}
          <nav className="flex items-center gap-1 md:gap-0.5 ml-2 md:ml-1 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              
              // Style Active/Inactive persis sama kayak Navbar
              const activeClasses = !isDark
                ? 'text-navy-900 font-semibold'
                : 'bg-white/15 text-white font-semibold';
              const activeStyle = (!isDark && active)
                ? { background: 'rgba(15,23,42,0.10)', boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.08)' }
                : undefined;
              const inactiveClasses = !isDark 
                ? 'text-navy-500 hover:text-navy-900 hover:bg-navy-800/10' 
                : 'text-slate-300 hover:bg-white/10 hover:text-white';

              return (
                <Link
                  key={label}
                  href={href}
                  title={label}
                  className={cn(
                    'flex items-center gap-1.5 p-2.5 md:px-3 md:py-2 rounded-xl text-sm transition-all font-medium',
                    active ? activeClasses : inactiveClasses
                  )}
                  style={activeStyle}
                >
                  <Icon className="w-4 h-4 md:w-3.5 md:h-3.5 flex-shrink-0" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Spacer biar item di kanan kedorong ke ujung */}
          <div className="flex-1" />

          {/* Bagian Kanan */}
          <div className="flex items-center gap-0.5 ml-auto">
            <button
              type="button"
              onClick={toggle}
              className={cn(
                'p-2 rounded-xl transition-colors flex-shrink-0',
                !isDark 
                  ? 'text-navy-500 hover:text-navy-900 hover:bg-navy-800/10' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
              aria-label="Toggle theme"
            >
              {!isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-gold/70" />}
            </button>

            <div className="ml-1.5 flex items-center gap-2 rounded-full px-2 py-1 border border-gold/35 bg-gold/10">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
              <span className={cn('text-xs font-semibold max-w-[60px] md:max-w-none truncate', isDark ? 'text-slate-100' : 'text-slate-800')}>{firstName}</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}