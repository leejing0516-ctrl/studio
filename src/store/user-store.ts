
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = {
  id: string;
  name: string;
  type: 'student' | 'teacher';
};

interface UserState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// This is a dummy storage object that does nothing.
// It's used on the server-side where sessionStorage is not available.
const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'user-storage',
      // Use createJSONStorage to provide a fallback for SSR.
      // On the client, it will use sessionStorage. On the server, it will use the dummy storage.
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.sessionStorage : dummyStorage
      ),
    }
  )
);
