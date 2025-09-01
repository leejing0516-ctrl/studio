"use client";

import { createContext, useState, ReactNode } from 'react';
import type { PortfolioItem } from '@/lib/types';
import { portfolio as initialPortfolio } from '@/lib/placeholder-data';

interface StudentData {
  points: number;
  portfolio: PortfolioItem[];
}

interface StudentDataContextType {
  studentData: StudentData;
  setStudentData: React.Dispatch<React.SetStateAction<StudentData>>;
}

export const StudentDataContext = createContext<StudentDataContextType>({
  studentData: {
    points: 2389,
    portfolio: initialPortfolio,
  },
  setStudentData: () => {},
});

export const StudentDataProvider = ({ children }: { children: ReactNode }) => {
  const [studentData, setStudentData] = useState<StudentData>({
    points: 2389,
    portfolio: initialPortfolio,
  });

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData }}>
      {children}
    </StudentDataContext.Provider>
  );
};
