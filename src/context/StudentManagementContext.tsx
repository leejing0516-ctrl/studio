
"use client";

import { createContext, useState, ReactNode, useEffect } from 'react';
import type { Student } from '@/lib/types';
import { students as initialStudents } from '@/lib/placeholder-data';

interface StudentManagementContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const defaultState: StudentManagementContextType = {
  students: initialStudents,
  setStudents: () => {},
};

export const StudentManagementContext = createContext<StudentManagementContextType>(defaultState);

export const StudentManagementProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(() => {
    if (typeof window !== 'undefined') {
      const savedStudents = localStorage.getItem('students');
      return savedStudents ? JSON.parse(savedStudents) : initialStudents;
    }
    return initialStudents;
  });

  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  return (
    <StudentManagementContext.Provider value={{ students, setStudents }}>
      {children}
    </StudentManagementContext.Provider>
  );
};
