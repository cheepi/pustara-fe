'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getPrivacySettings, updatePrivacySettings, type PrivacySettings, type PrivacySettingsUpdate } from '@/lib/users';

interface UsePrivacySettingsReturn {
  settings: PrivacySettings | null;
  loading: boolean;
  isUpdating: boolean;
  error: string | null;
  updateSetting: (key: keyof PrivacySettings, value: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage privacy settings with backend sync
 * Fetches on mount, debounces updates to prevent API spam (500ms)
 */
export function usePrivacySettings(): UsePrivacySettingsReturn {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer ref
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<PrivacySettingsUpdate>({});

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPrivacySettings();
        if (data) {
          setSettings(data);
        } else {
          setError('Failed to load privacy settings');
        }
      } catch (err) {
        console.error('Error fetching privacy settings:', err);
        setError('Error loading privacy settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Apply debounced update to backend
  const flushPendingUpdates = useCallback(async () => {
    if (Object.keys(pendingUpdatesRef.current).length === 0) return;

    setIsUpdating(true);
    try {
      const updates = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};

      const result = await updatePrivacySettings(updates);
      if (result) {
        setSettings(result);
        setError(null);
      } else {
        setError('Failed to update privacy settings');
      }
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      setError('Error updating privacy settings');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Update a single setting with debouncing
  const updateSetting = useCallback(async (key: keyof PrivacySettings, value: boolean) => {
    // Optimistic update
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    
    // Queue the update
    pendingUpdatesRef.current[key] = value;

    // Clear existing timer
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new debounce timer (500ms)
    updateTimeoutRef.current = setTimeout(() => {
      flushPendingUpdates();
    }, 500);
  }, [flushPendingUpdates]);

  // Refetch settings
  const refetch = useCallback(async () => {
    // Cancel any pending updates first
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    pendingUpdatesRef.current = {};

    setLoading(true);
    setError(null);
    try {
      const data = await getPrivacySettings();
      if (data) {
        setSettings(data);
      } else {
        setError('Failed to load privacy settings');
      }
    } catch (err) {
      console.error('Error refetching privacy settings:', err);
      setError('Error loading privacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    loading,
    isUpdating,
    error,
    updateSetting,
    refetch,
  };
}
