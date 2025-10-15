
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isMarketOpen: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<any>;
  fetchInitialData: () => () => void;
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
  isLoading: true,
  setIsLoading: () => {},
  isMarketOpen: false,
  runTransaction: async () => {},
  fetchInitialData: () => () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const checkMarketOpen = (config: PlatformConfig | null) => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const openHour = config?.marketOpenHour ?? 9;
    const closeHour = config?.marketCloseHour ?? 14;
    return day >= 1 && day <= 5 && hour >= openHour && hour < closeHour;
};

const useIdAsDocId = (collectionName: string) => {
  return ['stocks', 'classes', 'rewards', 'teachers'].includes(collectionName);
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [students, setStudentsState] = useState<Student[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const fetchInitialData = useCallback(() => {
    setIsLoading(true);
    
    const collectionsToListen: { name: string, setter: React.Dispatch<React.SetStateAction<any>> }[] = [
        { name: 'classes', setter: setClassesState },
        { name: 'rewards', setter: setRewardsState },
        { name: 'stocks', setter: setStocksState },
        { name: 'students', setter: setStudentsState },
        { name: 'teachers', setter: setTeachersState },
    ];

    const unsubs = collectionsToListen.map(c => {
        return onSnapshot(collection(db, c.name), (snapshot) => {
            c.setter(snapshot.docs.map(d => ({ ...d.data(), _docId: d.id })));
        });
    });
    
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
        if (doc.exists()) {
            setPlatformConfigState(doc.data() as PlatformConfig);
        }
        // Set loading to false after config is fetched, as it's the last piece.
        setIsLoading(false);
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubConfig();
    };
  }, []);

  const handleRunTransaction = (updateFunction: (transaction: Transaction) => Promise<any>) => {
      return firestoreRunTransaction(db, updateFunction);
  };

  const createSetterWithBatch = <T extends { _docId?: string; id?: any }>(
    collectionName: string,
    currentState: T[],
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ): ((action: SetStateActionWithFunction<T[]>) => Promise<void>) => {
    return async (action: SetStateActionWithFunction<T[]>) => {
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
        // Deep compare to avoid unnecessary writes
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
            // No optimistic update here, rely on onSnapshot to update state
          } catch (error) {
            console.error(`Batch update for ${collectionName} failed:`, error);
            throw error; // Rethrow to be caught by caller
          }
      }
    };
  };

  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, dataToUpdate, { merge: true });
  };

  useEffect(() => {
    setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);
    return () => clearInterval(marketInterval);
  }, [platformConfig]);

  return (
    <AppDataContext.Provider value={{ 
        rewards, 
        setRewards: createSetterWithBatch('rewards', rewards, setRewardsState),
        stocks,
        setStocks: createSetterWithBatch('stocks', stocks, setStocksState),
        classes, 
        setClasses: createSetterWithBatch('classes', classes, setClassesState),
        students,
        setStudents: createSetterWithBatch('students', students, setStudentsState),
        teachers,
        setTeachers: createSetterWithBatch('teachers', teachers, setTeachersState),
        platformConfig,
        setPlatformConfig,
        isLoading,
        setIsLoading,
        isMarketOpen,
        runTransaction: handleRunTransaction,
        fetchInitialData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
