/**
 * Device Detection Helper - Client-side only
 * Detects browser and OS information for Active Sessions MVP
 * Safe for Next.js App Router (handles SSR/client-side properly)
 */

'use client'; // Must be client component to access navigator

import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
}

/**
 * Get device information from current user's browser
 * Client-side only - safe to call from frontend
 * @returns {DeviceInfo} Device name with format "Chrome on Windows"
 */
export function getDeviceInfo(): DeviceInfo {
  try {
    // Check if running in browser (client-side)
    if (typeof window === 'undefined') {
      console.warn('[deviceDetection] Running on server, returning defaults');
      return {
        deviceName: 'Unknown Browser on Unknown OS',
        browser: 'Unknown Browser',
        os: 'Unknown OS',
      };
    }

    // Parse User-Agent from navigator (only available client-side)
      const parser = new UAParser();
      parser.setUA(navigator.userAgent);

      const result = parser.getResult();

    // Extract browser and OS with safe fallbacks
    const browser = result.browser?.name?.trim() || 'Unknown Browser';
    const os = result.os?.name?.trim() || 'Unknown OS';
    const deviceName = `${browser} on ${os}`;

    console.log('[deviceDetection] ✅ Parsed device info:', {
      browser,
      os,
      deviceName,
    });

    return {
      deviceName,
      browser,
      os,
    };
  } catch (error) {
    console.error('[deviceDetection] ⚠️ Error parsing User-Agent:', error);
    
    // Safe fallback
    return {
      deviceName: 'Unknown Browser on Unknown OS',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
    };
  }
}

/**
 * Get or create persistent device_id using localStorage
 * Ensures same device_id is reused across page refreshes
 * Prevents duplicate sessions when browser reloads
 * 
 * @returns {string} Stable device identifier (UUID format)
 */
export function getOrCreateDeviceId(): string {
  try {
    // Server-side: return placeholder (not used)
    if (typeof window === 'undefined') {
      return 'ssr-device-id';
    }

    const STORAGE_KEY = 'pustara_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
      // First time: create new UUID and store in localStorage
      deviceId = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, deviceId);
      console.log('[deviceDetection] 🆕 New device_id created and stored:', deviceId);
    } else {
      console.log('[deviceDetection] ♻️ Reusing existing device_id:', deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('[deviceDetection] ⚠️ Error managing device_id:', error);
    // Fallback: generate temporary ID if localStorage fails
    return 'fallback-' + Math.random().toString(36).slice(2, 9);
  }
}
