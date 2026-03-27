/**
 * CAPTCHA Integration Hook - Cloudflare Turnstile
 *
 * Invisible bot protection for auth flows
 * Cloudflare Turnstile is preferred because:
 * - No tracking (privacy-friendly)
 * - No JavaScript required for interaction
 * - Works with Next.js out of the box
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export function useCaptcha(): {
  token: string | null;
  ready: boolean;
  error: string | null;
  captchaRef: React.MutableRefObject<HTMLDivElement | null>;
  reset: () => void;
} {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setReady(true);
      };

      script.onerror = () => {
        setError('Failed to load CAPTCHA');
      };

      document.head.appendChild(script);
    } else if ((window as any).turnstile) {
      setReady(true);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    if (ready && captchaRef.current && (window as any).turnstile) {
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!siteKey) {
        setError('CAPTCHA site key not configured');
        return;
      }

      if (widgetIdRef.current) {
        return;
      }

      const widgetId = (window as any).turnstile.render(captchaRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (captchaToken: string) => {
          setToken(captchaToken);
          setError(null);
        },
        'error-callback': () => {
          setError('CAPTCHA verification failed');
          setToken(null);
        },
        'expired-callback': () => {
          setError('CAPTCHA kedaluwarsa. Silakan verifikasi ulang.');
          setToken(null);
        },
        'timeout-callback': () => {
          setError('CAPTCHA timeout. Silakan verifikasi ulang.');
          setToken(null);
        },
      });

      widgetIdRef.current = widgetId;
    }
  }, [ready]);

  const reset = () => {
    setToken(null);
    setError(null);
    if ((window as any).turnstile && widgetIdRef.current) {
      (window as any).turnstile.reset(widgetIdRef.current);
    }
  };

  return { token, ready, error, captchaRef, reset };
}

/**
 * Turnstile Widget Component
 * Place this in your login/register form
 */
export function CaptchaWidget({
  captchaRef,
}: {
  captchaRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      id="turnstile-widget"
      ref={(el) => {
        captchaRef.current = el;
      }}
      style={{
        width: '100%',
        minHeight: '64px',
        display: 'flex',
        justifyContent: 'center',
        padding: '0.5rem 0',
      }}
    />
  );
}

/**
 * Server-side verification helper
 * Call this on your backend to verify the CAPTCHA token
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}
