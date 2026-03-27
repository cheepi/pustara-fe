/**
 * HTML Sanitization Utilities
 * 
 * Provides safe HTML rendering for user-generated content, reviews,
 * and AI responses using DOMPurify.
 * 
 * Installation:
 *   npm install isomorphic-dompurify
 * 
 * Usage:
 *   import { sanitizeHtml } from '@/lib/sanitize';
 *   
 *   // In component
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userHtml) }} />
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * DOMPurify configuration for different content types
 */
const CONFIG_REVIEW = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false,
};

const CONFIG_MARKDOWN = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false,
};

const CONFIG_PLAIN = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false,
};

/**
 * Sanitize HTML from user input, reviews, or AI responses
 * 
 * Default: Allow basic formatting (links, bold, italic)
 * Use for user reviews, comments, descriptions
 * 
 * @param html Untrusted HTML string
 * @returns Safe HTML string
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  return DOMPurify.sanitize(html, CONFIG_REVIEW);
}

/**
 * Sanitize markdown-rendered HTML content
 * 
 * Use for content that's been converted from markdown to HTML
 * (e.g., from marked.js, markdown-it, etc.)
 * 
 * @param html HTML from markdown renderer
 * @returns Safe HTML with markdown elements preserved
 */
export function sanitizeMarkdown(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  return DOMPurify.sanitize(html, CONFIG_MARKDOWN);
}

/**
 * Escape all HTML tags - safest option for plain text
 * 
 * Use for raw user text that shouldn't contain any HTML
 * 
 * @param text Text potentially containing HTML characters
 * @returns Safe text with all tags escaped
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';

  return DOMPurify.sanitize(text, CONFIG_PLAIN);
}

/**
 * Extract plain text from HTML while removing all tags
 * 
 * @param html HTML content
 * @returns Plain text without tags
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return html.replace(/<[^>]*>/g, '');

  div.innerHTML = DOMPurify.sanitize(html, CONFIG_PLAIN);
  return div.textContent || div.innerText || '';
}

/**
 * Sanitize URLs to prevent javascript: protocol and similar attacks
 * 
 * @param url User-provided URL
 * @returns Safe URL or empty string
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const trimmed = url.trim().toLowerCase();

  if (dangerousProtocols.some((proto) => trimmed.startsWith(proto))) {
    return '';
  }

  return url;
}

/**
 * Sanitize JSON strings that might be displayed as HTML
 * 
 * @param jsonStr Untrusted JSON string
 * @returns Escaped JSON safe for display
 */
export function sanitizeJson(jsonStr: string | null | undefined): string {
  if (!jsonStr || typeof jsonStr !== 'string') return '';

  return JSON.stringify(JSON.parse(jsonStr), null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Check if content contains potentially dangerous scripts
 * Useful for validation/blocking dangerous content before storage
 * 
 * @param html Content to check
 * @returns true if dangerous content detected
 */
export function hasDangerousContent(html: string): boolean {
  const dangerous = [
    /<script/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /javascript:/i,
    /vbscript:/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
  ];

  return dangerous.some((pattern) => pattern.test(html));
}

/**
 * Content Security Policy (CSP) header check
 * Returns recommended CSP directives for the app
 * 
 * Usage: Add to Next.js headers config
 */
export const recommendedCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'covers.openlibrary.org'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'localhost:*', 'covers.openlibrary.org'],
  'frame-ancestors': ["'none'"],
};
