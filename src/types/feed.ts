import type { AiRecommendation } from '@/types/ai';
import type { TrendingBook } from '@/lib/api';

export type FeedItemType = 'activity' | 'ai_reco' | 'notif' | 'trending';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  time: string;
  actorId?: string;
  actorUsername?: string;
  user?: string; avatar_url?: string | null; loc?: string;
  action?: string; rating?: number; reviewText?: string;
  bookKey?: string; bookTitle?: string; bookAuthor?: string; coverId?: number; bookCoverUrl?: string;
  aiReason?: string;
  notifTitle?: string; notifBody?: string;
  rank?: number; reads?: number;
  aiReco?: AiRecommendation;
  trendingBook?: TrendingBook;
}