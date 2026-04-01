'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Trash2, BookOpen, X, Clock,
  LibraryBig, PenLine, Search, ArrowRight, CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useChatAI } from '@/hooks/useChatAI';
import { useUserStore } from '@/store/userStore';
import { useBookCover } from '@/hooks/useBookCover';
import type { AiRecommendation } from '@/types/ai';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  { label: 'Seperti Laskar Pelangi', query: 'Rekomendasiin buku seperti Laskar Pelangi' },
  { label: 'Karya Pramoedya', query: 'Buku karya Pramoedya Ananta Toer' },
  { label: 'Thriller seru', query: 'Buku genre thriller yang seru' },
  { label: 'Bacaan healing', query: 'Buku healing yang santai' },
  { label: 'Inspiratif & pendidikan', query: 'Buku inspiratif tentang pendidikan' },
];

const CAPABILITY_HINTS = [
  { Icon: LibraryBig, text: 'Rekomendasi personal berdasarkan selera kamu' },
  { Icon: PenLine, text: 'Ringkasan & ulasan buku apa saja' },
  { Icon: Search, text: 'Cari buku dari genre atau tema tertentu' },
];

// Spine accent colors for decorative shelf
const SPINE_PALETTE = [
  'hsl(38,75%,52%)',
  'hsl(210,38%,28%)',
  'hsl(355,58%,48%)',
  'hsl(152,32%,38%)',
  'hsl(268,28%,42%)',
  'hsl(28,62%,44%)',
  'hsl(190,45%,35%)',
];

