import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// This is a dummy storage object that does nothing.
// It's used on the server-side where sessionStorage is not available.
const dummyStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

type User = {
  id: string;
  name: string;
  type: 'student' | 'teacher';
};

interface UserState {
  // Use `undefined` to signify that the user state is still loading from storage.
  user: User | null | undefined;
  login: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: undefined, // Start with undefined to indicate loading state
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
      // This is crucial: it prevents the store from rehydrating on the server,
      // avoiding the mismatch between server and client.
      skipHydration: true, 
    }
  )
);
