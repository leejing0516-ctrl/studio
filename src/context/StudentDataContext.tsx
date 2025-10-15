
"use client";

import React, { createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Student, Teacher, PlatformConfig } from '@/lib/types';
import { AppDataContext } from './AppDataContext';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';

interface StudentData {
    student?: Student;
    teacher?: Teacher;
}

interface StudentDataContextType {
    studentData: StudentData | null;
    setStudentData: (data: StudentData) => void;
}

export const StudentDataContext = createContext<StudentDataContextType>({
    studentData: null,
    setStudentData: () => {},
});

export const StudentDataProvider = ({ children }: PropsWithChildren) => {
    const { students, teachers, isLoading, platformConfig } = useContext(AppDataContext);
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;

        const userRole = localStorage.getItem('userRole');
        
        if (!userRole) {
            if (pathname !== '/') {
                router.replace('/');
            }
            setIsAuthReady(true);
            return;
        }

        if (userRole === 'student') {
            const studentId = localStorage.getItem('studentId');
            const classId = localStorage.getItem('studentClassId');
            const storedPassword = localStorage.getItem('studentPassword');
            
            if (studentId && classId && storedPassword) {
                const foundStudent = students.find(s => s.classId === classId && s.id === studentId);
                 if (foundStudent && foundStudent.password === storedPassword) {
                    setStudentData({ student: foundStudent });
                 } else {
                    if (pathname !== '/') router.replace('/');
                 }
            } else {
                 if (pathname !== '/') router.replace('/');
            }

        } else if (userRole === 'teacher') {
            const teacherId = localStorage.getItem('teacherId');
            const storedPassword = localStorage.getItem('teacherPassword');

            if (teacherId && storedPassword) {
                const foundTeacher = teachers.find(t => t.id === teacherId);
                const correctPassword = foundTeacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;
                if (foundTeacher && storedPassword === correctPassword) {
                     setStudentData({ teacher: foundTeacher });
                } else {
                     if (pathname !== '/') router.replace('/');
                }
            } else {
                if (pathname !== '/') router.replace('/');
            }
        }
        setIsAuthReady(true);
    }, [students, teachers, isLoading, router, pathname, platformConfig]);
    
    if (!isAuthReady && pathname !== '/') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                正在驗證您的身份...
            </div>
        );
    }
    
    return (
        <StudentDataContext.Provider value={{ studentData, setStudentData }}>
            {children}
        </StudentDataContext.Provider>
    );
};
