
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, writeBatch, deleteDoc } from 'firebase/firestore';

type SetStateActionWithFunction<S> = S | ((prevState: S) => S);

interface AppDataContextType {
  students: Student[];
  setStudents: (action: SetStateActionWithFunction<Student[]>) => Promise<void>;
  rewards: Reward[];
  setRewards: (action: SetStateActionWithFunction<Reward[]>) => Promise<void>;
  stocks: Stock[];
  setStocks: (action: SetStateActionWithFunction<Stock[]>) => Promise<void>;
  classes: Class[];
  setClasses: (action: SetStateActionWithFunction<Class[]>) => Promise<void>;
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
  students: [],
  setStudents: async () => {},
  rewards: [],
  setRewards: async () => {},
  stocks: [],
  setStocks: async () => {},
  classes: [],
  setClasses: async () => {},
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
  return ['stocks', 'classes', 'rewards'].includes(collectionName);
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);
  
  const createSetterWithBatch = <T extends { _docId?: string; id?: any }>(
    collectionName: string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    currentState: T[]
  ) => {
    return async (action: SetStateActionWithFunction<T[]>) => {
      const oldData = currentState;
      const newData = typeof action === 'function' ? action(oldData) : action;
      
      stateSetter(newData); // Optimistic update
      
      const batch = writeBatch(db);
      const useId = useIdAsDocId(collectionName);

      const oldMap = new Map(oldData.map(item => [useId ? item.id : item._docId, item]));
      const newMap = new Map(newData.map(item => [useId ? item.id : item._docId, item]));
      
      oldMap.forEach((_, key) => {
        if (!newMap.has(key)) {
            if (key) batch.delete(doc(db, collectionName, key));
        }
      });
      
      newMap.forEach((newItem, key) => {
        const oldItem = oldMap.get(key);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
           const { _docId, ...itemData } = newItem;
           const docId = useId ? newItem.id : key;
           if (!docId) return;
           const docRef = doc(db, collectionName, docId);
           batch.set(docRef, itemData, { merge: true });
        }
      });
      
      try {
        await batch.commit();
      } catch (error) {
        console.error(`Batch update for ${collectionName} failed:`, error);
        stateSetter(oldData); // Revert on failure
      }
    };
  };

  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await firestoreRunTransaction(db, async (transaction) => {
          transaction.set(configRef, dataToUpdate, { merge: true });
      });
  };

  const fetchInitialData = useCallback(() => {
    const collectionsToListen: { name: string, setter: React.Dispatch<React.SetStateAction<any>> }[] = [
        { name: 'students', setter: setStudentsState },
        { name: 'classes', setter: setClassesState },
        { name: 'teachers', setter: setTeachersState },
        { name: 'rewards', setter: setRewardsState },
        { name: 'stocks', setter: setStocksState },
    ];

    const unsubs = collectionsToListen.map(c => {
        return onSnapshot(collection(db, c.name), (snapshot) => {
            c.setter(snapshot.docs.map(d => {
                const data = d.data();
                const docId = c.name === 'students' ? `${data.classId}-${data.id}` : d.id;
                return { ...data, id: data.id || d.id, _docId: docId };
            }));
        });
    });
    
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
        if (doc.exists()) {
            setPlatformConfigState(doc.data() as PlatformConfig);
        }
    });
    unsubs.push(unsubConfig);

    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubs.push(() => clearTimeout(timer));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);
    return () => clearInterval(marketInterval);
  }, [platformConfig]);

  return (
    <AppDataContext.Provider value={{ 
        students, 
        setStudents: createSetterWithBatch('students', setStudentsState, students),
        rewards, 
        setRewards: createSetterWithBatch('rewards', setRewardsState, rewards),
        stocks,
        setStocks: createSetterWithBatch('stocks', setStocksState, stocks),
        classes, 
        setClasses: createSetterWithBatch('classes', setClassesState, classes),
        teachers,
        setTeachers: createSetterWithBatch('teachers', setTeachersState, teachers),
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
