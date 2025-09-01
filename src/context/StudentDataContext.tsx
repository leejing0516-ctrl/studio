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
      const newStudentState = { ...prevData, ...updatedData };

      // If any part of the student object is updated, we need to merge it
      // with the existing student data to form a complete object.
      if (updatedData.student) {
        newStudentState.student = {
          ...(prevData.student || {}),
          ...updatedData.student,
        } as Student;
      }
      
      // Ensure the top-level points and portfolio are in sync with the student object inside.
      // The student object is the source of truth.
      if (newStudentState.student) {
        newStudentState.points = newStudentState.student.points;
        newStudentState.portfolio = newStudentState.student.portfolio;
      }

      return newStudentState;
    });
  };

  return (
    <StudentDataContext.Provider value={{ studentData, setStudentData, updateStudentData }}>
      {children}
    </StudentDataContext.Provider>
  );
};
