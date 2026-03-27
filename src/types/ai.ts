export interface AiSignal {
  score: number;
  weight: number;
  label: string;
}

export interface AiRecommendation {
  book_id: string;
  title: string;
  authors: string;
  cover_url?: string | null;
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
