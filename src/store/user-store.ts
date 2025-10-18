import { create } from 'zustand';

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

// Removed persist middleware to simplify and avoid hydration issues.
// State will now be in-memory only and reset on page refresh.
export const useUserStore = create<UserState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
