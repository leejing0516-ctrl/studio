
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAppData } from './AppDataContext';

interface User {
  id: string;
  role: 'student' | 'teacher' | 'subject_teacher' | 'admin';
  name?: string;
  _docId?: string;
  classId?: string;
  password?: string;
  // This helps identify impersonation
  managedClasses?: string[];
}

interface AuthContextType {
  student: User | null;
  teacher: User | null;
  isLoading: boolean; // This now primarily reflects the initial auth check from localStorage
  isAuthenticated: boolean;
  handleLogin: (credentials: any) => void;
  handleLogout: () => void;
  setAuthInfo: (info: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Is true until we have checked localStorage
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { students, teachers, config } = useSchoolStore();
  const { dataLoaded } = useAppData();

  const handleLogout = useCallback(() => {
    setIsLoading(true);
    setStudent(null);
    setTeacher(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('impersonator');
    router.push('/');
    setIsLoading(false);
  }, [router]);

  // Effect to initialize auth state from localStorage
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('auth');
      if (savedAuth) {
        const user: User = JSON.parse(savedAuth);
        if (user.role === 'student') {
          setStudent(user);
        } else { // teacher, admin, etc.
          setTeacher(user);
        }
      }
    } catch (error) {
      console.error("Failed to parse auth from localStorage", error);
      localStorage.removeItem('auth');
    }
    setIsLoading(false); // Finished checking localStorage
  }, []);

  // Effect to verify auth state once data is loaded, and log out if stale.
  useEffect(() => {
    // Only run verification if we have data and we are not on the login page
    if (!dataLoaded || pathname === '/') return; 
    
    const savedAuth = localStorage.getItem('auth');
    if (!savedAuth) {
        // If not on login page and no auth, logout
        if (pathname !== '/') {
            handleLogout();
        }
        return;
    }

    try {
        const user: User = JSON.parse(savedAuth);
        let userIsValid = false;
        if (user.role === 'student') {
            userIsValid = students.some(s => s.id === user.id);
        } else { // teacher, admin, etc.
            userIsValid = teachers.some(t => t._docId === user._docId);
        }

        if (!userIsValid) {
            toast({ title: "登入已過期", description: "您的帳號資料已更新或不存在，請重新登入。", variant: "destructive" });
            handleLogout();
        }
    } catch {
        handleLogout();
    }
  }, [dataLoaded, students, teachers, pathname, handleLogout, toast]);

  const setAuthInfo = useCallback((info: any) => {
    setIsLoading(true);
    let userToSet: User | null = null;
    
    if (info.role === 'student') {
      const studentData = students.find(s => s.id === info.studentId);
      if (studentData) {
        userToSet = { 
          id: studentData.id, 
          role: 'student', 
          name: studentData.name, 
          _docId: studentData._docId, 
          classId: studentData.classId
        };
        setStudent(userToSet);
        setTeacher(null);
        router.push(`/${studentData.id}/dashboard`);
      }
    } else if (info.role === 'teacher' || info.role === 'subject_teacher' || info.role === 'admin') {
      const teacherData = teachers.find(t => t._docId === info.docId);
      if (teacherData) {
        userToSet = { 
            id: teacherData.id, 
            role: teacherData.role, 
            name: teacherData.name, 
            _docId: teacherData._docId,
            password: teacherData.password,
            managedClasses: teacherData.managedClasses,
        };
        setTeacher(userToSet);
        setStudent(null);
        router.push('/teacher/dashboard');
      }
    }

    if (userToSet) {
        localStorage.setItem('auth', JSON.stringify(userToSet));
    }
    
    setIsLoading(false);
  }, [router, students, teachers]);

  const handleLogin = useCallback(async ({ role, studentId, teacherId, password }: any) => {
    setIsLoading(true);

    if (role === 'student') {
      const studentData = students.find(s => s.id === studentId);
      if (studentData) {
        setAuthInfo({ role: 'student', studentId: studentData.id });
      } else {
        toast({ title: "登入失敗", description: "找不到您的學生資料", variant: "destructive" });
        setIsLoading(false);
      }
    } else {
      const teacherData = teachers.find(t => t.id === teacherId);
      const correctPassword = teacherData?.password || config?.teacherPassword || TEACHER_PASSWORD;
      
      if (teacherData && password === correctPassword) {
        setAuthInfo({ role: teacherData.role, docId: teacherData._docId });
      } else {
        toast({ title: "登入失敗", description: "教師姓名或密碼錯誤", variant: "destructive" });
        setIsLoading(false);
      }
    }
  }, [students, teachers, config, toast, setAuthInfo]);
  
  const isAuthenticated = !!student || !!teacher;

  // Show a loading spinner only during the very initial auth check
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        正在驗證身份...
      </div>
    );
  }
  
  // After initial load, rely on layouts to handle their own loading state based on data availability
  return (
    <AuthContext.Provider value={{ student, teacher, isLoading, isAuthenticated, handleLogin, handleLogout, setAuthInfo }}>
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
