
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import type { Student, Teacher } from '@/lib/types';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
  handleLogout: () => void;
  setStudents: (updater: (prev: Student[]) => Student[], skipDbUpdate?: boolean) => Promise<void>; 
  setTeachers: (updater: (prev: Teacher[]) => Teacher[]) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
  handleLogout: () => {},
  setStudents: async () => {},
  setTeachers: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { students, teachers, config: platformConfig, loading: isAppLoading, setStudents: setStoreStudents, setTeachers: setStoreTeachers } = useSchoolStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setStudent(null);
    setTeacher(null);
    router.replace('/');
  }, [router]);
  
  const setStudentsProxy = async (updater: (prev: Student[]) => Student[], skipDbUpdate = false) => {
      const currentStudents = useSchoolStore.getState().students;
      const newStudents = updater(currentStudents);
      setStoreStudents(newStudents);
      
      if (skipDbUpdate) return;
      
      // Batch update to Firestore
      try {
        const batch = writeBatch(db);
        newStudents.forEach(s => {
          if (s._docId) { // Ensure we have the document ID
            const studentRef = doc(db, "students", s._docId);
            const { _docId, ...studentData } = s; // Don't write _docId back to the document
            batch.set(studentRef, studentData);
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to batch update students in Firestore:", error);
        // Optionally revert local state or show an error
      }
  };
  
   const setTeachersProxy = async (updater: (prev: Teacher[]) => Teacher[]) => {
      const currentTeachers = useSchoolStore.getState().teachers;
      const newTeachers = updater(currentTeachers);
      setStoreTeachers(newTeachers);

      // Batch update to Firestore
      try {
        const batch = writeBatch(db);
        newTeachers.forEach(t => {
          if (t._docId) { // Ensure we have the document ID
            const teacherRef = doc(db, "teachers", t._docId);
             const { _docId, ...teacherData } = t; 
            batch.set(teacherRef, teacherData);
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Failed to batch update teachers in Firestore:", error);
      }
  };


  useEffect(() => {
    if (isAppLoading) return;

    // Don't run auth check on the login page
    if (pathname === '/') {
        setAuthLoading(false);
        return;
    }

    try {
      const userRole = localStorage.getItem('userRole');
      
      if (userRole === 'student') {
        const studentId = localStorage.getItem('studentId');
        const classId = localStorage.getItem('studentClassId');
        const storedPassword = localStorage.getItem('studentPassword');

        if (!studentId || !classId || !storedPassword) throw new Error('Student auth info missing');
        
        const currentStudent = students.find(s => s.classId === classId && s.id === studentId);

        if (currentStudent && (currentStudent as Student).password === storedPassword) {
          setStudent(currentStudent);
        } else {
           throw new Error('Student not found or password mismatch');
        }
      } else if (userRole === 'teacher') {
        const teacherId = localStorage.getItem('teacherId');
        const storedPassword = localStorage.getItem('teacherPassword');
        
        if (!teacherId || !storedPassword) throw new Error('Teacher auth info missing');
        
        const currentTeacher = teachers.find(t => t.id === teacherId);
        const correctPassword = currentTeacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

        if (currentTeacher && storedPassword === correctPassword) {
          setTeacher(currentTeacher);
        } else {
          throw new Error('Teacher not found or password mismatch');
        }
      } else {
          throw new Error("No user role found");
      }
    } catch (error) {
      handleLogout();
    } finally {
      setAuthLoading(false);
    }
  }, [isAppLoading, students, teachers, platformConfig, handleLogout, pathname]);

  const value = { student, teacher, isLoading: authLoading, handleLogout, setStudents: setStudentsProxy, setTeachers: setTeachersProxy };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
