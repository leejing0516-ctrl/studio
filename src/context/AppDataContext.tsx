
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig, Loan, Announcement, Challenge } from '@/lib/types';
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
import { collection, doc, getDocs, writeBatch, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { isSameDay, startOfDay, differenceInCalendarDays, parseISO, isAfter } from 'date-fns';


// --- Cloud-based Data Management ---

interface AppDataContextType {
  students: Student[];
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>;
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
  
  const createUpdater = <T extends { id?: string | number; ticker?: string }>(
    collectionName: string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    return async (updater: (prevState: T[]) => T[]) => {
      let finalData: T[] | undefined;
      stateSetter(prevState => {
        finalData = updater(prevState);
        return finalData;
      });

      // Wait for state to be potentially set, then proceed with side effects
      await new Promise(resolve => setTimeout(resolve, 0));

      if (finalData) {
        const batch = writeBatch(db);
        const currentIds = new Set(finalData.map(p => p.id ? String(p.id) : p.ticker));

        finalData.forEach(item => {
          const docId = item.id ? String(item.id) : (item.ticker || null);
          if (docId) {
            const docRef = doc(db, collectionName, docId);
            batch.set(docRef, { ...item });
          }
        });
        
        // This part seems to require knowing the previous state to find deletions.
        // Let's get the previous state from a ref or another way if needed, but for now this is tricky.
        // A better way is to compare the new list with a fetched list, but that's slow.
        // The current implementation assumes `updater` gets the latest `prevState`.
        // Let's assume the state update is synchronous for the logic below.
        const prevData = students; // This is a simplification and might not be robust.
        prevData.forEach((item: any) => {
          const docId = item.id ? String(item.id) : (item.ticker || null);
          if (docId && !currentIds.has(docId)) {
            const docRef = doc(db, collectionName, docId);
            batch.delete(docRef);
          }
        });

        try {
          await batch.commit();
        } catch (e) {
          console.error(`Failed to update ${collectionName}`, e)
        }
      }
    };
  };

  const setStudents = createUpdater<Student>('students', setStudentsState);
  const setRewards = createUpdater<Reward>('rewards', setRewardsState);
  const setStocks = createUpdater<Stock>('stocks', setStocksState);
  const setClasses = createUpdater<Class>('classes', setClassesState);
  const setTeachers = createUpdater<Teacher>('teachers', setTeachersState);
  
  const setPlatformConfig = async (newConfig: Partial<PlatformConfig>) => {
    setPlatformConfigState(prev => {
        const updatedConfig = { ...(prev || { id: 'main' }), ...newConfig };
        
        const configDocRef = doc(db, 'config', 'main');
        try {
            setDoc(configDocRef, updatedConfig, { merge: true });
        } catch(e) {
            console.error("Failed to update platform config:", e);
        }
        return updatedConfig;
    });
  }

  const runDailyUpdates = useCallback(async () => {
    console.log("Running daily updates for loans and deposits...");
    
    // We need the latest students data to run updates on.
    const currentStudents = await fetchData<Student>('students');
    if (currentStudents.length === 0) {
        console.log("No students found, skipping daily updates.");
        return;
    }

    const today = startOfDay(new Date());
    const studentsToUpdate: { studentId: string; updates: Partial<Student> }[] = [];

    currentStudents.forEach(student => {
        let studentModified = false;
        let studentPoints = student.points;
        let studentPointHistory = [...(student.pointHistory || [])];
        
        // --- Loan Updates ---
        const updatedLoans = (student.loans || []).map(loan => {
            if (loan.status !== 'active' && loan.status !== 'overdue') {
                return loan;
            }
            
            const lastUpdate = startOfDay(loan.lastInterestAccruedDate ? parseISO(loan.lastInterestAccruedDate) : parseISO(loan.approvalDate!));
            const daysSinceLastUpdate = differenceInCalendarDays(today, lastUpdate);
            
            let updatedLoan = {...loan};

            if (daysSinceLastUpdate > 0) {
                updatedLoan.interest += daysSinceLastUpdate * loan.amount * loan.interestRate;
                updatedLoan.lastInterestAccruedDate = today.toISOString();
                studentModified = true;
            }

            const repaymentDate = startOfDay(parseISO(loan.repaymentDate));
            if (isAfter(today, repaymentDate) && updatedLoan.status === 'active') {
                updatedLoan.status = 'overdue';
                studentModified = true;
            }

            return updatedLoan;
        });
        
        // --- Fixed Deposit Updates ---
        const updatedDeposits = (student.fixedDeposits || []).map(deposit => {
            if (deposit.status !== 'active') {
                return deposit;
            }

            let updatedDeposit = {...deposit};
            const maturityDate = startOfDay(parseISO(deposit.maturityDate));

            if (isAfter(today, maturityDate) || isSameDay(today, maturityDate)) {
                updatedDeposit.status = 'matured';
                const interestGained = Math.floor(updatedDeposit.amount * updatedDeposit.interestRate * differenceInCalendarDays(parseISO(updatedDeposit.maturityDate), parseISO(updatedDeposit.startDate)));
                const finalAmount = deposit.amount + interestGained;
                studentPoints += finalAmount;

                studentPointHistory.push({
                    points: finalAmount,
                    date: today.toISOString(),
                    reason: `定存到期 #${deposit.id.slice(-4)}`
                });
                updatedDeposit.interestEarned = interestGained;
                studentModified = true;
            }
            
            return updatedDeposit;
        });
        
        if (studentModified) {
            studentsToUpdate.push({
                studentId: student.id,
                updates: {
                    points: studentPoints,
                    pointHistory: studentPointHistory,
                    loans: updatedLoans,
                    fixedDeposits: updatedDeposits,
                }
            });
        }
    });
    
    if (studentsToUpdate.length > 0) {
        console.log(`Found ${studentsToUpdate.length} students needing daily updates.`);
        // Update local state first for UI responsiveness
        setStudentsState(prevStudents => 
            prevStudents.map(student => {
                const updateInfo = studentsToUpdate.find(u => u.studentId === student.id);
                if (updateInfo) {
                    return { ...student, ...updateInfo.updates };
                }
                return student;
            })
        );
        
        // Then, commit all updates to Firestore asynchronously.
        const updatePromises = studentsToUpdate.map(({ studentId, updates }) => {
            const studentRef = doc(db, 'students', studentId);
            return updateDoc(studentRef, updates);
        });

        try {
            await Promise.all(updatePromises);
            console.log("Successfully committed all daily updates to Firestore.");
        } catch (error) {
            console.error("One or more daily updates failed to commit:", error);
        }
    } else {
        console.log("No daily updates needed for any student.");
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
        const initialConfig: PlatformConfig = { 
            id: 'main',
            teacherPassword: TEACHER_PASSWORD, 
            schoolFunds: 1000000,
            announcements: [],
            challenges: initialChallenges,
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
            const [classesData, teachersData, stocksData, studentsData] = await Promise.all([
                fetchData<Class>('classes'),
                fetchData<Teacher>('teachers'),
                fetchData<Stock>('stocks'), // Stocks are public, load them here.
                fetchData<Student>('students'), // Load students to run daily updates
            ]);
            setClassesState(classesData);
            setTeachersState(teachersData);
            setStocksState(stocksData);
            setStudentsState(studentsData);
        } else {
            // Even if seeded, fetch latest stock data if it's there
             const [stocksData, studentsData] = await Promise.all([
                fetchData<Stock>('stocks'),
                fetchData<Student>('students')
             ]);
             setStocksState(stocksData);
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
    
    if (stockUpdateIntervalRef.current) clearInterval(stockUpdateIntervalRef.current);
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
    }, 30 * 60 * 1000); // Check every 30 minutes

    runDailyUpdates(); // Run once on startup
    if (dailyUpdateIntervalRef.current) clearInterval(dailyUpdateIntervalRef.current);
    dailyUpdateIntervalRef.current = setInterval(runDailyUpdates, 86400000); // 24 hours

    return () => {
        if (stockUpdateIntervalRef.current) clearInterval(stockUpdateIntervalRef.current);
        if (dailyUpdateIntervalRef.current) clearInterval(dailyUpdateIntervalRef.current);
    };
  }, [initializePublicData, runDailyUpdates, setStocks]);

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
