
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig, Loan, Announcement, Challenge, FundraisingProject, PointRecord, FixedDeposit, StudentHabit } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, setDoc, getDoc, updateDoc, deleteDoc, runTransaction, Transaction, query, onSnapshot, Unsubscribe } from 'firebase/firestore';


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

const checkMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = now.getHours();
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

  const setStudents = async (updater: Student[] | ((prev: Student[]) => Student[])) => {
      const originalState = students;
      let intendedState: Student[];

      if (typeof updater === 'function') {
          intendedState = updater(originalState);
      } else {
          intendedState = updater;
      }
      
      try {
          const batch = writeBatch(db);
          const originalStudentKeys = new Set(originalState.map(s => `${s.classId}-${s.id}`));
          const intendedStudentKeys = new Set(intendedState.map(s => `${s.classId}-${s.id}`));

          intendedState.forEach(student => {
              const studentDocId = `${student.classId}-${student.id}`;
              const studentRef = doc(db, 'students', studentDocId);
              batch.set(studentRef, student, { merge: true });
          });

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
          throw error;
      }
  };

  const setRewards = async (updater: (prev: Reward[]) => Reward[]) => {
      const finalState = updater(rewards);
      try {
          const batch = writeBatch(db);
          finalState.forEach(reward => {
              const rewardRef = doc(db, 'rewards', String(reward.id));
              batch.set(rewardRef, reward);
          });
          const finalIds = new Set(finalState.map(r => r.id));
          rewards.forEach(reward => {
              if (!finalIds.has(reward.id)) {
                  batch.delete(doc(db, 'rewards', String(reward.id)));
              }
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to update rewards:", error);
      }
  };
    
  const setStocks = async (updater: (prev: Stock[]) => Stock[]) => {
      const finalState = updater(stocks);
      try {
          const batch = writeBatch(db);
          finalState.forEach(stock => {
              const stockRef = doc(db, 'stocks', stock.ticker);
              batch.set(stockRef, stock, { merge: true });
          });
          const finalIds = new Set(finalState.map(s => s.ticker));
          stocks.forEach(stock => {
              if (!finalIds.has(stock.ticker)) {
                  batch.delete(doc(db, 'stocks', stock.ticker));
              }
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to update stocks:", error);
      }
  };

  const setClasses = async (updater: (prev: Class[]) => Class[]) => {
      const finalState = updater(classes);
      try {
          const batch = writeBatch(db);
          finalState.forEach(c => {
              const classRef = doc(db, 'classes', c.id);
              batch.set(classRef, c);
          });
          const finalIds = new Set(finalState.map(c => c.id));
          classes.forEach(c => {
              if (!finalIds.has(c.id)) {
                  batch.delete(doc(db, 'classes', c.id));
              }
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to update classes:", error);
      }
  };

  const setTeachers = async (updater: (prev: Teacher[]) => Teacher[]) => {
      const finalState = updater(teachers);
      try {
          const batch = writeBatch(db);
          finalState.forEach(teacher => {
              const teacherRef = doc(db, 'teachers', teacher.id);
              batch.set(teacherRef, teacher);
          });
           const finalIds = new Set(finalState.map(t => t.id));
          teachers.forEach(teacher => {
              if (!finalIds.has(teacher.id)) {
                  batch.delete(doc(db, 'teachers', teacher.id));
              }
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to update teachers:", error);
      }
  };

  const setPlatformConfig = async (newConfig: Partial<PlatformConfig>) => {
    const configDocRef = doc(db, 'config', 'main');
    try {
        await setDoc(configDocRef, newConfig, { merge: true });
    } catch(e) {
        console.error("Failed to update platform config:", e);
        throw e; // Re-throw the error so the caller can handle it
    }
  }

  const handleRunTransaction = useCallback(async (updateFunction: (transaction: Transaction) => Promise<any>) => {
    return await runTransaction(db, updateFunction);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const subscriptions: Unsubscribe[] = [];

    const setupSubscription = <T>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => doc.data() as T);
            setter(data);
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching real-time ${collectionName}:`, error);
            setIsLoading(false);
        });
        return unsubscribe;
    };
    
    const setupDocSubscription = <T>(docPath: string[], setter: React.Dispatch<React.SetStateAction<T | null>>) => {
        const docRef = doc(db, ...docPath);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setter(docSnap.data() as T);
            } else {
                setter(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching real-time doc ${docPath.join('/')}:`, error);
            setIsLoading(false);
        });
        return unsubscribe;
    };

    subscriptions.push(setupSubscription<Student>('students', setStudentsState));
    subscriptions.push(setupSubscription<Teacher>('teachers', setTeachersState));
    subscriptions.push(setupSubscription<Class>('classes', setClassesState));
    subscriptions.push(setupSubscription<Reward>('rewards', setRewardsState));
    subscriptions.push(setupSubscription<Stock>('stocks', setStocksState));
    subscriptions.push(setupDocSubscription<PlatformConfig>(['config', 'main'], setPlatformConfigState));


    // Set up an interval to check if the market is open
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen());
    }, 60000);

    return () => {
      subscriptions.forEach(unsub => unsub());
      clearInterval(marketInterval);
    };
  }, []);

  useEffect(() => {
    if (isMarketOpen && !isLoading) {
        const stockUpdateInterval = setInterval(() => {
            const updatedStocks = stocks.map(stock => {
                // (Math.random() - 0.485) creates a slight upward bias
                const changePercent = (Math.random() - 0.485) * 0.02; // max 1% change
                const newPrice = stock.price * (1 + changePercent);
                const change = newPrice - stock.price;
                
                return {
                    ...stock,
                    price: newPrice,
                    change: change,
                    changePercent: (change / stock.price) * 100,
                };
            });
            // This will trigger the onSnapshot listener for other clients
            setStocks(() => updatedStocks); 
        }, 15000); // Update every 15 seconds

        return () => clearInterval(stockUpdateInterval);
    }
  }, [isMarketOpen, isLoading, stocks, setStocks]);


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
        runTransaction: handleRunTransaction,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
