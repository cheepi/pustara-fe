// 'use client';
// import { useCallback } from 'react';
// import { useAiStore } from '@/store/aiStore';
// import { fetchChatRecommendations } from '@/lib/api';

// /**
//  * Hook untuk fitur chat AI rekomendasi buku.
//  * Menyimpan history di Zustand store (persist selama session).
//  */
// export function useChatAI() {
//   const {
//     chatHistory,
//     chatLoading,
//     addChatMessage,
//     setChatLoading,
//     clearChat,
//   } = useAiStore();

//   const sendMessage = useCallback(async (userInput: string) => {
//     if (!userInput.trim() || chatLoading) return;

//     // Tambah pesan user dulu
//     addChatMessage({
//       role: 'user',
//       content: userInput,
//       timestamp: Date.now(),
//     });

//     setChatLoading(true);

//     try {
//       const res = await fetchChatRecommendations(userInput, 6);

//       // Buat teks balasan dari intent yang dideteksi
//       const intent = res.intent as Record<string, unknown>;
//       let replyText = '';

//       if (intent.seed_title) {
//         replyText = `Karena kamu menyebut "${intent.seed_title}", ini beberapa buku yang mirip:`;
//       } else if (intent.author_filter) {
//         replyText = `Ini buku-buku dari penulis "${intent.author_filter}":`;
//       } else if (Array.isArray(intent.genres) && intent.genres.length > 0) {
//         replyText = `Ini rekomendasi untuk genre ${(intent.genres as string[]).join(', ')}:`;
//       } else {
//         replyText = `Ini yang PustarAI temukan untuk "${userInput}":`;
//       }

//       if (res.recommendations.length === 0) {
//         replyText = `Hmm, gak ketemu buku yang cocok untuk "${userInput}". Coba kata kunci lain?`;
//       }

//       addChatMessage({
//         role: 'assistant',
//         content: replyText,
//         recommendations: res.recommendations,
//         query: res.query,
//         phase: res.phase,
//         timestamp: Date.now(),
//       });
//     } catch (err) {
//       addChatMessage({
//         role: 'assistant',
//         content: 'Maaf, PustarAI lagi gangguan nih. Coba lagi ya?',
//         timestamp: Date.now(),
//       });
//     } finally {
//       setChatLoading(false);
//     }
//   }, [chatLoading, addChatMessage, setChatLoading]);

//   return {
//     chatHistory,
//     chatLoading,
//     sendMessage,
//     clearChat,
//   };
// }
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

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || chatLoading) return;

    addChatMessage({
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    });

    setChatLoading(true);

    try {
      const res = await fetchChatRecommendations(userInput, 6);
      const recs = res.recommendations ?? [];
      const intent = res.intent as Record<string, unknown>;

      let replyText = '';
      if (intent?.seed_title) {
        replyText = `Karena kamu menyebut "${intent.seed_title}", ini beberapa buku yang mirip:`;
      } else if (intent?.author_filter) {
        replyText = `Ini buku-buku dari "${intent.author_filter}":`;
      } else if (Array.isArray(intent?.genres) && (intent.genres as string[]).length > 0) {
        replyText = `Ini rekomendasi untuk genre ${(intent.genres as string[]).join(', ')}:`;
      } else {
        replyText = `Ini yang PustarAI temukan untuk "${userInput}":`;
      }

      if (recs.length === 0) {
        replyText = `Hmm, gak ketemu buku yang cocok untuk "${userInput}". Coba kata kunci lain?`;
      }

      addChatMessage({
        role: 'assistant',
        content: replyText,
        recommendations: recs,
        query: res.query,
        phase: res.phase,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      addChatMessage({
          role: 'assistant',
          content: msg.includes('404')
          ? `Hmm, gak ketemu buku untuk "${userInput}". Coba lebih spesifik, misalnya nama judul atau genre?`
          : 'Maaf, PustarAI lagi gangguan nih. Coba lagi ya?',
          timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, addChatMessage, setChatLoading]);

  return { chatHistory, chatLoading, sendMessage, clearChat };
}