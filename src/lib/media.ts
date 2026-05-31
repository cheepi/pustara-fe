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