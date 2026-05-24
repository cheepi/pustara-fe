'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize,
  ArrowLeft, BookOpen, Clock, Menu, X, RotateCcw, Minus, Plus,
  Search, RedoDot,
} from 'lucide-react';
import { Upload, AlertCircle, Loader as LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { fetchReaderBook } from '@/lib/reader';
import { uploadPdfFile } from '@/lib/supabase-admin';
import type { ReaderBook } from '@/types/reader';
import { auth } from '@/lib/firebase';
import { getOrCreateDeviceId } from '@/lib/deviceDetection';
import confetti from 'canvas-confetti';
import { invalidateShelfCache } from '@/lib/shelf';

const Document = dynamic(
  () => import('react-pdf').then((mod) => {
    mod.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    return mod.Document;
  }),
  { ssr: false, loading: () => <div>Loading PDF...</div> }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

export default function ReadPage() {
  const params    = useParams();
  const router    = useRouter();
  const { user, role }  = useAuthStore();

  const bookKey = params?.bookId as string ?? 'd1';
  const [book, setBook] = useState<ReaderBook | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const userName = user?.displayName || user?.email || 'Pustara User';
  const isAdmin = role === 'admin';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const resolveToken = useCallback(async (): Promise<string | null> => {
    const current = auth?.currentUser;
    if (!current) return null;
    return current.getIdToken();
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadReaderContext() {
      try {
        setLoadingBook(true);
        setAccessError(null);

        const nextToken = await resolveToken();
        if (!mounted) return;

        if (!nextToken) {
          setAccessError('Sesi login tidak ditemukan. Silakan login ulang untuk membaca buku.');
          return;
        }

        setToken(nextToken);

        const accessRes = await fetch(`${API_URL}/books/${bookKey}/access`, {
          headers: { Authorization: `Bearer ${nextToken}` },
          cache: 'no-store',
        });

        if (!mounted) return;
        const accessPayload = await accessRes.json().catch(() => ({}));

        if (!accessRes.ok) {
          const payload = accessPayload;
          setAccessError(String(payload?.message || 'Akses baca ditolak untuk buku ini.'));
          return;
        }

        const readerBook = await fetchReaderBook(bookKey);
        if (!mounted) return;
        const resumePage = Number(accessPayload?.current_page ?? accessPayload?.currentPage ?? readerBook.currentPage ?? 1);
        setBook({
          ...readerBook,
          currentPage: Number.isFinite(resumePage) && resumePage > 0 ? resumePage : 1,
          reading_session: accessPayload?.session ?? readerBook.reading_session,
          dueDate: accessPayload?.due_date 
            ? new Date(accessPayload.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : readerBook.dueDate,
          daysLeft: accessPayload?.due_date
            ? Math.max(0, Math.floor((new Date(accessPayload.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : readerBook.daysLeft,
        });
      } catch {
        if (!mounted) return;
        setAccessError('Gagal memuat data reader. Coba lagi sebentar.');
      } finally {
        if (mounted) setLoadingBook(false);
      }
    }

    loadReaderContext();
    return () => {
      mounted = false;
    };
  }, [API_URL, bookKey, resolveToken]);

  const pdfFile = useMemo(() => {
    if (!token || !bookKey) return null;

    const resolvedPdfUrl = book?.pdfUrl || book?.file_url || null;
    const deviceHeader = { 'x-device-id': getOrCreateDeviceId() };
    if (resolvedPdfUrl) {
      return {
        url: resolvedPdfUrl,
        httpHeaders: { Authorization: `Bearer ${token}`, ...deviceHeader }
      };
    }

    return {
      url: `${API_URL}/books/${bookKey}/file`,
      httpHeaders: { Authorization: `Bearer ${token}`, ...deviceHeader }
    };
  }, [API_URL, book?.file_url, book?.pdfUrl, bookKey, token]);

  const [numPages,    setNumPages]    = useState<number>(0);
  const [pageNumber,  setPageNumber]  = useState<number>(1);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [pageWidth, setPageWidth] = useState<number>(340);
  const [scale,       setScale]       = useState<number>(1.4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI,      setShowUI]      = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [inputPage,   setInputPage]   = useState('1');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const readingTimeRef = useRef(0);
  const watermarkLabel = `@${userName || 'Pustara User'} · ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })}`;
  useEffect(() => { readingTimeRef.current = readingTime; }, [readingTime]);

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const containerRef   = useRef<HTMLDivElement>(null);
  const readerViewportRef = useRef<HTMLDivElement>(null);
  const hideUITimer    = useRef<ReturnType<typeof setTimeout>>();
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pageInputRef   = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Ensure mobile uses a smaller default scale for readability
  useEffect(() => {
    if (isMobile) setScale(1.0);
  }, [isMobile]);
  const latestNumPagesRef = useRef<number>(0);
  const latestPageRef = useRef<number>(1);
  const initialProgressSyncRef = useRef(false);
  const lastSavedPageRef = useRef<number>(1);
  const lastSavedReadingTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!book) return;
    document.title = `Pustara | ${book.title}`;
  }, [book]);

  useEffect(() => {
    latestPageRef.current = pageNumber;
  }, [pageNumber]);

  useEffect(() => {
    latestNumPagesRef.current = numPages;
  }, [numPages]);

  const getStoredReaderProgress = useCallback(() => {
    if (typeof window === 'undefined' || !bookKey) return null;

    try {
      const raw = window.localStorage.getItem(`pustara:reader-progress:${bookKey}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return {
        page: Math.max(1, Number(parsed.page) || 1),
        readingTimeSeconds: Math.max(0, Number(parsed.readingTimeSeconds) || 0),
      };
    } catch {
      return null;
    }
  }, [bookKey]);

  const setStoredReaderProgress = useCallback((page: number, readingTimeSeconds: number) => {
    if (typeof window === 'undefined' || !bookKey) return;

    try {
      window.localStorage.setItem(
        `pustara:reader-progress:${bookKey}`,
        JSON.stringify({
          page: Math.max(1, page),
          readingTimeSeconds: Math.max(0, readingTimeSeconds),
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [bookKey]);

  const clearStoredReaderProgress = useCallback(() => {
    if (typeof window === 'undefined' || !bookKey) return;

    try {
      window.localStorage.removeItem(`pustara:reader-progress:${bookKey}`);
    } catch {
      // ignore storage errors
    }
  }, [bookKey]);

  // FIX: Auto-load currentPage dari book data saat pertama kali load
  useEffect(() => {
    if (book && numPages > 0 && pageNumber === 1) {
      const backendPage = Number(book.currentPage || book.reading_session?.current_page || 1);
      const storedProgress = getStoredReaderProgress();
      const resumePage = Math.min(Math.max(storedProgress?.page || backendPage || 1, 1), numPages);

      if (resumePage > 1) {
        setPageNumber(resumePage);
        setInputPage(String(resumePage));
      }

      // if (storedProgress?.readingTimeSeconds && storedProgress.readingTimeSeconds > readingTime) {
      //   setReadingTime(storedProgress.readingTimeSeconds);
      const backendTimeSeconds = (book.reading_session?.reading_time_minutes ?? 0) * 60;
      const restoredTime = storedProgress?.readingTimeSeconds 
        ? Math.max(storedProgress.readingTimeSeconds, backendTimeSeconds)
        : backendTimeSeconds;

      if (restoredTime > readingTime) {
        setReadingTime(restoredTime);
        lastSavedReadingTimeRef.current = restoredTime; // ← penting! biar delta tidak hitung ulang dari 0
      }
    }
  }, [book, numPages, getStoredReaderProgress, readingTime]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const closeMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const t = setInterval(() => setReadingTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setStoredReaderProgress(latestPageRef.current, readingTime);
  }, [readingTime, setStoredReaderProgress]);

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

  // FIX: Auto-save progress dengan debounce 1.5 detik
  const saveProgress = useCallback(async (page: number, immediate = false) => {
    if (!bookKey) return;

    const safePage = Math.max(1, page);
    const elapsedSeconds = Math.max(0, readingTimeRef.current - lastSavedReadingTimeRef.current);
    const readingTimeMinutesDelta = Math.max(0, Math.floor(elapsedSeconds / 60));

    setStoredReaderProgress(safePage, readingTimeRef.current);

    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/reading/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        keepalive: immediate,
        body: JSON.stringify({
          bookId: bookKey,
          currentPage: safePage,
          readingTimeMinutesDelta,
          totalPages: latestNumPagesRef.current || numPages || book?.total_pages || 0, // send total pages from PDF to backend
          status: 'reading',
        }),
      });

      if (!res.ok) {
        console.warn('[Reader] Failed to save progress:', res.status);
        return;
      }

      const body = await res.json().catch(() => null);
      const sessionData = body?.data || body?.session || null;

      // Update local book reading_session so UI reflects saved progress immediately
      if (sessionData && typeof setBook === 'function') {
        setBook(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            reading_session: {
              // id: sessionData.id ? String(sessionData.id) : (sessionData.session_id ? String(sessionData.session_id) : null),
              id: String(sessionData.id ?? sessionData.session_id ?? ''),
              user_id: prev.reading_session?.user_id ?? sessionData.user_id ?? '',
              book_id: String(prev.id || bookKey),
              title: prev.title || sessionData.title || prev.title || 'Untitled',
              authors: prev.authors || sessionData.authors || '',
              cover_url: prev.cover_url || sessionData.cover_url || undefined,
              current_page: Number(sessionData.current_page || sessionData.currentPage || safePage || 1),
              total_pages: Number(sessionData.total_pages || sessionData.totalPages || latestNumPagesRef.current || numPages || 0),
              progress_percentage: Number(sessionData.progress_percentage || sessionData.progressPercentage || 0),
              status: sessionData.status || 'reading',
              last_read_at: sessionData.last_read_at || sessionData.lastReadAt || null,
              started_at: sessionData.started_at || sessionData.startedAt || null,
              finished_at: sessionData.finished_at || sessionData.finishedAt || null,
              reading_time_minutes: Number(sessionData.reading_time_minutes || sessionData.readingTimeMinutes || 0),
            },
          };
        });
      }

      lastSavedPageRef.current = safePage;
      lastSavedReadingTimeRef.current = readingTimeRef.current;
      clearStoredReaderProgress();
      invalidateShelfCache();
    } catch (err) {
      console.warn('[Reader] Progress save error:', err);
    }
  }, [token, bookKey, API_URL, numPages, setStoredReaderProgress, clearStoredReaderProgress]);

  const saveCurrentPageAndGoBack = useCallback(async () => {
    clearTimeout(progressSaveTimer.current);
    await saveProgress(latestPageRef.current, true);
    router.back();
  }, [router, saveProgress]);

  useEffect(() => {
    if (!token || !bookKey || !book || loadingBook || !pdfFile || numPages <= 0) return;
    if (initialProgressSyncRef.current) return;

    initialProgressSyncRef.current = true;
    void saveProgress(pageNumber, true);
  }, [token, bookKey, book, loadingBook, pdfFile, numPages, pageNumber, saveProgress]);

  useEffect(() => {
    if (!token || !bookKey) return;

    const t = setInterval(() => {
      void saveProgress(latestPageRef.current);
    }, 60000);

    return () => clearInterval(t);
  }, [token, bookKey, saveProgress]);

  // Debounce progress save on page change
  useEffect(() => {
    clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(() => {
      saveProgress(pageNumber);
    }, 1500); // 1.5 detik debounce

    return () => clearTimeout(progressSaveTimer.current);
  }, [pageNumber, saveProgress]);

  useEffect(() => {
    const flushProgress = () => {
      if (!token || !bookKey) return;
      const currentPage = latestPageRef.current;
      if (currentPage < 1) return;
      void saveProgress(currentPage, true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress();
      }
    };

    window.addEventListener('pagehide', flushProgress);
    window.addEventListener('beforeunload', flushProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      flushProgress();
      window.removeEventListener('pagehide', flushProgress);
      window.removeEventListener('beforeunload', flushProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, bookKey, saveProgress]);

  // FIX: Cek apakah udah nyampe halaman terakhir untuk trigger confetti + modal
  useEffect(() => {
    if (numPages > 0 && pageNumber === numPages && numPages > 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 500);
    }
  }, [pageNumber, numPages]);

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

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);

    // media query for desktop two-page layout
    const mq = window.matchMedia('(min-width: 769px)');
    const mqHandler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
      // ensure left page is odd when switching to desktop
      if (e.matches && pageNumber % 2 === 0) {
        setPageNumber(p => Math.max(1, p - 1));
      }
    };
    setIsDesktop(mq.matches);
    mq.addEventListener?.('change', mqHandler);

    return () => {
      document.removeEventListener('fullscreenchange', handler);
      mq.removeEventListener?.('change', mqHandler);
    };
  }, []);

  useEffect(() => {
    const el = readerViewportRef.current;
    if (!el) return;

    const computeWidth = () => {
      const rect = el.getBoundingClientRect();
      const gap = isDesktop ? 24 : 0;
      const availableWidth = Math.max(240, rect.width - 32 - gap);
      const availableHeight = Math.max(280, rect.height - 48); 

      if (isDesktop) {
        const byHeight = Math.floor((availableHeight * 3) / 4);
        const byWidth  = Math.floor(availableWidth / 2);
        setPageWidth(Math.max(220, Math.min(byHeight, byWidth)));
      } else {
        setPageWidth(Math.max(220, Math.floor(availableWidth)));
      }
    };

    computeWidth();
    const ro = new ResizeObserver(computeWidth);
    ro.observe(el);
    window.addEventListener('resize', computeWidth);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeWidth);
    };
  }, [isDesktop, showSidebar]);

  useEffect(() => { setInputPage(String(pageNumber)); }, [pageNumber]);

  useEffect(() => {
    let cancelled = false;
    setPdfData(null);
    if (!pdfFile) return;

    const fetchPdf = async () => {
      try {
        const { url, httpHeaders } = pdfFile as { url: string; httpHeaders: Record<string, string> };
        const res = await fetch(url, { headers: httpHeaders });
        if (!res.ok) throw new Error('Fetch failed');
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        setPdfData(new Uint8Array(buffer));
      } catch (err) {
        if (cancelled) return;
        console.error('[Reader] PDF fetch error', err);
        setPdfError('Gagal memuat PDF');
      }
    };

    void fetchPdf();
    return () => { cancelled = true; };
  }, [pdfFile]);

  // Create a memoized `file` prop that copies the bytes so transferring to worker
  // doesn't detach the original ArrayBuffer we keep in state.
  const memoizedFileProp = useMemo(() => {
    if (!pdfData) return undefined;
    // make a fresh copy of the bytes each time so pdfjs can transfer safely
    const copy = new Uint8Array(pdfData.length);
    copy.set(pdfData);
    return { data: copy };
  }, [pdfData]);

  if (loadingBook) {
    return <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white/60">Memuat buku...</div>;
  }

  if (accessError || !book || !token) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#1a1a1a] text-white px-6 text-center">
        <h2 className="text-xl font-bold mb-2">Akses Reader Dibatasi</h2>
        <p className="text-white/60 mb-6 max-w-md">{accessError || 'Buku tidak bisa dibuka saat ini.'}</p>
        <button
          onClick={() => router.push('/browse')}
          className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition"
        >
          Kembali ke Browse
        </button>
      </div>
    );
  }

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

  const step = isDesktop ? 2 : 1;
  function nextPage() { setPageNumber(p => Math.min(p + step, numPages)); }
  function prevPage() { setPageNumber(p => Math.max(p - step, 1)); }
  function zoomIn()   { setScale(s => Math.min(s + 0.2, 3.0)); }
  function zoomOut()  { setScale(s => Math.max(s - 0.2, 0.5)); }
  function resetZoom(){ setScale(1.0); }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setPdfError(null);
  }

  async function handlePdfUpload(file: File) {
    if (!file || file.type !== 'application/pdf') {
      setPdfError('Hanya file PDF yang didukung');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setPdfError('Maksimal ukuran file 50MB');
      return;
    }

    setUploadingPdf(true);
    setPdfError(null);

    try {
      const fileUrlToSend = await uploadPdfFile(file, bookKey);

      const updateRes = await fetch(`${API_URL}/admin/books/${bookKey}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_url: fileUrlToSend }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal menyimpan file PDF ke buku');
      }

      setBook((prev) => prev ? { ...prev, file_url: fileUrlToSend, pdfUrl: undefined } : prev);
      setLoading(true);
      setShowUploadModal(false);
      setPdfError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal upload PDF';
      setPdfError(message);
    } finally {
      setUploadingPdf(false);
    }
  }
  function handlePageInput(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const n = parseInt(inputPage);
      if (n >= 1 && n <= numPages) setPageNumber(n);
      else setInputPage(String(pageNumber));
    }
  }

  const progress   = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const timeStr    = `${Math.floor(readingTime / 60)}m ${readingTime % 60}s`;
  const isUrgent = (book.daysLeft ?? Infinity) <= 1;

  return (
    <div ref={containerRef}
      className="flex flex-col h-[100dvh] bg-[#1a1a1a] text-white overflow-hidden select-none"
      onMouseMove={resetHideTimer}
      onClick={(e) => { resetHideTimer(); closeMenu(); }}
      onContextMenu={handleContextMenu}>

      <AnimatePresence>
        {showUI && (
          <motion.header
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[#111]/90 backdrop-blur-md border-b border-white/8 z-30"
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }} transition={{ duration: 0.2 }}>

            <button onClick={() => void saveCurrentPageAndGoBack()}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <div className="w-px h-4 bg-white/15 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{book.title}</p>
              <p className="text-xs text-white/40 truncate">{book.author}</p>
            </div>

            <div className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
              isUrgent
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-white/5 text-white/50 border border-white/10'
            )}>
              <Clock className="w-3 h-3" />
              {isUrgent ? 'Hari ini!' : `${book.daysLeft} hari lagi`} · {book.dueDate}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 flex-shrink-0">
              <BookOpen className="w-3 h-3" />
              {timeStr}
            </div>

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
              {isAdmin && !numPages && (
                <button onClick={() => setShowUploadModal(true)}
                  className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5 text-sm font-medium flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload PDF</span>
                </button>
              )}
          </motion.header>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative">
          <div ref={readerViewportRef} className="flex-1 overflow-hidden flex items-center justify-center py-6 px-4 relative"
          style={{ background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #1a1a1a 100%)' }}>

          {loading && pdfFile && (
            <div className="w-full max-w-2xl aspect-[3/4] rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/10" />
            </div>
          )}

          {!pdfFile ? (
            <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <BookOpen className="w-14 h-14 text-white/15" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">PDF belum diunggah</h3>
                <p className="text-sm text-white/50">Buku ini ada di katalog, tapi file PDF-nya masih kosong.</p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF Sekarang
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/browse')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  Kembali ke Browse
                </button>
              )}
            </div>
          ) : pdfError ? (
            <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/20 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <AlertCircle className="w-14 h-14 text-red-400/80" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Gagal Memuat PDF</h3>
                <p className="text-sm text-white/50">{pdfError}</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF Baru
                </button>
              )}
            </div>
          ) : (!pdfData) ? (
            <div className="flex flex-col items-center gap-3 text-white/50">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              <p className="text-sm">Memuat buku...</p>
            </div>
          ) : (
            <Document
              file={memoizedFileProp}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('React-PDF Load Error:', error);
                setLoading(false);
                const msg = error?.message || String(error) || '';
                setPdfError(`Gagal membuka file PDF. ${msg ? `(${msg})` : 'Coba refresh halaman atau unggah ulang file.'}`);
              }}
              loading=""
              className="flex flex-col items-center"
            >
              <div className="relative rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] pointer-events-none">
                <div className={cn('grid gap-6', isDesktop ? 'grid-cols-2 justify-center' : 'grid-cols-1')}>
                  {[...Array(isDesktop ? 2 : 1)].map((_, idx) => {
                    const p = pageNumber + idx;
                    if (p > numPages) return null;
                    return (
                      <div
                        key={p}
                        className="relative overflow-hidden bg-white"
                        style={{
                          width: Math.floor(pageWidth * scale),
                          height: Math.floor((pageWidth * 4 * scale) / 3),
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Page
                            pageNumber={p}
                            width={Math.max(220, Math.floor(pageWidth * scale))}
                            renderMode="canvas"
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="block"
                          />
                        </div>

                        {/* Watermark per halaman */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none flex items-center justify-center" aria-hidden>
                          <div
                            className="font-black text-black"
                            style={{
                              fontFamily: "'Outfit', Inter, Arial, sans-serif",
                              fontSize: isMobile ? 24 : 40,
                              letterSpacing: '0.05em',
                              opacity: 0.05,
                              transform: 'rotate(-28deg)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {watermarkLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Document>
          )}

          {/* canvas sizing handled via wrapper classes to avoid styled-jsx */}

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
                <div className="p-3 bg-white/5 rounded-2xl border border-white/8">
                  <p className="font-semibold text-sm mb-0.5">{book.title}</p>
                  <p className="text-xs text-white/50">{book.author}</p>
                </div>

                <div>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-2">Progress</p>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/50">Hal. {pageNumber} / {numPages || '—'}</span>
                    <span className="text-xs font-bold text-indigo-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-indigo-500 rounded-full"
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>

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

      <AnimatePresence>
        {showUI && (
          <motion.footer
            className="flex-shrink-0 bg-[#111]/90 backdrop-blur-md border-t border-white/8 px-4 py-2.5 z-30"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.2 }}>

            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mb-2.5">
              <motion.div className="h-full bg-indigo-500 rounded-full"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={prevPage} disabled={pageNumber <= 1}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-sm">
                <input
                  ref={pageInputRef}
                  type="number" min={1} max={numPages}
                  value={inputPage}
                  onChange={e => setInputPage(e.target.value)}
                  onKeyDown={handlePageInput}
                  onBlur={() => setInputPage(String(pageNumber))}
                  className="w-12 text-center bg-white/10 border border-white/15 rounded-lg py-1 text-xs text-white outline-none focus:border-indigo-500/60 transition-colors"
                />
                <span className="text-white/40 text-xs">/ {numPages || '—'}</span>
              </div>

              <button onClick={nextPage} disabled={pageNumber >= numPages}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-white/15" />

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

              <button onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <div className="flex-1" />

              <span className="text-xs text-white/30 hidden sm:block">{progress}% selesai</span>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }} 
          className="fixed bg-[#282828] border border-[#3E3E3E] text-white p-3 rounded-lg shadow-2xl z-50 flex flex-col gap-2 min-w-[180px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-bold border-b border-[#3E3E3E] pb-2 mb-1 truncate">
            {book.title}
          </div>
          <button 
            onClick={() => void saveCurrentPageAndGoBack()} 
            className="text-left text-sm text-gray-300 hover:text-white hover:bg-[#3E3E3E] px-2 py-1.5 rounded transition"
          >
            Keluar dari Reader
          </button>
        </div>
      )}

      {/* ── COMPLETION MODAL ── */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-md rounded-3xl border border-white/10 bg-[#111]/95 p-6 text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="text-6xl mb-4">🎉</div>

              <h2 className="text-2xl font-bold text-white mb-2">Tamat!</h2>
              <p className="text-white/60 mb-6">
                Selamat! Kamu sudah menyelesaikan membaca buku ini. Apakah ada yang ingin kamu lakukan?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    clearStoredReaderProgress();
                    setBook(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        currentPage: 1,
                        reading_session: prev.reading_session
                          ? { ...prev.reading_session, current_page: 1, progress_percentage: 0 }
                          : prev.reading_session,
                      };
                    });
                    lastSavedPageRef.current = 1;
                    setShowCompletionModal(false);
                    setPageNumber(1);
                    void saveProgress(1, true);
                  }}
                  className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/20 px-4 py-3 font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
                >
                  Baca Ulang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    router.push('/browse');
                  }}
                  className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-600"
                >
                  Telusuri Buku Lain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    void saveCurrentPageAndGoBack();
                  }}
                  className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold text-white/80 transition-all hover:bg-white/10"
                >
                  Kembali
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadModal && isAdmin && (
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative max-w-sm rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-[#111] to-[#0a0a0a] p-6 text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <Upload className="mx-auto mb-4 w-12 h-12 text-indigo-400" />
              <h3 className="mb-2 text-xl font-bold text-white">Upload PDF</h3>
              <p className="mb-6 text-sm text-white/50">Pilih file PDF untuk buku ini, maksimal 50MB.</p>

              {uploadingPdf ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <LoaderIcon className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-sm text-white/70">Mengupload...</p>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="relative rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 p-8 transition hover:border-indigo-500/50">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-indigo-400" />
                      <span className="text-sm font-medium text-white">Klik untuk pilih file PDF</span>
                      <span className="text-xs text-white/40">PDF hingga 50MB</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handlePdfUpload(file);
                        }
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                </label>
              )}

              {pdfError && !uploadingPdf && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/20 p-3">
                  <p className="text-sm text-red-300">{pdfError}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
