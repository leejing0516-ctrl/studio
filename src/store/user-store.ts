
import { create } from 'zustand';

// THIS FILE IS NO LONGER USED in favor of a simpler sessionStorage approach
// It is kept to prevent breaking imports, but it does nothing.

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

export const useUserStore = create<UserState>()(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    })
);
