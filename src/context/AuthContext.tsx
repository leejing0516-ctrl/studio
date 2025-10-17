
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  role: 'student' | 'teacher' | 'subject_teacher' | 'admin';
  name?: string;
  _docId?: string;
  classId?: string;
  password?: string;
}

interface AuthContextType {
  student: User | null;
  teacher: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  handleLogin: (credentials: any) => void;
  handleLogout: () => void;
  setAuthInfo: (info: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { students, teachers, classes, config } = useSchoolStore(state => ({
    students: state.students,
    teachers: state.teachers,
    classes: state.classes,
    config: state.config,
  }));
  const dataLoading = useSchoolStore(state => state.students.length === 0 || state.teachers.length === 0);

  const setAuthInfo = useCallback((info: any) => {
    setIsLoading(true);
    if (info.role === 'student') {
      const studentData = students.find(s => s.id === info.studentId);
      if (studentData) {
        const user: User = { 
          id: studentData.id, 
          role: 'student', 
          name: studentData.name, 
          _docId: studentData._docId, 
          classId: studentData.classId
        };
        setStudent(user);
        setTeacher(null);
        localStorage.setItem('auth', JSON.stringify(user));
        router.push(`/${studentData.id}/dashboard`);
      }
    } else if (info.role === 'teacher' || info.role === 'subject_teacher' || info.role === 'admin') {
      const teacherData = teachers.find(t => t._docId === info.docId);
      if (teacherData) {
        const user: User = { 
            id: teacherData.id, 
            role: teacherData.role, 
            name: teacherData.name, 
            _docId: teacherData._docId,
            password: teacherData.password
        };
        setTeacher(user);
        setStudent(null);
        localStorage.setItem('auth', JSON.stringify(user));
        router.push('/teacher/dashboard');
      }
    }
    setIsLoading(false);
  }, [router, students, teachers]);
  
  // Effect to initialize auth state from localStorage
  useEffect(() => {
    // Wait until essential data is loaded before trying to restore auth
    if (dataLoading) {
      setIsLoading(true);
      return;
    };
  
    try {
      const savedAuth = localStorage.getItem('auth');
      if (savedAuth) {
        const user: User = JSON.parse(savedAuth);
        if (user.role === 'student') {
          // Verify student exists before setting auth state
          if (students.some(s => s.id === user.id)) {
            setStudent(user);
          } else {
            handleLogout(); // Stale auth data, log out
          }
        } else { // teacher, admin, etc.
          // Verify teacher exists before setting auth state
           if (teachers.some(t => t._docId === user._docId)) {
            setTeacher(user);
          } else {
            handleLogout(); // Stale auth data, log out
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse auth from localStorage", error);
      localStorage.removeItem('auth');
    }
    setIsLoading(false);
  }, [dataLoading, students, teachers]);

  const handleLogin = useCallback(async ({ role, studentId, teacherId, password }: any) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (role === 'student') {
      const studentData = students.find(s => s.id === studentId);
      // Student password check is optional for now based on screenshot
      if (studentData) {
        const user = { id: studentData.id, role: 'student', name: studentData.name, _docId: studentData._docId, classId: studentData.classId };
        setStudent(user);
        localStorage.setItem('auth', JSON.stringify(user));
        router.push(`/${studentId}/dashboard`);
      } else {
        toast({ title: "登入失敗", description: "找不到您的學生資料", variant: "destructive" });
      }
    } else { // teacher, admin, etc.
      const teacherData = teachers.find(t => t.id === teacherId);
      const correctPassword = teacherData?.password || config?.teacherPassword || TEACHER_PASSWORD;
      
      if (teacherData && password === correctPassword) {
        const user = { id: teacherData.id, role: teacherData.role, name: teacherData.name, _docId: teacherData._docId, password: teacherData.password };
        setTeacher(user);
        localStorage.setItem('auth', JSON.stringify(user));
        router.push('/teacher/dashboard');
      } else {
        toast({ title: "登入失敗", description: "教師姓名或密碼錯誤", variant: "destructive" });
      }
    }
    setIsLoading(false);
  }, [students, teachers, config, router, toast]);

  const handleLogout = useCallback(() => {
    setStudent(null);
    setTeacher(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('impersonator');
    router.push('/');
  }, [router]);
  
  const isAuthenticated = !!student || !!teacher;

  // Render a global loading screen if essential data is not ready
  if (dataLoading && isAuthenticated && pathname !== '/') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className='ml-4'>正在從雲端同步資料...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ student, teacher, isLoading: isLoading || (isAuthenticated && dataLoading), isAuthenticated, handleLogin, handleLogout, setAuthInfo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
