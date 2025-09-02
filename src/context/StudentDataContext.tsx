
"use client";

import { createContext, useState, ReactNode } from 'react';
import type { PortfolioItem, RedeemedRewardItem, Student, Loan } from '@/lib/types';

interface StudentData {
  student: Student | null;
  points: number;
  portfolio: PortfolioItem[];
  redeemedRewards: RedeemedRewardItem[];
  loans: Loan[];
}

interface StudentDataContextType {
  studentData: StudentData;
  setStudentData: React.Dispatch<React.SetStateAction<StudentData>>;
}

const defaultStudentData = {
    student: null,
    points: 0,
    portfolio: [],
    redeemedRewards: [],
    loans: [],
};

export const StudentDataContext = createContext<StudentDataContextType>({
  studentData: defaultStudentData,
  setStudentData: () => {},
});

export const StudentDataProvider = ({ children }: { children: ReactNode }) => {
  const [studentData, setStudentData] = useState<StudentData>(defaultStudentData);

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData }}>
      {children}
    </StudentDataContext.Provider>
  );
};
