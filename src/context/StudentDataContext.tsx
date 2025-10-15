
"use client";

import React, { createContext, useContext, PropsWithChildren, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { AppDataContext } from './AppDataContext';
import type { Student, Teacher } from '@/lib/types';


interface StudentDataContextType {
    studentData: {
        student: Student | null;
        teacher: Teacher | null;
    };
    isLoading: boolean;
}

export const StudentDataContext = createContext<StudentDataContextType>({
    studentData: { student: null, teacher: null },
    isLoading: true,
});

export const StudentDataProvider = ({ children }: PropsWithChildren) => {
    const { students, teachers } = useContext(AppDataContext);
    const { role, studentDocId, teacherDocId } = useAuth();
    const [studentData, setStudentData] = useState<{ student: Student | null; teacher: Teacher | null; }>({ student: null, teacher: null });
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setIsLoading(true);
        if (role === 'student' && studentDocId) {
            const currentStudent = students.find(s => s._docId === studentDocId);
            if (currentStudent) {
                setStudentData({ student: currentStudent, teacher: null });
            } else {
                 if (window.location.pathname !== '/') {
                    localStorage.clear();
                    router.replace('/');
                 }
            }
        } else if (role === 'teacher' && teacherDocId) {
            const currentTeacher = teachers.find(t => t._docId === teacherDocId);
            if (currentTeacher) {
                setStudentData({ student: null, teacher: currentTeacher });
            } else {
                 if (window.location.pathname !== '/') {
                    localStorage.clear();
                    router.replace('/');
                 }
            }
        } else {
             if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/teacher')) {
                // allow teacher login
             } else if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/student')){
                // router.replace('/');
             }
        }
        setIsLoading(false);
    }, [role, studentDocId, teacherDocId, students, teachers, router]);
    
    const value = useMemo(() => ({ studentData, isLoading }), [studentData, isLoading]);

    return (
        <StudentDataContext.Provider value={value}>
            {children}
        </StudentDataContext.Provider>
    );
};

