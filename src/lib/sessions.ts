/**
 * Sessions API
 * Centralized fetch wrapper untuk active sessions dengan session revocation handling
 */

import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import type { GlobalToastType } from '@/components/feedback/ToastProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Session {
  id: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  created_at: string;
  last_active: string;
}

/**
 * Global error handler untuk SESSION_REVOKED
 * Dipanggil otomatis saat session revoked di device lain
 */
async function handleSessionRevoked(showToast?: (msg: string, type?: GlobalToastType) => void) {
  console.log('[sessions] Session revoked detected - logging out...');
  
  try {
    // Sign out dari Firebase
    await signOut(auth);
  } catch (err) {
    console.error('[sessions] Signout error:', err);
  }

  // Toast notification
  if (showToast) {
    showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
  }

  // Redirect ke login (gunakan window.location untuk force reload)
  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
}

/**
 * Wrapper untuk fetch API calls yang bisa return SESSION_REVOKED error
 * @param url API endpoint
 * @param options fetch options
 * @param showToast optional toast callback
 * @returns response JSON atau error object
 */
export async function fetchWithSessionCheck(
  url: string,
  options: RequestInit = {},
  showToast?: (msg: string, type?: GlobalToastType) => void
) {
  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const json = await res.json();

    // Check untuk SESSION_REVOKED error (multi-device logout)
    if (res.status === 401 && json?.error === 'SESSION_REVOKED') {
      await handleSessionRevoked(showToast);
      return { success: false, error: 'SESSION_REVOKED' };
    }

    return { success: res.ok, status: res.status, ...json };
  } catch (err) {
    console.error('[fetchWithSessionCheck] Error:', err);
    return { success: false, error: 'FETCH_ERROR' };
  }
}

/**
 * Fetch active sessions dari backend
 * Real authenticated flow dengan Firebase bearer token
 */
export async function getSessions(showToast?: (msg: string, type?: GlobalToastType) => void): Promise<Session[]> {
  try {
    // Get Firebase ID token dari current user
    const token = await auth.currentUser?.getIdToken();
    
    if (!token) {
      console.warn('[sessions] No auth token available');
      return [];
    }

    // Prepare headers dengan Bearer token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const result = await fetchWithSessionCheck(
      `${API_URL}/auth/sessions`,
      {
        method: 'GET',
        headers,
      },
      showToast
    );

    if (!result.success || result.error === 'SESSION_REVOKED') {
      return [];
    }

    const sessions = Array.isArray(result?.data) ? result.data : [];

    return sessions.map((s: any) => ({
      id: s.id || s.session_id || '',
      device_name: s.device_name || 'Perangkat',
      browser: s.browser || '-',
      os: s.os || '-',
      ip_address: s.ip_address || '-',
      created_at: s.created_at || '',
      last_active: s.last_active || '',
    }));
  } catch (err) {
    console.error('[sessions] getSessions error:', err);
    return [];
  }
}
