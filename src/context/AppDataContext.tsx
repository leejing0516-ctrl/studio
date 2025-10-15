
"use client";

import { createContext, useState, ReactNode, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, runTransaction as firestoreRunTransaction, Transaction, writeBatch, getDocs, getDoc, setDoc } from 'firebase/firestore';

type SetStateActionWithFunction<S> = S | ((prevState: S) => S);

interface AppDataContextType {
  rewards: Reward[];
  setRewards: (action: SetStateActionWithFunction<Reward[]>) => Promise<void>;
  stocks: Stock[];
  setStocks: (action: SetStateActionWithFunction<Stock[]>) => Promise<void>;
  classes: Class[];
  setClasses: (action: SetStateActionWithFunction<Class[]>) => Promise<void>;
  students: Student[];
  setStudents: (action: SetStateActionWithFunction<Student[]>) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (action: SetStateActionWithFunction<Teacher[]>) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (dataToUpdate: Partial<PlatformConfig>) => Promise<void>;
  isMarketOpen: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<any>;
  
  // State setters for the provider
  _setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
  _setStocks: React.Dispatch<React.SetStateAction<Stock[]>>;
  _setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  _setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  _setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  _setPlatformConfig: React.Dispatch<React.SetStateAction<PlatformConfig | null>>;
  _setIsMarketOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const defaultState: AppDataContextType = {
  rewards: [],
  setRewards: async () => {},
  stocks: [],
  setStocks: async () => {},
  classes: [],
  setClasses: async () => {},
  students: [],
  setStudents: async () => {},
  teachers: [],
  setTeachers: async () => {},
  platformConfig: null,
  setPlatformConfig: async () => {},
  isMarketOpen: false,
  runTransaction: async () => {},
  _setRewards: () => {},
  _setStocks: () => {},
  _setClasses: () => {},
  _setStudents: () => {},
  _setTeachers: () => {},
  _setPlatformConfig: () => {},
  _setIsMarketOpen: () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const createSetterWithBatch = <T extends { _docId?: string; id?: any }>(
  collectionName: string
): ((action: SetStateActionWithFunction<T[]>, currentState: T[]) => Promise<void>) => {
  return async (action: SetStateActionWithFunction<T[]>, currentState: T[]) => {
    const oldData = currentState;
    const newData = typeof action === 'function' ? action(oldData) : action;
    
    const batch = writeBatch(db);
    
    const oldMap = new Map(oldData.map(item => [item._docId || item.id, item]));
    const newMap = new Map(newData.map(item => [item._docId || item.id, item]));
    
    let hasChanges = false;
    
    oldMap.forEach((_, key) => {
      if (!newMap.has(key)) {
          if (key) {
             batch.delete(doc(db, collectionName, key));
             hasChanges = true;
          }
      }
    });
    
    newMap.forEach((newItem, key) => {
      if (!key) {
          console.error(`Attempted to write to ${collectionName} with no ID`, newItem);
          return;
      }

      const oldItem = oldMap.get(key);
      if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
         const { _docId, ...itemData } = newItem;
         const docRef = doc(db, collectionName, key);
         batch.set(docRef, itemData, { merge: true });
         hasChanges = true;
      }
    });
    
    if (hasChanges) {
        try {
          await batch.commit();
        } catch (error) {
          console.error(`Batch update for ${collectionName} failed:`, error);
          throw error;
        }
    }
  };
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [students, setStudentsState] = useState<Student[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const handleRunTransaction = (updateFunction: (transaction: Transaction) => Promise<any>) => {
      return firestoreRunTransaction(db, updateFunction);
  };

  const setPlatformConfigWithDB = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, dataToUpdate, { merge: true });
  };
  
  const setRewardsWithDB = useCallback(createSetterWithBatch<Reward>('rewards'), []);
  const setStocksWithDB = useCallback(createSetterWithBatch<Stock>('stocks'), []);
  const setClassesWithDB = useCallback(createSetterWithBatch<Class>('classes'), []);
  const setStudentsWithDB = useCallback(createSetterWithBatch<Student>('students'), []);
  const setTeachersWithDB = useCallback(createSetterWithBatch<Teacher>('teachers'), []);

  return (
    <AppDataContext.Provider value={{ 
        rewards, 
        setRewards: (action) => setRewardsWithDB(action, rewards),
        stocks,
        setStocks: (action) => setStocksWithDB(action, stocks),
        classes, 
        setClasses: (action) => setClassesWithDB(action, classes),
        students,
        setStudents: (action) => setStudentsWithDB(action, students),
        teachers,
        setTeachers: (action) => setTeachersWithDB(action, teachers),
        platformConfig,
        setPlatformConfig: setPlatformConfigWithDB,
        isMarketOpen,
        runTransaction: handleRunTransaction,
        // Pass internal setters to the DataInitializer
        _setRewards: setRewardsState,
        _setStocks: setStocksState,
        _setClasses: setClassesState,
        _setStudents: setStudentsState,
        _setTeachers: setTeachersState,
        _setPlatformConfig: setPlatformConfigState,
        _setIsMarketOpen: setIsMarketOpen,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

