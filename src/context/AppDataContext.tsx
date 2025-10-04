
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch } from 'firebase/firestore';

type SetStateAction<S> = S | ((prevState: S) => S);

interface AppDataContextType {
  students: Student[];
  setStudents: (action: SetStateAction<Student[]>) => Promise<void>;
  rewards: Reward[];
  setRewards: (action: SetStateAction<Reward[]>) => Promise<void>;
  stocks: Stock[];
  setStocks: (action: SetStateAction<Stock[]>) => Promise<void>;
  classes: Class[];
  setClasses: (action: SetStateAction<Class[]>) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (action: SetStateAction<Teacher[]>) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (action: SetStateAction<PlatformConfig | null>) => Promise<void>;
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
  setClasses: async () => {},
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

  const createSetter = <T extends { id: string }>(
    currentState: T[],
    collectionName: string
  ) => async (action: SetStateAction<T[]>) => {
    const newState = typeof action === 'function' ? action(currentState) : action;
    const batch = writeBatch(db);
    newState.forEach(item => {
        const itemRef = doc(db, collectionName, item.id);
        batch.set(itemRef, item, { merge: true });
    });
    // Handle deletions if any
    const newStateIds = new Set(newState.map(s => s.id));
    const itemsToDelete = currentState.filter(s => !newStateIds.has(s.id));
    itemsToDelete.forEach(item => {
        const itemRef = doc(db, collectionName, item.id);
        batch.delete(itemRef);
    });

    await batch.commit();
  };

  const setStudents = createSetter(students, 'students');
  const setTeachers = createSetter(teachers, 'teachers');
  const setRewards = createSetter(rewards, 'rewards');
  const setStocks = createSetter(stocks, 'stocks');
  const setClasses = createSetter(classes, 'classes');

  const setPlatformConfig = async (action: SetStateAction<PlatformConfig | null>) => {
    const newConfig = typeof action === 'function' ? action(platformConfig) : action;
    if (newConfig) {
        const configRef = doc(db, 'config', 'main');
        await setDoc(configRef, newConfig, { merge: true });
    }
  }


  useEffect(() => {
    const allLoaded = Object.values(loadingStates).every(state => state === false);
    setIsLoading(!allLoaded);
  }, [loadingStates]);

  useEffect(() => {
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T extends {id?: string}>(
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        stateKey: keyof LoadingStates,
        idKey: string = 'id'
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: T[] = [];
            querySnapshot.forEach(doc => {
              const docData = doc.data();
              data.push({ ...docData, [idKey]: doc.id } as T);
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
    
    subscriptions.push(setupSubscription<Student>('students', (action) => {
        const newStudents = typeof action === 'function' ? action(students) : action;
        setStudentsState(newStudents.map(s => ({ ...s, id: `${s.classId}-${s.id}` })));
    }, 'students'));
    subscriptions.push(setupSubscription<Teacher>('teachers', setTeachersState, 'teachers'));
    subscriptions.push(setupSubscription<Class>('classes', setClassesState, 'classes'));
    subscriptions.push(setupSubscription<Reward>('rewards', setRewardsState, 'rewards'));
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState, 'stocks', 'ticker'));
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
        setClasses,
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
