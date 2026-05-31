const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function proxyMediaUrl(input?: string | null): string | null {
  if (!input) return null;

  const value = String(input).trim();
  if (!value) return null;
  if (/^(data:|blob:|javascript:)/i.test(value)) return value;

  if (value.startsWith('/')) {
    return value;
  }

  const base = API_URL.replace(/\/$/, '');
  if (value.startsWith(`${base}/media/proxy?url=`)) {
    return value;
  }

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();

    // Do not proxy OpenLibrary covers or other public CDN covers
    if (host.includes('covers.openlibrary.org') || host.includes('openlibrary.org')) return value;

    // Proxy if pointing to known storage hosts or if the resource is a PDF
    const storageHosts = [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      '.supabase.co',
      'lh3.googleusercontent.com',
      'googleusercontent.com',
    ];

    const isStorage = storageHosts.some((h) => host.includes(h));
    const isPdf = u.pathname.toLowerCase().endsWith('.pdf');

    if (!isStorage && !isPdf) {
      return value;
    }

    return `${base}/media/proxy?url=${encodeURIComponent(value)}`;
  } catch {
    return value;
  }
}

export function avatarProxyUrl(original?: string | null, userId?: string | null): string | null {
  if (!original) return null;
  const base = API_URL.replace(/\/$/, '');
  const value = String(original).trim();

  // If the backend already returned a relative proxy path like /users/:id/avatar
  // or /media/avatar/:id, just resolve it to an absolute URL — don't re-wrap.
  if (value.startsWith('/users/') || value.startsWith('/media/avatar/')) {
    return `${base}${value}`;
  }

  // If it's already an absolute URL pointing at our own backend proxy, pass through
  if (value.startsWith(`${base}/users/`) || value.startsWith(`${base}/media/avatar/`)) {
    return value;
  }

  // Build a fresh proxy URL using the canonical /users/:id/avatar route
  if (userId) {
    let buster = '';
    try {
      const parts = value.split('/');
      const last = parts[parts.length - 1];
      if (last) {
        const match = last.match(/^(\d+)/);
        if (match) {
          buster = `?v=${match[1]}`;
        } else {
          let hash = 0;
          for (let i = 0; i < last.length; i++) {
            hash = (hash << 5) - hash + last.charCodeAt(i);
            hash |= 0;
          }
          buster = `?v=${Math.abs(hash)}`;
        }
      }
    } catch (_) {}
    return `${base}/users/${encodeURIComponent(String(userId))}/avatar${buster}`;
  }

  // Fallback to regular proxy for unknown user id
  return proxyMediaUrl(original);
}