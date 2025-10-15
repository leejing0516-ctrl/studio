"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import type { Student, Teacher } from '@/lib/types';

interface AuthContextType {
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
  handleLogout: () => void;
  setStudents: (updater: (prev: Student[]) => Student[]) => Promise<void>; // Add this
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
  handleLogout: () => {},
  setStudents: async () => {}, // Add this
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { students, teachers, config: platformConfig, loading: isAppLoading, setStudents: setStoreStudents } = useSchoolStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setStudent(null);
    setTeacher(null);
    router.replace('/');
  }, [router]);
  
  // This is a temporary solution to allow setStudents to be called from the Auth context consumer
  // The correct long-term solution is to move all data modification logic to a separate service/hook layer.
  const setStudentsProxy = async (updater: (prev: Student[]) => Student[]) => {
      const currentStudents = useSchoolStore.getState().students;
      const newStudents = updater(currentStudents);
      setStoreStudents(newStudents);
      // Here you would also add the logic to persist the changes to Firebase
      // For now, it just updates the Zustand store.
  };

  useEffect(() => {
    if (isAppLoading) return;

    try {
      const userRole = localStorage.getItem('userRole');
      
      if (userRole === 'student') {
        const studentId = localStorage.getItem('studentId');
        const classId = localStorage.getItem('studentClassId');
        const storedPassword = localStorage.getItem('studentPassword');

        if (!studentId || !classId || !storedPassword) {
          throw new Error('Student auth info missing');
        }
        
        const currentStudent = students.find(s => s.classId === classId && s.id === studentId);

        if (currentStudent && currentStudent.password === storedPassword) {
          setStudent(currentStudent);
        } else {
           setStudent(null);
          // throw new Error('Student not found or password mismatch');
        }
      } else if (userRole === 'teacher') {
        const teacherId = localStorage.getItem('teacherId');
        const storedPassword = localStorage.getItem('teacherPassword');
        
        if (!teacherId || !storedPassword) {
          throw new Error('Teacher auth info missing');
        }
        
        const currentTeacher = teachers.find(t => t.id === teacherId);
        const correctPassword = currentTeacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

        if (currentTeacher && storedPassword === correctPassword) {
          setTeacher(currentTeacher);
        } else {
          setTeacher(null);
          // throw new Error('Teacher not found or password mismatch');
        }
      } else {
          setStudent(null);
          setTeacher(null);
      }
    } catch (error) {
      handleLogout();
    } finally {
      setAuthLoading(false);
    }
  }, [isAppLoading, students, teachers, platformConfig, handleLogout]);

  const value = { student, teacher, isLoading: isAppLoading || authLoading, handleLogout, setStudents: setStudentsProxy };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
