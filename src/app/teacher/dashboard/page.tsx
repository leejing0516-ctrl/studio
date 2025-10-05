

"use client";

import { useState, useContext, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Teacher, Class, Student, RedeemedRewardItem, Loan, StudentChallenge, PointRecord, PlatformConfig, StudentHabit } from "@/lib/types";
import { PlusCircle, Edit, Trash2, KeyRound, Upload, Download, Coins, Check, X, BadgeCent, Loader2, ShieldAlert, DatabaseZap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from "papaparse";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import { doc, writeBatch, Transaction, setDoc, deleteDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, subDays, isAfter } from "date-fns";

const CONFIRM_DELETE_TEXT = "我確定要刪除";
const CONFIRM_RESTORE_TEXT = "我確定要覆蓋";

export default function TeacherDashboardPage() {
    const { 
        students, setStudents,
        classes, setClasses,
        teachers, setTeachers,
        isLoading, platformConfig, runTransaction, setPlatformConfig
    } = useContext(AppDataContext);
    const { toast } = useToast();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [teacherName, setTeacherName] = useState<string | null>(null);
    const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [pointInputs, setPointInputs] = useState<{ [studentId: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
    const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
    const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
    const [isAllocatePointsDialogOpen, setIsAllocatePointsDialogOpen] = useState(false);
    const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);

    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);
    const [parsedCsvData, setParsedCsvData] = useState<Student[]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [teacherToAllocate, setTeacherToAllocate] = useState<Teacher | null>(null);
    const [teacherToImpersonate, setTeacherToImpersonate] = useState<Teacher | null>(null);
    const [confirmDeleteInput, setConfirmDeleteInput] = useState("");
    const [classToDelete, setClassToDelete] = useState<Class | null>(null);
    const [editedTeacherRole, setEditedTeacherRole] = useState<string | undefined>(undefined);

    const [batchPoints, setBatchPoints] = useState<number | ''>('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    
    const [loanToProcess, setLoanToProcess] = useState<{ student: Student, loan: Loan } | null>(null);
    const [challengeToApprove, setChallengeToApprove] = useState<{ student: Student, challenge: StudentChallenge } | null>(null);

    const [historySelectedTeacherId, setHistorySelectedTeacherId] = useState<string>('');
    const [historySelectedClassId, setHistorySelectedClassId] = useState<string>('');

    const [restoreCollectionName, setRestoreCollectionName] = useState('');
    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [confirmRestoreInput, setConfirmRestoreInput] = useState("");
    const [isRestoring, setIsRestoring] = useState(false);
    
    const classOptions = useMemo(() => {
        if (role === 'admin') return classes;
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [role, classes, teacherClassIds]);

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        const storedTeacherName = localStorage.getItem('teacherName');
        const storedClassIdsStr = localStorage.getItem('teacherClassIds');
        setRole(storedRole);
        setTeacherId(storedTeacherId);
        setTeacherName(storedTeacherName);
        if (storedClassIdsStr && storedClassIdsStr !== 'undefined') {
            try {
                const ids = JSON.parse(storedClassIdsStr);
                setTeacherClassIds(Array.isArray(ids) ? ids : []);
            } catch (e) {
                console.error("Failed to parse teacherClassIds from localStorage", e);
                setTeacherClassIds([]);
            }
        }
    }, []);

    useEffect(() => {
        if (classOptions.length > 0) {
            const currentClassIds = classOptions.map(c => c.id);
            if (!selectedClassId || !currentClassIds.includes(selectedClassId)) {
                setSelectedClassId(currentClassIds[0]);
            }
             if (!historySelectedClassId || !currentClassIds.includes(historySelectedClassId)) {
                setHistorySelectedClassId(currentClassIds[0]);
            }
        }
    }, [classOptions, selectedClassId, historySelectedClassId]);

    useEffect(() => {
        if (role && (role === 'teacher' || role === 'subject_teacher') && teacherId) {
            setHistorySelectedTeacherId(teacherId);
        }
    }, [role, teacherId]);

    
    const teacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);

    const studentsInClass = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId);
    }, [students, selectedClassId]);

    const availableClassesForNewTeacher = useMemo(() => {
        const assignedClassIds = new Set(
            teachers.filter(t => t.role === 'teacher' && t.classIds.length > 0).map(t => t.classIds[0])
        );
        return classes.filter(c => !assignedClassIds.has(c.id));
    }, [teachers, classes]);

    const availableClassesForEditTeacher = useMemo(() => {
        if (!teacherToEdit) return [];
        const assignedClassIds = new Set(
            teachers
                .filter(t => t.role === 'teacher' && t.id !== teacherToEdit.id && t.classIds.length > 0)
                .map(t => t.classIds[0])
        );
        const currentTeacherClassId = teacherToEdit.classIds?.[0];
        const unassignedClasses = classes.filter(c => !assignedClassIds.has(c.id));
        
        if (currentTeacherClassId && !unassignedClasses.some(c => c.id === currentTeacherClassId)) {
             const currentClass = classes.find(c => c.id === currentTeacherClassId);
             if (currentClass) {
                unassignedClasses.push(currentClass);
             }
        }
        return unassignedClasses;
    }, [teachers, classes, teacherToEdit]);

    const pointHistoryForTeacherAndClass = useMemo(() => {
        if (!historySelectedTeacherId || !historySelectedClassId) {
            return { records: [], studentTotals: new Map(), classSummary: [] };
        }

        const twentyDaysAgo = subDays(new Date(), 20);

        const targetTeacher = teachers.find(t => t.id === historySelectedTeacherId);
        if (!targetTeacher) {
            return { records: [], studentTotals: new Map(), classSummary: [] };
        }

        const records: (PointRecord & { studentName: string })[] = [];
        const studentTotals = new Map<string, { name: string, total: number }>();

        const classStudents = students.filter(s => s.classId === historySelectedClassId);

        const classSummary = classStudents.map(student => {
            let totalAwarded = 0;
            let totalDeducted = 0;

            (student.pointHistory || []).forEach(record => {
                const recordDate = parseISO(record.date);
                if (record.teacherId === historySelectedTeacherId && isAfter(recordDate, twentyDaysAgo)) {
                    records.push({ ...record, studentName: student.name });
                    if (record.points > 0) {
                        totalAwarded += record.points;
                    } else {
                        totalDeducted += record.points;
                    }
                }
            });

            const netTotal = totalAwarded + totalDeducted;
            if (netTotal !== 0) {
                studentTotals.set(student.id, { name: student.name, total: netTotal });
            }

            return {
                studentId: student.id,
                studentName: student.name,
                awarded: totalAwarded,
                deducted: totalDeducted,
                net: netTotal,
            };
        }).filter(summary => summary.awarded !== 0 || summary.deducted !== 0);

        records.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

        return { records, studentTotals, classSummary };
    }, [students, historySelectedTeacherId, historySelectedClassId, teachers]);
    
    const { rewardApprovalRequests, loanApprovalRequests, challengeApprovalRequests, habitApprovalRequests } = useMemo(() => {
        const rewardReqs: { student: Student; rewardItem: RedeemedRewardItem }[] = [];
        const loanReqs: { student: Student; loan: Loan }[] = [];
        const challengeReqs: { student: Student; challenge: StudentChallenge }[] = [];
        const habitReqs: { student: Student; habit: StudentHabit }[] = [];
    
        let studentsToList: Student[] = [];
    
        if (role === 'admin') {
            studentsToList = students;
        } else if ((role === 'teacher' || role === 'subject_teacher') && teacherId && teacherClassIds.length > 0) {
            studentsToList = students.filter(s => teacherClassIds.includes(s.classId));
        }
    
        studentsToList.forEach(student => {
            (student.redeemedRewards || []).forEach(r => {
                if (r.status === 'pending_use') {
                    rewardReqs.push({ student, rewardItem: r });
                }
            });
    
            (student.loans || []).forEach(l => {
                if (l.status === 'pending') {
                    loanReqs.push({ student, loan: l });
                }
            });
    
            (student.challenges || []).forEach(c => {
                if (c.status === 'pending_approval') {
                    challengeReqs.push({ student, challenge: c });
                }
            });

            (student.habits || []).forEach(h => {
                if (h.status === 'pending_approval') {
                    habitReqs.push({ student, habit: h });
                }
            });
        });
        
        const uniqueRewardReqs = rewardReqs.filter((v, i, a) => 
            a.findIndex(t => (`${t.student._docId}-${t.rewardItem.redemptionId}` === `${v.student._docId}-${v.rewardItem.redemptionId}`)) === i
        );
    
        return {
            rewardApprovalRequests: uniqueRewardReqs,
            loanApprovalRequests: loanReqs,
            challengeApprovalRequests: challengeReqs,
            habitApprovalRequests: habitReqs,
        };
    }, [students, role, teacherId, teacherClassIds]);

    const handleAddStudent = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const studentId = formData.get('id') as string;
        
        const existingStudent = students.find(s => s.classId === selectedClassId && s.id === studentId);
        if (existingStudent) {
            toast({
                title: "新增失敗",
                description: `ID 為 ${studentId} 的學生已存在於此班級中。`,
                variant: "destructive",
            });
            return;
        }

        const newStudent: Student = {
            id: studentId,
            name: formData.get('name') as string,
            classId: selectedClassId,
            points: 0,
            avatar: `https://picsum.photos/seed/${studentId}/100`,
            password: formData.get('password') as string,
            portfolio: [],
            pointHistory: [],
        };
        await setStudents([...students, newStudent]);
        setIsAddStudentDialogOpen(false);
        toast({
            title: "學生已新增",
            description: `${newStudent.name} 已被加入 ${classes.find(c=>c.id === selectedClassId)?.name} 班。`
        });
    };
    
    const handleEditStudent = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!studentToEdit) return;

        const formData = new FormData(event.currentTarget);
        
        await setStudents(prev => prev.map(s => {
            if (s._docId === studentToEdit._docId) {
                return {
                    ...s,
                    id: formData.get('id') as string,
                    name: formData.get('name') as string,
                };
            }
            return s;
        }));

        setIsEditStudentDialogOpen(false);
        toast({
            title: "學生資料已更新",
        });
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete || !studentToDelete._docId) return;
        await setStudents(students.filter(s => s._docId !== studentToDelete._docId));
        toast({
            title: "學生已刪除",
            description: `${studentToDelete.name} 已被從班級中移除。`,
            variant: "destructive"
        });
        setStudentToDelete(null);
    };

    const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!studentToResetPassword) return;

        const formData = new FormData(event.currentTarget);
        const newPassword = formData.get('new-password') as string;

        await setStudents(prev => prev.map(s => 
            s._docId === studentToResetPassword._docId
            ? { ...s, password: newPassword }
            : s
        ));
        
        setIsResetPasswordDialogOpen(false);
        toast({
            title: "密碼已重設",
            description: `${studentToResetPassword.name} 的密碼已更新。`
        });
    }
    
    const handleFileParse = (file: File) => {
        setCsvFile(file);
        Papa.parse<string[]>(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvPreview(results.data.slice(0, 5));
                const studentData = results.data.slice(1).map((row: string[]) => {
                    const [classId, id, name, password] = row;
                    return {
                        id, name, classId, password,
                        points: 0,
                        avatar: `https://picsum.photos/seed/${id}/100`,
                        portfolio: [],
                        pointHistory: []
                    };
                }).filter(s => s.id && s.name && s.classId && s.password);
                setParsedCsvData(studentData);
            }
        });
    };

    const handleImportStudents = async () => {
        if (parsedCsvData.length === 0) return;
        
        const existingStudentKeys = new Set(students.map(s => `${s.classId}-${s.id}`));
        const newStudents = parsedCsvData.filter(s => !existingStudentKeys.has(`${s.classId}-${s.id}`));
        
        await setStudents(prev => [...prev, ...newStudents]);

        toast({
            title: `匯入完成`,
            description: `已成功新增 ${newStudents.length} 位學生。`
        });
        setIsImportDialogOpen(false);
        setParsedCsvData([]);
        setCsvFile(null);
        setCsvPreview([]);
    };

    const handleAddTeacher = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const role = formData.get('role') as 'teacher' | 'admin' | 'subject_teacher';
        const classId = formData.get('classId') as string;

        const newTeacher: Omit<Teacher, '_docId'> = {
            id: `teacher-${Date.now()}-${Math.random()}`,
            name,
            role,
            classIds: role === 'teacher' && classId ? [classId] : (role === 'subject_teacher' ? [] : []),
            pointBalance: 0,
            password: platformConfig?.teacherPassword || TEACHER_PASSWORD,
        };

        await setTeachers(prev => [...prev, newTeacher as Teacher]);
        toast({ title: "教師已新增", description: `${name} 已被新增至系統中。` });
        setIsAddTeacherDialogOpen(false);
    };

    const handleUpdateTeacher = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!teacherToEdit) return;

        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const newRole = editedTeacherRole as 'teacher' | 'admin' | 'subject_teacher';
        const classId = formData.get('classId') as string;

        await setTeachers(prev => prev.map(t => {
            if (t.id === teacherToEdit.id) {
                return {
                    ...t,
                    name,
                    role: newRole,
                    classIds: newRole === 'teacher' && classId ? [classId] : (newRole === 'subject_teacher' ? (teacherToEdit.classIds || []) : []),
                }
            }
            return t;
        }));
        
        toast({ title: "教師資料已更新" });
        setIsEditTeacherDialogOpen(false);
    };

    const handleDeleteTeacher = async () => {
        if (!teacherToDelete || !teacherToDelete._docId) return;
        await setTeachers(prev => prev.filter(t => t._docId !== teacherToDelete._docId));
        toast({ title: "教師已刪除", variant: "destructive" });
        setTeacherToDelete(null);
    };

    const handleAllocatePoints = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!teacherToAllocate || !runTransaction || !teacherToAllocate._docId) return;

        const formData = new FormData(event.currentTarget);
        const amount = Number(formData.get('amount'));
        
        await runTransaction(async (transaction: Transaction) => {
            const configRef = doc(db, 'config', 'main');
            const teacherRef = doc(db, 'teachers', teacherToAllocate!._docId!);
            
            const [configDoc, teacherDoc] = await Promise.all([
                transaction.get(configRef),
                transaction.get(teacherRef)
            ]);
            
            const schoolFunds = (configDoc.data() as PlatformConfig)?.schoolFunds || 0;
            const teacherBalance = (teacherDoc.data() as Teacher)?.pointBalance || 0;

            if (schoolFunds < amount) {
                throw new Error("學校資金不足");
            }
            transaction.update(configRef, { schoolFunds: schoolFunds - amount });
            transaction.update(teacherRef, { pointBalance: teacherBalance + amount });
        });
        
        toast({ title: "點數已撥款" });
        setIsAllocatePointsDialogOpen(false);
    };

    const handleImpersonate = () => {
        if (!teacherToImpersonate || !teacherId) return;
        
        const teacherPassword = teacherToImpersonate.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

        localStorage.setItem('userRole', 'teacher');
        localStorage.setItem('teacherId', teacherToImpersonate.id);
        localStorage.setItem('teacherRole', teacherToImpersonate.role);
        localStorage.setItem('teacherClassIds', JSON.stringify(teacherToImpersonate.classIds || []));
        localStorage.setItem('teacherName', teacherToImpersonate.name);
        localStorage.setItem('teacherPassword', teacherPassword);
        localStorage.setItem('impersonator', teacherId);

        toast({ title: `開始模擬 ${teacherToImpersonate.name}`});
        window.location.reload();
    }

    const handleAddClass = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const id = formData.get('id') as string;
        const name = formData.get('name') as string;

        if (classes.some(c => c.id === id)) {
            toast({ title: "新增失敗", description: `班級 ID ${id} 已存在。`, variant: "destructive" });
            return;
        }

        const newClass: Omit<Class, '_docId'> = { id, name, announcements: [] };
        await setClasses(prev => [...prev, newClass as Class]);
        (event.target as HTMLFormElement).reset();
    };

    const handleDeleteClass = async () => {
        if (!classToDelete || !classToDelete._docId) return;
        if (students.some(s => s.classId === classToDelete.id)) {
            toast({ title: "刪除失敗", description: "此班級中仍有學生，無法刪除。", variant: "destructive" });
            setConfirmDeleteInput("");
            setClassToDelete(null);
            return;
        }
        
        await setTeachers(prev => prev.map(t => {
            if (t.role === 'subject_teacher' && (t.classIds || []).includes(classToDelete.id)) {
                return { ...t, classIds: t.classIds.filter(id => id !== classToDelete.id) };
            }
            return t;
        }));
        
        await setClasses(prev => prev.filter(c => c._docId !== classToDelete._docId));

        toast({ title: "班級已刪除", variant: "destructive" });
        
        setConfirmDeleteInput("");
        setClassToDelete(null);
    };
    
    const performPointOperation = async (student: Student, points: number, isBatch: boolean = false) => {
        if (!teacherId || !teacherName) {
            toast({ title: "操作無效", description: "教師資訊不完整，請重新登入。", variant: "destructive" });
            return;
        }
        if (points === 0 || !student._docId) return;

        const currentOperator = teachers.find(t => t.id === teacherId);
        if (!currentOperator || !currentOperator._docId) {
            toast({ title: "操作無效", description: "找不到您的教師資料。", variant: "destructive" });
            return;
        }
        
        if (role !== 'admin' && !(currentOperator.classIds || []).includes(selectedClassId)) {
            toast({ title: "權限不足", description: "您沒有在此班級發放點數的權限。", variant: "destructive" });
            return;
        }

        setIsProcessing(student._docId);

        try {
            await runTransaction(async (transaction) => {
                const impersonatorId = localStorage.getItem('impersonator');
                const isOperatingAsAdmin = role === 'admin' && !impersonatorId;

                const studentRef = doc(db, 'students', student._docId!);
                const studentDoc = await transaction.get(studentRef);
                if (!studentDoc.exists()) throw new Error("找不到學生資料。");
                const studentData = studentDoc.data() as Student;

                if (points < 0 && studentData.points < Math.abs(points)) {
                    throw new Error(`學生 ${studentData.name} 的點數不足以扣除。`);
                }

                let sourceRef, sourceField;
                if (isOperatingAsAdmin) {
                    sourceRef = doc(db, 'config', 'main');
                    sourceField = 'schoolFunds';
                } else {
                    sourceRef = doc(db, 'teachers', currentOperator._docId!);
                    sourceField = 'pointBalance';
                }

                const sourceDoc = await transaction.get(sourceRef);
                if (!sourceDoc.exists()) throw new Error("找不到您的資金來源資料。");
                const currentBalance = (sourceDoc.data() as any)[sourceField] || 0;
                
                if (points > 0 && currentBalance < points) {
                    throw new Error(`您的點數餘額不足。`);
                }

                const finalBalance = currentBalance - points;

                const newHistoryRecord: PointRecord = {
                    points,
                    date: new Date().toISOString(),
                    reason: `由老師 ${teacherName} ${isBatch ? '批次' : ''}${points > 0 ? '發放' : '扣除'}`,
                    teacherId: teacherId,
                };
                
                transaction.update(studentRef, {
                    points: studentData.points + points,
                    pointHistory: [...(studentData.pointHistory || []), newHistoryRecord]
                });
                transaction.update(sourceRef, { [sourceField]: finalBalance });
            });

        } catch (error: any) {
            console.error(`Point operation failed for student ${student.id}:`, error);
            throw error;
        } finally {
            if (!isBatch) {
                setIsProcessing(null);
                setPointInputs(prev => ({ ...prev, [student._docId!]: '' }));
            }
        }
    };
    
    const handleAwardPoints = async (student: Student) => {
        if (!student._docId) return;
        const pointsStr = pointInputs[student._docId];
        if (!pointsStr) return;
        const points = parseInt(pointsStr, 10);
        
        try {
            await performPointOperation(student, points, false);
        } catch(error: any) {
             toast({ title: "操作失敗", description: error.message, variant: "destructive" });
             setIsProcessing(null);
        }
    };

    const handleBatchOperation = async () => {
        if (batchPoints === '' || batchPoints === 0) return;
        
        setIsBatchProcessing(true);
        const points = Number(batchPoints);

        const studentsToUpdate = studentsInClass.filter(student => {
            if (points < 0 && student.points < Math.abs(points)) return false;
            return true;
        });

        if (studentsToUpdate.length < studentsInClass.length && points < 0) {
             toast({
                title: "部分操作未執行",
                description: "部分學生的點數不足以進行批次扣除。",
                variant: "default",
            });
        }
        if (studentsToUpdate.length === 0) {
            toast({ title: "批次操作失敗", description: (points < 0 ? "所有學生的點數都不足以進行扣除。" : "此班級沒有學生可供操作。"), variant: "destructive" });
            setIsBatchProcessing(false);
            return;
        }
        
        const impersonatorId = localStorage.getItem('impersonator');
        const isOperatingAsAdmin = role === 'admin' && !impersonatorId;

        const totalPointChange = points * studentsToUpdate.length;
        const sourceBalance = isOperatingAsAdmin ? (platformConfig?.schoolFunds || 0) : (teacher?.pointBalance || 0);

        if (points > 0 && sourceBalance < totalPointChange) {
            toast({ title: "批次操作失敗", description: "您的點數餘額不足以完成對所有學生的操作。", variant: "destructive" });
            setIsBatchProcessing(false);
            return;
        }

        let successfulOperations = 0;
        
        for (const student of studentsToUpdate) {
            try {
                await performPointOperation(student, points, true);
                successfulOperations++;
            } catch (error: any) {
                toast({ title: `為 ${student.name} 操作失敗`, description: error.message, variant: "destructive" });
            }
        }
        
        if (successfulOperations > 0) {
            toast({ title: "批次操作完成", description: `已成功為 ${successfulOperations} 位學生執行操作。` });
        }
        
        setIsBatchProcessing(false);
        setBatchPoints('');
    };

    const handleApproveRewardUse = async (student: Student, rewardItem: RedeemedRewardItem) => {
        if (!student._docId) return;
        await setStudents(prev => prev.map(s => {
            if (s._docId === student._docId) {
                const updatedRewards = (s.redeemedRewards || []).filter(r => r.redemptionId !== rewardItem.redemptionId);
                return { ...s, redeemedRewards: updatedRewards };
            }
            return s;
        }));
        toast({ title: "已同意使用", description: `已同意 ${student.name} 使用「${rewardItem.reward.name}」。`});
    };
    
    const handleProcessLoan = async (status: 'active' | 'rejected') => {
        if (!loanToProcess || !teacherId || !loanToProcess.student._docId) return;
        const { student, loan } = loanToProcess;

        try {
            await runTransaction(async (transaction: Transaction) => {
                const studentRef = doc(db, 'students', student._docId!);
                
                if (status === 'active') {
                    let sourceRef, sourceFunds, sourceField;
                    const impersonatorId = localStorage.getItem('impersonator');
                    const currentOperatorId = impersonatorId || teacherId;
                    const operator = teachers.find(t => t.id === currentOperatorId);

                    if (!operator || !operator._docId) throw new Error("找不到操作者資訊。");

                    if (operator.role === 'admin') {
                        sourceRef = doc(db, 'config', 'main');
                        const sourceDoc = await transaction.get(sourceRef);
                        sourceFunds = ((sourceDoc.data() as any).schoolFunds || 0);
                        sourceField = 'schoolFunds';
                    } else {
                        sourceRef = doc(db, 'teachers', operator._docId);
                         const sourceDoc = await transaction.get(sourceRef);
                        sourceFunds = ((sourceDoc.data() as any).pointBalance || 0);
                        sourceField = 'pointBalance';
                    }
                    if (sourceFunds < loan.amount) {
                        throw new Error("您的點數餘額不足以批准此貸款。");
                    }
                    transaction.update(sourceRef, { [sourceField]: sourceFunds - loan.amount });
                }

                const studentDoc = await transaction.get(studentRef);
                if (!studentDoc.exists()) throw new Error("Student not found");
                const studentData = studentDoc.data() as Student;

                const updatedLoans = (studentData.loans || []).map(l => 
                    l.id === loan.id
                    ? { ...l, status, approvalDate: new Date().toISOString(), approverId: teacherId }
                    : l
                );
                
                let updatedPoints = studentData.points;
                if(status === 'active') {
                    updatedPoints += loan.amount;
                }

                transaction.update(studentRef, { loans: updatedLoans, points: updatedPoints });
            });
            
            toast({ title: `貸款已${status === 'active' ? '批准' : '拒絕'}` });
            setLoanToProcess(null);

        } catch (error: any) {
             toast({ title: "操作失敗", description: error.message, variant: "destructive" });
        }
    };
    
    const handleApproveChallenge = async () => {
        if (!challengeToApprove || !teacherId || !challengeToApprove.student._docId) return;
        const { student, challenge } = challengeToApprove;
        const challengeDetails = platformConfig?.challenges?.find(c => c.id === challenge.challengeId);
        if (!challengeDetails) {
            toast({ title: "錯誤", description: "找不到挑戰的詳細資訊。", variant: "destructive" });
            return;
        }

        const points = challengeDetails.points;
        
        try {
            await runTransaction(async (transaction: Transaction) => {
                const studentRef = doc(db, 'students', student._docId!);
                const studentDoc = await transaction.get(studentRef);
                if (!studentDoc.exists()) throw new Error("Student not found");
                const studentData = studentDoc.data() as Student;
                
                let sourceRef, sourceFunds, sourceField;
                 if (challengeDetails.scope === 'school') {
                    sourceRef = doc(db, 'config', 'main');
                    const sourceDoc = await transaction.get(sourceRef);
                    sourceFunds = ((sourceDoc.data() as any).schoolFunds || 0);
                    sourceField = 'schoolFunds';
                } else { // class challenge
                    const provider = teachers.find(t => t.id === challengeDetails.providerId);
                    if (!provider || !provider._docId) throw new Error("找不到挑戰提供者的資料");
                    sourceRef = doc(db, 'teachers', provider._docId);
                    const sourceDoc = await transaction.get(sourceRef);
                    sourceFunds = ((sourceDoc.data() as any).pointBalance || 0);
                    sourceField = 'pointBalance';
                }

                if ((sourceFunds || 0) < points) {
                    throw new Error("資金提供者點數餘額不足。");
                }
                transaction.update(sourceRef, { [sourceField]: (sourceFunds || 0) - points });
                
                const newHistory: PointRecord = { points, date: new Date().toISOString(), reason: `完成挑戰: ${challengeDetails.name}`, teacherId: teacherId };
                transaction.update(studentRef, {
                    points: studentData.points + points,
                    pointHistory: [...(studentData.pointHistory || []), newHistory],
                    challenges: (studentData.challenges || []).map(c => c.challengeId === challenge.challengeId ? { ...c, status: 'completed' as const, completedDate: new Date().toISOString() } : c)
                });
            });

            toast({ title: "挑戰已批准", description: `已為 ${student.name} 發放 ${points} 點。`});
            setChallengeToApprove(null);

        } catch (error: any) {
             toast({ title: "批准失敗", description: error.message, variant: "destructive" });
        }
    };

    const handleRestoreData = async () => {
        if (!restoreCollectionName) {
            toast({ title: "請輸入來源集合名稱", variant: "destructive" });
            return;
        }
        setIsRestoring(true);

        try {
            const sourceCollectionRef = collection(db, restoreCollectionName);
            const targetCollectionRef = collection(db, "students");

            // 1. Get all documents from the source collection
            const sourceSnapshot = await getDocs(sourceCollectionRef);
            if (sourceSnapshot.empty) {
                throw new Error(`來源集合 "${restoreCollectionName}" 不存在或為空。`);
            }
            const sourceDocs = sourceSnapshot.docs.map(d => ({...d.data(), _docId: d.id }));

            // 2. Delete all documents in the target collection
            const targetSnapshot = await getDocs(targetCollectionRef);
            const deleteBatch = writeBatch(db);
            targetSnapshot.forEach(d => deleteBatch.delete(d.ref));
            await deleteBatch.commit();
            
            // 3. Write all source documents to the target collection
            const writeBatch = writeBatch(db);
            sourceDocs.forEach(docData => {
                const { _docId, ...data } = docData;
                const newDocRef = doc(targetCollectionRef, _docId);
                writeBatch.set(newDocRef, data);
            });
            await writeBatch.commit();
            
            // 4. (Optional) Delete the source collection - for simplicity, we'll let the user do this manually.
            toast({ title: "資料覆蓋成功！", description: `已成功將 ${sourceDocs.length} 筆資料從 "${restoreCollectionName}" 複製到 "students" 集合。`, duration: 10000 });

            setRestoreCollectionName('');
            setIsRestoreConfirmOpen(false);

        } catch (error: any) {
            console.error("Data restore failed:", error);
            toast({ title: "資料還原失敗", description: error.message, variant: "destructive" });
        } finally {
            setIsRestoring(false);
            setConfirmRestoreInput("");
        }
    };
    
    const getDashboardTabs = () => {
        const tabs = [];
        if (role === 'admin' || role === 'teacher') {
            tabs.push(<TabsTrigger key="students" value="students">學生管理</TabsTrigger>);
        }
        if (role === 'admin') {
            tabs.push(<TabsTrigger key="teachers" value="teachers">教師管理</TabsTrigger>);
        }
        
        tabs.push(<TabsTrigger key="points" value="points">發送點數</TabsTrigger>);
        
        if (role === 'admin' || role === 'teacher' || role === 'subject_teacher') {
             tabs.push(<TabsTrigger key="history" value="history">點數歷史</TabsTrigger>);
        }
        
        if (role === 'admin' || role === 'teacher') {
            tabs.push(<TabsTrigger key="approvals" value="approvals">審核中心</TabsTrigger>);
        }
        
        return tabs;
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const defaultTabValue = (role === 'teacher' || role === 'admin') ? 'students' : 'points';
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
             {role === 'admin' && (
                <Card className="border-red-500 bg-red-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert />
                            緊急資料救援
                        </CardTitle>
                        <CardDescription className="text-red-500/80">
                            此為高風險操作，僅在確認資料已從 Firebase 控制台成功還原到一個新的臨時集合後使用。此操作將會**永久覆蓋**現有的學生資料。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="restore-collection-name">已還原的集合名稱</Label>
                            <Input 
                                id="restore-collection-name" 
                                placeholder="例如: restored_students"
                                value={restoreCollectionName}
                                onChange={(e) => setRestoreCollectionName(e.target.value)}
                            />
                        </div>
                         <Button variant="destructive" onClick={() => setIsRestoreConfirmOpen(true)} disabled={!restoreCollectionName}>
                            開始覆蓋資料
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">
                        {role === 'admin' ? '全校總覽' : teacherName}
                    </h2>
                    <p className="text-muted-foreground">
                        {role === 'admin' ? '管理所有班級、教師和學校資金。' : '管理您的班級與點數。'}
                    </p>
                </div>
                <Card className="mt-4 sm:mt-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {role === 'admin' ? '學校總資金' : '我的點數餘額'}
                        </CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                             {(role === 'admin' ? (platformConfig?.schoolFunds || 0) : (teacher?.pointBalance || 0))?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                           {role === 'admin' ? '可用於撥款給老師或作為活動獎勵' : '可用於發放給學生'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={defaultTabValue} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
                    {getDashboardTabs()}
                </TabsList>

                {(role === 'admin' || role === 'teacher') && (
                <TabsContent value="students" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>學生名單</CardTitle>
                                <CardDescription>管理班級中的學生、重設密碼或進行批次匯入。</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2"/>批次匯入</Button>
                                <Button onClick={() => setIsAddStudentDialogOpen(true)}><PlusCircle className="mr-2"/>新增學生</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {role === 'admin' && (
                                <div className="mb-4">
                                    <Label htmlFor="class-select-students">選擇班級以管理</Label>
                                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                        <SelectTrigger id="class-select-students" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="請選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>編號</TableHead>
                                        <TableHead>姓名</TableHead>
                                        <TableHead>持有總點數</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsInClass.length > 0 ? studentsInClass.map(student => (
                                        <TableRow key={student._docId}>
                                            <TableCell>{student.id}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.points.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => { setStudentToEdit(student); setIsEditStudentDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setStudentToResetPassword(student); setIsResetPasswordDialogOpen(true); }}><KeyRound className="h-4 w-4"/></Button>
                                                <AlertDialog open={!!studentToDelete && studentToDelete._docId === student._docId} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setStudentToDelete(student)}><Trash2 className="h-4 w-4"/></Button>
                                                    </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                您確定要從班級中移除 {studentToDelete?.name} 嗎？此操作無法復原。
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleDeleteStudent} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">請先選擇班級，或此班級無學生。</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                )}
                
                {role === 'admin' && (
                <TabsContent value="teachers" className="mt-6">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>教師管理</CardTitle>
                                    <CardDescription>管理系統中的教師帳號、分配點數或模擬登入。</CardDescription>
                                </div>
                                <Button onClick={() => setIsAddTeacherDialogOpen(true)}><PlusCircle className="mr-2" />新增教師</Button>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>姓名</TableHead>
                                            <TableHead>角色</TableHead>
                                            <TableHead>任教班級</TableHead>
                                            <TableHead>點數餘額</TableHead>
                                            <TableHead className="text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teachers.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{t.name}</TableCell>
                                                <TableCell>{t.role === 'admin' ? '校長' : t.role === 'teacher' ? '班級導師' : '科任教師'}</TableCell>
                                                <TableCell>{(t.classIds || []).map(id => classes.find(c => c.id === id)?.name).join(', ') || '-'}</TableCell>
                                                <TableCell>{(t.pointBalance || 0).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => {setTeacherToAllocate(t); setIsAllocatePointsDialogOpen(true);}} disabled={t.role === 'admin'}><Coins className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => {setTeacherToEdit(t); setEditedTeacherRole(t.role); setIsEditTeacherDialogOpen(true);}}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => {setTeacherToImpersonate(t); setIsImpersonateDialogOpen(true);}} disabled={t.id === teacherId}><KeyRound className="h-4 w-4"/></Button>
                                                    <AlertDialog open={!!teacherToDelete && teacherToDelete.id === t.id} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setTeacherToDelete(t)} disabled={t.role === 'admin'}><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>確定刪除 {t.name} 嗎？</AlertDialogTitle>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleDeleteTeacher} className={buttonVariants({variant: 'destructive'})}>確定刪除</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>班級管理</CardTitle>
                                <CardDescription>新增或刪除系統中的班級。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold mb-2">新增班級</h4>
                                        <form onSubmit={handleAddClass} className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="class-id-input">班級ID</Label>
                                                <Input id="class-id-input" name="id" placeholder="例如：1A" required/>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="class-name-input">班級名稱</Label>
                                                <Input id="class-name-input" name="name" placeholder="例如：一年甲班" required/>
                                            </div>
                                            <Button type="submit">新增</Button>
                                        </form>
                                    </div>
                                    <div>
                                         <h4 className="font-semibold mb-2">現有班級</h4>
                                         <ScrollArea className="h-40 border rounded-md p-2">
                                             <div className="space-y-2">
                                                {classes.map(c => (
                                                    <div key={c.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                                        <span>{c.name} ({c.id})</span>
                                                        <AlertDialog open={!!classToDelete && classToDelete.id === c.id} onOpenChange={(open) => !open && setClassToDelete(null)}>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setClassToDelete(c)}><Trash2 className="h-4 w-4"/></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>確定刪除班級 {c.name} 嗎？</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        此操作將永久刪除此班級，且無法復原。請輸入「<span className="font-bold text-destructive">{CONFIRM_DELETE_TEXT}</span>」以確認。
                                                                    </AlertDialogDescription>
                                                                    <Input value={confirmDeleteInput} onChange={(e) => setConfirmDeleteInput(e.target.value)} />
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setConfirmDeleteInput('')}>取消</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleDeleteClass} disabled={confirmDeleteInput !== CONFIRM_DELETE_TEXT} className={buttonVariants({variant: 'destructive'})}>確定刪除</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                ))}
                                             </div>
                                         </ScrollArea>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                )}
                
                <TabsContent value="points" className="mt-6">
                    <Card>
                         <CardHeader>
                            <CardTitle>發送/扣除點數</CardTitle>
                            <CardDescription>獎勵或扣除學生的點數。輸入正數為發送，負數為扣除。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                <div className="flex-1 min-w-[200px] space-y-2">
                                    <Label htmlFor="class-select-points">選擇班級</Label>
                                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                        <SelectTrigger id="class-select-points" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="請選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map(classInfo => (
                                                 <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="space-y-1">
                                        <Label htmlFor="batch-points">全班批次操作</Label>
                                        <Input
                                            id="batch-points"
                                            type="number"
                                            placeholder="點數 (正/負)"
                                            value={batchPoints}
                                            onChange={e => setBatchPoints(e.target.value === '' ? '' : Number(e.target.value))}
                                            disabled={isBatchProcessing}
                                        />
                                    </div>
                                    <Button onClick={handleBatchOperation} disabled={!selectedClassId || isBatchProcessing}>
                                        {isBatchProcessing ? <Loader2 className="animate-spin" /> : '執行'}
                                    </Button>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>姓名</TableHead>
                                        <TableHead>目前點數</TableHead>
                                        <TableHead className="w-[250px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {studentsInClass.length > 0 ? studentsInClass.map(student => (
                                        <TableRow key={student._docId}>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.points.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="number"
                                                        placeholder="點數 (例如: 50, -50)"
                                                        value={pointInputs[student._docId!] || ''}
                                                        onChange={e => setPointInputs({...pointInputs, [student._docId!]: e.target.value})}
                                                        disabled={!!isProcessing}
                                                    />
                                                     <Button onClick={() => handleAwardPoints(student)} disabled={isProcessing === student._docId || !pointInputs[student._docId!]}>
                                                        {isProcessing === student._docId ? <Loader2 className="h-4 w-4 animate-spin"/> : '執行'}
                                                     </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">請先選擇班級。</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {(role === 'admin' || role === 'teacher' || role === 'subject_teacher') && (
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>點數歷史查詢</CardTitle>
                            <CardDescription>查詢指定老師在特定班級的點數發放與扣除總計 (最近 20 天)。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {role === 'admin' && (
                                     <div className="flex-1 min-w-[200px] space-y-2">
                                        <Label htmlFor="teacher-select-history">選擇老師</Label>
                                        <Select onValueChange={setHistorySelectedTeacherId} value={historySelectedTeacherId}>
                                            <SelectTrigger id="teacher-select-history">
                                                <SelectValue placeholder="請選擇老師" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex-1 min-w-[200px] space-y-2">
                                    <Label htmlFor="class-select-history">選擇班級</Label>
                                    <Select 
                                        onValueChange={setHistorySelectedClassId} 
                                        value={historySelectedClassId}
                                    >
                                        <SelectTrigger id="class-select-history">
                                            <SelectValue placeholder="請選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map(c => 
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {historySelectedTeacherId && historySelectedClassId && (
                                <div className="space-y-6">
                                     <Card>
                                        <CardHeader>
                                            <CardTitle>班級發放總表</CardTitle>
                                            <CardDescription>
                                                {teachers.find(t=>t.id === historySelectedTeacherId)?.name} 老師在 {classes.find(c=>c.id === historySelectedClassId)?.name} 班級，最近 20 天的點數紀錄。
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-72">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>學生</TableHead>
                                                            <TableHead className="text-right">發放總計</TableHead>
                                                            <TableHead className="text-right">扣除總計</TableHead>
                                                            <TableHead className="text-right">淨變動</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {pointHistoryForTeacherAndClass.classSummary.length > 0 ? pointHistoryForTeacherAndClass.classSummary.map((summary) => (
                                                            <TableRow key={summary.studentId}>
                                                                <TableCell>{summary.studentName}</TableCell>
                                                                <TableCell className="text-right text-green-600 font-medium">+{summary.awarded.toLocaleString()}</TableCell>
                                                                <TableCell className="text-right text-red-600 font-medium">{summary.deducted.toLocaleString()}</TableCell>
                                                                <TableCell className={`text-right font-bold ${summary.net > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {summary.net > 0 ? '+' : ''}{summary.net.toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        )) : (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-24 text-center">此條件下尚無相關點數紀錄。</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-1">
                                            <h4 className="font-semibold mb-2">學生點數淨變動</h4>
                                            <ScrollArea className="h-72 border rounded-md p-2">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>學生</TableHead>
                                                            <TableHead className="text-right">總計</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Array.from(pointHistoryForTeacherAndClass.studentTotals.entries()).length > 0 ? Array.from(pointHistoryForTeacherAndClass.studentTotals.entries()).map(([studentId, data]) => (
                                                            <TableRow key={studentId}>
                                                                <TableCell>{data.name}</TableCell>
                                                                <TableCell className={`text-right font-medium ${data.total > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {data.total > 0 ? '+' : ''}{data.total.toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        )) : (
                                                            <TableRow>
                                                                <TableCell colSpan={2} className="h-24 text-center">無相關紀錄</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </div>
                                        <div className="lg:col-span-2">
                                            <h4 className="font-semibold mb-2">詳細交易紀錄</h4>
                                            <ScrollArea className="h-72 border rounded-md p-2">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>日期</TableHead>
                                                            <TableHead>學生</TableHead>
                                                            <TableHead className="text-right">點數</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {pointHistoryForTeacherAndClass.records.length > 0 ? pointHistoryForTeacherAndClass.records.map((record, index) => (
                                                            <TableRow key={`${record.date}-${index}`}>
                                                                <TableCell>{format(parseISO(record.date), 'yyyy-MM-dd HH:mm')}</TableCell>
                                                                <TableCell>{record.studentName}</TableCell>
                                                                <TableCell className={`text-right font-medium ${record.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {record.points > 0 ? '+' : ''}{record.points.toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        )) : (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="h-24 text-center">無相關紀錄</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </TabsContent>
                )}
                
                {(role === 'admin' || role === 'teacher') && (
                <TabsContent value="approvals" className="mt-6">
                     <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>審核中心</CardTitle>
                                <CardDescription>處理來自學生的各項申請。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">習慣養成申請 ({habitApprovalRequests.length})</h3>
                                        {habitApprovalRequests.length > 0 ? (
                                            <p className="text-sm text-muted-foreground">請前往「習慣審核」頁面進行處理。</p>
                                        ) : <p className="text-sm text-muted-foreground">沒有待審核的習慣申請。</p>}
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">挑戰任務審核 ({challengeApprovalRequests.length})</h3>
                                        {challengeApprovalRequests.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>學生</TableHead>
                                                        <TableHead>挑戰名稱</TableHead>
                                                        <TableHead className="text-right">操作</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {challengeApprovalRequests.map(({ student, challenge }) => {
                                                        const details = platformConfig?.challenges?.find(c => c.id === challenge.challengeId);
                                                        return (
                                                            <TableRow key={`${student._docId}-${challenge.challengeId}`}>
                                                                <TableCell>{student.name}</TableCell>
                                                                <TableCell>{details?.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button size="sm" onClick={() => setChallengeToApprove({ student, challenge })}>
                                                                                <Check className="mr-2" /> 批准 (+{details?.points.toLocaleString()}點)
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>批准挑戰完成</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                您確定要批准 {student.name} 完成「{details?.name}」並發放獎勵嗎？
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={handleApproveChallenge}>確定批准</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        ) : <p className="text-sm text-muted-foreground">沒有待審核的挑戰任務。</p>}
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">貸款申請 ({loanApprovalRequests.length})</h3>
                                        {loanApprovalRequests.length > 0 ? (
                                            <Table>
                                                <TableHeader><TableRow><TableHead>學生</TableHead><TableHead>金額</TableHead><TableHead>理由</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {loanApprovalRequests.map(({student, loan}) => (
                                                        <TableRow key={loan.id}>
                                                            <TableCell>{student.name}</TableCell>
                                                            <TableCell>{loan.amount.toLocaleString()}</TableCell>
                                                            <TableCell>{loan.reason}</TableCell>
                                                            <TableCell className="text-right">
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button size="sm" className="mr-2" onClick={() => setLoanToProcess({student, loan})}>處理</Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>處理貸款申請</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                學生 {student.name} 申請了 {loan.amount.toLocaleString()} 點的貸款。理由：{loan.reason}
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <Button variant="destructive" onClick={() => handleProcessLoan('rejected')}>拒絕</Button>
                                                                            <Button onClick={() => handleProcessLoan('active')}>批准貸款</Button>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : <p className="text-sm text-muted-foreground">沒有待處理的貸款申請。</p>}
                                    </div>
                                    <Separator />
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">獎勵使用請求 ({rewardApprovalRequests.length})</h3>
                                        {rewardApprovalRequests.length > 0 ? (
                                             <Table>
                                                <TableHeader><TableRow><TableHead>學生</TableHead><TableHead>獎勵名稱</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {rewardApprovalRequests.map(({student, rewardItem}) => (
                                                        <TableRow key={`${student._docId}-${rewardItem.redemptionId}`}>
                                                            <TableCell>{student.name}</TableCell>
                                                            <TableCell>{rewardItem.reward.name}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button size="sm" onClick={() => handleApproveRewardUse(student, rewardItem)}>同意使用</Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ): <p className="text-sm text-muted-foreground">沒有待處理的獎勵使用請求。</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                )}
            </Tabs>

            <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ 確定要覆蓋所有學生資料嗎？</AlertDialogTitle>
                        <AlertDialogDescription>
                            這是一個極度危險的操作，將會用「<span className="font-bold text-destructive">{restoreCollectionName}</span>」集合中的資料，**永久性地、不可逆地覆蓋**目前的所有學生資料。
                            <br/><br/>
                            請輸入「<span className="font-bold text-destructive">{CONFIRM_RESTORE_TEXT}</span>」以確認執行。
                        </AlertDialogDescription>
                        <Input 
                            value={confirmRestoreInput} 
                            onChange={(e) => setConfirmRestoreInput(e.target.value)} 
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmRestoreInput('')}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRestoreData}
                            disabled={confirmRestoreInput !== CONFIRM_RESTORE_TEXT || isRestoring}
                            className={buttonVariants({ variant: "destructive" })}
                        >
                            {isRestoring ? <Loader2 className="animate-spin" /> : "我了解風險，確定覆蓋"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
                 <DialogContent>
                    <form onSubmit={handleAddStudent}>
                        <DialogHeader>
                            <DialogTitle>新增學生至 {classes.find(c=>c.id === selectedClassId)?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="student-id-input">學生編號</Label>
                                <Input id="student-id-input" name="id" required/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="student-name-input">姓名</Label>
                                <Input id="student-name-input" name="name" required/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="student-password-input">初始密碼</Label>
                                <Input id="student-password-input" name="password" required/>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">新增</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleEditStudent}>
                        <DialogHeader>
                            <DialogTitle>編輯學生資料</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-id">學生編號</Label>
                                <Input id="edit-student-id" name="id" defaultValue={studentToEdit?.id} required/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-student-name">姓名</Label>
                                <Input id="edit-student-name" name="name" defaultValue={studentToEdit?.name} required/>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">儲存</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
             <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleResetPassword}>
                        <DialogHeader>
                            <DialogTitle>重設 {studentToResetPassword?.name} 的密碼</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="new-password">新密碼</Label>
                            <Input id="new-password" name="new-password" type="text" required/>
                        </div>
                        <DialogFooter>
                             <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">確認重設</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>批次匯入學生</DialogTitle>
                        <DialogDescription>
                            上傳 CSV 檔案以快速新增多位學生。請先下載範本以確保格式正確。
                            檔案必須為 UTF-8 編碼。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <a href="/students-template.csv" download className={buttonVariants({variant: "outline"})}>
                            <Download className="mr-2"/>下載 CSV 範本
                        </a>
                        <div className="space-y-2">
                            <Label htmlFor="csv-upload">上傳 CSV 檔案</Label>
                            <Input id="csv-upload" type="file" accept=".csv" onChange={(e) => e.target.files && handleFileParse(e.target.files[0])}/>
                        </div>
                        {csvPreview.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">檔案預覽 (前 5 筆)</h4>
                                <div className="border rounded-md p-2 text-xs bg-muted overflow-x-auto">
                                    <pre><code>{csvPreview.map(row => row.join(',')).join('\n')}</code></pre>
                                </div>
                            </div>
                        )}
                    </div>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleImportStudents} disabled={parsedCsvData.length === 0}>確認匯入 {parsedCsvData.length} 位學生</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
                 <DialogContent>
                    <form onSubmit={handleAddTeacher}>
                        <DialogHeader><DialogTitle>新增教師</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="teacher-name">姓名</Label>
                                <Input id="teacher-name" name="name" required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teacher-role">角色</Label>
                                <Select name="role" required>
                                    <SelectTrigger id="teacher-role"><SelectValue placeholder="選擇角色"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="teacher">班級導師</SelectItem>
                                        <SelectItem value="subject_teacher">科任教師</SelectItem>
                                        <SelectItem value="admin">校長</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="teacher-class">班級 (僅班導適用)</Label>
                                <Select name="classId">
                                    <SelectTrigger id="teacher-class"><SelectValue placeholder="選擇一個未分配的班級"/></SelectTrigger>
                                    <SelectContent>
                                        {availableClassesForNewTeacher.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">新增</Button>
                        </DialogFooter>
                    </form>
                 </DialogContent>
            </Dialog>
            <Dialog open={isEditTeacherDialogOpen} onOpenChange={(open) => {if (!open) {setTeacherToEdit(null);} setIsEditTeacherDialogOpen(open);}}>
                 <DialogContent>
                    <form onSubmit={handleUpdateTeacher}>
                        <DialogHeader><DialogTitle>編輯 {teacherToEdit?.name} 的資料</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-teacher-name">姓名</Label>
                                <Input id="edit-teacher-name" name="name" defaultValue={teacherToEdit?.name} required/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-teacher-role">角色</Label>
                                <Select name="role" defaultValue={teacherToEdit?.role} onValueChange={(value) => setEditedTeacherRole(value)} required>
                                    <SelectTrigger id="edit-teacher-role"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="teacher">班級導師</SelectItem>
                                        <SelectItem value="subject_teacher">科任教師</SelectItem>
                                        <SelectItem value="admin">校長</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {(editedTeacherRole === 'teacher') && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-teacher-class">班級</Label>
                                <Select name="classId" defaultValue={teacherToEdit?.classIds?.[0]}>
                                    <SelectTrigger id="edit-teacher-class"><SelectValue placeholder="選擇指派班級"/></SelectTrigger>
                                    <SelectContent>
                                        {availableClassesForEditTeacher.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">儲存</Button>
                        </DialogFooter>
                    </form>
                 </DialogContent>
            </Dialog>
            <Dialog open={isAllocatePointsDialogOpen} onOpenChange={(open) => !open && setTeacherToAllocate(null)}>
                <DialogContent>
                    <form onSubmit={handleAllocatePoints}>
                        <DialogHeader><DialogTitle>撥款給 {teacherToAllocate?.name}</DialogTitle></DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="allocation-amount">撥款點數 (學校總資金剩餘: {platformConfig?.schoolFunds?.toLocaleString() || 0} 點)</Label>
                            <Input id="allocation-amount" name="amount" type="number" required />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">確認撥款</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
             <AlertDialog open={isImpersonateDialogOpen} onOpenChange={(open) => !open && setTeacherToImpersonate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>模擬登入</AlertDialogTitle>
                        <AlertDialogDescription>您確定要以 {teacherToImpersonate?.name} 的身份登入嗎？您將會看到該老師的介面。您可以隨時返回校長身份。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleImpersonate}>確定</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
