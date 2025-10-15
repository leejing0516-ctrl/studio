"use client";

import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import type { Student } from '@/lib/types';

interface StudentData {
  student: Student | null;
}

interface StudentDataContextType {
  studentData: StudentData;
  setStudentData: Dispatch<SetStateAction<StudentData>>;
}

const defaultStudentData: StudentData = {
    student: null,
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
