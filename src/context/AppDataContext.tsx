
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig, Loan } from '@/lib/types';
import { 
    students as initialStudents, 
    rewards as initialRewards,
    classes as initialClasses,
    teachers as initialTeachers,
    stocks as initialStocks,
    DAILY_INTEREST_RATE,
    TEACHER_PASSWORD,
} from '@/lib/placeholder-data';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { isSameDay, startOfDay, differenceInCalendarDays, parseISO } from 'date-fns';


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
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (newConfig: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  isMarketOpen: boolean;
  loadSensitiveData: () => Promise<{students: Student[], rewards: Reward[], stocks: Stock[]}>;
  seedInitialData: () => Promise<void>;
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
  loadSensitiveData: async () => ({ students: [], rewards: [], stocks: [] }),
  seedInitialData: async () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const checkMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
    // Monday to Friday (1-5), 9am to 2pm (9-13)
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
  const stockUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dailyUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generic fetch function
  const fetchData = useCallback(async <T,>(collectionName: string): Promise<T[]> => {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        // It's okay for collections to be empty initially.
        return snapshot.docs
            .map(doc => ({ ...doc.data() } as T));
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
      }
  }, []);
  
  const seedInitialData = useCallback(async () => {
    console.log("Checking if initial data seeding is necessary...");
    const collectionsToSeed = [
        { name: 'classes', data: initialClasses, setter: setClassesState },
        { name: 'teachers', data: initialTeachers, setter: setTeachersState },
        { name: 'rewards', data: initialRewards, setter: setRewardsState },
        { name: 'stocks', data: initialStocks, setter: setStocksState },
        { name: 'students', data: initialStudents, setter: setStudentsState },
    ];

    const batch = writeBatch(db);
    let writesPending = false;
    let dataUpdated = false;

    for (const { name, data, setter } of collectionsToSeed) {
        const docRef = doc(db, "seeded", name);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() && data.length > 0) {
            console.log(`Seeding collection: ${name}`);
            writesPending = true;
            data.forEach((item: any) => {
                const docId = item.id ? String(item.id) : (item.ticker || null);
                if (docId) {
                    const itemDocRef = doc(db, name, docId);
                    batch.set(itemDocRef, { ...item });
                }
            });
            batch.set(docRef, { seeded: true, date: new Date() });
            setter(data as any);
            dataUpdated = true;
        }
    }
    
    // Seed initial config if not set
    const configDocRef = doc(db, 'config', 'main');
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
        writesPending = true;
        const initialConfig = { teacherPassword: TEACHER_PASSWORD, schoolFunds: 1000000 };
        batch.set(configDocRef, initialConfig, { merge: true });
        setPlatformConfigState(prev => ({ ...(prev || { id: 'main' }), ...initialConfig }));
        dataUpdated = true;
    }


    if (writesPending) {
        try {
            await batch.commit();
            console.log("Initial data successfully seeded to Firestore.");
        } catch (error) {
            console.error("Error seeding data to Firestore:", error);
        }
    } else {
        console.log("No seeding necessary, data already exists.");
    }
    return dataUpdated;
  }, []);
  
  // App initialization function
  const initializePublicData = useCallback(async () => {
    setIsLoading(true);
    try {
        const dataWasSeeded = await seedInitialData();
        
        let configData: PlatformConfig | null = null;
        const configDocRef = doc(db, 'config', 'main');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
            configData = configSnap.data() as PlatformConfig;
        }
        setPlatformConfigState(configData);

        // If data was just seeded, the state is already up-to-date.
        // Otherwise, fetch from Firestore.
        if (!dataWasSeeded) {
            const [classesData, teachersData, stocksData] = await Promise.all([
                fetchData<Class>('classes'),
                fetchData<Teacher>('teachers'),
                fetchData<Stock>('stocks'), // Stocks are public, load them here.
            ]);
            setClassesState(classesData);
            setTeachersState(teachersData);
            setStocksState(stocksData);
        } else {
            // Even if seeded, fetch latest stock data if it's there
             const stocksData = await fetchData<Stock>('stocks');
             setStocksState(stocksData);
        }
    } catch (error) {
        console.error("Error initializing public data from Firestore:", error);
    } finally {
        setIsLoading(false);
    }
  }, [fetchData, seedInitialData]);

  const loadSensitiveData = useCallback(async () => {
    console.log("Loading sensitive data...");
    setIsLoading(true);
    try {
        const [studentsData, rewardsData] = await Promise.all([
            fetchData<Student>('students'),
            fetchData<Reward>('rewards'),
        ]);
        setStudentsState(studentsData);
        setRewardsState(rewardsData);
        // The stocks are already loaded publicly, we just return them
        const currentStocks = await fetchData<Stock>('stocks');
        setStocksState(currentStocks);
        return { students: studentsData, rewards: rewardsData, stocks: currentStocks };
    } catch (error) {
        console.error("Error loading sensitive data:", error);
        return { students: [], rewards: [], stocks: [] };
    } finally {
        setIsLoading(false);
    }
  }, [fetchData]);


  useEffect(() => {
    initializePublicData();
    
    // This interval checks the market status and updates prices if it's open.
    if (stockUpdateIntervalRef.current) {
        clearInterval(stockUpdateIntervalRef.current);
    }
    stockUpdateIntervalRef.current = setInterval(() => {
        const marketOpen = checkMarketOpen();
        setIsMarketOpen(marketOpen);

        if (marketOpen) {
            console.log("Market is open. Updating stock prices...");
            setStocks(prevStocks => {
                if(prevStocks.length === 0) return [];
                const updatedStocks = prevStocks.map(stock => {
                    const changePercent = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5% change
                    const newPrice = stock.price * (1 + changePercent);
                    const change = newPrice - stock.price;
                    
                    return {
                        ...stock,
                        price: Math.max(0.01, newPrice), // Price doesn't go below 0.01
                        change: change,
                        changePercent: (change / stock.price) * 100,
                    };
                });
                return updatedStocks;
            });
        }
    }, 7200000); // Check every 2 hours
    
    // Daily updates for loans
    if (dailyUpdateIntervalRef.current) {
        clearInterval(dailyUpdateIntervalRef.current);
    }
    dailyUpdateIntervalRef.current = setInterval(() => {
        console.log("Running daily updates for loans...");
        setStudents(prevStudents => {
            const today = startOfDay(new Date());
            let hasChanges = false;
            
            const updatedStudents = prevStudents.map(student => {
                if (!student.loans || student.loans.length === 0) return student;

                let studentModified = false;
                
                const updatedLoans = student.loans.map(loan => {
                    if (loan.status !== 'active' && loan.status !== 'overdue') {
                        return loan;
                    }
                    
                    const lastUpdate = startOfDay(loan.lastInterestAccruedDate ? parseISO(loan.lastInterestAccruedDate) : parseISO(loan.approvalDate!));
                    const daysSinceLastUpdate = differenceInCalendarDays(today, lastUpdate);
                    
                    let updatedLoan = {...loan};

                    if (daysSinceLastUpdate > 0) {
                        updatedLoan.interest += daysSinceLastUpdate * DAILY_INTEREST_RATE;
                        updatedLoan.lastInterestAccruedDate = today.toISOString();
                        studentModified = true;
                    }

                    const repaymentDate = startOfDay(parseISO(loan.repaymentDate));
                    if (today > repaymentDate && updatedLoan.status === 'active') {
                        updatedLoan.status = 'overdue';
                        studentModified = true;
                    }

                    return updatedLoan;
                });
                
                if (studentModified) {
                    hasChanges = true;
                    return { ...student, loans: updatedLoans };
                }
                return student;
            });
            
            // This is a functional update for the state, but we return the original
            // students if no changes were made to avoid a re-render.
            return hasChanges ? updatedStudents : prevStudents;
        });
    }, 86400000); // 24 hours

    // Cleanup intervals on component unmount
    return () => {
        if (stockUpdateIntervalRef.current) {
            clearInterval(stockUpdateIntervalRef.current);
        }
        if (dailyUpdateIntervalRef.current) {
            clearInterval(dailyUpdateIntervalRef.current);
        }
    };
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
        const currentIds = new Set(updatedData.map(p => p.id ? String(p.id) : p.ticker));

        updatedData.forEach(item => {
            const docId = item.id ? String(item.id) : (item.ticker || null);
            if (docId) {
                const docRef = doc(db, collectionName, docId);
                batch.set(docRef, { ...item });
            } else {
                console.warn(`Skipping item in ${collectionName} due to missing id/ticker:`, item);
            }
        });

        // Delete items that are in prevData but not in updatedData
        prevData.forEach(item => {
            const docId = item.id ? String(item.id) : (item.ticker || null);
            if(docId && !currentIds.has(docId)) {
                const docRef = doc(db, collectionName, docId);
                batch.delete(docRef);
            }
        })
        
        batch.commit().catch(e => console.error(`Failed to update ${collectionName}`, e));

        return updatedData;
    });
  };

  const setStudents = createUpdater<Student>('students', setStudentsState);
  const setRewards = createUpdater<Reward>('rewards', setRewardsState);
  const setStocks = createUpdater<Stock>('stocks', setStocksState);
  const setClasses = createUpdater<Class>('classes', setClassesState);
  const setTeachers = createUpdater<Teacher>('teachers', setTeachersState);
  
  const setPlatformConfig = async (newConfig: Partial<PlatformConfig>) => {
    const fullConfig = { ...(platformConfig || { id: 'main' }), ...newConfig };
    setPlatformConfigState(fullConfig);
    const configDocRef = doc(db, 'config', 'main');
    try {
        await setDoc(configDocRef, newConfig, { merge: true });
    } catch(e) {
        console.error("Failed to update platform config:", e);
    }
  }


  return (
    <AppDataContext.Provider value={{ 
        students, setStudents, 
        rewards, setRewards, 
        stocks, setStocks, 
        classes, setClasses, 
        teachers, setTeachers,
        platformConfig, setPlatformConfig,
        isLoading,
        isMarketOpen,
        loadSensitiveData,
        seedInitialData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
