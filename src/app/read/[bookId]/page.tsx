'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize,
  ArrowLeft, BookOpen, Clock, Menu, X, RotateCcw, Minus, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ── Dummy book data ───────────────────────────────────────────────────────────
const DUMMY_BOOKS: Record<string, { title: string; author: string; dueDate: string; daysLeft: number; pdfUrl: string }> = {
  'd1': { title: 'Laskar Pelangi',   author: 'Andrea Hirata',         dueDate: '18 Mar 2026', daysLeft: 0, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
  'd2': { title: 'Bumi Manusia',     author: 'Pramoedya Ananta Toer', dueDate: '21 Mar 2026', daysLeft: 3, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
  'd3': { title: 'Cantik Itu Luka',  author: 'Eka Kurniawan',         dueDate: '22 Mar 2026', daysLeft: 4, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
  'd4': { title: 'Perahu Kertas',    author: 'Dee Lestari',           dueDate: '22 Mar 2026', daysLeft: 4, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
  'd5': { title: 'Negeri 5 Menara',  author: 'Ahmad Fuadi',           dueDate: '23 Mar 2026', daysLeft: 5, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
  'd6': { title: 'Ayah',             author: 'Andrea Hirata',         dueDate: '24 Mar 2026', daysLeft: 6, pdfUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf' },
};

// ── Reader Page ───────────────────────────────────────────────────────────────
export default function ReadPage() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useAuthStore();

  const bookKey = params?.bookId as string ?? 'd1';
  const book    = DUMMY_BOOKS[bookKey] ?? DUMMY_BOOKS['d1'];
  const userName = user?.displayName || user?.email || 'Pustara User';

  // PDF state
  const [numPages,    setNumPages]    = useState<number>(0);
  const [pageNumber,  setPageNumber]  = useState<number>(1);
  const [scale,       setScale]       = useState<number>(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI,      setShowUI]      = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [inputPage,   setInputPage]   = useState('1');
  const [readingTime, setReadingTime] = useState(0); // seconds

  const containerRef   = useRef<HTMLDivElement>(null);
  const hideUITimer    = useRef<ReturnType<typeof setTimeout>>();
  const pageInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = `Pustara | ${book.title}`;
  }, [book.title]);

  // Reading timer
  useEffect(() => {
    const t = setInterval(() => setReadingTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-hide UI after 3s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideUITimer.current);
    hideUITimer.current = setTimeout(() => {
      if (isFullscreen) setShowUI(false);
    }, 3000);
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) resetHideTimer();
    else { setShowUI(true); clearTimeout(hideUITimer.current); }
    return () => clearTimeout(hideUITimer.current);
  }, [isFullscreen, resetHideTimer]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevPage();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === 'Escape') { setShowSidebar(false); if (isFullscreen) exitFullscreen(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNumber, numPages, isFullscreen]);

  // Fullscreen API
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  }
  function exitFullscreen() {
    document.exitFullscreen?.();
    setIsFullscreen(false);
  }
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  function nextPage() { setPageNumber(p => Math.min(p + 1, numPages)); }
  function prevPage() { setPageNumber(p => Math.max(p - 1, 1)); }
  function zoomIn()   { setScale(s => Math.min(s + 0.2, 3.0)); }
  function zoomOut()  { setScale(s => Math.max(s - 0.2, 0.5)); }
  function resetZoom(){ setScale(1.2); }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function handlePageInput(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const n = parseInt(inputPage);
      if (n >= 1 && n <= numPages) setPageNumber(n);
      else setInputPage(String(pageNumber));
    }
  }

  useEffect(() => { setInputPage(String(pageNumber)); }, [pageNumber]);

  const progress   = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const timeStr    = `${Math.floor(readingTime / 60)}m ${readingTime % 60}s`;
  const isUrgent   = book.daysLeft <= 1;

  return (
    <div ref={containerRef}
      className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden select-none"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}>

      {/* ── TOP BAR ── */}
      <AnimatePresence>
        {showUI && (
          <motion.header
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[#111]/90 backdrop-blur-md border-b border-white/8 z-30"
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }} transition={{ duration: 0.2 }}>

            {/* Back */}
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <div className="w-px h-4 bg-white/15 flex-shrink-0" />

            {/* Book info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{book.title}</p>
              <p className="text-xs text-white/40 truncate">{book.author}</p>
            </div>

            {/* Deadline badge */}
            <div className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
              isUrgent
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-white/5 text-white/50 border border-white/10'
            )}>
              <Clock className="w-3 h-3" />
              {isUrgent ? 'Hari ini!' : `${book.daysLeft} hari lagi`} · {book.dueDate}
            </div>

            {/* Reading time */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 flex-shrink-0">
              <BookOpen className="w-3 h-3" />
              {timeStr}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setShowSidebar(s => !s)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Menu className="w-4 h-4" />
              </button>
              <button onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto flex flex-col items-center py-6 px-4 relative"
          style={{ background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #1a1a1a 100%)' }}>

          {/* Loading skeleton */}
          {loading && (
            <div className="w-full max-w-2xl aspect-[3/4] rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/10" />
            </div>
          )}

          {/* PDF Document */}
          <Document
            file={book.pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setLoading(false)}
            loading=""
            className="flex flex-col items-center">
            <div className="relative shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="block"
              />
              {/* Watermark */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{ transform: 'rotate(-30deg)' }}>
                <p className="text-white/[0.04] font-bold text-2xl tracking-widest whitespace-nowrap select-none">
                  {userName.toUpperCase()} · PUSTARA
                </p>
              </div>
            </div>
          </Document>

          {/* Click zones for prev/next */}
          <button onClick={prevPage} disabled={pageNumber <= 1}
            className="fixed left-0 top-1/2 -translate-y-1/2 h-1/2 w-16 opacity-0 hover:opacity-100 transition-opacity
                       flex items-center justify-start pl-2 disabled:pointer-events-none z-10">
            <div className="p-2 rounded-xl bg-black/40 backdrop-blur-sm">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </button>
          <button onClick={nextPage} disabled={pageNumber >= numPages}
            className="fixed right-0 top-1/2 -translate-y-1/2 h-1/2 w-16 opacity-0 hover:opacity-100 transition-opacity
                       flex items-center justify-end pr-2 disabled:pointer-events-none z-10">
            <div className="p-2 rounded-xl bg-black/40 backdrop-blur-sm">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>

        {/* ── SIDEBAR: page thumbnails / info ── */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              className="w-64 bg-[#111]/95 backdrop-blur-md border-l border-white/8 flex flex-col overflow-hidden flex-shrink-0 z-20"
              initial={{ x: 64, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              exit={{ x: 64, opacity: 0 }} transition={{ duration: 0.2 }}>

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <p className="text-sm font-semibold">Informasi Buku</p>
                <button onClick={() => setShowSidebar(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Book info */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/8">
                  <p className="font-semibold text-sm mb-0.5">{book.title}</p>
                  <p className="text-xs text-white/50">{book.author}</p>
                </div>

                {/* Reading progress */}
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-2">Progress</p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Hal. {pageNumber} / {numPages || '—'}</span>
                    <span className="text-xs font-bold text-gold">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gold rounded-full"
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

                {/* Session stats */}
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-2">Sesi Ini</p>
                  <div className="flex flex-col gap-2">
                    {[
                      ['Waktu Baca', timeStr],
                      ['Halaman Dibaca', String(pageNumber)],
                      ['Deadline', book.dueDate],
                      ['Sisa Waktu', isUrgent ? 'Hari ini!' : `${book.daysLeft} hari`],
                    ].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{label}</span>
                        <span className={cn('text-xs font-semibold', label === 'Sisa Waktu' && isUrgent ? 'text-red-400' : 'text-white/80')}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyboard shortcuts */}
                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-2">Pintasan Keyboard</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      ['← →', 'Ganti halaman'],
                      ['+ -', 'Zoom'],
                      ['F', 'Fullscreen'],
                      ['Esc', 'Keluar fullscreen'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40">{desc}</span>
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM BAR ── */}
      <AnimatePresence>
        {showUI && (
          <motion.footer
            className="flex-shrink-0 bg-[#111]/90 backdrop-blur-md border-t border-white/8 px-4 py-2.5 z-30"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.2 }}>

            {/* Progress bar */}
            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-2.5">
              <motion.div className="h-full bg-gold rounded-full"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>

            <div className="flex items-center gap-3">
              {/* Prev */}
              <button onClick={prevPage} disabled={pageNumber <= 1}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page input */}
              <div className="flex items-center gap-1.5 text-sm">
                <input
                  ref={pageInputRef}
                  type="number" min={1} max={numPages}
                  value={inputPage}
                  onChange={e => setInputPage(e.target.value)}
                  onKeyDown={handlePageInput}
                  onBlur={() => setInputPage(String(pageNumber))}
                  className="w-12 text-center bg-white/10 border border-white/15 rounded-lg py-1 text-xs text-white outline-none focus:border-gold/60 transition-colors"
                />
                <span className="text-white/40 text-xs">/ {numPages || '—'}</span>
              </div>

              {/* Next */}
              <button onClick={nextPage} disabled={pageNumber >= numPages}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-white/15" />

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button onClick={resetZoom}
                  className="px-2 py-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono transition-colors min-w-[3.5rem] text-center">
                  {Math.round(scale * 100)}%
                </button>
                <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-4 bg-white/15" />

              {/* Fullscreen */}
              <button onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <div className="flex-1" />

              {/* Progress text */}
              <span className="text-xs text-white/30 hidden sm:block">{progress}% selesai</span>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}