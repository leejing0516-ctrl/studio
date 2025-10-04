
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, getDocs, addDoc } from 'firebase/firestore';

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
  
  const createSetter = <T extends { id: string; _docId?: string }>(
    collectionName: string,
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => async (action: SetStateActionWithFunction<T[]>) => {
    const currentState = typeof action === 'function' ? action(state) : action;
    
    setter(currentState);

    const batch = writeBatch(db);
    const existingDocIds = new Set<string>();

    for (const item of currentState) {
        const itemData: any = { ...item };
        
        if (item._docId) {
             existingDocIds.add(item._docId);
             delete itemData._docId;
             const itemRef = doc(db, collectionName, item._docId);
             batch.set(itemRef, itemData, { merge: true });
        } else {
             // This is a new item, let Firestore generate the ID
             delete itemData.id;
             delete itemData._docId;
             const newDocRef = doc(collection(db, collectionName));
             batch.set(newDocRef, itemData);
        }
    }
      
    const allDocsInDB = await getDocs(query(collection(db, collectionName)));
    allDocsInDB.forEach(doc => {
        if (!existingDocIds.has(doc.id)) {
            let shouldKeep = false;
            // Check if the doc from DB is actually represented in the new state, but just didn't have a _docId yet.
            // This is a safeguard against race conditions on initial load.
            if (currentState.some(item => !item._docId && item.id === doc.data().id)) { // weak check, relies on 'id' property
              shouldKeep = true;
            }
            if(!shouldKeep) {
              // This is a temporary guard to prevent deleting all students if something goes wrong.
              // In a real scenario, a more robust check is needed.
              if (collectionName === 'students' && currentState.length > 0) {
                 const currentStudentDoc = doc.data();
                 if (!currentState.find(s => s.id === currentStudentDoc.id && s.classId === currentStudentDoc.classId)) {
                    batch.delete(doc.ref);
                 }
              } else if (collectionName !== 'students') {
                 batch.delete(doc.ref);
              }
            }
        }
    });


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

    const setupSubscription = (
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        stateKey: keyof LoadingStates
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: any[] = [];
            querySnapshot.forEach(doc => {
                const docData = doc.data();
                // Crucially, we assign Firestore's doc.id to a unique _docId property,
                // and keep the object's original 'id' (like student number) untouched.
                // For collections other than students, their primary id is the doc id.
                 if (collectionName === 'students') {
                    data.push({ ...docData, _docId: doc.id });
                } else {
                    data.push({ ...docData, id: doc.id, _docId: doc.id });
                }
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
    
    subscriptions.push(setupSubscription('students', setStudentsState, 'students'));
    subscriptions.push(setupSubscription('teachers', setTeachersState, 'teachers'));
    subscriptions.push(setupSubscription('classes', setClassesState, 'classes'));
    subscriptions.push(setupSubscription('rewards', setRewardsState, 'rewards'));
    subscriptions.push(setupSubscription('stocks', setStocksState, 'stocks'));
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
