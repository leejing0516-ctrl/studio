
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import type { Student, Teacher } from '@/lib/types';
import { useSyncAll } from '@/hooks/useSyncAll';

interface AuthContextType {
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
  handleLogout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { students, teachers, config: platformConfig, loading: isAppLoading } = useSchoolStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setStudent(null);
    setTeacher(null);
    router.replace('/');
  }, [router]);

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
          throw new Error('Student not found or password mismatch');
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
          throw new Error('Teacher not found or password mismatch');
        }
      }
    } catch (error) {
      // Any error in auth validation leads to logout
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  }, [isAppLoading, students, teachers, platformConfig, handleLogout]);

  const value = { student, teacher, isLoading: isAppLoading || isLoading, handleLogout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