const hue = (title: string) => (title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % 360;

function formatTime(date: Date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

const EMAIL_PATTERN = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
function linkifyEmailsToMarkdown(text: string): string {
  const subject = encodeURIComponent('Request Buku Baru Pustara');
  const body = encodeURIComponent('Halo Pustakrew!\n\nAku mau request buku baru dong buat di Pustara:\n\nJudul: \nPenulis: \n\nTengkyu!');
  return String(text || '').replace(EMAIL_PATTERN, (email) => {
    const trimmed = String(email || '').trim();
    return trimmed ? `[@Pustakrew](mailto:${trimmed}?subject=${subject}&body=${body})` : email;
  });
}

// ── Typing effect hook ────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18, enabled = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); setDone(true); return; }
    setDisplayed(''); 
    setDone(false);
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { 
        clearInterval(interval); 
        setDone(true); 
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayed, done };
}

// ── Decorative shelf (empty state left panel) ─────────────────────────────────
function BookShelf({ isLight }: { isLight: boolean }) {
  const heights1 = [72, 88, 60, 96, 68, 80, 76];
  const heights2 = [80, 64, 92, 70, 84, 60, 88];

  return (
    <div className="flex flex-col gap-3 w-full" aria-hidden>
      {[SPINE_PALETTE, [...SPINE_PALETTE].reverse()].map((row, ri) => (
        <div key={ri} className="flex items-end gap-1.5 justify-center">
          {row.map((color, ci) => (
            <motion.div
              key={ci}
              className="rounded-t-sm flex-shrink-0"
              style={{
                width: 20,
                height: (ri === 0 ? heights1 : heights2)[ci],
                background: color,
                opacity: isLight ? 0.25 : 0.18,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: isLight ? 0.25 : 0.18, y: 0 }}
              transition={{ duration: 0.5, delay: ci * 0.04 + ri * 0.15, ease: 'easeOut' }}
            />
          ))}
        </div>
      ))}
      <div
        className="h-2 rounded-full w-full"
        style={{ background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)' }}
      />
    </div>
  );
}

function MiniRecoCard({ reco, isLight }: { reco: AiRecommendation; isLight: boolean }) {
  const { url: coverSrc } = useBookCover({
    id: reco.book_id, 
    title: reco.title,
    author: reco.authors, 
    cover_url: reco.cover_url ?? null,
  });
  const bg = `hsl(${hue(reco.title)}, 35%, ${isLight ? '75%' : '25%'})`;

  return (
    <Link href={`/book/${reco.book_id}`}>
      <motion.div
        className={cn(
          'flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all',
          isLight
            ? 'bg-white border-parchment-darker hover:border-gold/40 hover:shadow-sm'
            : 'bg-navy-800/50 border-white/8 hover:border-gold/30',
        )}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: bg }}>
          {coverSrc
            ? <img src={coverSrc} alt={reco.title} className="w-full h-full object-cover" />
            : <BookOpen className="w-4 h-4 text-white/50" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{reco.title}</p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>{reco.authors}</p>
          <p className="text-[10px] line-clamp-1 mt-1 italic" style={{ color: 'var(--muted)' }}>✦ {reco.reason_primary}</p>
        </div>
        <span className="text-[10px] font-bold text-gold flex-shrink-0">★ {reco.avg_rating.toFixed(1)}</span>
      </motion.div>
    </Link>
  );
}

function AIMessage({
  content, 
  recommendations, 
  isLatest, isLight, 
  timestamp,
}: {
  content: string; 
  recommendations?: AiRecommendation[];
  isLatest: boolean; 
  isLight: boolean; 
  timestamp?: Date;
}) {
  const processedContent = linkifyEmailsToMarkdown(content);
  const { displayed, done } = useTypewriter(processedContent, 2, isLatest);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
        </div>
        <div className="flex-1 pt-0.5 overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-gold/80 tracking-wide">PustarAI</span>
            {timestamp && done && (
              <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--muted)' }}>
                <Clock className="w-2.5 h-2.5" />{formatTime(timestamp)}
              </span>
            )}
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words" style={{ color: 'var(--text)' }}>
            <ReactMarkdown components={{
              a: ({ node, ...props }) => (
                <a {...props} className="text-gold font-semibold hover:underline break-words" target="_blank" rel="noopener noreferrer" />
              ),
              p: ({ node, children }) => <p className="mb-2 last:mb-0 inline">{children}</p>,
            }}>
              {displayed}
            </ReactMarkdown>
            {!done && <span className="inline-block w-0.5 h-4 bg-gold ml-1 align-middle animate-pulse" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {done && recommendations && recommendations.length > 0 && (
          <motion.div
            className="flex flex-col gap-2 pl-9"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {recommendations.slice(0, 4).map((reco) => (
              <MiniRecoCard key={reco.book_id} reco={reco} isLight={isLight} />
            ))}
            {recommendations.length > 4 && (
              <div className="text-[10px] text-gold/80 pl-1 mt-1 font-medium">
                + {recommendations.length - 4} buku lainnya ditemukan.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Empty State — split layout ────────────────────────────────────────────────
function EmptyState({
  isLight, input, onInput, onSend, onSuggestion, chatLoading, inputRef,
}: {
  isLight: boolean;
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  onSuggestion: (q: string) => void;
  chatLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  return (
    <motion.div
      className="flex flex-col lg:flex-row gap-8 lg:gap-14 items-start justify-center py-10 lg:py-16"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.div
        className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-5"
        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        {/* Identity */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-base font-serif font-black leading-none" style={{ color: 'var(--text)' }}>PustarAI</p>
              <p className="text-[10px] font-semibold text-gold/60 tracking-widest uppercase mt-0.5">Beta</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            Asisten baca personalmu — cerita selera, aku cariin bukunya.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {CAPABILITY_HINTS.map(({ Icon, text }, i) => (
            <motion.div
              key={text}
              className={cn(
                'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border',
                isLight ? 'bg-white/80 border-parchment-darker' : 'bg-navy-800/40 border-white/8',
              )}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
            >
              <Icon className="w-3.5 h-3.5 text-gold/70 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] leading-snug font-medium" style={{ color: 'var(--muted)' }}>{text}</span>
            </motion.div>
          ))}
        </div>

        <div className="hidden lg:block mt-2">
          <BookShelf isLight={isLight} />
        </div>
      </motion.div>

      <motion.div
        className="w-full lg:flex-1 flex flex-col gap-5"
        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
      >
        {/* Greeting */}
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl font-black leading-tight mb-1.5" style={{ color: 'var(--text)' }}>
            Mau baca apa hari ini?
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Tanya apa saja — rekomendasi, ringkasan, atau sekadar ngobrol soal buku.
          </p>
        </div>

        <div className={cn(
          'flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all',
          chatLoading
            ? isLight ? 'bg-slate-50 border-parchment-darker opacity-60' : 'bg-navy-800/60 border-white/8 opacity-60'
            : isLight ? 'bg-white border-parchment-darker focus-within:border-gold/50 focus-within:shadow-sm'
                      : 'bg-navy-800/80 border-white/10 focus-within:border-gold/40',
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tanya tentang buku apapun..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
            style={{ color: 'var(--text)' }}
            disabled={chatLoading}
            autoFocus
          />
          <motion.button
            onClick={onSend}
            disabled={!input.trim() || chatLoading}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !chatLoading
                ? 'bg-gold text-navy-900 hover:bg-gold/90'
                : 'opacity-25 cursor-not-allowed',
            )}
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>

        <AnimatePresence>
          {input.trim() && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-[11px] flex items-center gap-1 -mt-2.5 pl-1"
              style={{ color: 'var(--muted)', opacity: 0.55 }}
            >
              <CornerDownLeft className="w-3 h-3" /> tekan Enter untuk kirim
            </motion.p>
          )}
        </AnimatePresence>

        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 pl-0.5" style={{ color: 'var(--muted)', opacity: 0.5 }}>
            Atau mulai dari sini
          </p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map(({ label, query }, i) => (
              <motion.button
                key={label}
                onClick={() => onSuggestion(query)}
                className={cn(
                  'group flex items-center justify-between w-full text-left',
                  'px-3.5 py-2.5 rounded-xl border text-sm transition-all',
                  isLight
                    ? 'bg-white/60 border-parchment-darker text-slate-600 hover:border-gold/50 hover:bg-white hover:text-gold'
                    : 'bg-navy-800/30 border-white/8 text-white/55 hover:border-gold/35 hover:bg-navy-800/60 hover:text-gold/90',
                )}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-medium text-[13px]">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ChatAIContent() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { ready } = useProtectedRoute();
  const { chatHistory, chatLoading, sendMessage, clearChat } = useChatAI();
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [attachedBook, setAttachedBook] = useState<{ title: string; description: string } | null>(null);
  const { gender, age } = useUserStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bootstrappedRef = useRef(false);
  const [timestamps] = useState<Map<number, Date>>(() => new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    chatHistory.forEach((msg, i) => {
      if (msg.role === 'assistant' && !timestamps.has(i)) timestamps.set(i, new Date());
    });
  }, [chatHistory, timestamps]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    const attachedTitle = searchParams.get('attachedTitle')?.trim() || '';
    const attachedDesc = searchParams.get('attachedDesc')?.trim() || '';
    const prefill = searchParams.get('prefill')?.trim() || '';
    const autoSend = searchParams.get('autosend') === '1';

    if (attachedTitle) setAttachedBook({ title: attachedTitle, description: attachedDesc });
    if (prefill) setInput(prefill);
    if (attachedTitle && prefill && autoSend && !chatLoading) {
      sendMessage(prefill, { gender, age, attachedBook: { title: attachedTitle, description: attachedDesc } });
      setInput(''); setAttachedBook(null);
    }
    bootstrappedRef.current = true;
  }, [searchParams, chatLoading, sendMessage, gender, age]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const sent = attachedBook;
    setInput(''); 
    setAttachedBook(null);
    sendMessage(text, { gender, age, attachedBook: sent });
  }, [input, chatLoading, gender, age, attachedBook, sendMessage]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleSuggestion(query: string) {
    setInput(query);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (!ready) return <PageSkeleton />;
  const isEmpty = chatHistory.length === 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* Header */}
      {!isEmpty && (
        <>
          <div className="max-w-3xl w-full mx-auto px-4 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold/15 border border-gold/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </div>
              <h1 className="font-serif text-lg font-black" style={{ color: 'var(--text)' }}>PustarAI</h1>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-md tracking-wide',
                isLight ? 'bg-gold/10 text-gold/80' : 'bg-gold/15 text-gold/70',
              )}>BETA</span>
            </div>
            <button
              onClick={clearChat}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all',
                isLight
                  ? 'border-parchment-darker text-slate-500 hover:border-red-200 hover:text-red-500'
                  : 'border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400',
              )}
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus chat
            </button>
          </div>
          <div className={cn(
            'max-w-3xl w-full mx-auto px-4',
            isLight ? 'border-b border-parchment-darker/60' : 'border-b border-white/5',
          )} />
        </>
      )}

      {/* Chat area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 pb-4 overflow-y-auto">

        {/* Empty state */}
        {isEmpty && (
          <EmptyState
            isLight={isLight}
            input={input}
            onInput={setInput}
            onSend={handleSend}
            onSuggestion={handleSuggestion}
            chatLoading={chatLoading}
            inputRef={inputRef}
          />
        )}

        {/* Messages */}
        {!isEmpty && (
          <div className="flex flex-col gap-6 py-5">
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {msg.role === 'user' ? (
                    (() => {
                      const hasCtx = Boolean(msg.attachedBook?.title);
                      const isSummary = hasCtx && /ringkasan|summary/i.test(msg.content || '');
                      const display = isSummary ? `Summary untuk "${msg.attachedBook?.title}"` : msg.content;
                      return (
                        <div className="flex justify-end flex-col items-end gap-1">
                          {hasCtx && (
                            <div className="max-w-[86%] sm:max-w-[80%] mb-1 inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-navy-900/90 shadow-sm">
                              <BookOpen className="w-3.5 h-3.5 text-navy-900/70 flex-shrink-0" />
                              <span className="truncate max-w-[220px]">Konteks: {msg.attachedBook?.title}</span>
                            </div>
                          )}
                          <div className="max-w-[86%] sm:max-w-[80%] px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-tr-md text-sm font-medium leading-relaxed bg-gold text-navy-900">
                            <p className="whitespace-pre-wrap break-words">{display}</p>
                          </div>
                          <span className="text-[10px] flex items-center gap-0.5 pr-1" style={{ color: 'var(--muted)' }}>
                            <Clock className="w-2.5 h-2.5" />{formatTime(new Date())}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <AIMessage
                      content={msg.content}
                      recommendations={msg.recommendations}
                      isLatest={i === chatHistory.length - 1}
                      isLight={isLight}
                      timestamp={timestamps.get(i)}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {chatLoading && (
              <motion.div className="flex items-center gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
                </div>
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-2xl rounded-tl-md border',
                  isLight ? 'bg-white border-parchment-darker' : 'bg-navy-800/60 border-white/8',
                )}>
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-pulse" style={{ animationDelay: `${j * 0.18}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!isEmpty && (
        <div className="sticky bottom-0 max-w-3xl w-full mx-auto px-4 pb-6 pt-3" style={{ background: 'var(--bg)' }}>
          <div
            className="absolute top-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, var(--bg))`, transform: 'translateY(-100%)' }}
          />

          <AnimatePresence>
            {attachedBook && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'mb-2 flex items-center justify-between gap-2 w-fit max-w-[80%] rounded-lg border px-3 py-1.5 shadow-sm',
                  isLight ? 'bg-white border-gold/30' : 'bg-navy-800 border-gold/20',
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <BookOpen className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                    Konteks: {attachedBook.title}
                  </span>
                </div>
                <button onClick={() => setAttachedBook(null)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn(
            'flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all',
            chatLoading
              ? isLight ? 'bg-slate-50 border-parchment-darker opacity-75' : 'bg-navy-800/60 border-white/8 opacity-75'
              : isLight ? 'bg-white border-parchment-darker focus-within:border-gold/50 focus-within:shadow-sm'
                        : 'bg-navy-800/80 border-white/10 focus-within:border-gold/40',
          )}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={chatLoading ? 'PustarAI sedang berpikir...' : 'Tanya tentang buku apapun...'}
              className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
              style={{ color: 'var(--text)' }}
              disabled={chatLoading}
            />
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || chatLoading}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                input.trim() && !chatLoading ? 'bg-gold text-navy-900 hover:bg-gold/90' : 'opacity-30 cursor-not-allowed',
              )}
              whileTap={{ scale: 0.9 }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>

          <p className="text-center text-[10px] mt-2" style={{ color: 'var(--muted)', opacity: 0.45 }}>
            Powered by PustarAI · @Beta
          </p>
        </div>
      )}
    </div>
  );
}

export default function ChatAIPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ChatAIContent />
    </Suspense>
  );
}