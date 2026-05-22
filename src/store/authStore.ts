import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  personalized: boolean;
  role: 'reader' | 'admin' | null;
  profileCache: {
    uid: string;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
  } | null;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  setPersonalized: (v: boolean) => void;
  setRole: (role: 'reader' | 'admin' | null) => void;
  setProfileCache: (profile: { uid: string; displayName: string; avatarUrl: string | null; email: string | null } | null) => void;
  clearProfileCache: () => void;
  /** Atomic: set role + stop loading in one render cycle */
  resolveAuth: (role: 'reader' | 'admin' | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      personalized: false,
      role: null,
      profileCache: null,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setPersonalized: (personalized) => set({ personalized }),
      setRole: (role) => set({ role }),
      setProfileCache: (profile) => set({ profileCache: profile }),
      clearProfileCache: () => set({ profileCache: null }),
      resolveAuth: (role) => set({ role, loading: false }),
    }),
    {
      name: 'pustara-auth-cache',
      // Only persist profileCache — never persist loading/user/role so they always
      // start fresh and get resolved by onAuthStateChanged in AuthProvider.
      partialize: (state) => ({ profileCache: state.profileCache }),
      onRehydrateStorage: () => () => {
        // After rehydration, force loading back to true so AuthProvider resolves it
        // correctly via onAuthStateChanged instead of using stale persisted value.
        useAuthStore.setState({ loading: true });
      },
    }
  )
);
