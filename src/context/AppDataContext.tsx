
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
  setPlatformConfig: (dataToUpdate: Partial<PlatformConfig>) => Promise<void>;
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

const checkMarketOpen = (config: PlatformConfig | null) => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    const openHour = config?.marketOpenHour ?? 9;
    const closeHour = config?.marketCloseHour ?? 14;
    return day >= 1 && day <= 5 && hour >= openHour && hour < closeHour;
};

type LoadingStates = {
    students: boolean;
    teachers: boolean;
    classes: boolean;
    rewards: boolean;
    stocks: boolean;
    config: boolean;
}

const createSetterWithFirestoreSync = <T extends { _docId?: string, id?: any }>(
  collectionName: string,
  useIdAsDocId: boolean = false
) => {
  return async (action: SetStateActionWithFunction<T[]>) => {
    // This is a simplified version. In a real app, you'd get the current state from a reliable source.
    // For this context, we'll assume we need to fetch it first to properly apply the function form of the action.
    const currentDocsQuery = await getDocs(query(collection(db, collectionName)));
    const currentState = currentDocsQuery.docs.map(d => ({ ...d.data(), _docId: d.id })) as T[];
    
    const newState = typeof action === 'function' ? action(currentState) : action;

    try {
      const batch = writeBatch(db);
      const newDocIds = new Set(newState.map(item => useIdAsDocId ? item.id : item._docId).filter(Boolean));

      // Update or add new items
      for (const item of newState) {
        const docId = useIdAsDocId ? item.id : (item._docId || null);
        const { _docId, ...itemData } = item;

        let docRef;
        if (docId) {
            docRef = doc(db, collectionName, docId);
        } else {
            // For brand new items without any ID, create a new doc ref
            docRef = doc(collection(db, collectionName));
        }
        batch.set(docRef, itemData, { merge: true });
      }
      
      // Delete items that are no longer in the new state
      const oldDocIds = new Set(currentState.map(item => useIdAsDocId ? item.id : item._docId).filter(Boolean));
      for (const oldId of oldDocIds) {
        if (!newDocIds.has(oldId)) {
          batch.delete(doc(db, collectionName, oldId));
        }
      }

      await batch.commit();
    } catch (error) {
      console.error(`Error syncing ${collectionName}:`, error);
      throw error;
    }
  };
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

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

  useEffect(() => {
    setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);

    return () => clearInterval(marketInterval);
  }, [platformConfig]);

  const setStudents = createSetterWithFirestoreSync<Student>('students');
  const setTeachers = createSetterWithFirestoreSync<Teacher>('teachers');
  const setRewards = createSetterWithFirestoreSync<Reward>('rewards');
  const setStocks = createSetterWithFirestoreSync<Stock>('stocks');
  const setClasses = createSetterWithFirestoreSync<Class>('classes', true);

  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, dataToUpdate, { merge: true });
  };

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
        useIdAsDocId: boolean = false
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setter(currentData => {
                let updatedData = [...currentData];
                
                querySnapshot.docChanges().forEach((change) => {
                    const docData = change.doc.data() as T;
                    const docId = useIdAsDocId ? docData.id! : change.doc.id;
                    const fullData = { ...docData, _docId: docId };
                    const index = updatedData.findIndex(item => item._docId === docId);

                    if (change.type === "added") {
                        if (index === -1) {
                           updatedData.push(fullData);
                        } else {
                           // This can happen on initial load, treat as modified
                           updatedData[index] = fullData;
                        }
                    }
                    if (change.type === "modified") {
                        if (index !== -1) {
                            updatedData[index] = fullData;
                        }
                    }
                    if (change.type === "removed") {
                        if (index !== -1) {
                            updatedData.splice(index, 1);
                        }
                    }
                });
                return updatedData;
            });

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
    
    subscriptions.push(setupSubscription<Student>('students', setStudentsState, 'students'));
    subscriptions.push(setupSubscription<Teacher>('teachers', setTeachersState, 'teachers'));
    subscriptions.push(setupSubscription<Class>('classes', setClassesState, 'classes', true));
    subscriptions.push(setupSubscription<Reward>('rewards', setRewardsState, 'rewards'));
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState, 'stocks'));
    subscriptions.push(setupDocSubscription<PlatformConfig>(['config', 'main'], setPlatformConfigState, 'config'));

    return () => {
      subscriptions.forEach(unsub => unsub());
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
