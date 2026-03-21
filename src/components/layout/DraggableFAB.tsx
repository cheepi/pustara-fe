'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, MessageSquare, Settings, BookMarked, Palette, Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

const FAB_SIZE    = 52;
const ITEM_GAP    = 58;
const STORAGE_KEY = 'pustara_fab_pos';

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export default function DraggableFAB() {
  const { theme, toggle } = useTheme();  // ← pakai toggle, bukan setTheme
  const isLight = theme === 'light';
  const router  = useRouter();

  const [open,  setOpen]  = useState(false);
  const [pos,   setPos]   = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  const drag = useRef({ active: false, moved: false, startMX: 0, startMY: 0, startPX: 0, startPY: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  // Defined inside component — needs access to toggle & isLight
  const FAB_ITEMS = [
    {
      icon: BookMarked, label: 'Rak Buku', color: 'bg-amber-500 text-white',
      action: () => { setOpen(false); router.push('/shelf'); },
    },
    {
      icon: Users, label: 'Komunitas', color: 'bg-emerald-500 text-white',
      action: () => { setOpen(false); router.push('/community'); },
    },
    {
      icon: MessageSquare, label: 'PustarAI', color: 'bg-blue-500 text-white',
      action: () => { setOpen(false); router.push('/recommendations/chat'); },
    },
    {
      icon: isLight ? Moon : Sun,
      label: isLight ? 'Mode Gelap' : 'Mode Terang',
      color: 'bg-violet-500 text-white',
      action: () => { toggle(); setOpen(false); },  // ← toggle() dari ThemeProvider
    },
    {
      icon: Settings, label: 'Pengaturan', color: 'bg-slate-500 text-white',
      action: () => { setOpen(false); router.push('/settings'); },
    },
  ];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let p = { x: 16, y: window.innerHeight - FAB_SIZE - 96 };
    if (stored) { try { p = JSON.parse(stored); } catch {} }
    setPos(p);
    posRef.current = p;
    setReady(true);
  }, []);

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
        const snapped = { x: snapX, y: posRef.current.y };
        setPos(snapped);
        posRef.current = snapped;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped));
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
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

  const fanUp      = pos.y > FAB_ITEMS.length * ITEM_GAP + 60;
  const labelRight = pos.x < window.innerWidth / 2;  // FAB di kiri → label ke kanan

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} />
        )}
      </AnimatePresence>

      <div
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y, width: FAB_SIZE, height: FAB_SIZE, touchAction: 'none' }}
        onPointerDown={onFabPointerDown}>

        {/* Speed dial items */}
        <AnimatePresence>
          {open && FAB_ITEMS.map((item, i) => {
            const yOff = (i + 1) * ITEM_GAP * (fanUp ? -1 : 1);
            return (
              <motion.div
                key={item.label}
                className="absolute top-0 flex items-center pointer-events-auto"
                style={{
                  // FAB kiri → anchor left, tumbuh ke kanan (icon | label)
                  // FAB kanan → anchor right, tumbuh ke kiri (label | icon)
                  ...(labelRight ? { left: 0 } : { right: 0 }),
                  flexDirection: labelRight ? 'row' : 'row-reverse',
                  y: yOff,
                }}
                initial={{ opacity: 0, scale: 0.6, y: yOff + (fanUp ? 12 : -12) }}
                animate={{ opacity: 1, scale: 1, y: yOff }}
                exit={{   opacity: 0, scale: 0.6, y: yOff + (fanUp ? 12 : -12) }}
                transition={{ type: 'spring', stiffness: 440, damping: 28, delay: i * 0.04 }}
                onPointerDown={e => e.stopPropagation()}>

                {/* Icon button */}
                <motion.button
                  className={cn('w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl flex-shrink-0', item.color)}
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                  onClick={item.action}>
                  <item.icon className="w-5 h-5" />
                </motion.button>

                {/* Label pill */}
                <motion.span
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg',
                    labelRight ? 'ml-2.5' : 'mr-2.5',
                    isLight
                      ? 'glass-dark text-white border border-slate-200'
                      : 'glass-light  text-navy-800  border border-white/10'
                  )}
                  initial={{ opacity: 0, x: labelRight ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 + 0.05 }}>
                  {item.label}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Glass background layer — terpisah dari motion.button biar backdrop-filter jalan */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className={cn(
            'absolute inset-0 rounded-full',
            isLight
              ? 'bg-navy-800/80 backdrop-blur-xl border border-navy-700/50'
              : 'bg-white/10    backdrop-blur-xl border border-white/15'
          )} />
        </div>

        {/* Main FAB button */}
        <motion.button
          className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer text-white"
          onClick={onFabClick}
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}>
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x"    initial={{ opacity:0, rotate:-45 }} animate={{ opacity:1, rotate:0 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}><X    className="w-5 h-5" /></motion.div>
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
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
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