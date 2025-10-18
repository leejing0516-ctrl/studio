
"use client";
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

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
