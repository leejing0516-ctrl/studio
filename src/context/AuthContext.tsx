"use client";

import React, { createContext, useContext, PropsWithChildren, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import type { Student, Teacher } from '@/lib/types';

interface AuthContextType {
  role: 'student' | 'teacher' | null;
  studentDocId: string | null;
  teacherDocId: string | null;
  student: Student | null;
  teacher: Teacher | null;
  handleLogout: () => void;
  setAuthInfo: (info: { role: 'student' | 'teacher'; docId: string }) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [studentDocId, setStudentDocId] = useState<string | null>(null);
  const [teacherDocId, setTeacherDocId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  
  const { 
    students, teachers, 
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
  
  const value = {
    role,
    studentDocId,
    teacherDocId,
    student,
    teacher,
    handleLogout,
    setAuthInfo,
    isLoading: isAuthLoading || isStoreLoading,
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
