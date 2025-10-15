
"use client";

import React, { createContext, useCallback, ReactNode } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { doc, writeBatch, runTransaction as firestoreRunTransaction, Transaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Student, Teacher, Reward, Challenge, Class, PlatformConfig, Stock } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type AppDataContextType = {
  students: Student[];
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>;
  rewards: Reward[];
  setRewards: (updater: (prev: Reward[]) => Reward[]) => Promise<void>;
  challenges: Challenge[];
  setChallenges: (updater: (prev: Challenge[]) => Challenge[]) => Promise<void>;
  stocks: Stock[];
  setStocks: (updater: (prev: Stock[]) => Stock[]) => Promise<void>;
  classes: Class[];
  setClasses: (updater: (prev: Class[]) => Class[]) => Promise<void>;
  platformConfig: PlatformConfig | undefined;
  setPlatformConfig: (updates: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<void>;
};

export const AppDataContext = createContext<AppDataContextType>({
  students: [],
  setStudents: async () => {},
  teachers: [],
  setTeachers: async () => {},
  rewards: [],
  setRewards: async () => {},
  challenges: [],
  setChallenges: async () => {},
  stocks: [],
  setStocks: async () => {},
  classes: [],
  setClasses: async () => {},
  platformConfig: undefined,
  setPlatformConfig: async () => {},
  isLoading: true,
  runTransaction: async () => {},
});

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const { students, teachers, classes, config, setStudents: setStoreStudents, setTeachers: setStoreTeachers, setClasses: setStoreClasses, setConfig: setStoreConfig, loading } = useSchoolStore();
  const { toast } = useToast();

  const createBatchUpdater = <T extends { id: string; _docId?: string }>(
    collectionName: string,
    currentItems: T[],
    setStoreItems: (items: T[]) => void
  ) => async (updater: (prev: T[]) => T[]) => {
    const newItems = updater(currentItems);
    setStoreItems(newItems); // Optimistic update

    try {
      const batch = writeBatch(db);
      newItems.forEach(item => {
        if (item._docId) {
          const { _docId, ...dataToSave } = item;
          const docRef = doc(db, collectionName, _docId);
          batch.set(docRef, dataToSave, { merge: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error(`Batch update failed for ${collectionName}:`, error);
      toast({ title: "資料同步失敗", description: `更新 ${collectionName} 時發生錯誤`, variant: "destructive" });
      setStoreItems(currentItems); // Revert on failure
    }
  };

  const setConfig = async (updates: Partial<PlatformConfig>) => {
    const currentConfig = config || { id: 'main' };
    const newConfig = { ...currentConfig, ...updates };
    setStoreConfig(newConfig as PlatformConfig); // Optimistic update

    try {
      const configRef = doc(db, "config", "main");
      await firestoreRunTransaction(db, async (transaction) => {
        transaction.set(configRef, updates, { merge: true });
      });
    } catch (error) {
       console.error("Config update failed:", error);
       toast({ title: "設定儲存失敗", variant: "destructive" });
       setStoreConfig(currentConfig as PlatformConfig); // Revert
    }
  };

  const runTransaction = async (updateFunction: (transaction: Transaction) => Promise<any>) => {
     try {
       await firestoreRunTransaction(db, updateFunction);
     } catch (error: any) {
        console.error("Transaction failed:", error);
        throw error;
     }
  };
  
  const setStudents = createBatchUpdater('students', students, setStoreStudents);
  const setTeachers = createBatchUpdater('teachers', teachers, setStoreTeachers);
  const setClasses = createBatchUpdater('classes', classes, setStoreClasses);

  // Rewards, Challenges, Stocks are part of config
  const createConfigArrayUpdater = <K extends keyof PlatformConfig>(key: K) => 
    async (updater: (prev: any[]) => any[]) => {
      const currentItems = config?.[key] || [];
      const newItems = updater(currentItems as any[]);
      await setConfig({ [key]: newItems });
  };
  
  const setRewards = createConfigArrayUpdater('rewards');
  const setChallenges = createConfigArrayUpdater('challenges');
  const setStocks = createConfigArrayUpdater('stocks');

  return (
    <AppDataContext.Provider value={{
      students,
      setStudents,
      teachers,
      setTeachers,
      rewards: config?.rewards || [],
      setRewards,
      challenges: config?.challenges || [],
      setChallenges,
      stocks: config?.stocks || [],
      setStocks,
      classes,
      setClasses,
      platformConfig: config,
      setPlatformConfig: setConfig,
      isLoading: loading,
      runTransaction,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
