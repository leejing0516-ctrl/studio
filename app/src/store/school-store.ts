
import { create } from 'zustand';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    increment,
    runTransaction
} from "firebase/firestore";

// This store is now simplified. Most data is fetched directly in components.
// It can be used for actions that need to be called from multiple places.

// Types - These are still useful for type-checking across the app
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
  stock: number;
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
  // The store no longer holds data arrays. Data is fetched from Firestore.
  config: {
    interestRate: number;
    logoUrl?: string;
  };
  // Actions that perform writes to Firestore can be defined here or in a separate actions file.
  // For this example, we'll move them to `lib/firestore-actions.ts` to keep this file clean.
}

export const useSchoolStore = create<SchoolStoreState>((set, get) => ({
  // Initial State
  config: {
    interestRate: 0.01, // 1% interest
  },

  // Actions are now in lib/firestore-actions.ts
}));
