import { INITIAL_NOTIFICATIONS } from '@/data/notificationsFallback';
import type { NotificationItem } from '@/types/notifications';
import { apiGet } from '@/lib/api';

function normalizeNotification(raw: Record<string, unknown>, idx: number): NotificationItem {
  const createdAt = String(raw.created_at ?? raw.time ?? '');
  return {
    id: String(raw.id ?? `notif_${idx}`),
    user_id: String(raw.user_id ?? ''),
    book_id:
      raw.book_id !== undefined && raw.book_id !== null
        ? String(raw.book_id)
        : raw.related_book_id !== undefined && raw.related_book_id !== null
          ? String(raw.related_book_id)
          : null,
    actor_id: raw.actor_id !== undefined && raw.actor_id !== null ? String(raw.actor_id) : null,
    type: (raw.type as NotificationItem['type']) || 'system',
    title: String(raw.title ?? '-'),
    body: String(raw.body ?? raw.description ?? raw.message ?? '-'),
    time: createdAt || '-',
    created_at: createdAt || '-',
    read: Boolean(raw.read ?? raw.is_read ?? false),
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    bookCover: String(raw.bookCover ?? raw.coverId ?? '') || undefined,
  };
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  try {
    const payload = await apiGet<{ notifications?: Record<string, unknown>[] }>('/feed/me/notifications?limit=100');
    const raw = Array.isArray(payload?.notifications) ? payload.notifications : [];
    if (raw.length > 0) {
      return raw.map((item, idx) => normalizeNotification(item, idx));
    }
  } catch {
    // fallback below
  }

  return INITIAL_NOTIFICATIONS;
}
