"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { useSchoolStore } from '@/store/useSchoolStore';
import { Announcement, Challenge, Class, Fundraising, Habit, Pet, PlatformConfig, Stock, Student, Teacher } from '@/lib/types';

interface AppDataContextType {
  dataLoaded: boolean;
}

const AppDataContext = createContext<AppDataContextType>({ dataLoaded: false });

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const setSchoolStore = useSchoolStore(state => state.setData);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const collections: { name: string; key: keyof ReturnType<typeof useSchoolStore.getState> }[] = [
      { name: 'students', key: 'students' },
      { name: 'teachers', key: 'teachers' },
      { name: 'classes', key: 'classes' },
      { name: 'announcements', key: 'announcements' },
      { name: 'challenges', key: 'challenges' },
      { name: 'rewards', key: 'rewards' },
      { name: 'habits', key: 'habits' },
      { name: 'pets', key: 'pets' },
      { name: 'stocks', key: 'stocks' },
      { name: 'fundraising', key: 'fundraising' },
    ];

    const unsubs = collections.map(({ name, key }) => 
      onSnapshot(collection(db, name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
        setSchoolStore({ [key]: data } as any);
      })
    );

    const unsubConfig = onSnapshot(doc(db, "config", "platform"), (snapshot) => {
      const config = snapshot.data() as PlatformConfig;
      setSchoolStore({ config });
    });

    // Mark that initial data setup is in progress.
    // The actual data will be populated asynchronously.
    if (!dataLoaded) {
      setDataLoaded(true);
    }
    
    return () => {
      unsubs.forEach(unsub => unsub());
      unsubConfig();
    };
  // The dependency array is intentionally empty to run this effect only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppDataContext.Provider value={{ dataLoaded }}>
      {children}
    </AppDataContext.Provider>
  );
};
