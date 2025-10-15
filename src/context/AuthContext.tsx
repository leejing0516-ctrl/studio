
"use client";

import { createContext, useState, ReactNode, useEffect, useMemo, useCallback, useContext } from 'react';
import type { Student, Teacher } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, writeBatch, runTransaction as firestoreRunTransaction, Transaction } from 'firebase/firestore';

type SetStateActionWithFunction<S> = S | ((prevState: S) => S);

interface AuthContextType {
  students: Student[];
  setStudents: (action: SetStateActionWithFunction<Student[]>) => Promise<void>;
  teachers: Teacher[];
  setTeachers: (action: SetStateActionWithFunction<Teacher[]>) => Promise<void>;
  student: Student | null;
  teacher: Teacher | null;
  isLoading: boolean;
  runTransaction: (updateFunction: (transaction: Transaction) => Promise<any>) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType>({
  students: [],
  setStudents: async () => {},
  teachers: [],
  setTeachers: async () => {},
  student: null,
  teacher: null,
  isLoading: true,
  runTransaction: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [students, setStudentsState] = useState<Student[]>([]);
    const [teachers, setTeachersState] = useState<Teacher[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleRunTransaction = async (updateFunction: (transaction: Transaction) => Promise<any>) => {
      return firestoreRunTransaction(db, updateFunction);
    };

    const createSetterWithBatch = <T extends { _docId?: string; id?: any }>(
      collectionName: string,
      stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
      currentState: T[]
    ) => {
      return async (action: SetStateActionWithFunction<T[]>) => {
        const oldData = currentState;
        const newData = typeof action === 'function' ? action(oldData) : action;
        
        stateSetter(newData); // Optimistic update
        
        const batch = writeBatch(db);

        const oldMap = new Map(oldData.map(item => [item._docId || item.id, item]));
        const newMap = new Map(newData.map(item => [item._docId || item.id, item]));
        
        oldMap.forEach((_, key) => {
          if (!newMap.has(key)) {
              if (key) batch.delete(doc(db, collectionName, key));
          }
        });
        
        newMap.forEach((newItem, key) => {
          const oldItem = oldMap.get(key);
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
             const { _docId, ...itemData } = newItem;
             const docId = key;
             if (!docId) return;
             const docRef = doc(db, collectionName, docId);
             batch.set(docRef, itemData, { merge: true });
          }
        });
        
        try {
          await batch.commit();
        } catch (error) {
          console.error(`Batch update for ${collectionName} failed:`, error);
          stateSetter(oldData); // Revert on failure
        }
      };
    };

    useEffect(() => {
        const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
            const studentList = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id, id: d.data().id || d.id } as Student));
            setStudentsState(studentList);
            setIsLoading(false);
        });

        const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
            const teacherList = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id, id: d.data().id || d.id } as Teacher));
            setTeachersState(teacherList);
            setIsLoading(false);
        });

        return () => {
            unsubStudents();
            unsubTeachers();
        };
    }, []);

    useEffect(() => {
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
        } else if (userRole === 'teacher') {
            const teacherId = localStorage.getItem('teacherId');
            const currentTeacher = teachers.find(t => t.id === teacherId);
            if (currentTeacher) {
                setTeacher(currentTeacher);
            } else {
                setTeacher(null);
            }
        }
    }, [students, teachers]);

    const value = useMemo(() => ({
        students,
        setStudents: createSetterWithBatch('students', setStudentsState, students),
        teachers,
        setTeachers: createSetterWithBatch('teachers', setTeachersState, teachers),
        student,
        teacher,
        isLoading,
        runTransaction: handleRunTransaction,
    }), [students, teachers, student, teacher, isLoading]);

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

