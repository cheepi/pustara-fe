'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Trash2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useChatAI } from '@/hooks/useChatAI';
import type { AiRecommendation } from '@/store/aiStore';

const SUGGESTIONS = [
  'Rekomendasiin buku seperti Laskar Pelangi',
  'Buku karya Pramoedya Ananta Toer',
  'Buku genre thriller yang seru',
  'Buku healing yang santai',
  'Buku inspiratif tentang pendidikan',
];

const hue = (title: string) => (title.charCodeAt(0) + (title.charCodeAt(1) || 0)) % 360;

function MiniRecoCard({ reco, isLight }: { reco: AiRecommendation; isLight: boolean }) {
  const bg = `hsl(${hue(reco.title)}, 35%, ${isLight ? '75%' : '25%'})`;
  return (
    <Link href={`/browse?q=${encodeURIComponent(reco.title)}`}>
      <motion.div
        className={cn(
          'flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all',
          isLight ? 'bg-white border-parchment-darker hover:border-gold/40' : 'bg-navy-800/50 border-white/8 hover:border-gold/30',
        )}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="w-10 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: bg }}>
          <BookOpen className="w-4 h-4 text-white/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{reco.title}</p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>{reco.authors}</p>
          <p className="text-[10px] line-clamp-1 mt-1" style={{ color: 'var(--muted)' }}>✦ {reco.reason_primary}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-gold">★ {reco.avg_rating.toFixed(1)}</span>
          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{reco.phase}</span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function ChatAIPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { ready } = useProtectedRoute();
  const { chatHistory, chatLoading, sendMessage, clearChat } = useChatAI();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
              isLight ? 'border-parchment-darker text-slate-500 hover:border-red-200 hover:text-red-500' : 'border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400',
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-gold/70" />
            </div>
            <h2 className="font-serif text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>
              Tanya PustarAI
            </h2>
            <p className="text-sm max-w-sm leading-relaxed mb-8" style={{ color: 'var(--muted)' }}>
              Ceritain buku yang kamu suka, genre favoritmu, atau minta rekomendasi apapun.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className={cn(
                    'text-xs font-medium px-3 py-2 rounded-full border transition-all hover:border-gold/50 hover:text-gold',
                    isLight ? 'bg-white border-parchment-darker text-slate-600' : 'bg-navy-800/50 border-white/10 text-white/60',
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-gold text-navy-900 text-sm font-medium">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant reply */
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-gold" />
                      </div>
                      <p className="text-sm pt-1" style={{ color: 'var(--text)' }}>{msg.content}</p>
                    </div>

                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="flex flex-col gap-2 pl-9">
                        {msg.recommendations.map((reco) => (
                          <MiniRecoCard key={reco.book_id} reco={reco} isLight={isLight} />
                        ))}
                        {msg.phase && (
                          <p className="text-[10px] pl-1" style={{ color: 'var(--muted)' }}>
                            Mode: {msg.phase}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {chatLoading && (
            <motion.div
              className="flex items-center gap-2 pl-9"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gold/50 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 max-w-3xl w-full mx-auto px-4 pb-6 pt-2"
        style={{ background: 'var(--bg)' }}>
        <div
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all',
            isLight ? 'bg-white border-parchment-darker focus-within:border-gold/50' : 'bg-navy-800/80 border-white/10 focus-within:border-gold/40',
          )}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tanya tentang buku apapun..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
            style={{ color: 'var(--text)' }}
            disabled={chatLoading}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || chatLoading}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !chatLoading
                ? 'bg-gold text-navy-900 hover:bg-gold/90'
                : 'opacity-30 cursor-not-allowed',
              isLight ? 'bg-navy-800 text-white' : '',
            )}
            style={input.trim() && !chatLoading ? { background: '#C9A84C', color: '#0f172a' } : {}}
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
          Powered by PustarAI · Model hybrid content + collaborative
        </p>
      </div>
    </div>
  );
}