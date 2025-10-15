
"use client";

import React, { createContext, useContext, PropsWithChildren, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import type { Student, Teacher, PlatformConfig } from '@/lib/types';
import { doc, setDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  role: 'student' | 'teacher' | null;
  studentDocId: string | null;
  teacherDocId: string | null;
  student: Student | null;
  teacher: Teacher | null;
  handleLogout: () => void;
  setAuthInfo: (info: { role: 'student' | 'teacher'; docId: string }) => void;
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>;
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>;
  setPlatformConfig: (updates: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  runTransaction: (updateFunction: (transaction: any) => Promise<any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [studentDocId, setStudentDocId] = useState<string | null>(null);
  const [teacherDocId, setTeacherDocId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    students, teachers, config, 
    setStudents: setStoreStudents, 
    setTeachers: setStoreTeachers, 
    setConfig: setStoreConfig,
    loading: isStoreLoading,
  } = useSchoolStore();
  
  const student = students.find(s => s._docId === studentDocId) || null;
  const teacher = teachers.find(t => t._docId === teacherDocId) || null;

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as 'student' | 'teacher' | null;
    const storedStudentDocId = localStorage.getItem('studentDocId');
    const storedTeacherDocId = localStorage.getItem('teacherDocId');

    setRole(storedRole);
    if (storedRole === 'student') {
        setStudentDocId(storedStudentDocId);
    } else if (storedRole === 'teacher') {
        setTeacherDocId(storedTeacherDocId);
    }
    setIsAuthLoading(false);
  }, []);

  const setAuthInfo = useCallback((info: { role: 'student' | 'teacher'; docId: string }) => {
    localStorage.setItem('userRole', info.role);
    if (info.role === 'student') {
        localStorage.setItem('studentDocId', info.docId);
        setRole('student');
        setStudentDocId(info.docId);
        setTeacherDocId(null);
    } else {
        localStorage.setItem('teacherDocId', info.docId);
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
  
  const setStudentsWithDbUpdate = useCallback(async (updater: (prev: Student[]) => Student[]) => {
      const oldStudents = students;
      const newStudents = updater(oldStudents);
      setStoreStudents(newStudents); // Optimistic update
      
      try {
        const batch = writeBatch(db);
        const changedStudents = newStudents.filter((newStudent) => {
          const oldStudent = oldStudents.find(s => s._docId === newStudent._docId);
          return !oldStudent || JSON.stringify(newStudent) !== JSON.stringify(oldStudent);
        });

        if(changedStudents.length === 0) return;

        changedStudents.forEach((student) => {
            if (student._docId) {
                const ref = doc(db, "students", student._docId);
                const { _docId, ...studentData } = student;
                batch.set(ref, studentData, { merge: true });
            }
        });
        await batch.commit();
      } catch (error: any) {
        console.error("Failed to update students in DB:", error);
        setStoreStudents(oldStudents); // Revert on failure
        toast({ title: "學生資料更新失敗", description: "與資料庫同步時發生錯誤。", variant: "destructive" });
        throw error;
      }
  }, [students, setStoreStudents, toast]);

  const setTeachersWithDbUpdate = useCallback(async (updater: (prev: Teacher[]) => Teacher[]) => {
      const oldTeachers = teachers;
      const newTeachers = updater(oldTeachers);
      setStoreTeachers(newTeachers); // Optimistic update
      
      try {
        const batch = writeBatch(db);
        newTeachers.forEach((teacher) => {
            const oldTeacher = oldTeachers.find(t => t._docId === teacher._docId);
            if (!oldTeacher || JSON.stringify(teacher) !== JSON.stringify(oldTeacher)) {
                if (teacher._docId) {
                    const ref = doc(db, "teachers", teacher._docId);
                    const { _docId, ...teacherData } = teacher;
                    batch.set(ref, teacherData, { merge: true });
                }
            }
        });
        await batch.commit();
      } catch (error: any) {
        setStoreTeachers(oldTeachers); // Revert
        toast({ title: "教師資料更新失敗", variant: "destructive" });
        throw error;
      }
  }, [teachers, setStoreTeachers, toast]);
  
  const setPlatformConfigWithDbUpdate = useCallback(async (updates: Partial<PlatformConfig>) => {
      const oldConfig = config;
      const newConfig = { ...oldConfig, ...updates } as PlatformConfig;
      setStoreConfig(newConfig); // Optimistic update
      
      try {
        const ref = doc(db, "config", "main");
        await setDoc(ref, updates, { merge: true });
      } catch (error: any) {
        setStoreConfig(oldConfig!); // Revert
        toast({ title: "平台設定更新失敗", variant: "destructive" });
        throw error;
      }
  }, [config, setStoreConfig, toast]);

    const runTransactionWithToast = useCallback(async (updateFunction: (transaction: any) => Promise<any>) => {
        try {
            await runTransaction(db, updateFunction);
        } catch (error: any) {
            console.error("Transaction failed: ", error);
            toast({
                title: "操作失敗",
                description: error.message || "在執行資料庫交易時發生錯誤。",
                variant: "destructive",
            });
            throw error;
        }
    }, [toast]);

  const value = {
    role,
    studentDocId,
    teacherDocId,
    student,
    teacher,
    handleLogout,
    setAuthInfo,
    setStudents: setStudentsWithDbUpdate,
    setTeachers: setTeachersWithDbUpdate,
    setPlatformConfig: setPlatformConfigWithDbUpdate,
    isLoading: isAuthLoading || isStoreLoading,
    runTransaction: runTransactionWithToast,
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
