
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';

interface AppDataContextType {
  students: Student[];
  setStudents: (students: Student[]) => Promise<void>;
  rewards: Reward[];
  setRewards: (rewards: Reward[]) => Promise<void>;
  stocks: Stock[];
  setStocks: (stocks: Stock[]) => Promise<void>;
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  teachers: Teacher[];
  setTeachers: (teachers: Teacher[]) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (config: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  isMarketOpen: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<any>;
}

const defaultState: AppDataContextType = {
  students: [],
  setStudents: async () => {},
  rewards: [],
  setRewards: async () => {},
  stocks: [],
  setStocks: async () => {},
  classes: [],
  setClasses: () => {},
  teachers: [],
  setTeachers: async () => {},
  platformConfig: null,
  setPlatformConfig: async () => {},
  isLoading: true,
  isMarketOpen: false,
  runTransaction: async () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const checkMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 14;
};

type LoadingStates = {
    students: boolean;
    teachers: boolean;
    classes: boolean;
    rewards: boolean;
    stocks: boolean;
    config: boolean;
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(checkMarketOpen());

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
      students: true,
      teachers: true,
      classes: true,
      rewards: true,
      stocks: true,
      config: true,
  });

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);

  const setStudents = async (students: Student[]) => {
    const batch = firestoreRunTransaction(db, async (transaction) => {
        students.forEach(student => {
            const studentDocId = `${student.classId}-${student.id}`;
            const studentRef = doc(db, 'students', studentDocId);
            transaction.set(studentRef, student, { merge: true });
        });
    });
    await batch;
  }
  
  const setRewards = async (rewards: Reward[]) => {
    const batch = firestoreRunTransaction(db, async (transaction) => {
        rewards.forEach(reward => {
            const rewardRef = doc(db, 'rewards', reward.id);
            transaction.set(rewardRef, reward, { merge: true });
        });
    });
    await batch;
  }
  
  const setStocks = async (stocks: Stock[]) => {
     const batch = firestoreRunTransaction(db, async (transaction) => {
        stocks.forEach(stock => {
            const stockRef = doc(db, 'stocks', stock.ticker);
            transaction.set(stockRef, stock, { merge: true });
        });
    });
    await batch;
  }
  
  const setTeachers = async (teachers: Teacher[]) => {
     const batch = firestoreRunTransaction(db, async (transaction) => {
        teachers.forEach(teacher => {
            const teacherRef = doc(db, 'teachers', teacher.id);
            transaction.set(teacherRef, teacher, { merge: true });
        });
    });
    await batch;
  }
  
  const setPlatformConfig = async (config: Partial<PlatformConfig>) => {
    const configRef = doc(db, 'config', 'main');
    await setDoc(configRef, config, { merge: true });
  }

  useEffect(() => {
    const allLoaded = Object.values(loadingStates).every(state => state === false);
    setIsLoading(!allLoaded);
  }, [loadingStates]);

  useEffect(() => {
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T extends {id: string}>(
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        stateKey: keyof LoadingStates
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: T[] = [];
            querySnapshot.forEach(doc => {
              data.push({ ...doc.data(), id: doc.id } as T);
            });
            setter(data);
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
        }, (error) => {
            console.error(`Error fetching real-time ${collectionName}:`, error);
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
        });
        return unsubscribe;
    };
    
    const setupDocSubscription = <T,>(
        docPath: string[], 
        setter: React.Dispatch<React.SetStateAction<T | null>>,
        stateKey: keyof LoadingStates
    ) => {
        const docRef = doc(db, ...docPath);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setter(docSnap.data() as T);
            } else {
                setter(null);
            }
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
        }, (error) => {
            console.error(`Error fetching real-time doc ${docPath.join('/')}:`, error);
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
        });
        return unsubscribe;
    };

    subscriptions.push(setupSubscription<Student>('students', setStudentsState, 'students'));
    subscriptions.push(setupSubscription<Teacher>('teachers', setTeachersState, 'teachers'));
    subscriptions.push(setupSubscription<Class>('classes', setClassesState, 'classes'));
    subscriptions.push(setupSubscription<Reward>('rewards', setRewardsState, 'rewards'));
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState, 'stocks'));
    subscriptions.push(setupDocSubscription<PlatformConfig>(['config', 'main'], setPlatformConfigState, 'config'));

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
        setStudents,
        rewards, 
        setRewards,
        stocks,
        setStocks,
        classes, 
        setClasses: setClassesState,
        teachers,
        setTeachers,
        platformConfig,
        setPlatformConfig,
        isLoading,
        isMarketOpen,
        runTransaction: handleRunTransaction,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
