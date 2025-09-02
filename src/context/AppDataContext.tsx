
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock } from '@/lib/types';
import { 
    students as initialStudents, 
    rewards as initialRewards,
    classes as initialClasses,
    teachers as initialTeachers,
    stocks as initialStocks
} from '@/lib/placeholder-data';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc } from 'firebase/firestore';


// --- Cloud-based Data Management ---

interface AppDataContextType {
  students: Student[];
  setStudents: (newStudents: Student[] | ((prev: Student[]) => Student[])) => Promise<void>;
  rewards: Reward[];
  setRewards: (newRewards: Reward[] | ((prev: Reward[]) => Reward[])) => Promise<void>;
  stocks: Stock[];
  setStocks: (newStocks: Stock[] | ((prev: Stock[]) => Stock[])) => Promise<void>;
  classes: Class[];
  setClasses: (newClasses: Class[] | ((prev: Class[]) => Class[])) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (newTeachers: Teacher[] | ((prev: Teacher[]) => Teacher[])) => Promise<void>;
  isLoading: boolean;
  initializeAppData: () => Promise<void>;
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
  isLoading: true,
  initializeAppData: async () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generic fetch function
  const fetchData = useCallback(async <T,>(collectionName: string, initialState: T[]): Promise<T[]> => {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      if (snapshot.empty) {
          // If the collection is empty, seed it with initial data
          const batch = writeBatch(db);
          initialState.forEach((item: any) => {
              const docId = item.id ? String(item.id) : item.ticker;
              const docRef = doc(db, collectionName, docId);
              batch.set(docRef, item);
          });
          await batch.commit();
          console.log(`Seeded ${collectionName} collection.`);
          return initialState;
      }
      return snapshot.docs.map(doc => ({ ...doc.data() } as T));
  }, []);
  
  // App initialization function
  const initializeAppData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [studentsData, rewardsData, stocksData, classesData, teachersData] = await Promise.all([
            fetchData<Student>('students', initialStudents),
            fetchData<Reward>('rewards', initialRewards),
            fetchData<Stock>('stocks', initialStocks),
            fetchData<Class>('classes', initialClasses),
            fetchData<Teacher>('teachers', initialTeachers),
        ]);
        setStudentsState(studentsData);
        setRewardsState(rewardsData);
        setStocksState(stocksData);
        setClassesState(classesData);
        setTeachersState(teachersData);
    } catch (error) {
        console.error("Error initializing app data from Firestore:", error);
        // Optionally handle error state here
    } finally {
        setIsLoading(false);
    }
  }, [fetchData]);


  useEffect(() => {
    initializeAppData();
  }, [initializeAppData]);

  // Generic update function
  const createUpdater = <T extends { id?: string | number; ticker?: string }>(
    collectionName: string, 
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => async (newData: T[] | ((prev: T[]) => T[])) => {
    setter(prevData => {
        const updatedData = typeof newData === 'function' ? newData(prevData) : newData;
        
        const batch = writeBatch(db);
        updatedData.forEach(item => {
            const docId = item.id ? String(item.id) : item.ticker;
            if (docId) {
                const docRef = doc(db, collectionName, docId);
                batch.set(docRef, item);
            }
        });
        
        batch.commit().catch(e => console.error(`Failed to update ${collectionName}`, e));

        return updatedData;
    });
  };

  const setStudents = createUpdater<Student>('students', setStudentsState);
  const setRewards = createUpdater<Reward>('rewards', setRewardsState);
  const setStocks = createUpdater<Stock>('stocks', setStocksState);
  const setClasses = createUpdater<Class>('classes', setClassesState);
  const setTeachers = createUpdater<Teacher>('teachers', setTeachersState);


  // NOTE: Stock simulation logic should be moved to a server-side function (e.g., Firebase Cloud Function)
  // that runs on a schedule (e.g., daily at 5 PM). The client-side simulation is removed to ensure data consistency.
  // The function would read from Firestore, update prices, and write them back.

  return (
    <AppDataContext.Provider value={{ 
        students, setStudents, 
        rewards, setRewards, 
        stocks, setStocks, 
        classes, setClasses, 
        teachers, setTeachers,
        isLoading,
        initializeAppData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
