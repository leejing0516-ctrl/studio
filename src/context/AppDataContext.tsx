"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useContext } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, runTransaction as firestoreRunTransaction, Transaction, query, onSnapshot, Unsubscribe, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { isAfter, startOfDay, differenceInDays } from 'date-fns';
import { StudentDataContext } from './StudentDataContext';
import { useToast } from '@/hooks/use-toast';

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

const useIdAsDocId = (collectionName: string) => {
  return ['stocks', 'classes'].includes(collectionName);
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const { setStudentData } = useContext(StudentDataContext);
  const { toast } = useToast();

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
  
  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, dataToUpdate, { merge: true });
  };

  const createSetterWithBatch = <T extends { _docId?: string, id?: any }>(collectionName: string) => {
    return async (action: (prevState: T[]) => T[]) => {
      const currentData = (collectionName === 'students' ? students : 
                           collectionName === 'teachers' ? teachers : 
                           collectionName === 'classes' ? classes : 
                           collectionName === 'rewards' ? rewards : stocks) as T[];
      const newData = action(currentData);
      
      const batch = writeBatch(db);
      const useId = useIdAsDocId(collectionName);

      const oldMap = new Map(currentData.map(item => [useId ? item.id : item._docId, item]));
      const newMap = new Map(newData.map(item => [useId ? item.id : item._docId, item]));
      
      oldMap.forEach((_, key) => {
        if (!newMap.has(key)) {
          batch.delete(doc(db, collectionName, key));
        }
      });
      
      newMap.forEach((newItem, key) => {
        const oldItem = oldMap.get(key);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
           const { _docId, ...itemData } = newItem;
           batch.set(doc(db, collectionName, key), itemData, { merge: true });
        }
      });
      
      await batch.commit();
    };
  };

  const setStudents = createSetterWithBatch<Student>('students');
  const setTeachers = createSetterWithBatch<Teacher>('teachers');
  const setRewards = createSetterWithBatch<Reward>('rewards');
  const setStocks = createSetterWithBatch<Stock>('stocks');
  const setClasses = createSetterWithBatch<Class>('classes');
  
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

            const userRole = localStorage.getItem('userRole');
            if (userRole === 'student') {
                const storedClassId = localStorage.getItem('studentClassId');
                const storedStudentId = localStorage.getItem('studentId');
                const storedPassword = localStorage.getItem('studentPassword');

                if (collectionName === 'students' && storedClassId && storedStudentId && storedPassword) {
                    const foundStudent = (data as Student[]).find(s => s.classId === storedClassId && s.id === storedStudentId);
                    if (foundStudent && foundStudent.password === storedPassword) {
                         setStudentData({ student: foundStudent });
                    } else {
                        // This indicates a mismatch, could trigger logout in layout
                        setStudentData({ student: null });
                         toast({ title: "驗證失敗", description: "您的登入資訊已過期或不正確，請重新登入。", variant: "destructive" });
                         localStorage.clear();
                         window.location.href = '/';
                    }
                }
            }

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
  }, [setStudentData, toast]);

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
