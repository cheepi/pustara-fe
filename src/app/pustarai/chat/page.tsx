'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Trash2, BookOpen, X } from 'lucide-react';
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
  'Rekomendasiin buku seperti Laskar Pelangi',
  'Buku karya Pramoedya Ananta Toer',
  'Buku genre thriller yang seru',
  'Buku healing yang santai',
  'Buku inspiratif tentang pendidikan',
];

const hue = (title: string) => (title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % 360;

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

// ── Mini book card ─────────────────────────────────────────────────────────────
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
          isLight ? 'bg-white border-parchment-darker hover:border-gold/40' : 'bg-navy-800/50 border-white/8 hover:border-gold/30',
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
  isLatest,
  isLight,
}: {
  content: string;
  recommendations?: AiRecommendation[];
  isLatest: boolean;
  isLight: boolean;
}) {
  const mailtoLink = '[@Pustakrew](mailto:syifaalfyy@gmail.com?subject=Request%20Buku%20Baru%20Pustara&body=Halo%20Pustakrew!%0A%0AAku%20mau%20request%20buku%20baru%20dong%20buat%20di%20Pustara:%0A%0AJudul%3A%20%0APenulis%3A%20%0A%0ATengkyu!)';
  const processedContent = content.replace(/syifaalfyy@gmail\.com/g, mailtoLink);

  // Hanya pesan terbaru yang dapat typing effect
  const { displayed, done } = useTypewriter(processedContent, 6, isLatest);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
        </div>
        <div className="flex-1 pt-1 overflow-hidden">
          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words inline" style={{ color: 'var(--text)' }}>
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a 
                    {...props} 
                    className="text-gold font-semibold hover:underline break-words" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  />
                ),
                p: ({ node, children }) => (
                  <p className="mb-2 last:mb-0 inline">
                    {children}
                  </p>
                )
              }}
            >
              {displayed}
            </ReactMarkdown>
            
            {/* Kursor berkedip selama mengetik (ditaruh sejajar dengan teks) */}
            {!done && (
              <span className="inline-block w-0.5 h-4 bg-gold ml-1 align-middle animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Kartu rekomendasi — muncul setelah typing selesai */}
      <AnimatePresence>
        {done && recommendations && recommendations.length > 0 && (
          <motion.div
            className="flex flex-col gap-2 pl-9"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    if (bootstrappedRef.current) return;

    const attachedTitle = searchParams.get('attachedTitle')?.trim() || '';
    const attachedDesc = searchParams.get('attachedDesc')?.trim() || '';
    const prefill = searchParams.get('prefill')?.trim() || '';
    const autoSend = searchParams.get('autosend') === '1';

    if (attachedTitle) {
      setAttachedBook({ title: attachedTitle, description: attachedDesc });
    }

    if (prefill) {
      setInput(prefill);
    }

    if (attachedTitle && prefill && autoSend && !chatLoading) {
      sendMessage(prefill, {
        gender,
        age,
        attachedBook: { title: attachedTitle, description: attachedDesc },
      });
      setInput('');
    }

    bootstrappedRef.current = true;
  }, [searchParams, chatLoading, sendMessage, gender, age]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');
    sendMessage(text, { gender, age, attachedBook });
  }, [input, chatLoading, gender, age, attachedBook, sendMessage]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleSuggestion(s: string) {
    setInput(s);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (!ready) return <PageSkeleton />;
  const isEmpty = chatHistory.length === 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar />

      {/* Header */}
      <div className="max-w-3xl w-full mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h1 className="font-serif text-xl font-black" style={{ color: 'var(--text)' }}>Chat PustarAI</h1>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all',
              isLight ? 'border-parchment-darker text-slate-500 hover:border-red-200 hover:text-red-500'
                      : 'border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 pb-4 overflow-y-auto">

        {/* Empty state */}
        {isEmpty && (
          <motion.div
            className="flex flex-col items-center justify-center py-16 text-center"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-gold/70" />
            </div>
            <h2 className="font-serif text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Tanya PustarAI</h2>
            <p className="text-sm max-w-sm leading-relaxed mb-8" style={{ color: 'var(--muted)' }}>
              Ceritain buku yang kamu suka, genre favoritmu, atau minta rekomendasi apapun.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    'text-xs font-medium px-3 py-2 rounded-full border transition-all hover:border-gold/50 hover:text-gold',
                    isLight ? 'bg-white border-parchment-darker text-slate-600'
                            : 'bg-navy-800/50 border-white/10 text-white/60',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-6 py-4">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-gold text-navy-900 text-sm font-medium">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <AIMessage
                    content={msg.content}
                    recommendations={msg.recommendations}
                    isLatest={i === chatHistory.length - 1}
                    isLight={isLight}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading dots */}
          {chatLoading && (
            <motion.div className="flex items-center gap-2 pl-9" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-gold/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 max-w-3xl w-full mx-auto px-4 pb-6 pt-2" style={{ background: 'var(--bg)' }}>

        {/* Attached book chip */}
        <AnimatePresence>
          {attachedBook && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className={cn(
                'mb-2 flex items-center justify-between gap-2 w-fit max-w-[80%] rounded-lg border px-3 py-1.5 shadow-sm',
                isLight ? 'bg-white border-gold/30' : 'bg-navy-800 border-gold/20'
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
            : isLight ? 'bg-white border-parchment-darker focus-within:border-gold/50' : 'bg-navy-800/80 border-white/10 focus-within:border-gold/40'
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
              input.trim() && !chatLoading ? 'bg-gold text-navy-900 hover:bg-gold/90' : 'opacity-30 cursor-not-allowed'
            )}
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
          Powered by PustarAI · @Beta
        </p>
      </div>
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