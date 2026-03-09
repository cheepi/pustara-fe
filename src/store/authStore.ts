import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  personalized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  setPersonalized: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  personalized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setPersonalized: (personalized) => set({ personalized }),
}));
