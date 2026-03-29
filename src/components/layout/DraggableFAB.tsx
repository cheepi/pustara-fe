'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, Sparkles, Settings, UserRound, Menu, X, Sun, Moon, Compass, Bird, Library, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

const ITEM_GAP_DESKTOP = 58;
const ITEM_GAP_MOBILE = 48;
const STORAGE_KEY = 'pustara_fab_pos';

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export default function DraggableFAB() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const drag = useRef({ active: false, moved: false, startMX: 0, startMY: 0, startPX: 0, startPY: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  const mobileFabItems = [
    {
      icon: Compass, label: 'Eksplor', color: 'bg-indigo-500 text-white',
      action: () => { setOpen(false); router.push('/browse'); },
    },
    {
      icon: Bird, label: 'Feed', color: 'bg-sky-500 text-white',
      action: () => { setOpen(false); router.push('/feed'); },
    },
    {
      icon: Library, label: 'Rak', color: 'bg-violet-500 text-white',
      action: () => { setOpen(false); router.push('/shelf'); },
    },
    {
      icon: Sparkles, label: 'PustarAI', color: 'bg-blue-500 text-white',
      action: () => { setOpen(false); router.push('/pustarai/chat'); },
    },
    {
      icon: Flame, label: 'Populer', color: 'bg-rose-500 text-white',
      action: () => { setOpen(false); router.push('/popular'); },
    },
    {
      icon: Users, label: 'Komunitas', color: 'bg-emerald-500 text-white',
      action: () => { setOpen(false); router.push('/community'); },
    },
    {
      icon: isLight ? Moon : Sun,
      label: isLight ? 'Gelap' : 'Terang',
      color: isLight ? 'bg-yellow-400 text-navy-900' : 'bg-slate-600 text-white',
      action: () => { toggle(); setOpen(false); },
    },
  ];

  const desktopFabItems = [
    {
      icon: isLight ? Moon : Sun,
      label: isLight ? 'Mode Gelap' : 'Mode Terang',
      color: isLight ? 'bg-yellow-400 text-navy-900' : 'bg-slate-600 text-white',
      action: () => { toggle(); setOpen(false); },
    },
    {
      icon: Sparkles, label: 'PustarAI', color: 'bg-blue-500 text-white',
      action: () => { setOpen(false); router.push('/pustarai/chat'); },
    },
    {
      icon: Flame, label: 'Populer', color: 'bg-rose-500 text-white',
      action: () => { setOpen(false); router.push('/popular'); },
    },
    {
      icon: Users, label: 'Komunitas', color: 'bg-emerald-500 text-white',
      action: () => { setOpen(false); router.push('/community'); },
    },
    {
      icon: UserRound, label: 'Profil', color: 'bg-amber-500 text-white',
      action: () => { setOpen(false); router.push('/profile'); },
    },
    {
      icon: Settings, label: 'Pengaturan', color: 'bg-slate-500 text-white',
      action: () => { setOpen(false); router.push('/settings'); },
    },
  ];

  const FAB_ITEMS = isMobile ? mobileFabItems : desktopFabItems;
  const ITEM_GAP = isMobile ? ITEM_GAP_MOBILE : ITEM_GAP_DESKTOP;
  const FAB_SIZE = isMobile? 48 : 52;

  // ── Init position ──────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let p = { x: window.innerWidth - FAB_SIZE - 16, y: window.innerHeight - FAB_SIZE - 96 };
    if (stored) { try { p = JSON.parse(stored); } catch {} }
    setPos(p);
    posRef.current = p;
    setReady(true);
  }, []);

  // ── Viewport flags ─────────────────────────────────────────────────────────
  useEffect(() => {
    function update() { setIsMobile(window.innerWidth < 768); }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startMX;
      const dy = e.clientY - drag.current.startMY;
      if (!drag.current.moved && Math.hypot(dx, dy) > 5) {
        drag.current.moved = true;
        setOpen(false);
      }
      if (!drag.current.moved) return;
      const nx = clamp(drag.current.startPX + dx, 8, window.innerWidth  - FAB_SIZE - 8);
      const ny = clamp(drag.current.startPY + dy, 8, window.innerHeight - FAB_SIZE - 8);
      const p = { x: nx, y: ny };
      setPos(p);
      posRef.current = p;
    }

    function onUp() {
      if (!drag.current.active) return;
      drag.current.active = false;
      if (drag.current.moved) {
        const snapX = posRef.current.x + FAB_SIZE / 2 < window.innerWidth / 2
          ? 16 : window.innerWidth - FAB_SIZE - 16;
        const snapped = { x: snapX, y: clamp(posRef.current.y, 8, window.innerHeight - FAB_SIZE - 8) };
        setPos(snapped);
        posRef.current = snapped;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped));
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  function onFabPointerDown(e: React.PointerEvent) {
    if (e.button > 0) return;
    e.stopPropagation();
    drag.current = {
      active: true, moved: false,
      startMX: e.clientX, startMY: e.clientY,
      startPX: posRef.current.x, startPY: posRef.current.y,
    };
  }

  function onFabClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!drag.current.moved) setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  if (!ready) return null;

  const totalHeight = FAB_ITEMS.length * ITEM_GAP + 60;
  const fanUp = pos.y > totalHeight;
  const labelRight = pos.x + FAB_SIZE / 2 < window.innerWidth / 2;

  const iconSize = isMobile ? 'w-[40px] h-[40px]' : 'w-[52px] h-[52px]';
  const iconClass = isMobile ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const labelCls = isMobile ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5';

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y, width: FAB_SIZE, height: FAB_SIZE, touchAction: 'none' }}
        onPointerDown={onFabPointerDown}
      >
        {/* Speed dial items */}
        <AnimatePresence>
          {open && FAB_ITEMS.map((item, i) => {
            const yOff = (i + 1) * ITEM_GAP * (fanUp ? -1 : 1);
            return (
              <motion.div
                key={item.label}
                className="absolute top-0 flex items-center pointer-events-auto"
                style={{
                  ...(labelRight ? { left: 0 } : { right: 0 }),
                  flexDirection: labelRight ? 'row' : 'row-reverse',
                  y: yOff,
                }}
                initial={{ opacity: 0, scale: 0.6, y: yOff + (fanUp ? 12 : -12) }}
                animate={{ opacity: 1, scale: 1, y: yOff }}
                exit={{ opacity: 0, scale: 0.6, y: yOff + (fanUp ? 12 : -12) }}
                transition={{ type: 'spring', stiffness: 440, damping: 28, delay: i * 0.04 }}
                onPointerDown={e => e.stopPropagation()}
              >
                {/* Icon button */}
                <motion.button
                  className={cn('rounded-full flex items-center justify-center shadow-xl flex-shrink-0', iconSize, item.color)}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={item.action}
                >
                  <item.icon className={iconClass} />
                </motion.button>

                {/* Label pill */}
                <motion.span
                  className={cn(
                    'rounded-full font-semibold whitespace-nowrap shadow-lg',
                    labelCls,
                    labelRight ? 'ml-2' : 'mr-2',
                    isLight
                      ? 'glass-dark text-white border border-slate-200'
                      : 'glass-light text-navy-800 border border-white/10'
                  )}
                  initial={{ opacity: 0, x: labelRight ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 + 0.05 }}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Glass background */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className={cn(
            'absolute inset-0 rounded-full',
            isLight
              ? 'bg-navy-800/80 backdrop-blur-xl border border-navy-700/50'
              : 'bg-white/10 backdrop-blur-xl border border-white/15'
          )} />
        </div>

        {/* Main FAB button */}
        <motion.button
          className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer text-white"
          onClick={onFabClick}
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x" initial={{ opacity:0, rotate:-45 }} animate={{ opacity:1, rotate:0 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}><X    className="w-5 h-5" /></motion.div>
              : <motion.div key="menu" initial={{ opacity:0, rotate: 45 }} animate={{ opacity:1, rotate:0 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}><Menu className="w-5 h-5" /></motion.div>
            }
          </AnimatePresence>
        </motion.button>

        {/* Pulse ring */}
        {!open && (
          <motion.div
            className={cn('absolute inset-0 rounded-full pointer-events-none',
              isLight ? 'border-2 border-navy-800/25' : 'border-2 border-gold/30')}
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <DragHint isLight={isLight} />
      </div>
    </>
  );
}

function DragHint({ isLight }: { isLight: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('pustara_fab_hint')) return;
    const t = setTimeout(() => {
      setShow(true);
      setTimeout(() => { setShow(false); localStorage.setItem('pustara_fab_hint', '1'); }, 2500);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            'absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none',
            isLight ? 'glass-light text-navy-900' : 'glass-dark text-white'
          )}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
        >
          Seret untuk memindahkan
          <div className={cn(
            'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-4',
            isLight ? 'border-t-navy-800' : 'border-t-white'
          )} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}