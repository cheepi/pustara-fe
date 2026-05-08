import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  personalized: boolean;
  role: 'reader' | 'admin' | null;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  setPersonalized: (v: boolean) => void;
  setRole: (role: 'reader' | 'admin' | null) => void;
  /** Atomic: set role + stop loading in one render cycle */
  resolveAuth: (role: 'reader' | 'admin' | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  personalized: false,
  role: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setPersonalized: (personalized) => set({ personalized }),
  setRole: (role) => set({ role }),
  resolveAuth: (role) => set({ role, loading: false }),
}));
