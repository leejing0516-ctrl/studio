
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

// Dummy storage object for server-side rendering
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
      name: 'user-storage', // name of the item in the storage (must be unique)
      // Only use sessionStorage on the client side
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? sessionStorage : dummyStorage
      ),
    }
  )
);
