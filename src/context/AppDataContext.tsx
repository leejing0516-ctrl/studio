
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { useSchoolStore } from '@/store/useSchoolStore';
import { Announcement, Challenge, Class, Fundraising, Habit, Pet, PlatformConfig, Stock, Student, Teacher } from '@/lib/types';

interface AppDataContextType {
  loading: boolean;
}

const AppDataContext = createContext<AppDataContextType>({ loading: true });

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const setSchoolStore = useSchoolStore(state => state.setData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, "students"), (snapshot) => {
        const students = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Student));
        setSchoolStore({ students });
      }),
      onSnapshot(collection(db, "teachers"), (snapshot) => {
        const teachers = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Teacher));
        setSchoolStore({ teachers });
      }),
      onSnapshot(collection(db, "classes"), (snapshot) => {
        const classes = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Class));
        setSchoolStore({ classes });
      }),
       onSnapshot(collection(db, "announcements"), (snapshot) => {
        const announcements = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Announcement));
        setSchoolStore({ announcements });
      }),
      onSnapshot(collection(db, "challenges"), (snapshot) => {
        const challenges = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Challenge));
        setSchoolStore({ challenges });
      }),
      onSnapshot(collection(db, "rewards"), (snapshot) => {
        const rewards = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as any));
        setSchoolStore({ rewards });
      }),
       onSnapshot(collection(db, "habits"), (snapshot) => {
        const habits = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Habit));
        setSchoolStore({ habits });
      }),
       onSnapshot(collection(db, "pets"), (snapshot) => {
        const pets = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Pet));
        setSchoolStore({ pets });
      }),
      onSnapshot(collection(db, "stocks"), (snapshot) => {
        const stocks = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Stock));
        setSchoolStore({ stocks });
      }),
      onSnapshot(collection(db, "fundraising"), (snapshot) => {
        const fundraising = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id } as Fundraising));
        setSchoolStore({ fundraising });
      }),
      onSnapshot(doc(db, "config", "platform"), (snapshot) => {
        const config = snapshot.data() as PlatformConfig;
        setSchoolStore({ config });
      }),
    ];

    const initialLoad = Promise.all(unsubscribers).then(() => {
        setTimeout(() => setLoading(false), 500); // Add a small delay to prevent flash of loading
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [setSchoolStore]);

  return (
    <AppDataContext.Provider value={{ loading }}>
      {children}
    </AppDataContext.Provider>
  );
};
