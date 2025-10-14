
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useContext } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, deleteDoc, getDocs, where, addDoc } from 'firebase/firestore';
import { isAfter, startOfDay, differenceInDays } from 'date-fns';

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
  fetchInitialData: () => Promise<void>;
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
  fetchInitialData: async () => {},
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
  return ['stocks', 'classes'].includes(collectionName);
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

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [
            studentsSnap,
            teachersSnap,
            classesSnap,
            rewardsSnap,
            stocksSnap,
        ] = await Promise.all([
            getDocs(collection(db, "students")),
            getDocs(collection(db, "teachers")),
            getDocs(collection(db, "classes")),
            getDocs(collection(db, "rewards")),
            getDocs(collection(db, "stocks")),
        ]);

        const studentsData = studentsSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })) as Student[];
        const teachersData = teachersSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })) as Teacher[];
        const classesData = classesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, _docId: doc.id })) as Class[];
        const rewardsData = rewardsSnap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })) as Reward[];
        const stocksData = stocksSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, _docId: doc.id })) as Stock[];
        
        setStudentsState(studentsData);
        setTeachersState(teachersData);
        setClassesState(classesData);
        setRewardsState(rewardsData);
        setStocksState(stocksData);

        const configRef = doc(db, 'config', 'main');
        onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setPlatformConfigState({ ...docSnap.data(), id: docSnap.id } as PlatformConfig);
            }
        });

    } catch (error) {
        console.error("Error fetching initial data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);

  useEffect(() => {
    setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);
    return () => clearInterval(marketInterval);
  }, [platformConfig]);
  
  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, dataToUpdate, { merge: true });
  };

  const createSetterWithBatch = <T extends { _docId?: string, id?: any }>(
    collectionName: string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    currentState: T[]
  ) => {
    return async (action: SetStateActionWithFunction<T[]>) => {
      const newData = typeof action === 'function' ? action(currentState) : action;
      stateSetter(newData); // Optimistic update
      
      const batch = writeBatch(db);
      const useId = useIdAsDocId(collectionName);

      const oldMap = new Map(currentState.map(item => [useId ? item.id : item._docId, item]));
      const newMap = new Map(newData.map(item => [useId ? item.id : item._docId, item]));
      
      oldMap.forEach((_, key) => {
        if (!newMap.has(key)) {
          batch.delete(doc(db, collectionName, key));
        }
      });
      
      newMap.forEach((newItem, key) => {
        const oldItem = oldMap.get(key);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
           const { _docId, ...itemData } = newItem;
           const docRef = doc(db, collectionName, key);
           batch.set(docRef, itemData, { merge: true });
        }
      });
      
      try {
        await batch.commit();
      } catch (error) {
        console.error(`Batch update for ${collectionName} failed:`, error);
        // Optionally revert optimistic update
        stateSetter(currentState);
      }
    };
  };

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

