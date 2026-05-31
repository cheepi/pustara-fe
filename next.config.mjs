import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      // Book covers
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'books.google.com' },
      
      // Avatar sources
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google Firebase
      { protocol: 'https', hostname: 'ojlrymmikhdfqzuycldm.supabase.co' }, // Supabase (avatars)
      // Backend avatar proxy
      { protocol: 'https', hostname: 'pustara-be.vercel.app' },
      { protocol: 'http', hostname: 'localhost' },
      // Azure Blob Storage
      { protocol: 'https', hostname: '*.blob.core.windows.net' }, // Azure Blob Storage
    ],
    // Enable quality settings for optimization
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
};

export default withPWA(nextConfig);