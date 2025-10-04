
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, getDocs, addDoc } from 'firebase/firestore';
import { students as initialStudents } from '@/lib/placeholder-data';

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

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return firestoreRunTransaction(db, updateFunction);
  }, []);
  
  const createSetter = <T extends { id: string; _docId?: string; classId?: string; }>(
    collectionName: string,
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => async (action: SetStateActionWithFunction<T[]>) => {
    const currentState = typeof action === 'function' ? action(state) : action;
    setter(currentState);

    const batch = writeBatch(db);
    const docIdsInState = new Set<string>();

    for (const item of currentState) {
      if (item._docId) {
        docIdsInState.add(item._docId);
        const { _docId, ...itemData } = item;
        const itemRef = doc(db, collectionName, _docId);
        batch.set(itemRef, itemData, { merge: true });
      } else {
        // This is a new item
        let newDocRef;
        if (collectionName === 'students' && item.classId && item.id) {
          // Use composite key for students to prevent duplicates
          newDocRef = doc(db, collectionName, `${item.classId}-${item.id}`);
        } else {
          // Let Firestore generate ID for other collections
          newDocRef = doc(collection(db, collectionName));
        }
        batch.set(newDocRef, item);
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error(`Batch write for ${collectionName} failed:`, error);
    }
  };

  const setStudents = createSetter<Student>('students', students, setStudentsState);
  const setTeachers = createSetter<Teacher>('teachers', teachers, setTeachersState);
  const setRewards = createSetter<Reward>('rewards', rewards, setRewardsState);
  const setStocks = createSetter<Stock>('stocks', stocks, setStocksState);
  const setClasses = createSetter<Class>('classes', classes, setClassesState);
  
  const setPlatformConfigWithFunction = async (action: SetStateActionWithFunction<PlatformConfig | null>) => {
    const newConfig = typeof action === 'function' ? action(platformConfig) : { ...platformConfig, ...action };
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

    const setupSubscription = <T extends { id: string }>(
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        stateKey: keyof LoadingStates,
        isStudentCollection: boolean = false
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            if (isStudentCollection && querySnapshot.empty) {
                console.log("Student collection is empty, attempting to restore from placeholder data...");
                try {
                    const batch = writeBatch(db);
                    initialStudents.forEach(student => {
                        const docRef = doc(db, 'students', `${student.classId}-${student.id}`);
                        batch.set(docRef, student);
                    });
                    await batch.commit();
                    console.log("Successfully restored students from placeholder data.");
                    // Data will be re-fetched by onSnapshot, so we don't set state here.
                    return;
                } catch (error) {
                    console.error("Failed to restore student data:", error);
                }
            }

            const data: T[] = [];
            querySnapshot.forEach(doc => {
                const docData = doc.data() as T;
                const id = isStudentCollection ? (docData as any).id : doc.id;
                data.push({ ...docData, id: id, _docId: doc.id });
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
    
    subscriptions.push(setupSubscription<Student>('students', setStudentsState, 'students', true));
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
