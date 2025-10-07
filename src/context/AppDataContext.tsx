
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, getDocs, addDoc, getCountFromServer, deleteDoc } from 'firebase/firestore';
import { isAfter, startOfDay, differenceInDays } from 'date-fns';


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
  
  // Effect for daily financial processing (interest, loans, etc.)
  useEffect(() => {
    const processDailyFinance = async () => {
        const lastRun = localStorage.getItem('lastFinanceRun');
        const today = startOfDay(new Date()).toISOString().split('T')[0]; // YYYY-MM-DD

        if (lastRun === today) {
            // console.log("Daily finance has already been processed today.");
            return;
        }

        if (isLoading || students.length === 0) return;

        // console.log("Running daily finance processing...");
        const batch = writeBatch(db);
        let hasChanges = false;

        students.forEach(student => {
            if (!student._docId) return;

            let studentPoints = student.points;
            let needsUpdate = false;

            // Process Fixed Deposits
            const updatedDeposits = (student.fixedDeposits || []).map(deposit => {
                if (deposit.status === 'active') {
                    if (isAfter(new Date(), new Date(deposit.maturityDate))) {
                        // Deposit has matured
                        const totalReturn = deposit.amount + deposit.interestEarned;
                        studentPoints += totalReturn;
                        needsUpdate = true;
                        return { ...deposit, status: 'matured' as const };
                    } else {
                         // Accrue interest
                        const newInterest = deposit.interestEarned + (deposit.amount * deposit.interestRate);
                        if (Math.floor(newInterest) > Math.floor(deposit.interestEarned)) {
                            needsUpdate = true;
                            return { ...deposit, interestEarned: newInterest };
                        }
                    }
                }
                return deposit;
            });

            // Process Loans
            const updatedLoans = (student.loans || []).map(loan => {
                if (loan.status === 'active') {
                    const todayDate = startOfDay(new Date());
                    if (isAfter(todayDate, new Date(loan.repaymentDate))) {
                        // Loan is overdue
                         needsUpdate = true;
                        return { ...loan, status: 'overdue' as const };
                    } else {
                        // Accrue interest
                        const lastAccrued = loan.lastInterestAccruedDate ? new Date(loan.lastInterestAccruedDate) : new Date(loan.approvalDate || loan.requestDate);
                        const daysSinceLastAccrual = differenceInDays(todayDate, lastAccrued);
                        
                        if (daysSinceLastAccrual > 0) {
                            const newInterest = loan.interest + (loan.amount * loan.interestRate * daysSinceLastAccrual);
                            needsUpdate = true;
                            return { ...loan, interest: newInterest, lastInterestAccruedDate: todayDate.toISOString() };
                        }
                    }
                }
                 if (loan.status === 'overdue') { // Continue accruing interest on overdue loans
                    const lastAccrued = loan.lastInterestAccruedDate ? new Date(loan.lastInterestAccruedDate) : new Date(loan.repaymentDate);
                    const daysSinceLastAccrual = differenceInDays(startOfDay(new Date()), lastAccrued);
                    if (daysSinceLastAccrual > 0) {
                        const newInterest = loan.interest + (loan.amount * loan.interestRate * daysSinceLastAccrual);
                        needsUpdate = true;
                        return { ...loan, interest: newInterest, lastInterestAccruedDate: new Date().toISOString() };
                    }
                }
                return loan;
            });

            if (needsUpdate) {
                hasChanges = true;
                const studentRef = doc(db, 'students', student._docId);
                batch.update(studentRef, { 
                    points: studentPoints, 
                    fixedDeposits: updatedDeposits,
                    loans: updatedLoans
                });
            }
        });

        if (hasChanges) {
            try {
                await batch.commit();
                // console.log("Daily finance processing successful.");
                localStorage.setItem('lastFinanceRun', today);
            } catch (error) {
                console.error("Error committing daily finance batch:", error);
            }
        } else {
            // console.log("No financial changes to process today.");
            localStorage.setItem('lastFinanceRun', today); // Mark as run even if no changes
        }
    };
    
    // Run once a day, with a timeout to ensure data is loaded.
    const timer = setTimeout(processDailyFinance, 5000); // Wait 5 seconds after initial load
    return () => clearTimeout(timer);

  }, [isLoading, students]);


  useEffect(() => {
    const allLoaded = Object.values(loadingStates).every(state => state === false);
    setIsLoading(!allLoaded);
  }, [loadingStates]);

  useEffect(() => {
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T extends { id?: string, _docId?: string }>(
        collectionName: string, 
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        stateKey: keyof LoadingStates,
        useIdAsDocId: boolean = false
    ) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: any[] = [];
            querySnapshot.forEach(doc => {
                 data.push({
                    ...doc.data(),
                    _docId: doc.id,
                    ...(useIdAsDocId && { id: doc.id })
                });
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
