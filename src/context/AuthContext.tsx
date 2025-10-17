
"use client";

import React, { createContext, useContext, PropsWithChildren, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import type { Student, Teacher } from '@/lib/types';
import { doc, setDoc, runTransaction, writeBatch, Transaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  role: 'student' | 'teacher' | null;
  studentDocId: string | null;
  teacherDocId: string | null;
  student: Student | null;
  teacher: Teacher | null;
  handleLogout: () => void;
  setAuthInfo: (info: { role: 'student' | 'teacher'; docId: string }) => void;
  isLoading: boolean;
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>;
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>;
  setClasses: (updater: (prev: any[]) => any[]) => Promise<void>;
  setPlatformConfig: (data: Partial<any>) => Promise<void>;
  runTransaction: <T>(updateFunction: (transaction: Transaction) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [studentDocId, setStudentDocId] = useState<string | null>(null);
  const [teacherDocId, setTeacherDocId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  
  const { 
    students, teachers, classes: schoolClasses, config: platformConfig,
    setStudents: setStoreStudents, setTeachers: setStoreTeachers, setClasses: setStoreClasses,
    loading: isStoreLoading,
  } = useSchoolStore();
  
  const student = useMemo(() => students.find(s => s._docId === studentDocId) || null, [students, studentDocId]);
  const teacher = useMemo(() => teachers.find(t => t._docId === teacherDocId) || null, [teachers, teacherDocId]);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as 'student' | 'teacher' | null;
    const storedStudentDocId = localStorage.getItem('studentDocId');
    const storedTeacherDocId = localStorage.getItem('teacherDocId');

    setRole(storedRole);
    if (storedRole === 'student' && storedStudentDocId) {
        setStudentDocId(storedStudentDocId);
    } else if (storedRole === 'teacher' && storedTeacherDocId) {
        setTeacherDocId(storedTeacherDocId);
    }
    setIsAuthLoading(false);
  }, []);

  const setAuthInfo = useCallback((info: { role: 'student' | 'teacher'; docId: string }) => {
    localStorage.setItem('userRole', info.role);
    if (info.role === 'student') {
        localStorage.setItem('studentDocId', info.docId);
        localStorage.removeItem('teacherDocId');
        setRole('student');
        setStudentDocId(info.docId);
        setTeacherDocId(null);
    } else {
        localStorage.setItem('teacherDocId', info.docId);
        localStorage.removeItem('studentDocId');
        setRole('teacher');
        setTeacherDocId(info.docId);
        setStudentDocId(null);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setRole(null);
    setStudentDocId(null);
    setTeacherDocId(null);
    router.replace("/");
  }, [router]);
  
  const setStudentsWithFirestore = async (updater: (prev: Student[]) => Student[]) => {
      const updatedStudents = updater(students);
      const batch = writeBatch(db);
      updatedStudents.forEach(s => {
          if (s._docId) {
              const { _docId, ...studentData } = s;
              batch.set(doc(db, 'students', _docId), studentData, { merge: true });
          }
      });
      await batch.commit();
  };

  const setTeachersWithFirestore = async (updater: (prev: Teacher[]) => Teacher[]) => {
      const updatedTeachers = updater(teachers);
      const batch = writeBatch(db);
      updatedTeachers.forEach(t => {
          if (t._docId) {
              const { _docId, ...teacherData } = t;
              batch.set(doc(db, 'teachers', _docId), teacherData, { merge: true });
          }
      });
      await batch.commit();
  };
  
  const setClassesWithFirestore = async (updater: (prev: any[]) => any[]) => {
      const updatedClasses = updater(schoolClasses);
      const batch = writeBatch(db);
      updatedClasses.forEach(c => {
          if (c._docId) {
             const { _docId, ...classData } = c;
             batch.set(doc(db, 'classes', _docId), classData, { merge: true });
          }
      });
      await batch.commit();
  };

  const setPlatformConfigWithFirestore = async (data: Partial<any>) => {
      const configRef = doc(db, 'config', 'main');
      await setDoc(configRef, data, { merge: true });
  };
  
  const runTransactionWithFirestore = <T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> => {
    return runTransaction(db, updateFunction);
  }

  const value = {
    role,
    studentDocId,
    teacherDocId,
    student,
    teacher,
    handleLogout,
    setAuthInfo,
    isLoading: isAuthLoading || isStoreLoading,
    setStudents: setStudentsWithFirestore,
    setTeachers: setTeachersWithFirestore,
    setClasses: setClassesWithFirestore,
    setPlatformConfig: setPlatformConfigWithFirestore,
    runTransaction: runTransactionWithFirestore,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
