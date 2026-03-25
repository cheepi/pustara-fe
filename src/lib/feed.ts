import { fetchTrending } from '@/lib/api';
import { TRENDING_FALLBACK_FEED } from '@/data/feedFallback';
import type { FeedItem } from '@/types/feed';

export async function fetchTrendingFeedItems(topN = 5): Promise<FeedItem[]> {
  try {
    const books = await fetchTrending(topN);
    if (books.length === 0) {
      return TRENDING_FALLBACK_FEED;
    }

    return books.map((book, idx) => ({
      id: `trend_live_${idx}`,
      type: 'trending',
      time: idx === 0 ? '1 jam lalu' : idx === 1 ? '3 jam lalu' : 'Hari ini',
      rank: idx + 1,
      trendingBook: book,
      reads: Math.floor(Math.random() * 20000) + 1000,
    }));
  } catch {
    return TRENDING_FALLBACK_FEED;
  }
}
