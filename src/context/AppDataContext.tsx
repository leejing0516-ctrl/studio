
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

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);
  
  // Specialized setter for Students, which uses a composite key for _docId
  const setStudentsWithFunction = async (action: SetStateActionWithFunction<Student[]>) => {
      if (isSyncing.current) return;
      const oldState = students;
      const newState = typeof action === 'function' ? action(oldState) : action;

      if (JSON.stringify(oldState) === JSON.stringify(newState)) return;
      
      setStudentsState(newState);

      const batch = writeBatch(db);
      const oldStateMap = new Map(oldState.map(s => s._docId || `${s.classId}-${s.id}`));
      
      for (const student of newState) {
          const docId = student._docId || `${student.classId}-${student.id}`;
          const studentRef = doc(db, 'students', docId);
          const { _docId, ...studentData } = student;
          
          batch.set(studentRef, studentData, { merge: true });
          if(oldStateMap.has(docId)) {
             oldStateMap.delete(docId);
          }
      }

      for (const docId of oldStateMap.keys()) {
          if(docId) {
             batch.delete(doc(db, 'students', docId));
          }
      }

      await batch.commit();
  };

  const createGenericSetter = <T extends { _docId?: string; id?: string }>(
      collectionName: string,
      currentState: T[],
      stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ) => async (action: SetStateActionWithFunction<T[]>) => {
      if (isSyncing.current) return;
      const oldState = currentState;
      const newState = typeof action === 'function' ? action(oldState) : action;

      if (JSON.stringify(oldState) === JSON.stringify(newState)) return;
      
      stateSetter(newState);

      const batch = writeBatch(db);
      const oldDocsMap = new Map(oldState.map(item => [item._docId, item]));
      
      for (const item of newState) {
          const docId = item._docId; 
          if (docId) {
              // Existing document
              const docRef = doc(db, collectionName, docId);
              const { _docId, ...itemData } = item;
              batch.set(docRef, itemData, { merge: true });
              oldDocsMap.delete(docId);
          } else {
              // New document
              const newDocRef = doc(collection(db, collectionName));
              const { _docId, ...itemData } = item;
              batch.set(newDocRef, itemData);
          }
      }

      // Delete items that are no longer in the new state
      for (const docId of oldDocsMap.keys()) {
          if (docId) {
              batch.delete(doc(db, collectionName, docId));
          }
      }
      
      await batch.commit();
  };
  
  const setTeachers = createGenericSetter('teachers', teachers, setTeachersState);
  const setRewards = createGenericSetter('rewards', rewards, setRewardsState);
  const setStocks = createGenericSetter('stocks', stocks, setStocksState);
  const setClasses = createGenericSetter('classes', classes, setClassesState);

  const setPlatformConfigWithFunction = async (action: SetStateActionWithFunction<PlatformConfig | null>) => {
    if (isSyncing.current) return;
    
    const oldConfig = platformConfig;
    const newConfig = typeof action === 'function' ? action(platformConfig) : { ...platformConfig, ...action };
    
    if (JSON.stringify(oldConfig) === JSON.stringify(newConfig)) {
        return;
    }
    
    setPlatformConfigState(newConfig);

    if (newConfig) {
        const { id, ...configData } = newConfig;
        const configRef = doc(db, 'config', 'main');
        await setDoc(configRef, configData, { merge: true });
    }
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
            isSyncing.current = true;
            const data: (T & { _docId: string })[] = [];
            querySnapshot.forEach(doc => {
                const docData = doc.data() as T;
                const id = doc.id;
                if (collectionName === 'students') {
                     // For students, the doc.id is the composite key (e.g., '6A-1').
                     // We only add _docId and keep the original 'id' from the document data.
                     data.push({ ...docData, _docId: id });
                } else {
                     // For all other collections, the doc.id is the primary identifier.
                     // We set both 'id' and '_docId' to this value for consistency.
                     data.push({ ...docData, id: id, _docId: id });
                }
            });
            setter(data);
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
            setTimeout(() => { isSyncing.current = false; }, 100);
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
            isSyncing.current = true;
            if (docSnap.exists()) {
                setter({ ...docSnap.data(), id: docSnap.id } as T);
            } else {
                setter(null);
            }
            setLoadingStates(prev => ({...prev, [stateKey]: false}));
            setTimeout(() => { isSyncing.current = false; }, 100);
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
        setStudents: setStudentsWithFunction,
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
