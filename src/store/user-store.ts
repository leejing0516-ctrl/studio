
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
      name: 'user-storage', // name of the item in the storage (must be unique)
      // Conditionally choose storage based on the environment.
      // On the server, use a dummy storage that does nothing.
      // On the client, use sessionStorage.
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? sessionStorage : dummyStorage
      ),
    }
  )
);
