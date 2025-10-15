
"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Student, Teacher, PlatformConfig } from '@/lib/types';
import { AppDataContext } from './AppDataContext';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';

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

export const StudentDataProvider = ({ children }: { children: React.ReactNode }) => {
    const { students, teachers, isLoading, platformConfig } = useContext(AppDataContext);
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading || pathname === '/') return;

        const userRole = localStorage.getItem('userRole');
        
        if (userRole === 'student') {
            const studentId = localStorage.getItem('studentId');
            const classId = localStorage.getItem('studentClassId');
            const storedPassword = localStorage.getItem('studentPassword');

            if (studentId && classId && storedPassword) {
                const foundStudent = students.find(s => s.classId === classId && s.id === studentId);
                 if (foundStudent && foundStudent.password === storedPassword) {
                    setStudentData({ student: foundStudent });
                 } else {
                    router.replace('/');
                 }
            } else {
                router.replace('/');
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
                     router.replace('/');
                }
            } else {
                router.replace('/');
            }
        } else if (!pathname.startsWith('/login')) { // Allow access to login page
            router.replace('/');
        }
    }, [students, teachers, isLoading, router, pathname, platformConfig]);
    
    return (
        <StudentDataContext.Provider value={{ studentData, setStudentData }}>
            {children}
        </StudentDataContext.Provider>
    );
};
