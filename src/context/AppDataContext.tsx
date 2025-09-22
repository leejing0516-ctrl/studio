
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig, Loan, Announcement, Challenge, FundraisingProject, PointRecord, FixedDeposit, StudentHabit } from '@/lib/types';
import { 
    students as initialStudents, 
    rewards as initialRewards,
    classes as initialClasses,
    teachers as initialTeachers,
    stocks as initialStocks,
    challenges as initialChallenges,
    TEACHER_PASSWORD,
} from '@/lib/placeholder-data';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, getDoc, updateDoc, deleteDoc, runTransaction, Transaction, query, orderBy, limit } from 'firebase/firestore';


// --- Cloud-based Data Management ---

interface AppDataContextType {
  students: Student[];
  setStudents: (updater: Student[] | ((prev: Student[]) => Student[])) => Promise<void>;
  rewards: Reward[];
  setRewards: (updater: (prev: Reward[]) => Reward[]) => Promise<void>;
  stocks: Stock[];
  setStocks: (updater: (prev: Stock[]) => Stock[]) => Promise<void>;
  classes: Class[];
  setClasses: (updater: (prev: Class[]) => Class[]) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (newConfig: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  isMarketOpen: boolean;
  loadSensitiveData: () => Promise<{students: Student[], rewards: Reward[], stocks: Stock[]}>;
  seedInitialData: () => Promise<void>;
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
  loadSensitiveData: async () => ({ students: [], rewards: [], stocks: [] }),
  seedInitialData: async () => {},
  runTransaction: async () => {},
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
  
  // Generic fetch function
  const fetchData = useCallback(async <T,>(collectionName: string): Promise<T[]> => {
      try {
        let q;
        if (collectionName === 'teachers') {
            q = query(collection(db, collectionName), orderBy('id'));
        } else {
            q = query(collection(db, collectionName));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data() } as T));
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
      }
  }, []);
  
    const setStudents = async (updater: Student[] | ((prev: Student[]) => Student[])) => {
        const originalState = students;
        let intendedState: Student[];

        if (typeof updater === 'function') {
            intendedState = updater(originalState);
        } else {
            intendedState = updater;
        }

        // Optimistic UI update
        setStudentsState(intendedState);

        try {
            const batch = writeBatch(db);
            const originalStudentKeys = new Set(originalState.map(s => `${s.classId}-${s.id}`));
            const intendedStudentKeys = new Set(intendedState.map(s => `${s.classId}-${s.id}`));

            // Handle additions and updates
            intendedState.forEach(student => {
                const studentDocId = `${student.classId}-${student.id}`;
                const studentRef = doc(db, 'students', studentDocId);
                batch.set(studentRef, student, { merge: true });
            });

            // Handle deletions
            originalState.forEach(student => {
                const studentDocId = `${student.classId}-${student.id}`;
                if (!intendedStudentKeys.has(studentDocId)) {
                    const studentRef = doc(db, 'students', studentDocId);
                    batch.delete(studentRef);
                }
            });

            await batch.commit();

        } catch (error) {
            console.error(`Transaction failed for students: `, error);
            // Rollback on failure
            setStudentsState(originalState);
            // Optionally, show an error toast to the user
            throw error;
        }
    };

    const setRewards = async (updater: (prev: Reward[]) => Reward[]) => {
        const currentState = await fetchData<Reward>('rewards');
        const finalState = updater(currentState);
        
        try {
            const batch = writeBatch(db);
            finalState.forEach(reward => {
                const rewardRef = doc(db, 'rewards', String(reward.id));
                batch.set(rewardRef, reward);
            });
            // Handle deletions
            const finalIds = new Set(finalState.map(r => r.id));
            currentState.forEach(reward => {
                if (!finalIds.has(reward.id)) {
                    batch.delete(doc(db, 'rewards', String(reward.id)));
                }
            });
            await batch.commit();
            const freshRewards = await fetchData<Reward>('rewards');
            setRewardsState(freshRewards);
        } catch (error) {
            console.error("Failed to update rewards:", error);
            setRewardsState(currentState);
        }
    };
    
    const setStocks = async (updater: (prev: Stock[]) => Stock[]) => {
        const currentState = await fetchData<Stock>('stocks');
        const finalState = updater(currentState);
        
        try {
            const batch = writeBatch(db);
            finalState.forEach(stock => {
                const stockRef = doc(db, 'stocks', stock.ticker);
                batch.set(stockRef, stock);
            });
            const finalIds = new Set(finalState.map(s => s.ticker));
            currentState.forEach(stock => {
                if (!finalIds.has(stock.ticker)) {
                    batch.delete(doc(db, 'stocks', stock.ticker));
                }
            });
            await batch.commit();
            const freshStocks = await fetchData<Stock>('stocks');
            setStocksState(freshStocks);
        } catch (error) {
            console.error("Failed to update stocks:", error);
            setStocksState(currentState);
        }
    };

    const setClasses = async (updater: (prev: Class[]) => Class[]) => {
        const currentState = await fetchData<Class>('classes');
        const finalState = updater(currentState);
        
        try {
            const batch = writeBatch(db);
            finalState.forEach(c => {
                const classRef = doc(db, 'classes', c.id);
                batch.set(classRef, c);
            });
            const finalIds = new Set(finalState.map(c => c.id));
            currentState.forEach(c => {
                if (!finalIds.has(c.id)) {
                    batch.delete(doc(db, 'classes', c.id));
                }
            });
            await batch.commit();
            const freshClasses = await fetchData<Class>('classes');
            setClassesState(freshClasses);
        } catch (error) {
            console.error("Failed to update classes:", error);
            setClassesState(currentState);
        }
    };

    const setTeachers = async (updater: (prev: Teacher[]) => Teacher[]) => {
        const currentState = await fetchData<Teacher>('teachers');
        const finalState = updater(currentState);
        
        try {
            const batch = writeBatch(db);
            finalState.forEach(teacher => {
                const teacherRef = doc(db, 'teachers', teacher.id);
                batch.set(teacherRef, teacher);
            });
             const finalIds = new Set(finalState.map(t => t.id));
            currentState.forEach(teacher => {
                if (!finalIds.has(teacher.id)) {
                    batch.delete(doc(db, 'teachers', teacher.id));
                }
            });
            await batch.commit();
            const freshTeachers = await fetchData<Teacher>('teachers');
            setTeachersState(freshTeachers);
        } catch (error) {
            console.error("Failed to update teachers:", error);
            setTeachersState(currentState);
        }
    };

  const setPlatformConfig = async (newConfig: Partial<PlatformConfig>) => {
    const configDocRef = doc(db, 'config', 'main');
    try {
        await setDoc(configDocRef, newConfig, { merge: true });
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
            setPlatformConfigState(configSnap.data() as PlatformConfig);
        }
    } catch(e) {
        console.error("Failed to update platform config:", e);
    }
  }

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
                let docId = item.id;
                if (name === 'stocks') docId = item.ticker;
                if (name === 'students') docId = `${item.classId}-${item.id}`;

                if (docId) {
                    const itemDocRef = doc(db, name, String(docId));
                    batch.set(itemDocRef, { ...item }, { merge: true });
                }
            });
            batch.set(docRef, { seeded: true, date: new Date() });
            setter(data as any);
            dataUpdated = true;
        }
    }
    
    const configDocRef = doc(db, 'config', 'main');
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
        writesPending = true;
        const initialConfig: PlatformConfig = { 
            id: 'main',
            teacherPassword: TEACHER_PASSWORD, 
            schoolFunds: 1000000,
            announcements: [],
            challenges: initialChallenges,
            fundraisingProjects: [],
            fixedDepositInterestRate: 0.01, // 1% daily
            loanInterestRate: 0.005, // 0.5% daily
        };
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

        if (!dataWasSeeded) {
            const [classesData, teachersData, stocksData, rewardsData, studentsData] = await Promise.all([
                fetchData<Class>('classes'),
                fetchData<Teacher>('teachers'),
                fetchData<Stock>('stocks'), 
                fetchData<Reward>('rewards'), 
                fetchData<Student>('students'), 
            ]);
            setClassesState(classesData);
            setTeachersState(teachersData);
            setStocksState(stocksData);
            setRewardsState(rewardsData);
            setStudentsState(studentsData);
        } else {
             const [stocksData, rewardsData, studentsData] = await Promise.all([
                fetchData<Stock>('stocks'),
                fetchData<Reward>('rewards'),
                fetchData<Student>('students'),
             ]);
             setStocksState(stocksData);
             setRewardsState(rewardsData);
             setStudentsState(studentsData);
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
        const studentsData = await fetchData<Student>('students');
        setStudentsState(studentsData);
        
        return { students: studentsData, rewards: rewards, stocks: stocks };
    } catch (error) {
        console.error("Error loading sensitive data:", error);
        return { students: [], rewards: [], stocks: [] };
    } finally {
        setIsLoading(false);
    }
  }, [fetchData, rewards, stocks]);
  
  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return await runTransaction(db, updateFunction);
  }, []);

  // Simplified useEffect to only handle market open/close and initial data load.
  useEffect(() => {
    initializePublicData();

    // Set up an interval to check if the market is open
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen());
    }, 60000); // Check every minute

    return () => {
      clearInterval(marketInterval);
    };
  }, [initializePublicData]);


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
        runTransaction: handleRunTransaction,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
