import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  gender: string | undefined;
  age: string | undefined;
  genres: string[];
  
  // Actions
  setUserProfile: (profile: { gender?: string; age?: string; genres?: string[] }) => void;
  clearUserProfile: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      gender: undefined,
      age: undefined,
      genres: [],
      
      setUserProfile: (profile) => set((state) => ({ ...state, ...profile })),
      clearUserProfile: () => set({ gender: undefined, age: undefined, genres: [] }),
    }),
    {
      name: 'pustara-user-profile', // Nama untuk nyimpen di LocalStorage biar ga ilang pas di-refresh
    }
  )
);