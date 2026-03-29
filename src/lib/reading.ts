import { auth } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ReadingSession {
  id: string;
  book_id: string;
  title: string;
  authors: string;
  cover_url?: string;
  current_page?: number;
  total_pages?: number;
  progress_percentage?: number;
  status?: string;
  started_at?: string;
  last_read_at?: string;
  finished_at?: string;
  reading_time_minutes?: number;
}

async function getOptionalAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};

  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSession(raw: Record<string, unknown>): ReadingSession {
  return {
    id: String(raw.id ?? ''),
    book_id: String(raw.book_id ?? ''),
    title: String(raw.title ?? 'Untitled'),
    authors: String(raw.authors ?? 'Unknown Author'),
    cover_url: raw.cover_url ? String(raw.cover_url) : undefined,
    current_page: toNumber(raw.current_page, 0),
    total_pages: toNumber(raw.total_pages, 0),
    progress_percentage: toNumber(raw.progress_percentage, 0),
    status: raw.status ? String(raw.status) : undefined,
    started_at: raw.started_at ? String(raw.started_at) : undefined,
    last_read_at: raw.last_read_at ? String(raw.last_read_at) : undefined,
    finished_at: raw.finished_at ? String(raw.finished_at) : undefined,
    reading_time_minutes: toNumber(raw.reading_time_minutes, 0),
  };
}

export async function getMyReadingSessions(status?: string, limit = 20): Promise<ReadingSession[]> {
  try {
    const headers = await getOptionalAuthHeader();
    if (!headers.Authorization) return [];

    const params = new URLSearchParams({ limit: String(limit), offset: '0' });
    if (status) params.set('status', status);

    const res = await fetch(`${API_URL}/reading/sessions?${params.toString()}`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) return [];
    const json = await res.json();
    const rows = Array.isArray(json?.sessions) ? json.sessions : [];
    return rows.map((row: Record<string, unknown>) => normalizeSession(row));
  } catch {
    return [];
  }
}

export function formatRelativeTime(input?: string): string {
  if (!input) return 'Baru saja';
  const ms = Date.now() - new Date(input).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Baru saja';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (ms < hour) return `${Math.max(1, Math.floor(ms / minute))} menit lalu`;
  if (ms < day) return `${Math.floor(ms / hour)} jam lalu`;
  if (ms < week) return `${Math.floor(ms / day)} hari lalu`;
  return `${Math.floor(ms / week)} minggu lalu`;
}

export function formatDateID(input?: string): string {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}