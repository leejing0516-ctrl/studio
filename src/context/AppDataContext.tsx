
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';

interface AppDataContextType {
  students: Student[];
  rewards: Reward[];
  stocks: Stock[];
  classes: Class[];
  teachers: Teacher[];
  platformConfig: PlatformConfig | null;
  isLoading: boolean;
  isMarketOpen: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<any>;
  setPlatformConfig: (newConfig: Partial<PlatformConfig>) => Promise<void>;
}

const defaultState: AppDataContextType = {
  students: [],
  rewards: [],
  stocks: [],
  classes: [],
  teachers: [],
  platformConfig: null,
  isLoading: true,
  isMarketOpen: false,
  runTransaction: async () => {},
  setPlatformConfig: async () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const checkMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 14;
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(checkMarketOpen());

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return await runTransaction(db, updateFunction);
  }, []);
  
  const handleSetPlatformConfig = useCallback(async (newConfig: Partial<PlatformConfig>) => {
    const configDocRef = doc(db, 'config', 'main');
    try {
        await setDoc(configDocRef, newConfig, { merge: true });
    } catch(e) {
        console.error("Failed to update platform config:", e);
        throw e; // Re-throw the error to be caught by the caller
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => doc.data() as T);
            setter(data);
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching real-time ${collectionName}:`, error);
            setIsLoading(false);
        });
        return unsubscribe;
    };
    
    const setupDocSubscription = <T,>(docPath: string[], setter: React.Dispatch<React.SetStateAction<T | null>>) => {
        const docRef = doc(db, ...docPath);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setter(docSnap.data() as T);
            } else {
                setter(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching real-time doc ${docPath.join('/')}:`, error);
            setIsLoading(false);
        });
        return unsubscribe;
    };

    subscriptions.push(setupSubscription<Student>('students', setStudentsState));
    subscriptions.push(setupSubscription<Teacher>('teachers', setTeachersState));
    subscriptions.push(setupSubscription<Class>('classes', setClassesState));
    subscriptions.push(setupSubscription<Reward>('rewards', setRewardsState));
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState));
    subscriptions.push(setupDocSubscription<PlatformConfig>(['config', 'main'], setPlatformConfigState));

    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen());
    }, 60000);

    return () => {
      subscriptions.forEach(unsub => unsub());
      clearInterval(marketInterval);
    };
  }, []);

  return (
    <AppDataContext.Provider value={{ 
        students, 
        rewards, 
        stocks,
        classes, 
        teachers,
        platformConfig,
        isLoading,
        isMarketOpen,
        runTransaction: handleRunTransaction,
        setPlatformConfig: handleSetPlatformConfig,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
