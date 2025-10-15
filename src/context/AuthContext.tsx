
"use client";

import { createContext, useState, ReactNode, useEffect, useMemo, useContext, useCallback } from 'react';
import type { Student, Teacher } from '@/lib/types';
import { AppDataContext } from './AppDataContext';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
  handleLogout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
  handleLogout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { students, teachers, platformConfig, isLoading: isAppDataLoading } = useContext(AppDataContext);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    
    const handleLogout = useCallback(() => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('studentClassId');
        localStorage.removeItem('studentId');
        localStorage.removeItem('studentPassword');
        localStorage.removeItem('teacherId');
        localStorage.removeItem('teacherName');
        localStorage.removeItem('teacherClassIds');
        localStorage.removeItem('teacherRole');
        localStorage.removeItem('teacherPassword');
        localStorage.removeItem('impersonator');
        setStudent(null);
        setTeacher(null);
        router.replace('/');
    }, [router]);

    useEffect(() => {
        if (isAppDataLoading) {
            setIsLoading(true);
            return;
        }

        const userRole = localStorage.getItem('userRole');
        
        if (userRole === 'student') {
            const studentId = localStorage.getItem('studentId');
            const classId = localStorage.getItem('studentClassId');
            const storedPassword = localStorage.getItem('studentPassword');
            const currentStudent = students.find(s => s.classId === classId && s.id === studentId);
            
            if (currentStudent && currentStudent.password === storedPassword) {
                setStudent(currentStudent);
            } else {
                setStudent(null);
                if (studentId) handleLogout(); // Logout if credentials don't match
            }
            setTeacher(null);
        } else if (userRole === 'teacher') {
            const teacherId = localStorage.getItem('teacherId');
            const storedPassword = localStorage.getItem('teacherPassword');
            const currentTeacher = teachers.find(t => t.id === teacherId);
            const correctPassword = currentTeacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

            if (currentTeacher && storedPassword === correctPassword) {
                setTeacher(currentTeacher);
            } else {
                setTeacher(null);
                if (teacherId) handleLogout(); // Logout if credentials don't match
            }
            setStudent(null);
        } else {
          setStudent(null);
          setTeacher(null);
        }
        
        setIsLoading(false);

    }, [isAppDataLoading, students, teachers, platformConfig, handleLogout]);

    const value = useMemo(() => ({
        student,
        teacher,
        isLoading,
        handleLogout,
    }), [student, teacher, isLoading, handleLogout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
