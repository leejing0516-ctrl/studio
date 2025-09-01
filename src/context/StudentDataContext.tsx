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
      // Start with the previous data
      const newData = { ...prevData };

      // Update points if provided
      if (updatedData.points !== undefined) {
        newData.points = updatedData.points;
      }
      
      // Update portfolio if provided
      if (updatedData.portfolio !== undefined) {
        newData.portfolio = updatedData.portfolio;
      }
      
      // Update student object if provided
      if (updatedData.student !== undefined) {
          newData.student = updatedData.student;
      }

      // Ensure the student object within newData is kept in sync
      if (newData.student) {
          newData.student = {
              ...newData.student,
              points: newData.points,
              portfolio: newData.portfolio,
              // Make sure redeemedRewards are carried over
              redeemedRewards: updatedData.student?.redeemedRewards || newData.student.redeemedRewards || []
          };
      }
      
      return newData;
    });
  };

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData, updateStudentData }}>
      {children}
    </StudentDataContext.Provider>
  );
};
