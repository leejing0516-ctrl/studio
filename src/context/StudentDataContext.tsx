
"use client";

import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Student, Teacher } from '@/lib/types';
import { useSchoolStore } from '@/store/useSchoolStore';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { Loader2 } from 'lucide-react';

interface StudentData {
    student?: Student;
    teacher?: Teacher;
}

interface StudentDataContextType {
    studentData: StudentData | null;
    setStudentData: (data: StudentData | null) => void;
}

export const StudentDataContext = createContext<StudentDataContextType>({
    studentData: null,
    setStudentData: () => {},
});

export const StudentDataProvider = ({ children }: PropsWithChildren) => {
    const { students, teachers, config: platformConfig, loading: isSchoolDataLoading } = useSchoolStore();
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    
    const isLoginPage = pathname === '/';

    useEffect(() => {
        // Don't run auth logic on the login page itself after initial check
        if (isLoginPage && isAuthReady) return;
        
        // Wait for school data to be loaded before trying to authenticate
        if (isSchoolDataLoading) return;

        const userRole = localStorage.getItem('userRole');

        if (!userRole) {
            if (!isLoginPage) {
                router.replace('/');
            }
            setIsAuthReady(true);
            return;
        }

        let foundUser = false;
        if (userRole === 'student') {
            const studentDocId = localStorage.getItem('studentDocId');
            const storedPassword = localStorage.getItem('studentPassword');
            
            if (studentDocId && storedPassword) {
                const foundStudent = students.find(s => s._docId === studentDocId);
                if (foundStudent && foundStudent.password === storedPassword) {
                    setStudentData({ student: foundStudent });
                    foundUser = true;
                    if(isLoginPage) router.replace('/dashboard');
                }
            }

        } else if (userRole === 'teacher') {
            const teacherDocId = localStorage.getItem('teacherDocId');
            const storedPassword = localStorage.getItem('teacherPassword');

            if (teacherDocId && storedPassword) {
                const foundTeacher = teachers.find(t => t._docId === teacherDocId);
                const correctPassword = foundTeacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;
                
                if (foundTeacher && storedPassword === correctPassword) {
                    setStudentData({ teacher: foundTeacher });
                    foundUser = true;
                     if(isLoginPage) router.replace('/teacher/dashboard');
                }
            }
        }
        
        if (!foundUser && !isLoginPage) {
            localStorage.clear();
            router.replace('/');
        }
        
        setIsAuthReady(true);
    }, [isSchoolDataLoading, students, teachers, platformConfig, router, pathname, isAuthReady, isLoginPage]);
    
    // Show a loading screen for non-login pages while authentication is in progress.
    if (!isAuthReady && !isLoginPage) {
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
