"use client";

import { createContext, useState, ReactNode } from 'react';
import type { PortfolioItem, Student } from '@/lib/types';

interface StudentData {
  student: Student | null;
  points: number;
  portfolio: PortfolioItem[];
}

interface StudentDataContextType {
  studentData: StudentData;
  setStudentData: React.Dispatch<React.SetStateAction<StudentData>>;
  updateStudentData: (updatedData: Partial<StudentData>) => void;
}

const defaultStudentData = {
    student: null,
    points: 0,
    portfolio: [],
};

export const StudentDataContext = createContext<StudentDataContextType>({
  studentData: defaultStudentData,
  setStudentData: () => {},
  updateStudentData: () => {},
});

export const StudentDataProvider = ({ children }: { children: ReactNode }) => {
  const [studentData, setStudentData] = useState<StudentData>(defaultStudentData);

  const updateStudentData = (updatedData: Partial<StudentData>) => {
    setStudentData(prevData => {
        const newStudent = updatedData.student !== undefined ? updatedData.student : prevData.student;
        const newPoints = updatedData.points !== undefined ? updatedData.points : prevData.points;
        const newPortfolio = updatedData.portfolio !== undefined ? updatedData.portfolio : prevData.portfolio;

        return {
            ...prevData,
            ...updatedData,
            student: newStudent ? { ...newStudent, points: newPoints, portfolio: newPortfolio } : null,
        }
    });
  };

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData, updateStudentData }}>
      {children}
    </StudentDataContext.Provider>
  );
};
