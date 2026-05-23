import { useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';

export type PasswordErrorCode =
  | 'wrong-password'
  | 'too-many-requests'
  | 'requires-recent-login'
  | 'weak-password'
  | 'no-user'
  | 'invalid-email'
  | 'unknown';

export interface PasswordError {
  code: PasswordErrorCode;
  message: string;
}

export interface UsePasswordManagementReturn {
  // Change password flow
  changePassword: (email: string, oldPassword: string, newPassword: string) => Promise<void>;
  changePasswordLoading: boolean;
  changePasswordError: PasswordError | null;
  clearChangePasswordError: () => void;

  // Forgot password flow
  sendResetEmail: (email: string) => Promise<void>;
  resetEmailLoading: boolean;
  resetEmailError: PasswordError | null;
  resetEmailSent: boolean;
  clearResetEmailError: () => void;

  // Utility
  validatePassword: (password: string) => { valid: boolean; message: string };
}

function mapFirebaseError(error: unknown): PasswordError {
  if (error instanceof Error) {
    const message = error.message;
    const code = (error as any).code || '';
    
    const codeMap: Record<string, { code: PasswordErrorCode; message: string }> = {
      'auth/wrong-password': {
        code: 'wrong-password',
        message: 'Kata sandi lama salah. Periksa kembali dan coba lagi.',
      },
      'auth/too-many-requests': {
        code: 'too-many-requests',
        message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.',
      },
      'auth/requires-recent-login': {
        code: 'requires-recent-login',
        message: 'Sesi Anda sudah kadaluarsa. Silakan logout dan login kembali untuk keamanan.',
      },
      'auth/weak-password': {
        code: 'weak-password',
        message: 'Kata sandi terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.',
      },
      'auth/user-not-found': {
        code: 'no-user',
        message: 'Akun tidak ditemukan.',
      },
      'auth/invalid-email': {
        code: 'invalid-email',
        message: 'Email tidak valid.',
      },
    };

    return codeMap[code] || {
      code: 'unknown',
      message: message || 'Gagal memperbarui kata sandi.',
    };
  }

  return {
    code: 'unknown',
    message: 'Terjadi kesalahan yang tidak diketahui.',
  };
}

export function usePasswordManagement(): UsePasswordManagementReturn {
  // Change password state
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<PasswordError | null>(null);

  // Reset email state
  const [resetEmailLoading, setResetEmailLoading] = useState(false);
  const [resetEmailError, setResetEmailError] = useState<PasswordError | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  /**
   * Change password while user is logged in
   * Requires re-authentication before updating
   */
  async function changePassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
    setChangePasswordError(null);

    // Validation
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setChangePasswordError({
        code: 'weak-password',
        message: validation.message,
      });
      return;
    }

    if (!email || !oldPassword) {
      setChangePasswordError({
        code: 'invalid-email',
        message: 'Email dan kata sandi diperlukan.',
      });
      return;
    }

    setChangePasswordLoading(true);
    try {
      const user = auth?.currentUser;
      if (!user) {
        throw new Error('Pengguna tidak ditemukan.');
      }

      // Re-authenticate with old password
      const credential = EmailAuthProvider.credential(email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Update to new password
      await updatePassword(user, newPassword);
    } catch (error) {
      setChangePasswordError(mapFirebaseError(error));
      throw mapFirebaseError(error);
    } finally {
      setChangePasswordLoading(false);
    }
  }

  /**
   * Send password reset email (forgot password flow)
   * User receives email with reset link
   */
  async function sendResetEmail(email: string): Promise<void> {
    setResetEmailError(null);
    setResetEmailSent(false);

    if (!email) {
      setResetEmailError({
        code: 'invalid-email',
        message: 'Email tidak boleh kosong.',
      });
      return;
    }

    if (!auth) {
      setResetEmailError({
        code: 'unknown',
        message: 'Layanan autentikasi belum siap. Muat ulang halaman dan coba lagi.',
      });
      return;
    }

    setResetEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (error) {
      setResetEmailError(mapFirebaseError(error));
      throw mapFirebaseError(error);
    } finally {
      setResetEmailLoading(false);
    }
  }

  /**
   * Validate password strength
   * Firebase requires:
   * - At least 6 characters for weak passwords
   * - Recommended 8+ characters with variety
   */
  function validatePassword(password: string): { valid: boolean; message: string } {
    if (!password) {
      return { valid: false, message: 'Kata sandi harus diisi.' };
    }
    if (password.length < 6) {
      return { valid: false, message: 'Kata sandi minimal 6 karakter.' };
    }
    if (password.length < 8) {
      return { valid: true, message: 'Cukup (minimal 8 karakter disarankan)' };
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { valid: true, message: 'Baik (tambahkan huruf kapital dan angka untuk lebih kuat)' };
    }
    return { valid: true, message: 'Kuat' };
  }

  function clearChangePasswordError() {
    setChangePasswordError(null);
  }

  function clearResetEmailError() {
    setResetEmailError(null);
  }

  return {
    // Change password
    changePassword,
    changePasswordLoading,
    changePasswordError,
    clearChangePasswordError,

    // Reset email
    sendResetEmail,
    resetEmailLoading,
    resetEmailError,
    resetEmailSent,
    clearResetEmailError,

    // Utility
    validatePassword,
  };
}
