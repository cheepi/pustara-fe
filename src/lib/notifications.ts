import { INITIAL_NOTIFICATIONS } from '@/data/notificationsFallback';
import type { NotificationItem } from '@/types/notifications';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';

function formatNotificationTime(value: string) {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Baru saja';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} menit lalu`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} jam lalu`;
  if (diffMs < 2 * day) return 'Kemarin';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
}

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
    time: formatNotificationTime(createdAt),
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
    return raw.map((item, idx) => normalizeNotification(item, idx));
  } catch {
    // fallback below
  }

  return INITIAL_NOTIFICATIONS;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const payload = await apiGet<{ notifications?: Record<string, unknown>[] }>('/feed/me/notifications?limit=100');
  const raw = Array.isArray(payload?.notifications) ? payload.notifications : [];
  return raw.filter((item) => !Boolean(item.read ?? item.is_read ?? false)).length;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiPatch(`/feed/me/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch('/feed/me/notifications/read', { all: true });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiDelete(`/feed/me/notifications/${notificationId}`);
}
