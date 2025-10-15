
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import { usePathname } from "next/navigation";
import type {
  Student,
  Teacher,
  ClassInfo,
  Stock,
  Reward,
  PlatformConfig,
  Challenge,
} from "@/lib/types";
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  runTransaction as firestoreRunTransaction,
  query,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { isAfter, isSameDay, startOfDay, differenceInDays } from "date-fns";

const calculateStockChange = (stock: Stock): Stock => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isMarketHours = hour >= 9 && hour < 14;

  if (isWeekend || !isMarketHours) {
    return { ...stock, change: 0, changePercent: 0 };
  }

  const hash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  };

  const seed = hash(stock.ticker + new Date().toDateString());
  const randomFactor = (seed % 200) / 100 - 1;
  const volatility = (hash(stock.ticker) % 50) / 1000 + 0.01;
  const changePercent = randomFactor * volatility * 20;
  const newPrice = Math.max(1, stock.price * (1 + changePercent / 100));

  return {
    ...stock,
    price: newPrice,
    change: newPrice - stock.price,
    changePercent: ((newPrice - stock.price) / stock.price) * 100,
  };
};

type AppDataContextType = {
  students: Student[];
  setStudents: (
    updater: Student[] | ((prev: Student[]) => Student[]),
    skipDbUpdate?: boolean
  ) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (
    updater: Teacher[] | ((prev: Teacher[]) => Teacher[])
  ) => Promise<void>;
  classes: ClassInfo[];
  setClasses: (
    updater: ClassInfo[] | ((prev: ClassInfo[]) => ClassInfo[])
  ) => Promise<void>;
  stocks: Stock[];
  setStocks: (
    updater: Stock[] | ((prev: Stock[]) => Stock[])
  ) => Promise<void>;
  rewards: Reward[];
  setRewards: (
    updater: Reward[] | ((prev: Reward[]) => Reward[])
  ) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (updates: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  runTransaction: (
    updateFunction: (transaction: any) => Promise<any>
  ) => Promise<any>;
  isMarketOpen: boolean;
};

export const AppDataContext = createContext<AppDataContextType>({
  students: [],
  setStudents: async () => {},
  teachers: [],
  setTeachers: async () => {},
  classes: [],
  setClasses: async () => {},
  stocks: [],
  setStocks: async () => {},
  rewards: [],
  setRewards: async () => {},
  platformConfig: null,
  setPlatformConfig: async () => {},
  isLoading: true,
  runTransaction: async () => {},
  isMarketOpen: false,
});

export const AppDataProvider = ({ children }: PropsWithChildren) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [classes, setClassesState] = useState<ClassInfo[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [platformConfig, setPlatformConfigState] =
    useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const pathname = usePathname();

  const handleSetStudents = useCallback(
    async (
      updater: Student[] | ((prev: Student[]) => Student[]),
      skipDbUpdate: boolean = false
    ) => {
      const newStudents =
        typeof updater === "function" ? updater(students) : updater;
      setStudentsState(newStudents);

      if (skipDbUpdate) return;

      try {
        const batch = writeBatch(db);
        newStudents.forEach((student) => {
          if (student._docId) {
            const ref = doc(db, "students", student._docId);
            const { _docId, ...studentData } = student;
            batch.set(ref, studentData, { merge: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to update students:", error);
        toast({
          title: "學生資料更新失敗",
          description: "與資料庫同步時發生錯誤。",
          variant: "destructive",
        });
      }
    },
    [students, toast]
  );

  const handleSetTeachers = useCallback(
    async (updater: Teacher[] | ((prev: Teacher[]) => Teacher[])) => {
      const newTeachers =
        typeof updater === "function" ? updater(teachers) : updater;
      setTeachersState(newTeachers);
      try {
        const batch = writeBatch(db);
        newTeachers.forEach((teacher) => {
          if (teacher._docId) {
            const ref = doc(db, "teachers", teacher._docId);
            const { _docId, ...teacherData } = teacher;
            batch.set(ref, teacherData, { merge: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to update teachers:", error);
        toast({
          title: "教師資料更新失敗",
          description: "與資料庫同步時發生錯誤。",
          variant: "destructive",
        });
      }
    },
    [teachers, toast]
  );

  const handleSetClasses = useCallback(
    async (updater: ClassInfo[] | ((prev: ClassInfo[]) => ClassInfo[])) => {
      const newClasses =
        typeof updater === "function" ? updater(classes) : updater;
      setClassesState(newClasses);
      try {
        const batch = writeBatch(db);
        newClasses.forEach((c) => {
          if (c._docId) {
            const ref = doc(db, "classes", c._docId);
            const { _docId, ...classData } = c;
            batch.set(ref, classData, { merge: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to update classes:", error);
        toast({
          title: "班級資料更新失敗",
          variant: "destructive",
        });
      }
    },
    [classes, toast]
  );

  const handleSetStocks = useCallback(
    async (updater: Stock[] | ((prev: Stock[]) => Stock[])) => {
      const newStocks = typeof updater === "function" ? updater(stocks) : updater;
      const configUpdate = { stocks: newStocks };
      await handleSetPlatformConfig(configUpdate);
    },
    [stocks]
  );
  
  const handleSetRewards = useCallback(
    async (updater: Reward[] | ((prev: Reward[]) => Reward[])) => {
      const newRewards = typeof updater === "function" ? updater(rewards) : updater;
      const configUpdate = { rewards: newRewards };
      await handleSetPlatformConfig(configUpdate);
    },
    [rewards]
  );

  const handleSetPlatformConfig = useCallback(
    async (updates: Partial<PlatformConfig>) => {
      try {
        await firestoreRunTransaction(db, async (transaction) => {
          const configRef = doc(db, "config", "main");
          transaction.set(configRef, updates, { merge: true });
        });
      } catch (error) {
        console.error("Failed to update platform config:", error);
        toast({
          title: "平台設定更新失敗",
          description: "與資料庫同步時發生錯誤。",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  const handleRunTransaction = useCallback(
    async (updateFunction: (transaction: any) => Promise<any>) => {
      return firestoreRunTransaction(db, updateFunction);
    },
    []
  );

  const isMarketOpen = useMemo(() => {
    if (!platformConfig) return false;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const openHour = platformConfig.marketOpenHour ?? 9;
    const closeHour = platformConfig.marketCloseHour ?? 14;
    return day >= 1 && day <= 5 && hour >= openHour && hour < closeHour;
  }, [platformConfig]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribers: Unsubscribe[] = [];

    const fetchInitialData = async () => {
        try {
            const [studentsSnap, teachersSnap, classesSnap, configSnap] = await Promise.all([
                getDocs(query(collection(db, "students"))),
                getDocs(query(collection(db, "teachers"))),
                getDocs(query(collection(db, "classes"))),
                getDocs(query(collection(db, "config")))
            ]);

            const studentsData = studentsSnap.docs.map(d => ({ _docId: d.id, ...d.data() })) as Student[];
            const teachersData = teachersSnap.docs.map(d => ({ _docId: d.id, ...d.data() })) as Teacher[];
            const classesData = classesSnap.docs.map(d => ({ _docId: d.id, ...d.data() })) as ClassInfo[];
            const mainConfigDoc = configSnap.docs.find(d => d.id === 'main');
            const configData = mainConfigDoc ? mainConfigDoc.data() as PlatformConfig : null;

            setStudentsState(studentsData);
            setTeachersState(teachersData);
            setClassesState(classesData);
            if (configData) {
              setPlatformConfigState(configData);
              setStocksState(configData.stocks || []);
              setRewardsState(configData.rewards || []);
            }
            
        } catch(e) {
            console.error("Error fetching initial data", e);
            toast({ title: "資料初始化失敗", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    fetchInitialData();


    const collections: { name: "students" | "teachers" | "classes"; setter: React.Dispatch<React.SetStateAction<any[]>> }[] = [
      { name: "students", setter: setStudentsState },
      { name: "teachers", setter: setTeachersState },
      { name: "classes", setter: setClassesState },
    ];
    
    collections.forEach(({ name, setter }) => {
      const q = collection(db, name);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setter(snapshot.docs.map(d => ({ _docId: d.id, ...d.data() })));
        },
        (error) => {
          console.error(`Error fetching ${name}:`, error);
        }
      );
      unsubscribers.push(unsubscribe);
    });
    
    const configRef = doc(db, "config", "main");
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const configData = docSnap.data() as PlatformConfig;
        setPlatformConfigState(configData);
        setStocksState(configData.stocks || []);
        setRewardsState(configData.rewards || []);
      }
    });
    unsubscribers.push(unsubConfig);

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [toast]);
  

  // Stock price simulation
  useEffect(() => {
    if (!isMarketOpen || stocks.length === 0) return;
    const interval = setInterval(() => {
      setStocksState((prevStocks) =>
        prevStocks.map((stock) => calculateStockChange(stock))
      );
    }, 15000);
    return () => clearInterval(interval);
  }, [isMarketOpen, stocks.length]);

  // Automatic Interest & Deposit Maturity
  useEffect(() => {
    const today = startOfDay(new Date());

    const processStudentUpdates = async () => {
      const studentsWithUpdates = students.filter((s) => {
        const hasActiveLoan = s.loans?.some(
          (l) =>
            (l.status === "active" || l.status === "overdue") &&
            l.lastInterestAccruedDate !== today.toISOString().split("T")[0]
        );
        const hasMaturingDeposit = s.fixedDeposits?.some(
          (d) =>
            d.status === "active" && isSameDay(new Date(d.maturityDate), today)
        );
        return hasActiveLoan || hasMaturingDeposit;
      });

      if (studentsWithUpdates.length === 0) return;

      const updatedStudents = students.map((student) => {
        let updatedStudent = { ...student };

        // Accrue loan interest
        if (updatedStudent.loans) {
          updatedStudent.loans = updatedStudent.loans.map((loan) => {
            const lastAccrued = loan.lastInterestAccruedDate
              ? new Date(loan.lastInterestAccruedDate)
              : new Date(loan.approvalDate || loan.requestDate);
            if (
              (loan.status === "active" || loan.status === "overdue") &&
              !isSameDay(lastAccrued, today)
            ) {
              const daysSinceLast = differenceInDays(today, lastAccrued);
              loan.interest += loan.amount * loan.interestRate * daysSinceLast;
              loan.lastInterestAccruedDate = today.toISOString().split("T")[0];
            }
            if (loan.status === "active" && isAfter(today, new Date(loan.repaymentDate))) {
              loan.status = "overdue";
            }
            return loan;
          });
        }

        // Mature fixed deposits
        if (updatedStudent.fixedDeposits) {
          let pointsFromMaturity = 0;
          let newPointHistory: any[] = [];

          updatedStudent.fixedDeposits = updatedStudent.fixedDeposits.map(
            (deposit) => {
              if (
                deposit.status === "active" &&
                isAfter(today, new Date(deposit.maturityDate))
              ) {
                const interest =
                  deposit.amount *
                  deposit.interestRate *
                  differenceInDays(
                    new Date(deposit.maturityDate),
                    new Date(deposit.startDate)
                  );
                pointsFromMaturity += deposit.amount + interest;
                newPointHistory.push({
                  points: deposit.amount + interest,
                  date: new Date().toISOString(),
                  reason: "定存到期",
                });
                return {
                  ...deposit,
                  status: "matured" as const,
                  interestEarned: interest,
                };
              }
              return deposit;
            }
          );
          if (pointsFromMaturity > 0) {
            updatedStudent.points =
              (updatedStudent.points || 0) + pointsFromMaturity;
            updatedStudent.pointHistory = [
              ...(updatedStudent.pointHistory || []),
              ...newPointHistory,
            ];
          }
        }
        return updatedStudent;
      });

      try {
        await handleSetStudents(() => updatedStudents, false);
      } catch (e) {
        console.error("Failed to process daily student updates:", e);
      }
    };
    if (!isLoading && students.length > 0) {
       processStudentUpdates();
    }
  }, [students, isLoading]);

  const contextValue = {
    students,
    setStudents: handleSetStudents,
    teachers,
    setTeachers: handleSetTeachers,
    classes,
    setClasses: handleSetClasses,
    stocks,
    setStocks: handleSetStocks,
    rewards,
    setRewards: handleSetRewards,
    platformConfig,
    setPlatformConfig: handleSetPlatformConfig,
    isLoading,
    runTransaction: handleRunTransaction,
    isMarketOpen,
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};
