import { fetchTrending, apiGet } from '@/lib/api';
import { TRENDING_FALLBACK_FEED } from '@/data/feedFallback';
import type { FeedItem } from '@/types/feed';
import { getMyProfile } from '@/lib/users';
import { fetchShelfData } from '@/lib/shelf';
import { formatRelativeTime } from '@/lib/reading';

export interface FeedSidebarProfile {
  initials: string;
  name: string;
  subtitle: string;
  dipinjam: number;
  streak: number;
  selesai: number;
}

export interface FeedSuggestion {
  id: string;
  name: string;
  loc: string;
  books: number;
  avatar: string;
}

export interface FeedSidebarPayload {
  profile: FeedSidebarProfile;
  recentReads: Array<{
    entryKey: string;
    bookId: string;
    title: string;
    authors: string;
    cover_url: string;
    progress_percentage: number;
  }>;
  suggestions: FeedSuggestion[];
}

interface BackendActivity {
  type: string;
  book: {
    id: string;
    title: string;
    authors: string[];
    cover_url: string;
  };
  status: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  session_id: string;
  started_at: string | null;
  finished_at: string | null;
  last_read_at: string | null;
  actor_name: string;
  actor_avatar: string | null;
  timestamp: string | null;
}

interface BackendActivityResponse {
  activities: BackendActivity[];
  total: number;
}

interface BackendRecommendation {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string;
  books_count: number;
}

interface BackendRecommendationsResponse {
  users: BackendRecommendation[];
}

function normalizeCoverUrl(input?: string | null): string {
  if (!input) return '';
  const value = String(input).trim();
  if (!value) return '';
  const extracted = value.match(/https?:\/\/[^\s"')]+/i)?.[0] ?? value;
  return extracted.replace(/[),.;]+$/, '');
}

function stripCoverLeakText(input: string): string {
  return input
    .replace(/src\s*=\s*https?:\/\/\S+/gi, '')
    .replace(/https?:\/\/covers\.openlibrary\.org\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toInitials(input: string): string {
  const value = input.trim();
  if (!value) return 'P';
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toDateKey(input?: string | null): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function pickProfileSubtitle(profile: unknown): string {
  if (!profile || typeof profile !== 'object') return 'Pembaca aktif';
  const source = profile as { bio?: unknown; status?: unknown; description?: unknown };
  const value = [source.bio, source.status, source.description]
    .map((item) => String(item ?? '').trim())
    .find(Boolean);
  return value || 'Pembaca aktif';
}

function calcStreakFromActivities(activities: BackendActivity[]): number {
  const days = new Set<string>();
  for (const activity of activities) {
    const day = toDateKey(activity.timestamp || activity.last_read_at || activity.finished_at || activity.started_at);
    if (day) days.add(day);
  }

  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

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

export async function fetchFeedActivities(limit = 8): Promise<FeedItem[]> {
  try {
    const response = await apiGet<BackendActivityResponse>(`/feed/me/activity?limit=${limit}&include_network=1`);

    return response.activities.map((activity, idx) => ({
      id: `activity_${activity.session_id}_${idx}`,
      type: 'activity',
      time: formatRelativeTime(activity.timestamp || undefined),
      user: activity.actor_name,
      avatar: toInitials(activity.actor_name).charAt(0),
      loc: 'Komunitas Pustara',
      action:
        activity.status === 'finished'
          ? 'selesai membaca'
          : activity.status === 'wishlist'
            ? 'menyimpan ke wishlist'
            : 'sedang membaca',
      rating: undefined,
      bookKey: activity.book.id,
      bookTitle: stripCoverLeakText(activity.book.title || 'Tanpa Judul'),
      bookAuthor: stripCoverLeakText(Array.isArray(activity.book.authors) ? activity.book.authors.join(', ') : String(activity.book.authors || '')),
      bookCoverUrl: normalizeCoverUrl(activity.book.cover_url),
      reviewText:
        activity.status === 'finished'
          ? 'Menyelesaikan bacaan terbaru di Pustara.'
          : activity.status === 'wishlist'
            ? 'Menambahkan buku ini ke wishlist.'
            : `Progress membaca ${Math.round(activity.progress_percentage)}%.`,
    } as FeedItem));
  } catch (error) {
    console.error('Error fetching feed activities:', error);
    return [];
  }
}

export async function fetchFeedSidebarPayload(): Promise<FeedSidebarPayload> {
  try {
    const [profile, feedResponse, recoResponse, shelfData] = await Promise.all([
      getMyProfile(),
      apiGet<BackendActivityResponse>('/feed/me/activity?limit=3'),
      apiGet<BackendRecommendationsResponse>('/feed/me/recommendations?limit=3'),
      fetchShelfData(),
    ]);

    const name = profile?.name || 'Pembaca Pustara';
    const initials = toInitials(name);

    const isReadingStatus = (status: string) => {
      const value = String(status || '').toLowerCase();
      return value === 'reading' || value === 'in_progress' || value === 'borrowed' || value === 'started';
    };

    // Prefer profile aggregates so counts are not limited by activity sample size.
    const shelfBorrowedCount = Number(shelfData?.stats?.total_borrowed ?? 0);
    const profileReadingCount = Array.isArray(profile?.currently_reading) ? profile.currently_reading.length : 0;
    const activityReadingCount = feedResponse.activities.filter(a => isReadingStatus(a.status)).length;
    const readingCount = Math.max(0, shelfBorrowedCount || profileReadingCount || activityReadingCount);

    const profileFinishedCount = Number(profile?.total_read ?? 0);
    const activityFinishedCount = feedResponse.activities.filter(a => a.status === 'finished').length;
    const finishedCount = Math.max(0, profileFinishedCount || activityFinishedCount);

    const profileStreak = Number(profile?.reading_streak ?? 0);
    const computedStreak = calcStreakFromActivities(feedResponse.activities);
    const streak = Math.max(0, profileStreak || computedStreak);

    // Map recent reads from activities
    const recentReads = feedResponse.activities
      .filter(a => isReadingStatus(a.status))
      .map((a, index) => ({
        entryKey: a.session_id || `${a.book.id}-${a.timestamp || a.last_read_at || index}`,
        bookId: a.book.id,
        title: stripCoverLeakText(a.book.title || 'Tanpa Judul'),
        authors: stripCoverLeakText(Array.isArray(a.book.authors) ? a.book.authors.join(', ') : String(a.book.authors || '')),
        cover_url: normalizeCoverUrl(a.book.cover_url),
        progress_percentage: a.progress_percentage,
      }));

    return {
      profile: {
        initials,
        name,
        subtitle: pickProfileSubtitle(profile),
        dipinjam: readingCount,
        streak,
        selesai: finishedCount,
      },
      recentReads,
      suggestions: recoResponse.users.map((user) => ({
        id: user.id,
        name: user.name,
        loc: user.bio || 'Komunitas Pustara',
        books: user.books_count,
        avatar: toInitials(user.name).charAt(0),
      })).slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching feed sidebar payload:', error);
    return {
      profile: {
        initials: 'P',
        name: 'Pembaca Pustara',
        subtitle: 'Pembaca aktif',
        dipinjam: 0,
        streak: 0,
        selesai: 0,
      },
      recentReads: [],
      suggestions: [],
    };
  }
}
