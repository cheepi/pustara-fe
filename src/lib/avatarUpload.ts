import { supabase, isSupabaseConfigured } from './supabase';
import { updateMyProfile } from './users';

interface UploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Upload avatar image to Supabase Storage and update backend
 *
 * Flow:
 * 1. Validate file (image/* type, max 5MB)
 * 2. Upload to Supabase Storage (avatars/ bucket)
 * 3. Save the public avatar URL to backend so the profile can render it directly
 * 4. Return the avatar URL for UI update
 */
export async function uploadAvatarToSupabase(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase belum dikonfigurasi di environment production.',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Validate file
    // ─────────────────────────────────────────────────────────────
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Hanya file gambar yang diizinkan (image/jpeg, image/png, image/webp)',
      };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: `Ukuran file terlalu besar. Maksimal 5MB, Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Upload to Supabase Storage
    // ─────────────────────────────────────────────────────────────
    // Bucket: pustara-storage
    // Path format: avatars/{userId}/{timestamp}-{sanitizedFilename}
    // Note: Sanitize filename to avoid URL encoding issues (spaces, parentheses, etc)
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const sanitizedFileName = `${timestamp}-${crypto.randomUUID()}.${ext}`;
    const filePath = `avatars/${userId}/${sanitizedFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pustara-storage')
      .upload(filePath, file, {
        upsert: true, // Overwrite if exists
        contentType: file.type,
      });

    if (uploadError || !uploadData) {
      console.error('Supabase upload error:', uploadError);
      return {
        success: false,
        error: `Upload ke Supabase gagal: ${uploadError?.message || 'Unknown error'}`,
      };
    }

    // ─────────────────────────────────────────────────────────────
    const { data: publicUrlData } = supabase.storage
      .from('pustara-storage')
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    // 3. Save public avatar URL to backend database
    // ─────────────────────────────────────────────────────────────
    const backendResult = await updateMyProfile({
      avatar_url: avatarUrl,
    });

    if (!backendResult) {
      console.error('Backend update failed, but file was uploaded to Supabase');
      return {
        success: false,
        error: 'Gagal menyimpan avatar ke database. File sudah terupload ke Supabase.',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Return proxied avatar URL from backend (not raw Supabase URL)
    //    backendResult.avatar_url is already resolved to /users/:id/avatar proxy path
    // ─────────────────────────────────────────────────────────────
    return {
      success: true,
      // Prefer the backend-proxied URL so we never expose raw Supabase URLs in the UI
      avatarUrl: backendResult.avatar_url || avatarUrl,
    };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload gagal',
    };
  }
}
