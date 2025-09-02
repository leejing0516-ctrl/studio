
"use client";

import { createContext, useState, ReactNode, useEffect } from 'react';
import type { Student, Reward, Class, Teacher, Stock } from '@/lib/types';
import { 
    students as initialStudents, 
    rewards as initialRewards,
    classes as initialClasses,
    teachers as initialTeachers,
    stocks as initialStocks
} from '@/lib/placeholder-data';

// --- Stock Simulation Logic ---

const STOCK_UPDATE_HOUR_UTC = 9; // 5 PM in Taiwan (UTC+8) is 9 AM UTC.
const STOCK_PRICE_FLUCTUATION = 0.05; // +/- 5%

const simulateStockUpdate = (currentStocks: Stock[]): Stock[] => {
    return currentStocks.map(stock => {
        const fluctuation = (Math.random() - 0.5) * 2 * STOCK_PRICE_FLUCTUATION; // Random number between -0.05 and 0.05
        const newPrice = stock.price * (1 + fluctuation);
        const change = newPrice - stock.price;
        const changePercent = (change / stock.price) * 100;
        
        return {
            ...stock,
            price: parseFloat(newPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
        };
    });
};


// --- End Stock Simulation Logic ---


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
  stocks: Stock[];
  setStocks: React.Dispatch<React.SetStateAction<Stock[]>>;
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
  stocks: initialStocks,
  setStocks: () => {},
  classes: initialClasses,
  setClasses: () => {},
  teachers: initialTeachers,
  setTeachers: () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(() => getFromStorage('students', initialStudents));
  const [rewards, setRewards] = useState<Reward[]>(() => getFromStorage('rewards', initialRewards));
  const [stocks, setStocks] = useState<Stock[]>(() => getFromStorage('stocks', initialStocks));
  const [teachers, setTeachers] = useState<Teacher[]>(() => getFromStorage('teachers', initialTeachers));
  const [classes, setClasses] = useState<Class[]>(() => getFromStorage('classes', initialClasses));

  useEffect(() => {
    setInStorage('students', students);
  }, [students]);

  useEffect(() => {
    setInStorage('rewards', rewards);
  }, [rewards]);
  
  useEffect(() => {
    setInStorage('stocks', stocks);
  }, [stocks]);

  useEffect(() => {
    setInStorage('teachers', teachers);
  }, [teachers]);

  useEffect(() => {
    setInStorage('classes', classes);
  }, [classes]);
  
  // Effect for stock simulation
  useEffect(() => {
    const lastUpdateStr = localStorage.getItem('lastStockUpdate');
    const lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : new Date(0);
    const now = new Date();

    const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if it's a new day and past 5 PM Taiwan time (9 AM UTC)
    if (nowDate > lastUpdateDate && now.getUTCHours() >= STOCK_UPDATE_HOUR_UTC) {
        console.log("Simulating daily stock update...");
        const updatedStocks = simulateStockUpdate(stocks);
        setStocks(updatedStocks);
        localStorage.setItem('lastStockUpdate', now.toISOString());
    }
  }, []); // Run only once on initial load

  return (
    <AppDataContext.Provider value={{ students, setStudents, rewards, setRewards, stocks, setStocks, classes, setClasses, teachers, setTeachers }}>
      {children}
    </AppDataContext.Provider>
  );
};
