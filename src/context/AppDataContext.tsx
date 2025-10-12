
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { isAfter, startOfDay, differenceInDays } from 'date-fns';
import { isEqual } from 'lodash';


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

const createSetterWithDiffing = <T extends { _docId?: string; id?: any }>(
  collectionName: string,
  currentState: T[],
  useIdAsDocId: boolean = false
) => {
  return async (action: SetStateActionWithFunction<T[]>) => {
    const newState = typeof action === 'function' ? action(currentState) : action;

    try {
      const batch = writeBatch(db);
      const oldStateMap = new Map(currentState.map(item => [useIdAsDocId ? item.id : item._docId, item]));
      const newStateMap = new Map(newState.map(item => [useIdAsDocId ? item.id : item._docId, item]));

      // Detect updates and additions
      for (const [key, newItem] of newStateMap.entries()) {
        const oldItem = oldStateMap.get(key);
        const { _docId, ...itemData } = newItem;
        const docId = useIdAsDocId ? newItem.id : newItem._docId;

        if (!oldItem) {
          // New item
          const ref = docId ? doc(db, collectionName, docId) : doc(collection(db, collectionName));
          batch.set(ref, itemData);
        } else if (!isEqual(oldItem, newItem)) {
          // Updated item
          if (docId) {
            const ref = doc(db, collectionName, docId);
            batch.set(ref, itemData, { merge: true });
          }
        }
      }

      // Detect deletions
      for (const [key, oldItem] of oldStateMap.entries()) {
        if (!newStateMap.has(key)) {
          const docId = useIdAsDocId ? oldItem.id : oldItem._docId;
          if (docId) {
            const ref = doc(db, collectionName, docId);
            batch.delete(ref);
          }
        }
      }

      await batch.commit();
    } catch (error) {
      console.error(`Error syncing diff for ${collectionName}:`, error);
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
  
  const setStudents = createSetterWithDiffing<Student>('students', students);
  const setTeachers = createSetterWithDiffing<Teacher>('teachers', teachers);
  const setRewards = createSetterWithDiffing<Reward>('rewards', rewards);
  const setStocks = createSetterWithDiffing<Stock>('stocks', stocks, true);
  const setClasses = createSetterWithDiffing<Class>('classes', classes, true);

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
            return;
        }

        if (isLoading || students.length === 0) return;

        const batch = writeBatch(db);
        let hasChanges = false;

        students.forEach(student => {
            if (!student._docId) return;

            let studentPoints = student.points;
            let needsUpdate = false;
            let updatePayload: any = {};

            // Process Fixed Deposits
            const updatedDeposits = (student.fixedDeposits || []).map(deposit => {
                if (deposit.status === 'active') {
                    if (isAfter(new Date(), new Date(deposit.maturityDate))) {
                        const totalReturn = deposit.amount + deposit.interestEarned;
                        studentPoints += totalReturn;
                        needsUpdate = true;
                        return { ...deposit, status: 'matured' as const };
                    } else {
                        const newInterest = deposit.interestEarned + (deposit.amount * deposit.interestRate);
                        if (Math.floor(newInterest) > Math.floor(deposit.interestEarned)) {
                            needsUpdate = true;
                            return { ...deposit, interestEarned: newInterest };
                        }
                    }
                }
                return deposit;
            });

            if (needsUpdate) {
              updatePayload.fixedDeposits = updatedDeposits;
            }


            // Process Loans
            const updatedLoans = (student.loans || []).map(loan => {
                let loanNeedsUpdate = false;
                let updatedLoan = { ...loan };

                if (loan.status === 'active') {
                    const todayDate = startOfDay(new Date());
                    if (isAfter(todayDate, new Date(loan.repaymentDate))) {
                        updatedLoan.status = 'overdue' as const;
                        loanNeedsUpdate = true;
                    }
                    const lastAccrued = loan.lastInterestAccruedDate ? new Date(loan.lastInterestAccruedDate) : new Date(loan.approvalDate || loan.requestDate);
                    const daysSinceLastAccrual = differenceInDays(todayDate, lastAccrued);
                    if (daysSinceLastAccrual > 0) {
                        updatedLoan.interest += (loan.amount * loan.interestRate * daysSinceLastAccrual);
                        updatedLoan.lastInterestAccruedDate = todayDate.toISOString();
                        loanNeedsUpdate = true;
                    }
                } else if (loan.status === 'overdue') {
                    const todayDate = startOfDay(new Date());
                    const lastAccrued = loan.lastInterestAccruedDate ? new Date(loan.lastInterestAccruedDate) : new Date(loan.repaymentDate);
                    const daysSinceLastAccrual = differenceInDays(todayDate, lastAccrued);
                    if (daysSinceLastAccrual > 0) {
                        updatedLoan.interest += (loan.amount * loan.interestRate * daysSinceLastAccrual);
                        updatedLoan.lastInterestAccruedDate = new Date().toISOString();
                        loanNeedsUpdate = true;
                    }
                }
                
                if (loanNeedsUpdate) {
                  needsUpdate = true;
                }
                return updatedLoan;
            });
            
            if (needsUpdate) {
              updatePayload.loans = updatedLoans;
            }

            if (student.points !== studentPoints) {
                updatePayload.points = studentPoints;
                needsUpdate = true;
            }

            if (needsUpdate) {
                hasChanges = true;
                const studentRef = doc(db, 'students', student._docId);
                batch.update(studentRef, updatePayload);
            }
        });

        if (hasChanges) {
            try {
                await batch.commit();
                localStorage.setItem('lastFinanceRun', today);
            } catch (error) {
                console.error("Error committing daily finance batch:", error);
            }
        } else {
            localStorage.setItem('lastFinanceRun', today);
        }
    };
    
    const timer = setTimeout(processDailyFinance, 5000);
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
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState, 'stocks', true));
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
