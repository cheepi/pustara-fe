'use client';

import { useState } from 'react';
import { useSmartLending, formatDaysLeft, getLoanStatusColor } from '@/hooks/useSmartLending';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, RotateCcw, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * Loan Card - Tampilkan status pinjaman dengan smart logic
 * 
 * Props:
 * - loan: { id, title, author, cover_url, borrowed_at, due_date, days_left, extended, etc }
 * - onReturn: callback saat return
 * - onExtend: callback saat extend
 */

interface LoanCardProps {
  loan: {
    id: string;
    loan_id: string;
    title: string;
    author: string;
    coverUrl: string;
    borrowed_at: string;
    due_date: string;
    days_left: number;
    canExtend?: boolean;
    is_overdue?: boolean;
    extended?: boolean;
  };
  onRefresh?: () => void;
}

export function LoanCard({ loan, onRefresh }: LoanCardProps) {
  const { returnBook, extend } = useSmartLending();
  const [isReturning, setIsReturning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const daysLeft = loan.days_left ?? 0;
  const isOverdue = daysLeft < 0;
  const isDueSoon = daysLeft > 0 && daysLeft <= 3;
  const isLastDay = daysLeft === 0 || daysLeft === 1;
  const canExtend = loan.canExtend && !isOverdue && !loan.extended;

  const statusColor = getLoanStatusColor(isOverdue ? 'overdue' : 'active', daysLeft);

  const handleReturn = async () => {
    setIsReturning(true);
    await returnBook(loan.loan_id);
    onRefresh?.();
    setIsReturning(false);
  };

  const handleExtend = async () => {
    setIsExtending(true);
    await extend(loan.loan_id);
    onRefresh?.();
    setIsExtending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`
        relative rounded-lg border overflow-hidden transition-all
        ${isOverdue ? 'border-red-500/50 bg-red-500/5' : isDueSoon ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
      `}>
      {/* Cover Image */}
      <div className="relative aspect-[3/4] bg-slate-200 dark:bg-slate-700 overflow-hidden">
        {loan.coverUrl ? (
          <img src={loan.coverUrl} alt={loan.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            📚 No Cover
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {isOverdue && (
            <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              OVERDUE
            </div>
          )}
          {isDueSoon && !isOverdue && (
            <div className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <AlertCircle className="w-3 h-3" />
              DUE SOON
            </div>
          )}
          {loan.extended && (
            <div className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <RotateCcw className="w-3 h-3" />
              EXTENDED
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        {/* Title & Author */}
        <h4 className="font-semibold text-sm truncate dark:text-white">{loan.title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3">{loan.author}</p>

        {/* Days Left Status */}
        <div className={`
          p-2 rounded-lg mb-3 text-sm font-medium
          ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
            isLastDay ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
            isDueSoon ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }
        `}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDaysLeft(daysLeft)}</span>
          </div>
        </div>

        {/* Dates Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-3">
          <div className="flex justify-between">
            <span>Dipinjam:</span>
            <span>{new Date(loan.borrowed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Jatuh tempo:</span>
            <span className={isOverdue || isLastDay ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
              {new Date(loan.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleReturn}
            disabled={isReturning}
            className={`
              py-1.5 px-2 rounded-lg text-xs font-semibold transition-all
              ${isReturning
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}>
            {isReturning ? 'Mengembalikan...' : '✓ Kembalikan'}
          </button>

          <AnimatePresence>
            {canExtend ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleExtend}
                disabled={isExtending}
                className={`
                  py-1.5 px-2 rounded-lg text-xs font-semibold transition-all
                  ${isExtending
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                  }
                `}>
                {isExtending ? 'Perpanjang...' : '+3 Hari'}
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Info Text */}
        {!canExtend && loan.extended && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
            Pinjaman sudah diperpanjang
          </p>
        )}
        {isOverdue && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
            ⚠️ Hubungi librarian untuk pengembalian
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Reading Progress Card - Tampilkan progress membaca
 */

interface ReadingSessionProps {
  session: {
    id: string;
    session_id: string;
    title: string;
    author: string;
    coverUrl: string;
    current_page: number;
    total_pages: number;
    progress_percentage: number;
    status: 'reading' | 'paused' | 'finished';
    last_read_at: string;
  };
  onUpdate?: () => void;
}

export function ReadingProgressCard({ session, onUpdate }: ReadingSessionProps) {
  const { updateProgress, finishReading, pauseReading } = useSmartLending();
  const [isUpdating, setIsUpdating] = useState(false);

  const progressPercent = session.progress_percentage || 0;

  const handleMarkFinished = async () => {
    setIsUpdating(true);
    await finishReading(session.id);
    onUpdate?.();
    setIsUpdating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-slate-200 dark:bg-slate-700">
        {session.coverUrl ? (
          <img src={session.coverUrl} alt={session.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            📖
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {session.status === 'finished' && (
            <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <CheckCircle className="w-3 h-3" />
              SELESAI
            </div>
          )}
          {session.status === 'paused' && (
            <div className="flex items-center gap-1 bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              ⏸ DIJEDA
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <h4 className="font-semibold text-sm truncate dark:text-white">{session.title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3">{session.author}</p>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300">Progress</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            />
          </div>
        </div>

        {/* Page Info */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {session.current_page}/{session.total_pages} halaman
        </p>

        {/* Action Button */}
        {session.status !== 'finished' && (
          <motion.button
            onClick={handleMarkFinished}
            disabled={isUpdating}
            className={`
              w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-all
              ${isUpdating
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}>
            {isUpdating ? '✓ Menyelesaikan...' : '✓ Selesai Dibaca'}
          </motion.button>
        )}

        {session.status === 'finished' && (
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold text-center">
            🎉 Selamat! Buku selesai dibaca
          </p>
        )}
      </div>
    </motion.div>
  );
}
