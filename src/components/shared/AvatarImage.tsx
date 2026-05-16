'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarImageProps {
  /**
   * Image URL from storage (avatar_url from profile)
   * If null or error occurs, falls back to initials
   */
  src: string | null;

  /**
   * Alt text for image
   */
  alt: string;

  /**
   * Initials to show as fallback (e.g., "JD" for John Doe)
   * Default: "U" (Unknown)
   */
  initials?: string;

  /**
   * Size preset: sm (28px), md (32px), lg (48px)
   * Default: md
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable avatar display component
 *
 * Renders profile image with graceful fallback to initials.
 * Uses Next.js Image for optimization (lazy loading, caching, responsive).
 * Handles image errors with automatic fallback to initials.
 *
 * Usage:
 * <AvatarImage
 *   src={profile.avatar_url}
 *   alt="User avatar"
 *   initials="JD"
 *   size="md"
 * />
 */
export default function AvatarImage({
  src,
  alt,
  initials = 'U',
  size = 'md',
  className,
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Size mappings (width/height in pixels)
  const sizeMap = {
    sm: {
      px: 28,
      container: 'w-7 h-7',
      text: 'text-xs',
    },
    md: {
      px: 32,
      container: 'w-8 h-8',
      text: 'text-sm',
    },
    lg: {
      px: 48,
      container: 'w-12 h-12',
      text: 'text-lg',
    },
  };

  const { px, container, text } = sizeMap[size];

  // If no src or image failed to load, show initials
  if (!src || imageError) {
    return (
      <div
        className={cn(
          container,
          'rounded-full bg-gold/25 border border-gold/40',
          'flex items-center justify-center font-bold text-gold',
          'flex-shrink-0',
          text,
          className
        )}
        title={alt}
      >
        {initials.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  // Render Image using `fill` so it always matches the parent container
  return (
    <div
      className={cn(
        container,
        'relative rounded-full overflow-hidden',
        'flex-shrink-0',
        'border border-gold/20',
        className
      )}
      title={alt}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${px}px`}
        className={cn(
          'object-cover w-full h-full',
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={() => setImageError(true)}
        onLoadingComplete={() => setIsLoading(false)}
        priority={false}
        unoptimized={true}
      />
    </div>
  );
}
