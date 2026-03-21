import { create } from 'zustand';

// ── Types (sesuai response dari FastAPI via Express) ──────────────────────────

export interface AiSignal {
  score: number;
  weight: number;
  label: string;
}

export interface AiRecommendation {
  book_id: string;
  title: string;
  authors: string;
  avg_rating: number;
  reason_primary: string;
  reason_secondary: string | null;
  dominant_signal: 'content' | 'collab';
  hybrid_score: number;
  phase: '❄️ Cold' | '🌡️ Mid' | '🔥 Warm';
  signals: {
    content: AiSignal;
    collab: AiSignal;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: AiRecommendation[];
  query?: string;
  phase?: string;
  timestamp: number;
}

interface AiStore {
  // Rekomendasi untuk homepage & ai-reco page
  homeRecommendations: AiRecommendation[];
  homeLoading: boolean;
  homeError: string | null;
  homeFetchedAt: number | null;

  // Rekomendasi buku serupa (per book_id)
  similarBooks: Record<string, AiRecommendation[]>;
  similarLoading: Record<string, boolean>;

  // Chat history
  chatHistory: ChatMessage[];
  chatLoading: boolean;

  // Actions
  setHomeRecommendations: (recs: AiRecommendation[]) => void;
  setHomeLoading: (v: boolean) => void;
  setHomeError: (e: string | null) => void;
  setHomeFetchedAt: (t: number) => void;

  setSimilarBooks: (bookId: string, recs: AiRecommendation[]) => void;
  setSimilarLoading: (bookId: string, v: boolean) => void;

  addChatMessage: (msg: ChatMessage) => void;
  setChatLoading: (v: boolean) => void;
  clearChat: () => void;
}

export const useAiStore = create<AiStore>((set) => ({
  homeRecommendations: [],
  homeLoading: false,
  homeError: null,
  homeFetchedAt: null,

  similarBooks: {},
  similarLoading: {},

  chatHistory: [],
  chatLoading: false,

  setHomeRecommendations: (recs) => set({ homeRecommendations: recs }),
  setHomeLoading: (v) => set({ homeLoading: v }),
  setHomeError: (e) => set({ homeError: e }),
  setHomeFetchedAt: (t) => set({ homeFetchedAt: t }),

  setSimilarBooks: (bookId, recs) =>
    set((s) => ({ similarBooks: { ...s.similarBooks, [bookId]: recs } })),
  setSimilarLoading: (bookId, v) =>
    set((s) => ({ similarLoading: { ...s.similarLoading, [bookId]: v } })),

  addChatMessage: (msg) =>
    set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  setChatLoading: (v) => set({ chatLoading: v }),
  clearChat: () => set({ chatHistory: [] }),
}));