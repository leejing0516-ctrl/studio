
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, getDocs, addDoc, getCountFromServer, deleteDoc } from 'firebase/firestore';

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
  setPlatformConfig: (action: SetStateActionWithFunction<PlatformConfig | null>) => Promise<void>;
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
  
  const isSyncing = useRef(false);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);
  
  const setWithFirestoreSync = useCallback(<T extends { _docId?: string; id?: any }>(
    collectionName: string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    useDefinedIdAsDocId: boolean = false
  ) => async (action: SetStateActionWithFunction<T[]>) => {
    isSyncing.current = true;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);

    const newState = await new Promise<T[]>((resolve) => {
        stateSetter(prevState => {
            const updated = typeof action === 'function' ? action(prevState) : action;
            resolve(updated);
            return updated;
        });
    });

    try {
        const batch = writeBatch(db);
        const newDocsMap = new Map(newState.map(item => [item._docId || item.id, item]));
        const oldDocsQuery = await getDocs(query(collection(db, collectionName)));
        const oldDocIds = new Set(oldDocsQuery.docs.map(d => d.id));

        for (const item of newState) {
            const docId = useDefinedIdAsDocId ? item.id : (item._docId || null);
            const { _docId, ...itemData } = item;

            if (docId) {
                const docRef = doc(db, collectionName, docId);
                batch.set(docRef, itemData, { merge: true });
                oldDocIds.delete(docId);
            } else {
                 const docRef = doc(collection(db, collectionName));
                 batch.set(docRef, itemData);
            }
        }
        
        for (const docId of oldDocIds) {
            batch.delete(doc(db, collectionName, docId));
        }

        await batch.commit();
    } catch (error) {
        console.error(`Error syncing ${collectionName}:`, error);
    } finally {
       syncTimeout.current = setTimeout(() => {
         isSyncing.current = false;
       }, 1000);
    }
  }, []);

  const setStudents = setWithFirestoreSync('students', setStudentsState);
  const setTeachers = setWithFirestoreSync('teachers', setTeachersState);
  const setRewards = setWithFirestoreSync('rewards', setRewardsState);
  const setStocks = setWithFirestoreSync('stocks', setStocksState);
  const setClasses = setWithFirestoreSync('classes', setClassesState, true);

  const setPlatformConfigWithFunction = async (action: SetStateActionWithFunction<PlatformConfig | null>) => {
    isSyncing.current = true;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    
    const newConfig = typeof action === 'function' ? action(platformConfig) : { ...platformConfig, ...action };
    
    setPlatformConfigState(newConfig);

    if (newConfig) {
        const { id, ...configData } = newConfig;
        const configRef = doc(db, 'config', 'main');
        await setDoc(configRef, configData, { merge: true });
    }

    syncTimeout.current = setTimeout(() => {
        isSyncing.current = false;
    }, 1000);
  }

  useEffect(() => {
    const allLoaded = Object.values(loadingStates).every(state => state === false);
    setIsLoading(!allLoaded);
  }, [loadingStates]);

  useEffect(() => {
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T extends { id?: string }>(
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        stateKey: keyof LoadingStates,
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
             if (isSyncing.current) {
                console.log(`Syncing in progress, skipping snapshot for ${collectionName}`);
                return;
            }
            const data: (T & { _docId: string })[] = [];
            querySnapshot.forEach(doc => {
                const docData = doc.data() as T;
                const id = doc.id;
                data.push({ ...docData, _docId: id });
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
             if (isSyncing.current) {
                console.log(`Syncing in progress, skipping snapshot for ${docPath.join('/')}`);
                return;
            }
            if (docSnap.exists()) {
                setter({ ...docSnap.data(), id: docSnap.id } as T);
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
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
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
        setPlatformConfig: setPlatformConfigWithFunction,
        isLoading,
        isMarketOpen,
        runTransaction: handleRunTransaction,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
