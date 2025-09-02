
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
import { collection, doc, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';


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
  loadSensitiveData: () => Promise<{students: Student[], rewards: Reward[], stocks: Stock[]}>;
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
  loadSensitiveData: async () => ({ students: [], rewards: [], stocks: [] }),
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sensitiveDataLoaded, setSensitiveDataLoaded] = useState(false);

  // Generic fetch function - now only reads data
  const fetchData = useCallback(async <T,>(collectionName: string): Promise<T[]> => {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      if (snapshot.empty) {
          console.warn(`Firestore collection '${collectionName}' is empty. Please seed it manually if this is not expected.`);
          return [];
      }
      return snapshot.docs
        .filter(doc => doc.id !== '--metadata--') // Filter out any metadata doc
        .map(doc => ({ ...doc.data() } as T));
  }, []);
  
  // App initialization function
  const initializePublicData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [classesData, teachersData] = await Promise.all([
            fetchData<Class>('classes'),
            fetchData<Teacher>('teachers'),
        ]);
        setClassesState(classesData);
        setTeachersState(teachersData);
    } catch (error) {
        console.error("Error initializing public data from Firestore:", error);
    } finally {
        setIsLoading(false);
    }
  }, [fetchData]);

  const loadSensitiveData = useCallback(async () => {
    // No need to check sensitiveDataLoaded here as it will be called explicitly
    console.log("Loading sensitive data...");
    setIsLoading(true);
    try {
        const [studentsData, rewardsData, stocksData] = await Promise.all([
            fetchData<Student>('students'),
            fetchData<Reward>('rewards'),
            fetchData<Stock>('stocks'),
        ]);
        setStudentsState(studentsData);
        setRewardsState(rewardsData);
        setStocksState(stocksData);
        setSensitiveDataLoaded(true); // Mark as loaded
        return { students: studentsData, rewards: rewardsData, stocks: stocksData };
    } catch (error) {
        console.error("Error loading sensitive data:", error);
        return { students: [], rewards: [], stocks: [] };
    } finally {
        setIsLoading(false);
    }
  }, [fetchData]);


  useEffect(() => {
    // Only load public data on initial load
    initializePublicData();
  }, [initializePublicData]);

  // Generic update function
  const createUpdater = <T extends { id?: string | number; ticker?: string }>(
    collectionName: string, 
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => async (newData: T[] | ((prev: T[]) => T[])) => {
    // Use a function for the setter to get the most up-to-date previous state
    setter(prevData => {
        const updatedData = typeof newData === 'function' ? newData(prevData) : newData;
        
        const batch = writeBatch(db);
        updatedData.forEach(item => {
            // Determine the document ID, preferring 'id' over 'ticker'
            const docId = item.id ? String(item.id) : (item.ticker || null);
            if (docId) {
                const docRef = doc(db, collectionName, docId);
                // Ensure plain objects are written to Firestore
                batch.set(docRef, { ...item });
            } else {
                console.warn(`Skipping item in ${collectionName} due to missing id/ticker:`, item);
            }
        });
        
        // Asynchronously commit the batch and handle potential errors
        batch.commit().catch(e => console.error(`Failed to update ${collectionName}`, e));

        // Return the new state for React to render
        return updatedData;
    });
  };

  const setStudents = createUpdater<Student>('students', setStudentsState);
  const setRewards = createUpdater<Reward>('rewards', setRewardsState);
  const setStocks = createUpdater<Stock>('stocks', setStocksState);
  const setClasses = createUpdater<Class>('classes', setClassesState);
  const setTeachers = createUpdater<Teacher>('teachers', setTeachersState);


  return (
    <AppDataContext.Provider value={{ 
        students, setStudents, 
        rewards, setRewards, 
        stocks, setStocks, 
        classes, setClasses, 
        teachers, setTeachers,
        isLoading,
        loadSensitiveData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
