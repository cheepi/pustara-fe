import { auth } from '@/lib/firebase';
import type { FollowActionResult, RecommendedUser, UserProfile } from '@/types/user';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type FollowAction = 'follow' | 'unfollow';

export interface UpdateMyProfilePayload {
  name?: string;
  username?: string;
  bio?: string;
  preferred_genres?: string[];
}

export interface UsernameAvailabilityResult {
  available: boolean;
  normalizedUsername: string;
  message: string;
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

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function toShortId(value: unknown): string {
  const compact = String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return compact.slice(0, 6) || 'reader';
}

function looksGeneratedHandle(value: unknown): boolean {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return true;
  if (/^u_[a-z0-9_]{12,}$/.test(raw)) return true;
  if (/^[a-z0-9_]{24,}$/.test(raw) && !/[aeiou]/.test(raw)) return true;
  return false;
}

function toHandle(value: unknown, fallbackId: unknown): string {
  const source = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s.]/g, ' ')
    .replace(/[.\-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (source.length >= 3 && !looksGeneratedHandle(source)) {
    return source.slice(0, 24);
  }

  return `pustara_${toShortId(fallbackId)}`;
}

function normalizePublicIdentity(raw: Record<string, unknown>): { displayName: string; username: string } {
  const id = raw.id;
  const rawDisplayName = raw.display_name ? String(raw.display_name).trim() : '';
  const rawName = raw.name ? String(raw.name).trim() : '';
  const rawUsername = raw.username ? String(raw.username).trim() : '';
  const rawEmail = raw.email ? String(raw.email).trim() : '';
  const emailLocal = rawEmail.includes('@') ? rawEmail.split('@')[0] : '';

  const preferredDisplay = rawDisplayName || rawName || emailLocal || rawUsername;
  const displayName = preferredDisplay && !looksGeneratedHandle(preferredDisplay)
    ? preferredDisplay
    : `Pembaca ${toShortId(id)}`;

  const username = toHandle(rawUsername || rawDisplayName || rawName || emailLocal, id);

  return { displayName, username };
}

function normalizeUserProfile(raw: Record<string, unknown>): UserProfile {
  const identity = normalizePublicIdentity(raw);
  return {
    id: String(raw.id ?? ''),
    username: identity.username,
    display_name: identity.displayName,
    name: identity.displayName,
    email: raw.email ? String(raw.email) : null,
    bio: String(raw.bio ?? ''),
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    preferred_genres: parseStringArray(raw.preferred_genres),
    total_read: Number(raw.total_read ?? 0),
    reading_streak: Number(raw.reading_streak ?? 0),
    created_at: raw.created_at ? String(raw.created_at) : null,
    updated_at: raw.updated_at ? String(raw.updated_at) : null,
    followers_count: Number(raw.followers_count ?? 0),
    following_count: Number(raw.following_count ?? 0),
    is_following: Boolean(raw.is_following),
    currently_reading: Array.isArray(raw.currently_reading) ? raw.currently_reading as UserProfile['currently_reading'] : [],
    liked_books: Array.isArray(raw.liked_books) ? raw.liked_books as UserProfile['liked_books'] : [],
  };
}

function normalizeRecommendedUser(raw: Record<string, unknown>): RecommendedUser {
  const identity = normalizePublicIdentity(raw);
  return {
    id: String(raw.id ?? ''),
    username: identity.username,
    display_name: identity.displayName,
    name: identity.displayName,
    bio: String(raw.bio ?? ''),
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    preferred_genres: parseStringArray(raw.preferred_genres),
    followers_count: Number(raw.followers_count ?? 0),
    total_read: Number(raw.total_read ?? 0),
    reading_streak: Number(raw.reading_streak ?? 0),
    is_following: Boolean(raw.is_following),
  };
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  if (!id) return null;

  try {
    const headers = await getOptionalAuthHeader();
    const res = await fetch(`${API_URL}/users/${id}`, {
      cache: 'no-store',
      headers,
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const raw = (json?.data ?? {}) as Record<string, unknown>;
    return normalizeUserProfile(raw);
  } catch (err) {
    console.warn(`[users] getUserProfile(${id}) gagal:`, err);
    return null;
  }
}

export async function toggleFollowUser(
  id: string,
  action: FollowAction
): Promise<FollowActionResult | null> {
  if (!id) return null;

  const method = action === 'follow' ? 'POST' : 'DELETE';
  const endpoint = action === 'follow' ? `/users/${id}/follow` : `/users/${id}/unfollow`;

  try {
    const headers = await getOptionalAuthHeader();
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json?.data ?? null) as FollowActionResult | null;
  } catch (err) {
    console.warn(`[users] toggleFollowUser(${id}, ${action}) gagal:`, err);
    return null;
  }
}

export async function getRecommendedUsers(limit = 8): Promise<RecommendedUser[]> {
  try {
    const headers = await getOptionalAuthHeader();
    const params = new URLSearchParams({ limit: String(limit) });

    const res = await fetch(`${API_URL}/users/recommendations?${params.toString()}`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((item: Record<string, unknown>) => normalizeRecommendedUser(item));
  } catch (err) {
    console.warn('[users] getRecommendedUsers gagal:', err);
    return [];
  }
}

export async function getMyFollowingUsers(limit = 30): Promise<RecommendedUser[]> {
  try {
    const headers = await getOptionalAuthHeader();
    const params = new URLSearchParams({ limit: String(limit) });

    const res = await fetch(`${API_URL}/users/me/following?${params.toString()}`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((item: Record<string, unknown>) => normalizeRecommendedUser(item));
  } catch (err) {
    console.warn('[users] getMyFollowingUsers gagal:', err);
    return [];
  }
}

export async function getMyFollowersUsers(limit = 30): Promise<RecommendedUser[]> {
  try {
    const headers = await getOptionalAuthHeader();
    const params = new URLSearchParams({ limit: String(limit) });

    const res = await fetch(`${API_URL}/users/me/followers?${params.toString()}`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    return list.map((item: Record<string, unknown>) => normalizeRecommendedUser(item));
  } catch (err) {
    console.warn('[users] getMyFollowersUsers gagal:', err);
    return [];
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    const headers = await getOptionalAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`${API_URL}/users/me`, {
      cache: 'no-store',
      headers,
    });

    if (!res.ok) return null;
    const json = await res.json();
    const raw = (json?.data ?? {}) as Record<string, unknown>;
    return normalizeUserProfile(raw);
  } catch (err) {
    console.warn('[users] getMyProfile gagal:', err);
    return null;
  }
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfile | null> {
  try {
    const headers = await getOptionalAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const raw = (json?.data ?? {}) as Record<string, unknown>;
    return normalizeUserProfile(raw);
  } catch (err) {
    console.warn('[users] updateMyProfile gagal:', err);
    return null;
  }
}

export async function checkUsernameAvailability(input: string): Promise<UsernameAvailabilityResult> {
  const normalizedUsername = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s.]/g, ' ')
    .replace(/[.\-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalizedUsername) {
    return {
      available: false,
      normalizedUsername: '',
      message: 'Nama pengguna wajib diisi.',
    };
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 24) {
    return {
      available: false,
      normalizedUsername,
      message: 'Nama pengguna harus 3-24 karakter.',
    };
  }

  try {
    const params = new URLSearchParams({ username: normalizedUsername });
    const res = await fetch(`${API_URL}/users/username-availability?${params.toString()}`, {
      cache: 'no-store',
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        available: false,
        normalizedUsername,
        message: String(payload?.message || 'Gagal memeriksa username.'),
      };
    }

    return {
      available: Boolean(payload?.available),
      normalizedUsername: String(payload?.username || normalizedUsername),
      message: String(payload?.message || ''),
    };
  } catch {
    return {
      available: false,
      normalizedUsername,
      message: 'Koneksi bermasalah. Coba lagi.',
    };
  }
}
