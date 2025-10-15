
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  runTransaction,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { isSameDay, startOfDay } from "date-fns";

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
  const change = stock.price * (changePercent / 100);
  const newPrice = Math.max(1, stock.price + change);

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
    updater: (prev: Student[]) => Student[],
    skipDbUpdate?: boolean
  ) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>;
  classes: ClassInfo[];
  setClasses: (updater: (prev: ClassInfo[]) => ClassInfo[]) => Promise<void>;
  stocks: Stock[];
  setStocks: (updater: (prev: Stock[]) => Stock[]) => Promise<void>;
  rewards: Reward[];
  setRewards: (updater: (prev: Reward[]) => Reward[]) => Promise<void>;
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

export const AppDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
      updater: (prev: Student[]) => Student[],
      skipDbUpdate: boolean = false
    ) => {
      const newStudents = updater(students);
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
    async (updater: (prev: Teacher[]) => Teacher[]) => {
      const newTeachers = updater(teachers);
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
    async (updater: (prev: ClassInfo[]) => ClassInfo[]) => {
      const newClasses = updater(classes);
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
    async (updater: (prev: Stock[]) => Stock[]) => {
      const newStocks = updater(stocks);
      setStocksState(newStocks);
      try {
        const batch = writeBatch(db);
        newStocks.forEach((stock) => {
          const ref = doc(db, "stocks", stock.ticker);
          const { _docId, ...stockData } = stock;
          batch.set(ref, stockData, { merge: true });
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to update stocks:", error);
        toast({ title: "股票資料更新失敗", variant: "destructive" });
      }
    },
    [stocks, toast]
  );

  const handleSetRewards = useCallback(
    async (updater: (prev: Reward[]) => Reward[]) => {
      const newRewards = updater(rewards);
      setRewardsState(newRewards);
      try {
        const batch = writeBatch(db);
        newRewards.forEach((reward) => {
          if (reward._docId) {
            const ref = doc(db, "rewards", reward._docId);
            const { _docId, ...rewardData } = reward;
            batch.set(ref, rewardData, { merge: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to update rewards:", error);
        toast({ title: "獎勵資料更新失敗", variant: "destructive" });
      }
    },
    [rewards, toast]
  );

  const handleSetPlatformConfig = useCallback(
    async (updates: Partial<PlatformConfig>) => {
      try {
        await runTransaction(db, async (transaction) => {
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
      return runTransaction(db, updateFunction);
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
    if (pathname === "/") {
      setIsLoading(false);
    }

    const unsubscribers: Unsubscribe[] = [];
    const collections = [
      { name: "students", setter: setStudentsState },
      { name: "teachers", setter: setTeachersState },
      { name: "classes", setter: setClassesState },
    ];

    collections.forEach(({ name, setter }) => {
      const q = collection(db, name);
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc) => ({
            _docId: doc.id,
            ...doc.data(),
          })) as any[];
          setter(data);
          setIsLoading(false);
        },
        (error) => {
          console.error(`Error fetching ${name}:`, error);
          toast({
            title: "資料同步錯誤",
            description: `無法從資料庫獲取 ${name} 集合。`,
            variant: "destructive",
          });
          setIsLoading(false);
        }
      );
      unsubscribers.push(unsubscribe);
    });

    const configRef = doc(db, "config", "main");
    const unsubConfig = onSnapshot(
      configRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const configData = docSnap.data() as PlatformConfig;
          setPlatformConfigState(configData);
          setStocksState(configData.stocks || []);
          setRewardsState(configData.rewards || []);
        } else {
          toast({
            title: "設定檔遺失",
            description: "找不到平台的核心設定檔。",
            variant: "destructive",
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching config:", error);
        toast({
          title: "設定檔同步錯誤",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );
    unsubscribers.push(unsubConfig);

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [toast, pathname]);

  // Stock price simulation
  useEffect(() => {
    if (!isMarketOpen) return;

    const interval = setInterval(() => {
      setStocksState((prevStocks) =>
        prevStocks.map((stock) => calculateStockChange(stock))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isMarketOpen]);

  // Automatic Interest & Deposit Maturity
  useEffect(() => {
    const today = startOfDay(new Date());

    const processStudentUpdates = async () => {
        const studentsToUpdate = students.filter(s =>
            (s.loans?.some(l => (l.status === 'active' || l.status === 'overdue') && l.lastInterestAccruedDate !== today.toISOString().split('T')[0])) ||
            (s.fixedDeposits?.some(d => d.status === 'active' && isSameDay(new Date(d.maturityDate), today)))
        );

        if (studentsToUpdate.length === 0) return;
        
        const updatedStudents = students.map(student => {
             let updatedStudent = { ...student };
            
             // Accrue loan interest
            if(updatedStudent.loans) {
                updatedStudent.loans = updatedStudent.loans.map(loan => {
                    const lastAccrued = loan.lastInterestAccruedDate ? new Date(loan.lastInterestAccruedDate) : new Date(loan.approvalDate || loan.requestDate);
                     if ((loan.status === 'active' || loan.status === 'overdue') && !isSameDay(lastAccrued, today)) {
                        loan.interest += loan.amount * loan.interestRate;
                        loan.lastInterestAccruedDate = today.toISOString().split('T')[0];
                     }
                     if (loan.status === 'active' && isAfter(today, new Date(loan.repaymentDate))) {
                         loan.status = 'overdue';
                     }
                     return loan;
                });
            }

            // Mature fixed deposits
            if(updatedStudent.fixedDeposits) {
                let pointsFromMaturity = 0;
                updatedStudent.fixedDeposits = updatedStudent.fixedDeposits.map(deposit => {
                    if (deposit.status === 'active' && isSameDay(new Date(deposit.maturityDate), today)) {
                        const interest = deposit.amount * deposit.interestRate * (differenceInDays(new Date(deposit.maturityDate), new Date(deposit.startDate)));
                        pointsFromMaturity += deposit.amount + interest;
                        return { ...deposit, status: 'matured' as const, interestEarned: interest };
                    }
                    return deposit;
                });
                if (pointsFromMaturity > 0) {
                    updatedStudent.points = (updatedStudent.points || 0) + pointsFromMaturity;
                }
            }
            
            return updatedStudent;
        });

        try {
            await handleSetStudents(() => updatedStudents, false);
            console.log("Successfully processed daily student financial updates.");
        } catch(e) {
            console.error("Failed to process daily student updates:", e);
        }
    };
    
    processStudentUpdates();
    
  }, [students]);

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
