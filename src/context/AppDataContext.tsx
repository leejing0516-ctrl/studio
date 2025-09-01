
"use client";

import { createContext, useState, ReactNode, useEffect } from 'react';
import type { Student, Reward, Class, Teacher } from '@/lib/types';
import { 
    students as initialStudents, 
    rewards as initialRewards,
    classes as initialClasses,
    teachers as initialTeachers
} from '@/lib/placeholder-data';

// Helper function to get data from localStorage
const getFromStorage = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') {
        return fallback;
    }
    const stored = localStorage.getItem(key);
    try {
        return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
        console.error(`Error parsing ${key} from localStorage`, e);
        return fallback;
    }
};

// Helper function to set data to localStorage
const setInStorage = <T,>(key: string, value: T) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

interface AppDataContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  rewards: Reward[];
  setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

const defaultState: AppDataContextType = {
  students: initialStudents,
  setStudents: () => {},
  rewards: initialRewards,
  setRewards: () => {},
  classes: initialClasses,
  setClasses: () => {},
  teachers: initialTeachers,
  setTeachers: () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(() => getFromStorage('students', initialStudents));
  const [rewards, setRewards] = useState<Reward[]>(() => getFromStorage('rewards', initialRewards));
  const [teachers, setTeachers] = useState<Teacher[]>(() => getFromStorage('teachers', initialTeachers));
  const [classes, setClasses] = useState<Class[]>(() => getFromStorage('classes', initialClasses));

  useEffect(() => {
    setInStorage('students', students);
  }, [students]);

  useEffect(() => {
    setInStorage('rewards', rewards);
  }, [rewards]);

  useEffect(() => {
    setInStorage('teachers', teachers);
  }, [teachers]);

  useEffect(() => {
    setInStorage('classes', classes);
  }, [classes]);

  return (
    <AppDataContext.Provider value={{ students, setStudents, rewards, setRewards, classes, setClasses, teachers, setTeachers }}>
      {children}
    </AppDataContext.Provider>
  );
};

    