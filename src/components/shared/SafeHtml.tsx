'use client';

import { sanitizeHtml, sanitizeMarkdown } from '@/lib/sanitize';

/**
 * SafeHtml Component
 * 
 * Renders HTML content safely, protecting against XSS attacks.
 * Automatically sanitizes input using DOMPurify.
 * 
 * Usage:
 *   <SafeHtml html={userGeneratedHtml} />
 *   <SafeHtml html={markdownHtml} type="markdown" />
 */

interface SafeHtmlProps {
  /** Untrusted HTML string to render */
  html: string | null | undefined;
  
  /** Type of content: 'html'for basic |'markdown' for markdown-rendered */
  type?: 'html' | 'markdown';
  
  /** CSS class name */
  className?: string;
}

export function SafeHtml({
  html,
  type = 'html',
  className,
}: SafeHtmlProps) {
  if (!html) return null;

  const sanitized = type === 'markdown' ? sanitizeMarkdown(html) : sanitizeHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export default SafeHtml;
