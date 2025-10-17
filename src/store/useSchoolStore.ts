import { create } from 'zustand';
import { Announcement, Challenge, Class, Fundraising, Habit, Pet, PlatformConfig, Reward, Stock, Student, Teacher } from '@/lib/types';

interface SchoolState {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  announcements: Announcement[];
  challenges: Challenge[];
  rewards: Reward[];
  habits: Habit[];
  pets: Pet[];
  stocks: Stock[];
  fundraising: Fundraising[];
  config: PlatformConfig | null;
  setData: (data: Partial<SchoolState>) => void;
}

export const useSchoolStore = create<SchoolState>((set) => ({
  students: [],
  teachers: [],
  classes: [],
  announcements: [],
  challenges: [],
  rewards: [],
  habits: [],
  pets: [],
  stocks: [],
  fundraising: [],
  config: null,
  setData: (data) => set((state) => ({ ...state, ...data })),
}));
