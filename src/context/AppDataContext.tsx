
"use client";

import React, { createContext, useState, useEffect, PropsWithChildren, useMemo } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { Student, Teacher, ClassInfo, PlatformConfig, Reward, Challenge } from '@/lib/types';

interface AppDataContextType {
  students: Student[];
  teachers: Teacher[];
  classes: ClassInfo[];
  rewards: Reward[];
  stocks: PlatformConfig['stocks'];
  platformConfig: PlatformConfig | null;
  isLoading: boolean;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
  setPlatformConfig: (updates: Partial<PlatformConfig>) => Promise<void>;
  isMarketOpen: boolean;
}

export const AppDataContext = createContext<AppDataContextType>({
  students: [],
  teachers: [],
  classes: [],
  rewards: [],
  stocks: [],
  platformConfig: null,
  isLoading: true,
  setStudents: () => {},
  setTeachers: () => {},
  setClasses: () => {},
  setRewards: () => {},
  setPlatformConfig: async () => {},
  isMarketOpen: false,
});

export const AppDataProvider = ({ children }: PropsWithChildren) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stocks, setStocks] = useState<PlatformConfig['stocks']>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, "students"), (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Student));
        setStudents(studentData);
      }),
      onSnapshot(collection(db, "teachers"), (snapshot) => {
        const teacherData = snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as Teacher));
        setTeachers(teacherData);
      }),
      onSnapshot(collection(db, "classes"), (snapshot) => {
        const classData = snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() } as ClassInfo));
        setClasses(classData);
      }),
      onSnapshot(doc(db, "config", "main"), (doc) => {
        const configData = doc.data() as PlatformConfig;
        setPlatformConfigState(configData);
        setRewards(configData.rewards || []);
        setStocks(configData.stocks || []);
      })
    ];

    const allLoaded = students.length > 0 && teachers.length > 0 && classes.length > 0 && platformConfig !== null;
    if (isLoading && allLoaded) {
      // Small delay to prevent flash of loader
      setTimeout(() => setIsLoading(false), 200); 
    }

    return () => unsubscribers.forEach(unsub => unsub());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

   useEffect(() => {
    if (!platformConfig) return;

    const checkMarketStatus = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentHour = now.getHours();
      
      const marketOpenHour = platformConfig.marketOpenHour ?? 9;
      const marketCloseHour = platformConfig.marketCloseHour ?? 14;

      // Monday (1) to Friday (5)
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isWithinHours = currentHour >= marketOpenHour && currentHour < marketCloseHour;

      setIsMarketOpen(isWeekday && isWithinHours);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [platformConfig]);

  const setPlatformConfig = async (updates: Partial<PlatformConfig>) => {
    const mainConfigRef = doc(db, 'config', 'main');
    await require('firebase/firestore').setDoc(mainConfigRef, updates, { merge: true });
    // The onSnapshot listener will update the state automatically
  };
  
  const value = useMemo(() => ({
    students, teachers, classes, rewards, stocks, platformConfig, isLoading,
    setStudents, setTeachers, setClasses, setRewards, setPlatformConfig, isMarketOpen
  }), [students, teachers, classes, rewards, stocks, platformConfig, isLoading, isMarketOpen]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        正在與雲端同步資料...
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};
