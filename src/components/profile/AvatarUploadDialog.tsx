'use client';

import { useState, useRef } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadAvatarToSupabase } from '@/lib/avatarUpload';
import { useAuthStore } from '@/store/authStore';

interface Props {
  userId: string;
  onUploadSuccess: (newAvatarUrl: string) => void;
  isLight: boolean;
}

export default function AvatarUploadDialog({
  userId,
  onUploadSuccess,
  isLight,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user, setProfileCache } = useAuthStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const result = await uploadAvatarToSupabase(file, userId);

      if (!result.success) {
        setError(result.error || 'Upload gagal');
        return;
      }

      // Success
      setSuccess('Avatar berhasil diperbarui!');
      const cacheBustedUrl = `${result.avatarUrl!}${result.avatarUrl!.includes('?') ? '&' : '?'}t=${Date.now()}`;
      if (user) {
        setProfileCache({
          uid: user.uid,
          displayName: user.displayName || user.email || 'Pengguna',
          avatarUrl: cacheBustedUrl,
          email: user.email || null,
        });
      }
      onUploadSuccess(cacheBustedUrl);

      // Clear success message after 2s
      setTimeout(() => setSuccess(null), 2000);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        hidden
      />

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
          'transition-all duration-200',
          uploading && 'opacity-60 cursor-not-allowed',
          isLight
            ? 'bg-gold text-navy-900 hover:brightness-110 disabled:hover:brightness-100'
            : 'bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 hover:border-gold/40 disabled:hover:bg-gold/20'
        )}
      >
        <Camera className="w-4 h-4" />
        {uploading ? 'Mengunggah...' : 'Ubah Avatar'}
      </button>

      {/* Error message */}
      {error && (
        <div
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg text-sm',
            isLight ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          className={cn(
            'flex items-center gap-2 p-3 rounded-lg text-sm',
            isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          )}
        >
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          {success}
        </div>
      )}

      {/* File size hint */}
      <p className={cn('text-xs', isLight ? 'text-slate-500' : 'text-slate-400')}>
        Format: JPG, PNG, WebP. Ukuran maksimal: 5MB
      </p>
    </div>
  );
}
