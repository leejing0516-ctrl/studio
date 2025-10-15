
"use client";

import React, { createContext, useContext, PropsWithChildren, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StudentDataContext } from './StudentDataContext';
import { AppDataContext } from './AppDataContext';

interface AuthContextType {
  student: any;
  teacher: any;
  setStudents: (updater: (prev: any[]) => any[]) => Promise<void>;
  runTransaction: (updateFunction: (transaction: any) => Promise<any>) => Promise<any>;
  teachers: any[];
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  setStudents: async () => {},
  runTransaction: async () => {},
  teachers: [],
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const { studentData, setStudentData } = useContext(StudentDataContext);
  const { students, setStudents, runTransaction, teachers } = useContext(AppDataContext);

  const student = useMemo(() => {
    if (studentData?.student) {
        return students.find(s => s.id === studentData.student.id && s.classId === studentData.student.classId) || studentData.student;
    }
    return null;
  }, [studentData, students]);


  const value = {
    student,
    teacher: studentData?.teacher,
    setStudents,
    runTransaction,
    teachers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
