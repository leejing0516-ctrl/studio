"use client";

import { createContext, useState, ReactNode } from 'react';
import type { PortfolioItem, Student } from '@/lib/types';
import { portfolio as initialPortfolio } from '@/lib/placeholder-data';

interface StudentData {
  student: Student | null;
  points: number;
  portfolio: PortfolioItem[];
}

interface StudentDataContextType {
  studentData: StudentData;
  setStudentData: React.Dispatch<React.SetStateAction<StudentData>>;
  updateStudentPoints: (newPoints: number) => void;
}

export const StudentDataContext = createContext<StudentDataContextType>({
  studentData: {
    student: null,
    points: 0,
    portfolio: initialPortfolio,
  },
  setStudentData: () => {},
  updateStudentPoints: () => {},
});

export const StudentDataProvider = ({ children }: { children: ReactNode }) => {
  const [studentData, setStudentData] = useState<StudentData>({
    student: null,
    points: 0,
    portfolio: initialPortfolio,
  });

  const updateStudentPoints = (newPoints: number) => {
    setStudentData(prevData => ({
        ...prevData,
        points: newPoints,
        student: prevData.student ? { ...prevData.student, points: newPoints } : null,
    }));
  };

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData, updateStudentPoints }}>
      {children}
    </StudentDataContext.Provider>
  );
};
