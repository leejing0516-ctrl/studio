
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig, Loan, Announcement, Challenge, FundraisingProject, Backup, StudentBackup } from '@/lib/types';
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
import { isSameDay, startOfDay, differenceInCalendarDays, parseISO, isAfter } from 'date-fns';


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
  fetchBackups: () => Promise<Backup[]>;
  createBackup: (description?: string) => Promise<void>;
  restoreFromBackup: (backup: Backup) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
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
  fetchBackups: async () => [],
  createBackup: async () => {},
  restoreFromBackup: async () => {},
  deleteBackup: async () => {},
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

  const runDailyUpdates = useCallback(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    console.log(`Checking if daily updates should be run at ${now.toLocaleTimeString()}`);
    
    // Condition 1: Only run at or after noon.
    if (currentHour < 12) {
      console.log("It's before noon. Skipping daily updates.");
      return;
    }

    try {
        // Condition 2: Check if a daily backup for today already exists.
        const latestBackupQuery = query(collection(db, 'backups'), orderBy('createdAt', 'desc'), limit(1));
        const latestBackupSnap = await getDocs(latestBackupQuery);
        const today = startOfDay(new Date());
        
        if (!latestBackupSnap.empty) {
            const latestBackup = latestBackupSnap.docs[0].data() as Backup;
            const lastBackupDate = startOfDay(new Date(latestBackup.createdAt));

            if (isSameDay(lastBackupDate, today) && latestBackup.description?.includes("每日自動備份")) {
                console.log("Daily auto-backup has already been run today. Skipping all daily tasks.");
                return;
            }
        }
        
        console.log("Running daily tasks: Interest calculation, deposits, and auto-backup...");

        const allStudents = await fetchData<Student>('students');
        if (allStudents.length === 0) {
            console.log("No students found, skipping daily tasks.");
            return;
        }
        
        let studentsModified = false;
        const studentBatch = writeBatch(db);

        allStudents.forEach(student => {
            let needsUpdate = false;
            let studentPoints = student.points;
            let studentPointHistory = [...(student.pointHistory || [])];
            
            const updatedLoans = (student.loans || []).map(loan => {
                if (loan.status !== 'active' && loan.status !== 'overdue') return loan;
                
                const lastUpdate = startOfDay(loan.lastInterestAccruedDate ? parseISO(loan.lastInterestAccruedDate) : parseISO(loan.approvalDate!));
                const daysSinceLastUpdate = differenceInCalendarDays(today, lastUpdate);
                
                let updatedLoan = {...loan};
                if (daysSinceLastUpdate > 0) {
                    updatedLoan.interest += daysSinceLastUpdate * loan.amount * loan.interestRate;
                    updatedLoan.lastInterestAccruedDate = today.toISOString();
                    needsUpdate = true;
                }
                const repaymentDate = startOfDay(parseISO(loan.repaymentDate));
                if (isAfter(today, repaymentDate) && updatedLoan.status === 'active') {
                    updatedLoan.status = 'overdue';
                    needsUpdate = true;
                }
                return updatedLoan;
            });
            
            const updatedDeposits = (student.fixedDeposits || []).map(deposit => {
                if (deposit.status !== 'active') return deposit;

                const maturityDate = startOfDay(parseISO(deposit.maturityDate));
                if (isAfter(today, maturityDate) || isSameDay(today, maturityDate)) {
                    const interestGained = Math.floor(deposit.amount * deposit.interestRate * differenceInCalendarDays(maturityDate, parseISO(deposit.startDate)));
                    studentPoints += deposit.amount + interestGained;
                    studentPointHistory.push({
                        points: deposit.amount + interestGained,
                        date: today.toISOString(),
                        reason: `定存 #${deposit.id.slice(-4)} 到期結算`
                    });
                    needsUpdate = true;
                    return {
                        ...deposit,
                        status: 'settled' as const,
                        interestEarned: interestGained,
                    };
                }
                return deposit;
            });
            
            if (needsUpdate) {
                studentsModified = true;
                const studentDocId = `${student.classId}-${student.id}`;
                const studentRef = doc(db, 'students', studentDocId);
                studentBatch.update(studentRef, {
                    points: studentPoints,
                    pointHistory: studentPointHistory,
                    loans: updatedLoans,
                    fixedDeposits: updatedDeposits,
                });
            }
        });
        
        if (studentsModified) {
            console.log(`Found students needing daily updates. Adding to batch...`);
        }

        console.log("Performing automated daily backup...");
        const backupId = new Date().toISOString();
        const backupRef = doc(db, 'backups', backupId);
        const studentsToBackup: StudentBackup[] = allStudents.map(s => ({
            id: s.id,
            classId: s.classId,
            points: s.points,
        }));
        studentBatch.set(backupRef, {
            id: backupId,
            createdAt: backupId,
            description: "每日自動備份",
            students: studentsToBackup,
        });
        console.log("New daily backup added to batch.");
        
        const backupsQuery = query(collection(db, 'backups'), orderBy('createdAt', 'desc'));
        const backupSnaps = await getDocs(backupsQuery);
        if (backupSnaps.docs.length >= 7) { 
            console.log(`Pruning old backups. Found ${backupSnaps.docs.length}, keeping 7.`);
            const backupsToDelete = backupSnaps.docs.slice(6); 
            backupsToDelete.forEach(docToDelete => {
                console.log(`Scheduling deletion for backup: ${docToDelete.id}`);
                studentBatch.delete(docToDelete.ref);
            });
        }
        
        await studentBatch.commit();
        console.log("Successfully committed all daily tasks to Firestore.");
        
        const updatedStudents = await fetchData<Student>('students');
        setStudentsState(updatedStudents);

    } catch(error) {
        console.error("Error during daily updates:", error);
    }
  }, [fetchData]);

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
            loanInterestRate: 0.005, // 0.5% daily,
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

  const fetchBackups = useCallback(async (): Promise<Backup[]> => {
    const backupsQuery = query(collection(db, 'backups'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(backupsQuery);
    return snapshot.docs.map(doc => doc.data() as Backup);
  }, []);

  const createBackup = useCallback(async (description?: string): Promise<void> => {
    const now = new Date();
    const backupId = now.toISOString();
    const backupRef = doc(db, 'backups', backupId);

    const studentsToBackup: StudentBackup[] = students.map(s => ({
      id: s.id,
      classId: s.classId,
      points: s.points
    }));

    const newBackup: Backup = {
      id: backupId,
      createdAt: backupId,
      description: description || "手動備份 (Manual Backup)",
      students: studentsToBackup,
    };

    await setDoc(backupRef, newBackup);
  }, [students]);

  const restoreFromBackup = useCallback(async (backup: Backup): Promise<void> => {
      try {
        const batch = writeBatch(db);
        backup.students.forEach(studentBackup => {
          const studentDocId = `${studentBackup.classId}-${studentBackup.id}`;
          const studentRef = doc(db, 'students', studentDocId);
          batch.update(studentRef, { points: studentBackup.points });
        });
        await batch.commit();

        const updatedStudents = await fetchData<Student>('students');
        setStudentsState(updatedStudents);

      } catch (error) {
        console.error("Failed to restore from backup:", error);
        throw error;
      }
  }, [fetchData]);

  const deleteBackup = useCallback(async (backupId: string): Promise<void> => {
    try {
      const backupRef = doc(db, 'backups', backupId);
      await deleteDoc(backupRef);
    } catch (error) {
      console.error("Failed to delete backup:", error);
      throw error;
    }
  }, []);


  useEffect(() => {
    initializePublicData();
    
    if (stockUpdateIntervalRef.current) clearInterval(stockUpdateIntervalRef.current);
    stockUpdateIntervalRef.current = setInterval(() => {
        const marketOpen = checkMarketOpen();
        setIsMarketOpen(marketOpen);

        if (marketOpen) {
            setStocksState(prevStocks => {
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
                const batch = writeBatch(db);
                updatedStocks.forEach(stock => {
                    const stockRef = doc(db, 'stocks', stock.ticker);
                    batch.update(stockRef, { 
                        price: stock.price, 
                        change: stock.change, 
                        changePercent: stock.changePercent 
                    });
                });
                batch.commit().catch(e => console.error("Failed to batch update stock prices:", e));
                return updatedStocks;
            });
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    const firstRun = setTimeout(() => runDailyUpdates(), 10000); // Run once 10s after startup
    if (dailyUpdateIntervalRef.current) clearInterval(dailyUpdateIntervalRef.current);
    dailyUpdateIntervalRef.current = setInterval(runDailyUpdates, 3600000); // Run every hour to check if it's a new day

    return () => {
        clearTimeout(firstRun);
        if (stockUpdateIntervalRef.current) clearInterval(stockUpdateIntervalRef.current);
        if (dailyUpdateIntervalRef.current) clearInterval(dailyUpdateIntervalRef.current);
    };
  }, [initializePublicData, runDailyUpdates]);

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
        fetchBackups,
        createBackup,
        restoreFromBackup,
        deleteBackup,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

    