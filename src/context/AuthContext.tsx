
"use client";

import { createContext, useState, ReactNode, useEffect, useMemo, useContext } from 'react';
import type { Student, Teacher } from '@/lib/types';
import { AppDataContext } from './AppDataContext';

interface AuthContextType {
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  student: null,
  teacher: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { students, teachers, isLoading: isAppLoading } = useContext(AppDataContext);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(isAppLoading) {
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
            }
            setTeacher(null);
        } else if (userRole === 'teacher') {
            const teacherId = localStorage.getItem('teacherId');
            const storedPassword = localStorage.getItem('teacherPassword');
            const currentTeacher = teachers.find(t => t.id === teacherId);

            if (currentTeacher && (currentTeacher.password === storedPassword || "001" === storedPassword)) { // using default password as fallback
                setTeacher(currentTeacher);
            } else {
                setTeacher(null);
            }
            setStudent(null);
        } else {
          setStudent(null);
          setTeacher(null);
        }
        
        setIsLoading(false);

    }, [students, teachers, isAppLoading]);

    const value = useMemo(() => ({
        student,
        teacher,
        isLoading,
    }), [student, teacher, isLoading]);

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
