import { INITIAL_NOTIFICATIONS } from '@/data/notificationsFallback';
import type { NotificationItem } from '@/types/notifications';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function normalizeNotification(raw: Record<string, unknown>, idx: number): NotificationItem {
  return {
    id: String(raw.id ?? `notif_${idx}`),
    user_id: String(raw.user_id ?? ''),
    book_id: raw.book_id !== undefined && raw.book_id !== null ? String(raw.book_id) : null,
    actor_id: raw.actor_id !== undefined && raw.actor_id !== null ? String(raw.actor_id) : null,
    type: (raw.type as NotificationItem['type']) || 'system',
    title: String(raw.title ?? '-'),
    body: String(raw.body ?? raw.message ?? '-'),
    time: String(raw.time ?? '-'),
    created_at: String(raw.created_at ?? raw.time ?? '-'),
    read: Boolean(raw.read ?? false),
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    bookCover: String(raw.bookCover ?? raw.coverId ?? '') || undefined,
  };
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const endpoints = ['/notifications', '/users/me/notifications'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      if (raw.length > 0) {
        return raw.map((item: Record<string, unknown>, idx: number) => normalizeNotification(item, idx));
      }
    } catch {
      // try next endpoint
    }
  }

  return INITIAL_NOTIFICATIONS;
}
