'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * useSmartLending - Smart borrowing, returning, extensions, progress tracking
 * 
 * Usage:
 * const { borrow, returnBook, extend, updateProgress } = useSmartLending();
 * 
 * await borrow(bookId);  // Pinjam buku
 * await returnBook(loanId);  // Kembalikan
 * await extend(loanId);  // Perpanjang 3 hari
 * await updateProgress(bookId, currentPage, readingMinutes);  // Update progress baca
 */

export function useSmartLending() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const request = useCallback(async (endpoint: string, method = 'POST', body: Record<string, unknown> | null = null) => {
    if (!user?.uid) {
      setError('Harus login untuk melakukan aksi ini');
      return null;
    }

    const token = await user.getIdToken();

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, apiUrl]);

  // ── BORROWING ──
  const borrow = useCallback(async (bookId: string) => {
    console.log('[useSmartLending] 📕 Borrowing book:', bookId);
    const result = await request('/shelf/me/borrow/' + bookId);
    if (result) {
      setSuccess('✅ Buku berhasil dipinjam! Harus dikembalikan dalam 7 hari');
      return result;
    }
    return null;
  }, [request]);

  // ── RETURNING ──
  const returnBook = useCallback(async (loanId: string) => {
    console.log('[useSmartLending] 📚 Returning loan:', loanId);
    const result = await request(`/shelf/me/return/${loanId}`);
    if (result) {
      setSuccess('✅ Buku berhasil dikembalikan');
      return result;
    }
    return null;
  }, [request]);

  // ── EXTEND LOAN (3 hari tambahan) ──
  const extend = useCallback(async (loanId: string) => {
    console.log('[useSmartLending] ⏱️ Extending loan:', loanId);
    const result = await request(`/shelf/me/extend/${loanId}`);
    if (result) {
      setSuccess('✅ Peminjaman diperpanjang 3 hari');
      return result;
    }
    return null;
  }, [request]);

  // ── UPDATE READING PROGRESS ──
  /**
   * currentPage: halaman berapa sekarang
   * readingTimeMinutes: berapa lama baca session ini (opsional)
   */
  const updateProgress = useCallback(async (
    bookId: string,
    currentPage: number,
    readingTimeMinutes: number = 0
  ) => {
    console.log('[useSmartLending] 📖 Update progress:', { bookId, currentPage, readingTimeMinutes });
    const result = await request('/reading/update', 'POST', {
      bookId,
      currentPage,
      readingTimeMinutes,
    });
    if (result) {
      const percentage = result.progress_percentage || 0;
      setSuccess(`📖 Progress: ${currentPage}/${result.total_pages} halaman (${percentage}%)`);
      return result;
    }
    return null;
  }, [request]);

  // ── FINISH READING ──
  const finishReading = useCallback(async (bookId: string) => {
    console.log('[useSmartLending] ✨ Finishing reading:', bookId);
    const result = await request('/reading/finish', 'POST', { bookId });
    if (result) {
      setSuccess('🎉 Selamat! Buku sudah selesai dibaca!');
      return result;
    }
    return null;
  }, [request]);

  // ── PAUSE READING ──
  const pauseReading = useCallback(async (bookId: string) => {
    console.log('[useSmartLending] ⏸️ Pausing reading:', bookId);
    const result = await request('/reading/pause', 'POST', { bookId });
    if (result) {
      setSuccess('Pembacaan dijeda. Lanjutkan kapan saja!');
      return result;
    }
    return null;
  }, [request]);

  return {
    // Loan actions
    borrow,
    returnBook,
    extend,

    // Reading actions
    updateProgress,
    finishReading,
    pauseReading,

    // State
    loading,
    error,
    success,
    setError,
    setSuccess,
  };
}

/**
 * Utility: Format days left untuk display
 */
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) {
    return `⚠️ ${Math.abs(daysLeft)} hari terlambat`;
  } else if (daysLeft === 0) {
    return '🔴 Harus dikembalikan hari ini';
  } else if (daysLeft === 1) {
    return '🟠 Terakhir 1 hari lagi';
  } else if (daysLeft <= 3) {
    return `🟡 ${daysLeft} hari lagi`;
  } else {
    return `🟢 ${daysLeft} hari lagi`;
  }
}

/**
 * Utility: Get status color untuk loan
 */
export function getLoanStatusColor(status: string, daysLeft: number): string {
  if (status === 'overdue') return 'red';
  if (status === 'extended') return 'blue';
  if (daysLeft <= 1) return 'red';
  if (daysLeft <= 3) return 'yellow';
  return 'green';
}

/**
 * Utility: Get reading progress color
 */
export function getProgressColor(percentage: number): string {
  if (percentage < 25) return 'from-blue-500 to-blue-600';
  if (percentage < 50) return 'from-green-500 to-green-600';
  if (percentage < 75) return 'from-yellow-500 to-yellow-600';
  return 'from-purple-500 to-purple-600';
}
