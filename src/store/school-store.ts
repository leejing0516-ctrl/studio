
import { create } from 'zustand';
import {
  mockStudentData,
  mockClasses,
  mockTeachers,
  mockRewards,
  mockStocks,
} from '@/lib/mock-data';

// Types
export interface StudentAsset {
  stockId: string;
  quantity: number;
  purchasePrice: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  points: number;
  assets: StudentAsset[];
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  name: string;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  stock: number; // How many are available
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  price: number;
  history: number[];
}

// Store State
interface SchoolStoreState {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  rewards: Reward[];
  stocks: Stock[];
  config: {
    interestRate: number;
    logoUrl?: string;
  };
  fetchInitialData: () => void;
  getStudentById: (id: string) => Student | undefined;
  getStudentsByClass: (classId: string) => Student[];
  awardPoints: (studentId: string, amount: number) => void;
  redeemReward: (studentId: string, rewardId: string) => { success: boolean, message: string };
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (reward: Reward) => void;
  runInterestSimulator: () => void;
  updateStockPrices: () => void;
}

export const useSchoolStore = create<SchoolStoreState>((set, get) => ({
  // Initial State from mock data
  students: mockStudentData,
  teachers: mockTeachers,
  classes: mockClasses,
  rewards: mockRewards,
  stocks: mockStocks,
  config: {
    interestRate: 0.01, // 1% interest
  },

  // Actions
  fetchInitialData: () => {
    // In a real app, you'd fetch from an API. Here we just ensure state is loaded.
    set({
      students: mockStudentData,
      teachers: mockTeachers,
      classes: mockClasses,
      rewards: mockRewards,
      stocks: mockStocks,
    });
  },

  getStudentById: (id) => {
    return get().students.find((s) => s.id === id);
  },
  
  getStudentsByClass: (classId) => {
    return get().students.filter((s) => s.classId === classId);
  },

  awardPoints: (studentId, amount) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === studentId
          ? { ...student, points: student.points + amount }
          : student
      ),
    }));
  },

  redeemReward: (studentId, rewardId) => {
    const student = get().students.find((s) => s.id === studentId);
    const reward = get().rewards.find((r) => r.id === rewardId);

    if (!student || !reward) {
        return { success: false, message: "Student or reward not found." };
    }
    if (reward.stock <= 0) {
        return { success: false, message: "Reward is out of stock." };
    }
    if (student.points < reward.cost) {
        return { success: false, message: "Not enough points." };
    }

    set((state) => ({
        students: state.students.map((s) =>
            s.id === studentId ? { ...s, points: s.points - reward.cost } : s
        ),
        rewards: state.rewards.map((r) =>
            r.id === rewardId ? { ...r, stock: r.stock - 1 } : r
        ),
    }));

    return { success: true, message: "Reward redeemed successfully!" };
  },

  addReward: (rewardData) => {
    const newReward: Reward = {
      ...rewardData,
      id: `reward-${Date.now()}`,
    };
    set((state) => ({
      rewards: [...state.rewards, newReward],
    }));
  },

  updateReward: (updatedReward) => {
    set((state) => ({
        rewards: state.rewards.map((reward) =>
            reward.id === updatedReward.id ? updatedReward : reward
        ),
    }));
  },
  
  runInterestSimulator: () => {
    set(state => ({
        students: state.students.map(student => ({
            ...student,
            points: Math.floor(student.points * (1 + state.config.interestRate))
        }))
    }));
  },

  updateStockPrices: () => {
    set(state => ({
        stocks: state.stocks.map(stock => {
            const change = (Math.random() - 0.5) * (stock.price * 0.1); // Fluctuate by up to 5%
            const newPrice = Math.max(1, stock.price + change); // Ensure price doesn't go below 1
            const newHistory = [...stock.history.slice(-9), newPrice];
            return {
                ...stock,
                price: newPrice,
                history: newHistory,
            };
        })
    }));
  }

}));
