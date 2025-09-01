"use client";

import { createContext, useState, ReactNode } from 'react';
import type { Student } from '@/lib/types';
import { students as initialStudents } from '@/lib/placeholder-data';

interface StudentManagementContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export const StudentManagementContext = createContext<StudentManagementContextType>({
  students: initialStudents,
  setStudents: () => {},
});

export const StudentManagementProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);

  return (
    <StudentManagementContext.Provider value={{ students, setStudents }}>
      {children}
    </StudentManagementContext.Provider>
  );
};
