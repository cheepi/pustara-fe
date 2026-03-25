'use client';
import { useCallback } from 'react';
import { useAiStore } from '@/store/aiStore';
import { fetchChatRecommendations } from '@/lib/api';

export function useChatAI() {
  const {
    chatHistory,
    chatLoading,
    addChatMessage,
    setChatLoading,
    clearChat,
  } = useAiStore();

  const sendMessage = useCallback(async (
    userInput: string,
    context?: { gender?: string; age?: string; attachedBook?: { title: string; description: string } | null }
  ) => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput || chatLoading) return;

    // Guard: cegah double-send prompt identik yang terjadi sangat berdekatan
    // (mis. page remount / trigger tak sengaja saat navigasi kembali).
    const last = chatHistory[chatHistory.length - 1];
    const prev = chatHistory[chatHistory.length - 2];
    const duplicateAfterAssistant =
      last?.role === 'assistant' &&
      prev?.role === 'user' &&
      prev.content.trim() === trimmedInput &&
      Date.now() - last.timestamp < 8000;
    const duplicatePendingUser =
      last?.role === 'user' &&
      last.content.trim() === trimmedInput &&
      Date.now() - last.timestamp < 8000;

    if (duplicateAfterAssistant || duplicatePendingUser) {
      return;
    }

    addChatMessage({ role: 'user', content: trimmedInput, timestamp: Date.now() });
    setChatLoading(true);

    try {
      // Kirim 6 pesan terakhir sebagai history (3 giliran) supaya Groq ingat konteks
      const historyToSend = chatHistory
        .slice(-6)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetchChatRecommendations(
        trimmedInput,
        10,
        context?.attachedBook?.title,
        context?.attachedBook?.description,
        context?.gender,
        context?.age,
        historyToSend,
      );

      const showRecs = res.show_recommendations !== false;
      const allRecs  = showRecs ? (res.recommendations ?? []) : [];
      const replyText = res.response_text || `Ini yang PustarAI temukan untuk "${trimmedInput}":`;

      // Filter kartu: hanya tampilkan buku yang beneran disebut Groq dalam teksnya.
      // Kalau tidak ada yang match (Groq jawab umum), fallback ke 3 teratas dari sistem.
      let recs = allRecs;
      if (allRecs.length > 0 && replyText.length > 10) {
        const replyLower = replyText.toLowerCase();
        const mentioned  = allRecs.filter(r =>
          replyLower.includes(r.title.toLowerCase())
        );
        // Pakai yang disebut Groq; kalau tidak ada satupun match → ambil max 3 teratas
        recs = mentioned.length > 0 ? mentioned : allRecs.slice(0, 3);
      }

      addChatMessage({
        role: 'assistant',
        content: replyText,
        recommendations: recs,
        query: JSON.stringify(res.parsed_query),
        phase: res.intent,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      addChatMessage({
        role: 'assistant',
        content: msg.includes('404')
          ? `Hmm, gak ketemu buku untuk "${trimmedInput}". Coba lebih spesifik, misalnya nama judul atau genre?`
          : 'Maaf, PustarAI lagi gangguan nih. Coba lagi ya?',
        timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  }, [chatHistory, chatLoading, addChatMessage, setChatLoading]);

  return { chatHistory, chatLoading, sendMessage, clearChat };
}