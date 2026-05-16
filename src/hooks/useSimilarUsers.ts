'use client';
import { useEffect, useState } from 'react';
import { fetchSimilarUsers } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { AiRecommendation } from '@/types/ai';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

let _cache: { data: AiRecommendation[]; similar_users: number; at: number } | null = null;

export function useSimilarUsers(n = 8) {
  const { user, loading: authLoading } = useAuthStore();
  const [books, setBooks]             = useState<AiRecommendation[]>([]);
  const [similarCount, setSimilarCount] = useState(0);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    const isStale = !_cache || Date.now() - _cache.at > CACHE_TTL_MS;
    if (!isStale && _cache) {
      setBooks(_cache.data);
      setSimilarCount(_cache.similar_users);
      return;
    }

    setLoading(true);
    fetchSimilarUsers(n)
      .then((res) => {
        _cache = { data: res.recommendations, similar_users: res.similar_users, at: Date.now() };
        setBooks(res.recommendations);
        setSimilarCount(res.similar_users);
      })
      .catch(() => {
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [authLoading, user?.uid, n]);

  return { books, similarCount, loading };
}