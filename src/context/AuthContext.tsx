
"use client";

import React, { createContext, useContext, PropsWithChildren, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { StudentDataContext } from './StudentDataContext';
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';


interface AuthContextType {
  student: any;
  teacher: any;
  isLoading: boolean;
  handleLogout: () => void;
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>;
  // Add other necessary functions or states
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
  handleLogout: () => {},
  setStudents: async () => {},
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const { toast } = useToast();
  const { studentData, setStudentData } = useContext(StudentDataContext);
  const { students, teachers, setStudents: setStoreStudents } = useSchoolStore();

  const student = useMemo(() => {
    if (studentData?.student) {
        // Always get the latest student data from the central store
        return students.find(s => s._docId === studentData.student._docId) || studentData.student;
    }
    return null;
  }, [studentData?.student, students]);

  const teacher = useMemo(() => {
     if (studentData?.teacher) {
        return teachers.find(t => t._docId === studentData.teacher._docId) || studentData.teacher;
    }
    return null;
  }, [studentData?.teacher, teachers]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setStudentData(null);
    router.replace("/");
    // No need to call reset on useSchoolStore, it will be reset on reload.
  }, [setStudentData, router]);

  const setStudentsWithDbUpdate = useCallback(async (updater: (prev: Student[]) => Student[]) => {
      const newStudents = updater(students);
      setStoreStudents(newStudents);
      
      try {
        const batch = writeBatch(db);
        newStudents.forEach((student) => {
            // Find changes, a bit inefficient but safe
            const oldStudent = students.find(s => s._docId === student._docId);
            if (JSON.stringify(oldStudent) !== JSON.stringify(student)) {
                 if (student._docId) {
                    const ref = doc(db, "students", student._docId);
                    const { _docId, ...studentData } = student; // Don't write _docId back
                    batch.set(ref, studentData, { merge: true });
                 }
            }
        });
        await batch.commit();
      } catch (error: any) {
        console.error("Failed to update students in DB:", error);
        toast({
          title: "學生資料更新失敗",
          description: "與資料庫同步時發生錯誤。",
          variant: "destructive",
        });
        // Optionally revert state
        setStoreStudents(students);
      }
  }, [students, setStoreStudents, toast]);


  const value = {
    student,
    teacher,
    isLoading: !student && !teacher,
    handleLogout,
    setStudents: setStudentsWithDbUpdate
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
