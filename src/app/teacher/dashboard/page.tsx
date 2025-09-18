

"use client";

import { useState, useContext, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reward, Student, Teacher, Class, Loan, StudentChallenge, FundraisingProject } from "@/lib/types";
import { PlusCircle, Edit, Trash2, KeyRound, Check, X, Upload, Download, Loader2, Users, Banknote, ShieldPlus, Coins, Flag, Hourglass, ShieldCheck, Gift, Briefcase, HeartHandshake, LineChart, UserCheck } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { AppDataContext } from "@/context/AppDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow, isValid, addDays } from "date-fns";
import Papa from "papaparse";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { zhTW } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { db } from "@/lib/firebase";
import { doc, deleteDoc, getDoc, setDoc, updateDoc } from "firebase/firestore";


interface StagedStudent {
    classId: string;
    id: string;
    name: string;
    password?: string;
    status: 'valid' | 'duplicate' | 'invalid';
    errors: string[];
}


export default function TeacherDashboardPage() {
  const { 
    students, setStudents, 
    classes, setClasses, 
    teachers, setTeachers, 
    rewards, setRewards,
    isLoading, platformConfig, setPlatformConfig,
    runTransaction: runDbTransaction,
  } = useContext(AppDataContext);
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // States for CSV import
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [stagedStudents, setStagedStudents] = useState<StagedStudent[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // State for Batch Award Points
  const [isBatchAwardDialogOpen, setIsBatchAwardDialogOpen] = useState(false);
  const [batchAwardAmount, setBatchAwardAmount] = useState<number | ''>('');
  
  // State for Central Bank
  const [isAdjustFundsDialogOpen, setIsAdjustFundsDialogOpen] = useState(false);
  const [adjustFundsAmount, setAdjustFundsAmount] = useState<number | ''>('');
  const [adjustFundsType, setAdjustFundsType] = useState<'add' | 'remove'>('add');

  // State for Teacher Point Allocation
  const [isAllocatePointsDialogOpen, setIsAllocatePointsDialogOpen] = useState(false);
  const [teacherToAllocate, setTeacherToAllocate] = useState<Teacher | null>(null);
  const [allocationAmount, setAllocationAmount] = useState<number | ''>('');
  
  // State for Subject Teacher Class Management
  const [isManageClassesDialogOpen, setIsManageClassesDialogOpen] = useState(false);
  const [selectedClassesForSubjectTeacher, setSelectedClassesForSubjectTeacher] = useState<string[]>([]);
  

  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);

  // One-time effect to load teacher info from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('teacherRole');
    const storedTeacherId = localStorage.getItem('teacherId');
    const storedClassIdsStr = localStorage.getItem('teacherClassIds');
    
    setRole(storedRole);
    setTeacherId(storedTeacherId);
    
    if (storedClassIdsStr && storedClassIdsStr !== 'undefined') {
        try {
            const initialClassIds = JSON.parse(storedClassIdsStr);
            setTeacherClassIds(initialClassIds);
            if (storedRole !== 'admin' && initialClassIds.length > 0 && !selectedClassId) {
                setSelectedClassId(initialClassIds[0]);
            }
        } catch {}
    }
  }, []);
  
  // Effect to set initial class selection for admin
  useEffect(() => {
    if (role === 'admin' && classes.length > 0 && !selectedClassId) {
        setSelectedClassId(classes[0].id);
    }
  }, [role, classes, selectedClassId]);

  const currentTeacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);

  const studentsInView = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);
  
  const loanRequests = useMemo(() => {
      return students.flatMap(student => 
          (student.loans || [])
              .filter(l => l.status === 'pending')
              .map(l => ({ student, loan: l }))
      ).filter(({ student }) => {
          if (role === 'admin') return true;
          return role === 'teacher' && (teacherClassIds || []).includes(student.classId);
      });
  }, [students, role, teacherClassIds]);


  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);

  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [teacherToResetPassword, setTeacherToResetPassword] = useState<Teacher | null>(null);
  
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);


  const { toast } = useToast();
  
  const pendingRequests = useMemo(() => {
    return students.flatMap(student =>
        (student.redeemedRewards || [])
            .filter(r => r.status === 'pending_use')
            .map(redemption => ({ student, redemption }))
    ).filter(({ redemption, student }) => {
        if (role === 'admin' && redemption.reward.scope === 'school') {
            return true;
        }
        if (role === 'teacher' && (teacherClassIds || []).includes(student.classId) && redemption.reward.providerId === teacherId) {
            return true;
        }
        return false;
    });
  }, [students, role, teacherId, teacherClassIds]);

  const recentRedemptions = useMemo(() => {
     return students.flatMap(student => (student.redeemedRewards || []).map(r => ({student, redemption: r})))
        .filter(({ student }) => {
             if (role === 'admin') return true; // Admin sees all
             return (teacherClassIds || []).includes(student.classId);
        })
        .sort((a, b) => {
            if (!a.redemption.redemptionDate) return 1;
            if (!b.redemption.redemptionDate) return -1;
            return new Date(b.redemption.redemptionDate).getTime() - new Date(a.redemption.redemptionDate).getTime();
        })
        .slice(0, 10);
  }, [students, role, teacherClassIds]);
  
  const challengeApprovals = useMemo(() => {
      const allChallenges = platformConfig?.challenges || [];
      return students.flatMap(student =>
          (student.challenges || [])
            .filter(c => c.status === 'pending_approval')
            .map(sc => ({
                student,
                studentChallenge: sc,
                challenge: allChallenges.find(c => c.id === sc.challengeId)
            }))
      ).filter(({ student, challenge }) => {
          if (!challenge) return false;
          if (role === 'admin' && challenge.scope === 'school') {
             return true;
          }
          if (role === 'teacher' && challenge.providerId === teacherId && (teacherClassIds || []).includes(student.classId)) {
            return true;
          }
          return false;
      });
  }, [students, platformConfig?.challenges, role, teacherId, teacherClassIds]);

  const handleApproveUsage = (studentId: string, classId: string, redemptionId: string) => {
    
    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentId && s.classId === classId) {
            return {
                ...s,
                redeemedRewards: (s.redeemedRewards || []).filter(r => r.redemptionId !== redemptionId)
            };
        }
        return s;
    }));

    toast({
        title: "已批准使用",
        description: `您已批准了該學生的獎勵使用請求。`
    });
  };

  const handleAwardPoints = async (studentId: string, pointsToChange: number) => {
    if (!pointsToChange || !teacherId) {
        toast({ title: "無效的操作", description: "請輸入一個非零的數字或重新登入。", variant: "destructive" });
        return;
    }

    try {
        await runDbTransaction(async (transaction: any) => {
            const studentRef = doc(db, 'students', `${selectedClassId}-${studentId}`);
            const teacherRef = doc(db, 'teachers', teacherId);

            const [studentDoc, teacherDoc] = await Promise.all([
                transaction.get(studentRef),
                role !== 'admin' ? transaction.get(teacherRef) : Promise.resolve(null)
            ]);

            if (!studentDoc.exists()) {
                throw new Error("找不到學生資料。");
            }
            const currentStudentData = studentDoc.data() as Student;

            const isDeducting = pointsToChange < 0;

            if (role !== 'admin' && !isDeducting) {
                const currentTeacherData = teacherDoc?.data() as Teacher;
                if (!currentTeacherData || (currentTeacherData.pointBalance || 0) < pointsToChange) {
                    throw new Error("您的點數餘額不足以發放此次點數。");
                }
                transaction.update(teacherRef, { pointBalance: (currentTeacherData.pointBalance || 0) - pointsToChange });
            }

            const actionText = isDeducting ? "扣除" : "發放";
            const reason = `由 ${role === 'admin' ? '校長' : '老師'} ${currentTeacher?.name} ${actionText}`;
            
            const newHistoryEntry = { points: pointsToChange, date: new Date().toISOString(), reason };

            transaction.update(studentRef, {
                points: currentStudentData.points + pointsToChange,
                pointHistory: [...(currentStudentData.pointHistory || []), newHistoryEntry]
            });
        });

        // Optimistically update local state after successful transaction
        setStudents(currentStudents => currentStudents.map(s => {
            if (s.id === studentId && s.classId === selectedClassId) {
                const actionText = pointsToChange < 0 ? "扣除" : "發放";
                const reason = `由 ${role === 'admin' ? '校長' : '老師'} ${currentTeacher?.name} ${actionText}`;
                return {
                    ...s,
                    points: s.points + pointsToChange,
                    pointHistory: [...(s.pointHistory || []), { points: pointsToChange, date: new Date().toISOString(), reason }]
                };
            }
            return s;
        }));

        if (role !== 'admin' && pointsToChange > 0) {
            setTeachers(currentTeachers => currentTeachers.map(t =>
                t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - pointsToChange } : t
            ));
        }

        toast({
            title: `點數已${pointsToChange < 0 ? '扣除' : '發放'}！`,
            description: `操作成功。`
        });

    } catch (error: any) {
        console.error("點數發放失敗:", error);
        toast({ title: "操作失敗", description: error.message, variant: "destructive" });
    }
  }

  const handleBatchAwardPoints = async () => {
    const pointsToChange = Number(batchAwardAmount);
    if (!pointsToChange || studentsInView.length === 0 || !teacherId) {
      toast({ title: "無效的操作", description: "請輸入點數、選擇班級或重新登入。", variant: "destructive" });
      return;
    }
    const isDeducting = pointsToChange < 0;
    const totalPointsToChange = studentsInView.length * pointsToChange;

    try {
        await runDbTransaction(async (transaction: any) => {
            if (role !== 'admin' && !isDeducting) {
                const teacherRef = doc(db, 'teachers', teacherId);
                const teacherDoc = await transaction.get(teacherRef);
                const currentTeacherData = teacherDoc.data() as Teacher;
                if (!currentTeacherData || (currentTeacherData.pointBalance || 0) < totalPointsToChange) {
                    throw new Error(`您的點數餘額不足。需要 ${totalPointsToChange.toLocaleString()} 點。`);
                }
                transaction.update(teacherRef, { pointBalance: (currentTeacherData.pointBalance || 0) - totalPointsToChange });
            }

            const studentPromises = studentsInView.map(s => transaction.get(doc(db, 'students', `${s.classId}-${s.id}`)));
            const studentDocs = await Promise.all(studentPromises);

            const actionText = isDeducting ? "批次扣除" : "批次發放";
            const reason = `由 ${role === 'admin' ? '校長' : '老師'} ${currentTeacher?.name} ${actionText}`;
            const newHistoryEntry = { points: pointsToChange, date: new Date().toISOString(), reason };

            studentDocs.forEach((studentDoc) => {
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data() as Student;
                    transaction.update(studentDoc.ref, {
                        points: studentData.points + pointsToChange,
                        pointHistory: [...(studentData.pointHistory || []), newHistoryEntry]
                    });
                }
            });
        });

        // Optimistically update local state after successful transaction
        setStudents(currentStudents => currentStudents.map(s => {
            if (s.classId === selectedClassId) {
                 const actionText = pointsToChange < 0 ? "批次扣除" : "批次發放";
                 const reason = `由 ${role === 'admin' ? '校長' : '老師'} ${currentTeacher?.name} ${actionText}`;
                return {
                    ...s,
                    points: s.points + pointsToChange,
                    pointHistory: [...(s.pointHistory || []), { points: pointsToChange, date: new Date().toISOString(), reason }]
                };
            }
            return s;
        }));

        if (role !== 'admin' && !isDeducting) {
            setTeachers(currentTeachers => currentTeachers.map(t =>
                t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - totalPointsToChange } : t
            ));
        }

        toast({
            title: `批次${isDeducting ? '扣除' : '發放'}成功！`,
            description: `已成功對 ${studentsInView.length} 位學生操作。`
        });
        setIsBatchAwardDialogOpen(false);
        setBatchAwardAmount('');

    } catch (error: any) {
        console.error("批次點數操作失敗:", error);
        toast({ title: "操作失敗", description: error.message, variant: "destructive" });
    }
  };

  const handleAddStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;

    if (students.some(s => s.id === id && s.classId === selectedClassId)) {
        toast({
            title: "新增學生失敗",
            description: `編號 ${id} 在此班級已存在。`,
            variant: "destructive",
        });
        return;
    }

    const newStudent: Student = {
        id,
        name,
        classId: selectedClassId,
        password,
        points: 0,
        avatar: `https://picsum.photos/seed/${selectedClassId}-${id}/100`,
        portfolio: [],
        redeemedRewards: [],
        loans: [],
        pointHistory: [],
        challenges: [],
        fixedDeposits: [],
        habits: [],
    };
    setStudents(current => [...current, newStudent]);
    setIsAddStudentDialogOpen(false);
    toast({
        title: "已新增學生",
        description: `已成功新增學生 ${name}。`
    });
  }
  
  const handleEditStudentClick = (student: Student) => {
    setStudentToEdit(student);
  }

  const handleUpdateStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentToEdit) return;

    const formData = new FormData(event.currentTarget);
    const newId = formData.get("id") as string;
    const newName = formData.get("name") as string;
    
    if (newId !== studentToEdit.id && students.some(s => s.id === newId && s.classId === studentToEdit.classId)) {
        toast({
            title: "更新失敗",
            description: `編號 ${newId} 已被此班級的其他學生使用。`,
            variant: "destructive",
        });
        return;
    }

    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentToEdit.id && s.classId === studentToEdit.classId) {
            return { ...studentToEdit, id: newId, name: newName };
        }
        return s;
    }));
    
    setStudentToEdit(null);
    toast({
        title: "學生資訊已更新",
        description: `已成功更新學生 ${newName} 的資訊。`
    });
  }
  
  const handleDeleteStudentClick = (student: Student) => {
    setStudentToDelete(student);
  };
  
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const studentToDeleteName = studentToDelete.name;
    const studentDocId = `${studentToDelete.classId}-${studentToDelete.id}`;

    try {
        const studentDocRef = doc(db, 'students', studentDocId);
        await deleteDoc(studentDocRef);
        
        await setStudents(current => current.filter(s => s.id !== studentToDelete.id || s.classId !== studentToDelete.classId));
        
        toast({
            title: "已刪除學生",
            description: `已成功刪除學生 ${studentToDeleteName}。`,
        });
    } catch(e) {
        console.error("Error deleting student:", e);
        toast({
            title: "刪除失敗",
            description: "刪除學生時發生錯誤，請稍後再試。",
            variant: "destructive"
        });
    } finally {
        setStudentToDelete(null);
    }
  };


  const handleResetPasswordClick = (student: Student) => {
    setStudentToResetPassword(student);
  };

  const handleConfirmResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentToResetPassword) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("new-password") as string;
    
    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentToResetPassword.id && s.classId === studentToResetPassword.classId) {
            return { ...s, password: newPassword };
        }
        return s;
    }));

    setStudentToResetPassword(null);
    toast({
        title: "密碼已重設",
        description: `${studentToResetPassword.name} 的密碼已更新。`
    });
  }
  
  const handleAddTeacher = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as 'teacher' | 'subject_teacher';
    const classId = formData.get("classId") as string;

    const newTeacher: Teacher = {
        id,
        name,
        role,
        classIds: role === 'teacher' && classId !== 'unassigned' ? [classId] : [],
        password: platformConfig?.teacherPassword || TEACHER_PASSWORD,
        pointBalance: 0,
    };

    try {
        await runDbTransaction(async (transaction: any) => {
            const teacherRef = doc(db, 'teachers', id);
            const docSnap = await transaction.get(teacherRef);
            if (docSnap.exists()) {
                throw new Error(`ID 為 ${id} 的老師已存在。`);
            }
            transaction.set(teacherRef, newTeacher);
        });

        // Optimistically update local state
        setTeachers(current => [...current, newTeacher]);
        setIsAddTeacherDialogOpen(false);
        toast({ title: "已新增老師", description: `已成功新增老師 ${name}。` });

    } catch (error: any) {
        console.error("新增老師失敗:", error);
        toast({ title: "新增失敗", description: error.message, variant: "destructive" });
    }
  };

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsEditTeacherDialogOpen(true);
  }
  
  const handleUpdateTeacher = (updatedTeacherData: Partial<Teacher>) => {
    if (!editingTeacher) return;
    
    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === editingTeacher.id ? { ...t, ...updatedTeacherData } : t
    ));

    setIsEditTeacherDialogOpen(false);
    setEditingTeacher(null);
    toast({
        title: "已更新教師資訊",
        description: "教師資訊已成功更新。"
    });
  }
  
  const handleDeleteTeacherClick = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
  };

  const handleResetTeacherPasswordClick = (teacher: Teacher) => {
    setTeacherToResetPassword(teacher);
  };

  const handleConfirmResetTeacherPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherToResetPassword) return;

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("new-password") as string;

    if (newPassword.length < 3) {
      toast({ title: "密碼太短", description: "新密碼長度至少需要 3 個字元。", variant: "destructive" });
      return;
    }

    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === teacherToResetPassword.id ? { ...t, password: newPassword } : t
    ));

    toast({
        title: "教師密碼已更新",
        description: `老師 ${teacherToResetPassword.name} 的密碼已成功重設。`
    });

    setTeacherToResetPassword(null);
  };
  
  const handleConfirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    
    setTeachers(currentTeachers => currentTeachers.filter(t => t.id !== teacherToDelete.id));
    setRewards(currentRewards => currentRewards.filter(r => r.providerId !== teacherToDelete.id));

    if(platformConfig?.challenges) {
      setPlatformConfig({
        challenges: platformConfig.challenges.filter(c => c.providerId !== teacherToDelete.id)
      });
    }

    toast({
        title: "已刪除老師",
        description: `已成功刪除老師 ${teacherToDelete.name} 及其相關的獎勵與挑戰。`,
        variant: "destructive",
    });
    setTeacherToDelete(null);
  };
  
  const handleAddClass = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;

    if (classes.some(c => c.id === id)) {
        toast({
            title: "新增班級失敗",
            description: `ID 為 ${id} 的班級已存在。`,
            variant: "destructive",
        });
        return;
    }

    const newClass: Class = { id, name, announcements: [] };
    setClasses(current => [...current, newClass]);
    setIsAddClassDialogOpen(false);
    toast({
        title: "已新增班級",
        description: `已成功新增班級 ${name}。`
    });
  };

  const handleDeleteClassClick = (classObj: Class) => {
    setClassToDelete(classObj);
  };

  const handleConfirmDeleteClass = () => {
    if (!classToDelete) return;
    
    // Remove students in that class
    setStudents(prev => prev.filter(s => s.classId !== classToDelete.id));
    
    // Remove the class itself
    setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
    
    // Unassign any teacher from that class
    setTeachers(prev => prev.map(t => {
        if (t.classIds && t.classIds.includes(classToDelete.id)) {
            return { ...t, classIds: t.classIds.filter(id => id !== classToDelete.id) };
        }
        return t;
    }));

    toast({ title: "已刪除班級", description: `已成功刪除班級「${classToDelete.name}」及其所有學生。`, variant: "destructive" });
    
    if (selectedClassId === classToDelete.id) {
        const firstClass = classes.find(c => c.id !== classToDelete.id);
        setSelectedClassId(firstClass ? firstClass.id : '');
    }
    
    setClassToDelete(null);
  };

  const handleLoanDecision = (studentId: string, classId: string, loanId: string, decision: 'approve' | 'reject') => {
      
      const targetLoan = students.find(s => s.id === studentId && s.classId === classId)?.loans.find(l => l.id === loanId);
      
      if (!targetLoan) {
          toast({ title: "錯誤", description: "找不到該筆貸款申請。", variant: "destructive" });
          return;
      }
      
      const approver = teachers.find(t => t.id === teacherId);
      if (decision === 'approve' && role !== 'admin') {
          if (!approver) {
              toast({ title: "錯誤", description: "找不到您的教師帳號資訊。", variant: "destructive" });
              return;
          }
          if ((approver.pointBalance || 0) < targetLoan.amount) {
              toast({ title: "貸款批准失敗", description: "您的點數餘額不足以批准此筆貸款。", variant: "destructive" });
              return;
          }
          // Deduct points from teacher's balance
          setTeachers(currentTeachers => currentTeachers.map(t => 
              t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - targetLoan.amount } : t
          ));
      }
      
      setStudents(currentStudents => currentStudents.map(s => {
          if (s.id === studentId && s.classId === classId) {
            let updatedStudent = { ...s };
            if (decision === 'approve') {
                updatedStudent = {
                    ...updatedStudent,
                    points: updatedStudent.points + targetLoan.amount,
                    loans: (updatedStudent.loans || []).map(l => l.id === loanId ? { ...l, status: 'active' as const, approvalDate: new Date().toISOString(), lastInterestAccruedDate: new Date().toISOString() } : l)
                };
                toast({ title: "貸款已批准", description: `已將 ${targetLoan.amount.toLocaleString()} 點數撥款給 ${updatedStudent.name}。` });
            } else {
                 updatedStudent = {
                    ...updatedStudent,
                    loans: (updatedStudent.loans || []).map(l => l.id === loanId ? { ...l, status: 'rejected' as const } : l)
                };
                toast({ title: "貸款已拒絕", description: `已拒絕 ${updatedStudent.name} 的貸款申請。`, variant: "destructive" });
            }
            return updatedStudent;
          }
          return s;
      }));
  };
  
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        parseCsvFile(selectedFile);
    }
  };

  const parseCsvFile = (file: File) => {
    setStagedStudents([]);
    const existingStudentKeys = new Set(students.map(s => `${s.classId}-${s.id}`));
    const allClassIds = new Set(classes.map(c => c.id));

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "utf-8",
        complete: (results) => {
            const parsedData: StagedStudent[] = results.data.map((row: any) => {
                const student: StagedStudent = { classId: '', id: '', name: '', password: '', status: 'valid', errors: [] };
                
                if (row.classId && typeof row.classId === 'string' && row.classId.trim() && allClassIds.has(row.classId.trim())) {
                    student.classId = row.classId.trim();
                } else {
                    student.status = 'invalid';
                    student.errors.push(`無效或不存在的班級ID: ${row.classId}`);
                }

                if (row.id && typeof row.id === 'string' && row.id.trim()) {
                    student.id = row.id.trim();
                } else {
                    student.status = 'invalid';
                    student.errors.push('缺少或無效的學生編號');
                }

                if (row.name && typeof row.name === 'string' && row.name.trim()) {
                    student.name = row.name.trim();
                } else {
                    student.status = 'invalid';
                    student.errors.push('缺少或無效的姓名');
                }
                
                if (row.password && typeof row.password === 'string' && row.password.trim()) {
                    student.password = row.password.trim();
                } else {
                    student.status = 'invalid';
                    student.errors.push('缺少或無效的密碼');
                }

                if (student.status === 'valid' && existingStudentKeys.has(`${student.classId}-${student.id}`)) {
                    student.status = 'duplicate';
                }

                return student;
            });
            setStagedStudents(parsedData);
        },
        error: (error: any) => {
            toast({ title: 'CSV 解析失敗', description: error.message, variant: 'destructive' });
        }
    });
  }
  
  const handleConfirmImport = async () => {
    setIsImporting(true);
    const newStudents = stagedStudents
        .filter(s => s.status === 'valid' || s.status === 'duplicate')
        .map(s => ({
            id: s.id,
            name: s.name,
            password: s.password!,
            classId: s.classId,
            points: 0,
            avatar: `https://picsum.photos/seed/${s.classId}-${s.id}/100`,
            portfolio: [],
            redeemedRewards: [],
            loans: [],
            pointHistory: [],
            challenges: [],
            fixedDeposits: [],
            habits: [],
        }));

    if (newStudents.length === 0) {
        toast({ title: "沒有可匯入的學生", description: "請檢查您的 CSV 檔案，沒有找到可匯入或更新的新學生。", variant: "destructive" });
        setIsImporting(false);
        return;
    }

    await setStudents(currentStudents => {
        const studentMap = new Map(currentStudents.map(s => [`${s.classId}-${s.id}`, s]));
        newStudents.forEach(s => {
            studentMap.set(`${s.classId}-${s.id}`, s);
        });
        return Array.from(studentMap.values());
    });


    toast({
        title: "匯入成功",
        description: `已成功處理 ${newStudents.length} 位學生資料。`
    });

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setStagedStudents([]);
    setFile(null);
  };
  
  const handleAdjustFunds = () => {
    const amount = Number(adjustFundsAmount);
    if (!amount || amount <= 0) {
        toast({ title: "無效的金額", description: "請輸入一個大於 0 的有效金額。", variant: "destructive" });
        return;
    }

    if (adjustFundsType === 'add') {
      const currentFunds = platformConfig?.schoolFunds || 0;
      let newFunds = currentFunds + amount;
      setPlatformConfig({ schoolFunds: newFunds });
      toast({ title: "資金已調整", description: `學校總資金已更新為 ${newFunds.toLocaleString()} 點。` });
    } else {
        const currentFunds = platformConfig?.schoolFunds || 0;
        if (currentFunds < amount) {
            toast({ title: "資金不足", description: "無法移除比目前總資金還多的金額。", variant: "destructive" });
            return;
        }
        let newFunds = currentFunds - amount;
        setPlatformConfig({ schoolFunds: newFunds });
        toast({ title: "資金已調整", description: `學校總資金已更新為 ${newFunds.toLocaleString()} 點。` });
    }

    setIsAdjustFundsDialogOpen(false);
    setAdjustFundsAmount('');
  };

  const handleAllocatePointsToTeacher = () => {
    const amount = Number(allocationAmount);
    if (!amount || !teacherToAllocate || amount <= 0) {
        toast({ title: "無效的金額", description: "請輸入一個大於 0 的有效金額。", variant: "destructive" });
        return;
    }
   
    const currentSchoolFunds = platformConfig?.schoolFunds || 0;
    
    if (currentSchoolFunds < amount) {
        toast({ title: "學校資金不足", description: "中央銀行資金不足以進行此次撥款。", variant: "destructive" });
        return;
    }

    // Deduct from school funds
    setPlatformConfig({ schoolFunds: currentSchoolFunds - amount });
    // Add to teacher's balance
    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === teacherToAllocate.id ? { ...t, pointBalance: (t.pointBalance || 0) + amount } : t
    ));
    toast({ title: "撥款成功", description: `已成功撥款 ${amount.toLocaleString()} 點給 ${teacherToAllocate.name} 老師。`});

    setIsAllocatePointsDialogOpen(false);
    setAllocationAmount('');
    setTeacherToAllocate(null);
  };

  const unassignedClasses = useMemo(() => {
    const assignedClassIds = teachers
        .filter(t => t.role === 'teacher')
        .flatMap(t => t.classIds || []);
    return classes.filter(c => !assignedClassIds.includes(c.id));
  }, [classes, teachers]);

  const handleChallengeApproval = (studentId: string, classId: string, challengeId: string) => {
    const challenge = (platformConfig?.challenges || []).find(c => c.id === challengeId);
    if (!challenge) return;
    
    setStudents(currentStudents => currentStudents.map(student => {
        if(student.id === studentId && student.classId === classId) {
            const today = new Date().toISOString();
            const pointsToAdd = challenge.points;
            
            const newHistory = [...(student.pointHistory || []), { points: pointsToAdd, date: today, reason: `完成挑戰: ${challenge.name}` }];
            const updatedStudent = {
                ...student,
                points: student.points + pointsToAdd,
                pointHistory: newHistory,
                challenges: (student.challenges || []).map(c => 
                    c.challengeId === challengeId ? { ...c, status: 'completed' as const, completedDate: today } : c
                )
            };
            return updatedStudent;
        }
        return student;
    }));
    
    toast({ title: "挑戰已批准", description: `已發送 ${challenge.points.toLocaleString()} 點給該學生。` });
  };
  
  const handleOpenManageClasses = () => {
    if (currentTeacher) {
      setSelectedClassesForSubjectTeacher(currentTeacher.classIds || []);
      setIsManageClassesDialogOpen(true);
    }
  };
  
  const handleSaveSubjectTeacherClasses = () => {
    if (!teacherId) return;
    setTeachers(prev => prev.map(t => 
        t.id === teacherId ? { ...t, classIds: selectedClassesForSubjectTeacher } : t
    ));
    setTeacherClassIds(selectedClassesForSubjectTeacher); // Update local state as well
     // Update localStorage
    localStorage.setItem('teacherClassIds', JSON.stringify(selectedClassesForSubjectTeacher));
    toast({ title: "任教班級已更新" });
    setIsManageClassesDialogOpen(false);
  };
  
  const handleSubjectClassSelection = (classId: string, isChecked: boolean) => {
    setSelectedClassesForSubjectTeacher(prev => 
        isChecked ? [...prev, classId] : prev.filter(id => id !== classId)
    );
  };

  const handleImpersonate = (teacher: Teacher) => {
    if (!teacherId || role !== 'admin') return;

    localStorage.setItem('impersonator', teacherId); // Store original admin ID
    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('teacherId', teacher.id);
    localStorage.setItem('teacherRole', teacher.role);
    localStorage.setItem('teacherClassIds', JSON.stringify(teacher.classIds));
    localStorage.setItem('teacherName', teacher.name);

    toast({ title: `正在模擬 ${teacher.name} 的身份`, description: "您現在將以該老師的視角瀏覽。" });
    window.location.reload();
  }


  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  const roleNameMapping = {
      admin: '校長',
      teacher: '班級導師',
      subject_teacher: '科任教師'
  }
  
  const mainDashboardContent = () => (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {role === 'admin' ? (
        <>
            <Card>
            <CardHeader>
                <CardTitle>班級選擇</CardTitle>
                <CardDescription>身為校長，您可以選擇要檢視或管理的班級。</CardDescription>
            </CardHeader>
            <CardContent>
                <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="請選擇班級" />
                </SelectTrigger>
                <SelectContent>
                    {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><Banknote/> 學校總資金</CardTitle>
                    <CardDescription>用於分配預算給各班老師的總資金池。</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsAdjustFundsDialogOpen(true)}>
                    <ShieldPlus className="mr-2 h-4 w-4" />
                    調整資金
                </Button>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">{(platformConfig?.schoolFunds || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">目前在經濟體系中流通的點數總量。</p>
            </CardContent>
            </Card>
        </>
        ) : (
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Coins /> 我的點數餘額</CardTitle>
                    <CardDescription>您可以發放給學生的點數總額。點數不足時请向校長申請撥款。</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{(currentTeacher?.pointBalance || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">目前可用的點數。</p>
                </CardContent>
            </Card>
        )}
    </div>
    <Tabs defaultValue={role === 'subject_teacher' ? 'classes' : 'students'} className="animate-in fade-in-0 duration-500">
        <TabsList className={`grid w-full ${role === 'admin' ? 'grid-cols-3' : (role === 'teacher' ? 'grid-cols-3' : 'grid-cols-2')}`}>
            {role !== 'subject_teacher' && <TabsTrigger value="students">學生管理</TabsTrigger>}
            {role === 'admin' && <TabsTrigger value="teachers">教師管理</TabsTrigger>}
            {role === 'subject_teacher' && <TabsTrigger value="classes">班級管理</TabsTrigger>}
            <TabsTrigger value="points">發送點數</TabsTrigger>
            {(role === 'admin' || role === 'teacher') && <TabsTrigger value="approvals">審核中心</TabsTrigger>}
        </TabsList>

      
      {role !== 'subject_teacher' && 
        <TabsContent value="students" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>學生名單</CardTitle>
                        <CardDescription>
                            新增、編輯、刪除或批次匯入學生。
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            批次匯入
                        </Button>
                        <Button onClick={() => setIsAddStudentDialogOpen(true)} disabled={!selectedClassId}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新增學生
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>編號</TableHead>
                            <TableHead>姓名</TableHead>
                            <TableHead>目前點數</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentsInView.map((student) => (
                            <TableRow key={`${student.classId}-${student.id}`}>
                                <TableCell className="font-mono">{student.id}</TableCell>
                                <TableCell className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={student.avatar} data-ai-hint="student avatar" />
                                    <AvatarFallback>
                                        {student.name.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.name}</span>
                                </TableCell>
                                <TableCell>{student.points.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditStudentClick(student)}>
                                            <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleResetPasswordClick(student)}>
                                            <KeyRound className="h-4 w-4" />
                                    </Button>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteStudentClick(student)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </AlertDialog>
                </CardContent>
            </Card>
        </TabsContent>
      }

      {role === 'admin' && (
        <>
        <TabsContent value="teachers" className="mt-6 space-y-6">
            <Card>
                <CardHeader  className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>教師管理</CardTitle>
                        <CardDescription>新增、編輯教師，或為他們分配點數預算。</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddTeacherDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增老師
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>班級</TableHead>
                                <TableHead>點數餘額</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.map(teacher => (
                                <TableRow key={teacher.id}>
                                    <TableCell>{teacher.id}</TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={teacher.role === 'admin' ? 'destructive' : teacher.role === 'teacher' ? 'default' : 'secondary'}>
                                            {roleNameMapping[teacher.role]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{(teacher.classIds || []).map(id => classes.find(c => c.id === id)?.name).join(', ') || 'N/A'}</TableCell>
                                    <TableCell>{(teacher.pointBalance || 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
                                            {teacher.role !== 'admin' && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => handleImpersonate(teacher)}>
                                                        <UserCheck className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>模擬登入</p></TooltipContent>
                                            </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => { setTeacherToAllocate(teacher); setIsAllocatePointsDialogOpen(true); }}>
                                                        <Coins className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>分配點數</p></TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditTeacherClick(teacher)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>編輯</p></TooltipContent>
                                            </Tooltip>
                                             <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => handleResetTeacherPasswordClick(teacher)}>
                                                        <KeyRound className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>重設密碼</p></TooltipContent>
                                            </Tooltip>
                                            <AlertDialog>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTeacherClick(teacher)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </AlertDialogTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>刪除</p></TooltipContent>
                                                </Tooltip>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            您確定要刪除老師「{teacher.name}」嗎？此操作將永久移除该老師的帳號及其建立的獎勵與挑戰，且無法復原。
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleConfirmDeleteTeacher} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader  className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>班級列表</CardTitle>
                        <CardDescription>新增或管理系統中的班級。</CardDescription>
                    </div>
                     <Button onClick={() => setIsAddClassDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增班級
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級 ID</TableHead>
                                <TableHead>班級名稱</TableHead>
                                <TableHead>班級導師</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.id}</TableCell>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{teachers.find(t => t.role === 'teacher' && t.classIds && t.classIds.includes(c.id))?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog onOpenChange={(open) => { if (!open) setClassToDelete(null)}}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClassClick(c)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>您確定要刪除班級嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        刪除「{classToDelete?.name}」將會永久刪除該班級內的所有學生資料，此操作無法復原。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleConfirmDeleteClass} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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
        </TabsContent>
        </>
      )}

       {role === 'subject_teacher' && (
         <TabsContent value="classes" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>我的任教班級</CardTitle>
                        <CardDescription>新增或移除您任教的班級。</CardDescription>
                    </div>
                    <Button onClick={handleOpenManageClasses}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增/管理班級
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級 ID</TableHead>
                                <TableHead>班級名稱</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {teacherClassIds.length > 0 ? teacherClassIds.map(classId => {
                                const classInfo = classes.find(c => c.id === classId);
                                return (
                                    <TableRow key={classId}>
                                        <TableCell>{classInfo?.id}</TableCell>
                                        <TableCell>{classInfo?.name}</TableCell>
                                    </TableRow>
                                );
                           }) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        您目前沒有設定任何任教班級。
                                    </TableCell>
                                </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </TabsContent>
       )}
      
      <TabsContent value="points" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>發送/扣除點數</CardTitle>
                <CardDescription>
                發送點數給學生，或輸入負數来扣除點數。
                </CardDescription>
            </div>
             <Button onClick={() => setIsBatchAwardDialogOpen(true)} disabled={!selectedClassId || studentsInView.length === 0}>
                <Users className="mr-2 h-4 w-4" />
                全班批次操作
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
                <Label htmlFor="class-select-points">請先選擇班級</Label>
                <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                    <SelectTrigger id="class-select-points" className="w-full md:w-[280px]">
                        <SelectValue placeholder="請選擇班級" />
                    </SelectTrigger>
                    <SelectContent>
                        {(role === 'admin' 
                            ? classes 
                            : (teacherClassIds || []).map(id => classes.find(c => c.id === id)).filter(Boolean) as Class[]
                        ).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedClassId ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>目前點數</TableHead>
                    <TableHead className="w-[150px]">要發送/扣除的點數</TableHead>
                    <TableHead className="text-right w-[100px]">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {studentsInView.length > 0 ? studentsInView.map((student) => (
                    <TableRow key={`${student.classId}-${student.id}`}>
                        <TableCell className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={student.avatar} data-ai-hint="student avatar" />
                            <AvatarFallback>
                            {student.name.slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{student.name}</span>
                        </TableCell>
                        <TableCell>{student.points.toLocaleString()}</TableCell>
                        <TableCell>
                        <form id={`points-form-${student.id}`} onSubmit={(e) => {
                            e.preventDefault();
                            const points = parseInt(new FormData(e.currentTarget).get('points') as string, 10);
                            handleAwardPoints(student.id, points);
                            (e.target as HTMLFormElement).reset();
                        }}>
                            <Input name="points" type="number" placeholder="例如 50 或 -50" aria-label={`給 ${student.name} 的點數`} />
                        </form>
                        </TableCell>
                        <TableCell className="text-right">
                        <Button size="sm" type="submit" form={`points-form-${student.id}`}>執行</Button>
                        </TableCell>
                    </TableRow>
                    )) : (
                        <TableRow>
                           <TableCell colSpan={4} className="text-center h-24">此班級沒有學生。</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            ) : (
                <div className="text-center text-muted-foreground py-12">
                    請從上方選擇一個班級來查看學生名單。
                </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
     {(role === 'admin' || role === 'teacher') && (
        <TabsContent value="approvals" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck/> 獎勵使用請求</CardTitle>
                        <CardDescription>學生想要使用他們兌換的獎勵，您可以在這裡批准。</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>學生</TableHead>
                                    <TableHead>獎勵</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingRequests.length > 0 ? pendingRequests.map(({student, redemption}) => (
                                    <TableRow key={redemption.redemptionId}>
                                        <TableCell>{student.name} ({classes.find(c => c.id === student.classId)?.name})</TableCell>
                                        <TableCell>{redemption.reward.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleApproveUsage(student.id, student.classId, redemption.redemptionId)}>同意使用</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">目前沒有獎勵使用請求。</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>最新兌換紀錄</CardTitle>
                        <CardDescription>查看最近學生們用點數兌換了什麼獎勵。</CardDescription>
                    </CardHeader>
                     <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>學生</TableHead>
                                    <TableHead>班級</TableHead>
                                    <TableHead>獎勵</TableHead>
                                    <TableHead>兌換時間</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentRedemptions.length > 0 ? recentRedemptions.map(({student, redemption}) => (
                                    <TableRow key={redemption.redemptionId}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{classes.find(c => c.id === student.classId)?.name}</TableCell>
                                        <TableCell>{redemption.reward.name}</TableCell>
                                        <TableCell>{redemption.redemptionDate ? formatDistanceToNow(new Date(redemption.redemptionDate), { addSuffix: true, locale: zhTW }) : 'N/A'}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">目前沒有兌換紀錄。</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Banknote /> 貸款申請</CardTitle>
                        <CardDescription>審核來自學生的貸款申請。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>學生</TableHead>
                                    <TableHead>金額</TableHead>
                                    <TableHead>理由</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loanRequests.length > 0 ? loanRequests.map(({ student, loan }) => (
                                    <TableRow key={loan.id}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{loan.amount.toLocaleString()}</TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><p>{loan.reason}</p></TooltipTrigger>
                                                    <TooltipContent><p>{loan.reason}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" className="mr-2 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600" onClick={() => handleLoanDecision(student.id, student.classId, loan.id, 'approve')}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleLoanDecision(student.id, student.classId, loan.id, 'reject')}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">目前沒有貸款申請。</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Flag/> 挑戰任務審核</CardTitle>
                        <CardDescription>審核學生提交的已完成挑戰。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>學生</TableHead>
                                    <TableHead>挑戰名稱</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {challengeApprovals.length > 0 ? challengeApprovals.map(({student, studentChallenge, challenge}) => (
                                     <TableRow key={`${student.classId}-${student.id}-${studentChallenge.challengeId}`}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{challenge?.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleChallengeApproval(student.id, student.classId, studentChallenge.challengeId)}>批准</Button>
                                        </TableCell>
                                     </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">目前沒有待審核的挑戰。</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      )}

    </Tabs>
    </>
    );

  return (
    <div className="flex flex-col gap-6">
      {mainDashboardContent()}

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                  <AlertDialogDescription>
                      您確定要刪除學生「{studentToDelete?.name}」嗎？此操作將永久移除該學生的所有資料且無法復原。
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setStudentToDelete(null)}>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteStudent} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for Adjusting School Funds */}
      <Dialog open={isAdjustFundsDialogOpen} onOpenChange={setIsAdjustFundsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>調整學校總資金</DialogTitle>
                  <DialogDescription>
                      增加（注入）或減少（移除）學校總資金。此操作會直接影響點數的總供給量。
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label>操作類型</Label>
                      <Select onValueChange={(value: 'add' | 'remove') => setAdjustFundsType(value)} defaultValue={adjustFundsType}>
                          <SelectTrigger>
                              <SelectValue placeholder="選擇操作類型" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="add">增加資金 (注入)</SelectItem>
                              <SelectItem value="remove">減少資金 (移除)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="adjust-funds-amount">金額</Label>
                      <Input 
                          id="adjust-funds-amount" 
                          name="adjust-funds-amount" 
                          type="number"
                          placeholder="要調整的點數"
                          value={adjustFundsAmount}
                          min="1"
                          onChange={(e) => setAdjustFundsAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          required 
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="secondary">取消</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAdjustFunds}>確認調整</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for Allocating Points to Teacher */}
      <Dialog open={isAllocatePointsDialogOpen} onOpenChange={(open) => { if(!open) setTeacherToAllocate(null) }}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>分配點數給老師</DialogTitle>
                  <DialogDescription>
                      從學校總資金撥款給「{teacherToAllocate?.name}」老師。
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="allocation-amount">撥款金額</Label>
                      <Input 
                          id="allocation-amount" 
                          type="number"
                          placeholder="要操作的點数量"
                          value={allocationAmount}
                          min="1"
                          onChange={(e) => setAllocationAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          required 
                      />
                  </div>
                  <div className="text-sm text-muted-foreground">
                      <p>學校總資金：{(platformConfig?.schoolFunds || 0).toLocaleString()} 點</p>
                      <p>{teacherToAllocate?.name}老師餘額：{(teacherToAllocate?.pointBalance || 0).toLocaleString()} 點</p>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={() => setTeacherToAllocate(null)}>取消</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAllocatePointsToTeacher}>確認操作</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog for Batch Awarding Points */}
      <Dialog open={isBatchAwardDialogOpen} onOpenChange={setIsBatchAwardDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>全班批次發放/扣除點數</DialogTitle>
                  <DialogDescription>
                      為「{classes.find(c => c.id === selectedClassId)?.name}」的所有學生發送或扣除相同數量的點數。此操作無法復原。
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="batch-award-amount" className="text-right">
                          點數
                      </Label>
                      <Input 
                          id="batch-award-amount" 
                          name="batch-award-amount" 
                          type="number" 
                          className="col-span-3"
                          placeholder="正數為發放，負數為扣除"
                          value={batchAwardAmount}
                          onChange={(e) => setBatchAwardAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          required 
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="secondary">取消</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleBatchAwardPoints}>確認操作</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialogs for Students */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddStudent}>
          <DialogHeader>
              <DialogTitle>新增學生</DialogTitle>
              <DialogDescription>
              在「{classes.find(c => c.id === selectedClassId)?.name}」建立新的學生帳號。
              </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-add-id" className="text-right">
                  編號
              </Label>
              <Input id="student-add-id" name="id" className="col-span-3" required/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-add-name" className="text-right">
                  姓名
              </Label>
              <Input id="student-add-name" name="name" className="col-span-3" required/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-add-password" className="text-right">
                  密碼
              </Label>
              <Input id="student-add-password" name="password" type="password" className="col-span-3" required/>
              </div>
          </div>
          <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="secondary">取消</Button>
              </DialogClose>
              <Button type="submit">新增學生</Button>
          </DialogFooter>
          </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              if (!open) {
                  setFile(null);
                  setStagedStudents([]);
              }
              setIsImportDialogOpen(open);
          }}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>批次匯入學生</DialogTitle>
                  <DialogDescription>
                      上傳一個 CSV 檔案來批次新增或更新學生資料。檔案必須包含 `classId`, `id`, `name`, 和 `password` 這四個欄位。
                  </DialogDescription>
                  <p className="text-sm text-destructive font-medium">
                      重要提示：為避免乱碼，請務必將您的 CSV 檔案另存為 `UTF-8` 編碼格式後再上傳。
                  </p>
                  <a href="/students-template.csv" download className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1 w-fit">
                      <Download className="h-3 w-3" />
                      下載 CSV 範本
                  </a>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="space-y-2">
                      <Label>上傳 CSV 檔案</Label>
                      <div>
                          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="sr-only" />
                          <Label htmlFor="csv-file" className={buttonVariants({ variant: "outline" })}>
                              <Upload className="mr-2 h-4 w-4" />
                              {file ? file.name : "選擇檔案"}
                          </Label>
                      </div>
                  </div>

                  {stagedStudents.length > 0 && (
                      <div className="space-y-2">
                          <h3 className="font-semibold">匯入預覽</h3>
                          <Card className="max-h-64 overflow-y-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>班級ID</TableHead>
                                          <TableHead>學生編號</TableHead>
                                          <TableHead>姓名</TableHead>
                                          <TableHead>狀態</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {stagedStudents.map((student, index) => (
                                          <TableRow key={`${student.classId}-${student.id}-${index}`}>
                                              <TableCell>{student.classId}</TableCell>
                                              <TableCell>{student.id}</TableCell>
                                              <TableCell>{student.name}</TableCell>
                                              <TableCell>
                                                  {student.status === 'valid' && <Badge variant="default">可匯入</Badge>}
                                                  {student.status === 'duplicate' && <Badge variant="secondary">將更新</Badge>}
                                                  {student.status === 'invalid' && (
                                                      <TooltipProvider>
                                                          <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                  <Badge variant="destructive">資料無效</Badge>
                                                              </TooltipTrigger>
                                                              <TooltipContent>
                                                                  <p>{student.errors.join(', ')}</p>
                                                              </TooltipContent>
                                                          </Tooltip>
                                                      </TooltipProvider>
                                                  )}
                                              </TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          </Card>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button variant="secondary">取消</Button>
                  </DialogClose>
                  <Button 
                      onClick={handleConfirmImport} 
                      disabled={isImporting || stagedStudents.filter(s => s.status === 'valid' || s.status === 'duplicate').length === 0}
                  >
                      {isImporting ? '匯入中...' : `確認匯入/更新 ${stagedStudents.filter(s => s.status === 'valid' || s.status === 'duplicate').length} 位學生`}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={!!studentToEdit} onOpenChange={(open) => !open && setStudentToEdit(null)}>
          <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleUpdateStudent}>
              <DialogHeader>
                  <DialogTitle>編輯學生資訊</DialogTitle>
                  <DialogDescription>
                  更新「{studentToEdit?.name}」的詳細資訊。
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="student-edit-id" className="text-right">
                      編號
                  </Label>
                  <Input id="student-edit-id" name="id" defaultValue={studentToEdit?.id} className="col-span-3" required/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="student-edit-name" className="text-right">
                      姓名
                  </Label>
                  <Input id="student-edit-name" name="name" defaultValue={studentToEdit?.name} className="col-span-3" required/>
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={() => setStudentToEdit(null)}>取消</Button>
                  </DialogClose>
                  <Button type="submit">儲存變更</Button>
              </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
      
      <Dialog open={!!studentToResetPassword} onOpenChange={(open) => { if (!open) setStudentToResetPassword(null); }}>
          <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleConfirmResetPassword}>
          <DialogHeader>
              <DialogTitle>重設密碼</DialogTitle>
              <DialogDescription>
              為學生「{studentToResetPassword?.name}」設定一組新密碼。
              </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                  新密碼
              </Label>
              <Input id="new-password" name="new-password" type="password" className="col-span-3" required/>
              </div>
          </div>
          <DialogFooter>
              <DialogClose asChild>
                  <Button type="button" variant="secondary">取消</Button>
              </DialogClose>
              <Button type="submit">儲存密碼</Button>
          </DialogFooter>
          </form>
          </DialogContent>
      </Dialog>
      
      {/* Dialogs for Teachers and Classes (Admin only) */}
      {role === 'admin' && (
          <>
              <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleAddTeacher}>
                      <DialogHeader>
                      <DialogTitle>新增老師</DialogTitle>
                      <DialogDescription>建立新的老師帳號並選擇指派的班級。</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="teacher-id" className="text-right">老師 ID</Label>
                              <Input id="teacher-id" name="id" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="teacher-name" className="text-right">姓名</Label>
                              <Input id="teacher-name" name="name" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">角色</Label>
                              <RadioGroup name="role" defaultValue="teacher" className="col-span-3 flex gap-4">
                                  <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="teacher" id="role-teacher" />
                                      <Label htmlFor="role-teacher">班級導師</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="subject_teacher" id="role-subject-teacher" />
                                      <Label htmlFor="role-subject-teacher">科任教師</Label>
                                  </div>
                              </RadioGroup>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="teacher-class" className="text-right">指派班級</Label>
                              <Select name="classId" defaultValue="unassigned">
                                  <SelectTrigger className="col-span-3">
                                      <SelectValue placeholder="選擇一個未指派的班級" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="unassigned">不指派 (科任/待命)</SelectItem>
                                      {unassignedClasses.map(c => (
                                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                      <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                          <Button type="submit">新增老師</Button>
                      </DialogFooter>
                  </form>
                  </DialogContent>
              </Dialog>
              
              {editingTeacher && (
                  <EditTeacherDialog
                      isOpen={isEditTeacherDialogOpen}
                      onOpenChange={setIsEditTeacherDialogOpen}
                      teacher={editingTeacher}
                      classes={classes}
                      allTeachers={teachers}
                      onSave={handleUpdateTeacher}
                  />
              )}

              <Dialog open={!!teacherToResetPassword} onOpenChange={(open) => { if (!open) setTeacherToResetPassword(null) }}>
                  <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleConfirmResetTeacherPassword}>
                      <DialogHeader>
                      <DialogTitle>重設教師密碼</DialogTitle>
                      <DialogDescription>為老師「{teacherToResetPassword?.name}」設定一組新密碼。</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-password" className="text-right">新密碼</Label>
                          <Input id="new-password" name="new-password" type="password" className="col-span-3" required />
                      </div>
                      </div>
                      <DialogFooter>
                          <DialogClose asChild>
                              <Button type="button" variant="secondary">取消</Button>
                          </DialogClose>
                          <Button type="submit">儲存密碼</Button>
                      </DialogFooter>
                  </form>
                  </DialogContent>
              </Dialog>

              <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                      <form onSubmit={handleAddClass}>
                  <DialogHeader>
                      <DialogTitle>新增班級</DialogTitle>
                      <DialogDescription>
                      建立一個新的班級。
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="class-id" className="text-right">
                          班級 ID
                      </Label>
                      <Input id="class-id" name="id" placeholder="例如 3A" className="col-span-3" required/>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="class-name" className="text-right">
                          班級名稱
                      </Label>
                      <Input id="class-name" name="name" placeholder="例如 三年甲班" className="col-span-3" required/>
                      </div>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">取消</Button>
                      </DialogClose>
                      <Button type="submit">新增班級</Button>
                  </DialogFooter>
                  </form>
                  </DialogContent>
              </Dialog>
          </>
      )}
      
      {/* Dialog for Subject Teacher to manage classes */}
      <Dialog open={isManageClassesDialogOpen} onOpenChange={setIsManageClassesDialogOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>管理任教班級</DialogTitle>
                  <DialogDescription>勾選您所有任教的班級。</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <ScrollArea className="h-60 rounded-md border p-4">
                      <div className="space-y-2">
                          {classes.map(c => (
                              <div key={c.id} className="flex items-center space-x-2">
                                  <Checkbox
                                      id={`class-select-${c.id}`}
                                      checked={selectedClassesForSubjectTeacher.includes(c.id)}
                                      onCheckedChange={(checked) => handleSubjectClassSelection(c.id, !!checked)}
                                  />
                                  <Label htmlFor={`class-select-${c.id}`}>{c.name}</Label>
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                  <Button type="button" onClick={handleSaveSubjectTeacherClasses}>儲存變更</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for the Edit Teacher Dialog to manage its own state
interface EditTeacherDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    teacher: Teacher;
    classes: Class[];
    allTeachers: Teacher[];
    onSave: (updatedTeacher: Partial<Teacher>) => void;
}

function EditTeacherDialog({ isOpen, onOpenChange, teacher, classes, allTeachers, onSave }: EditTeacherDialogProps) {
    const [name, setName] = useState(teacher.name);
    const [currentRole, setCurrentRole] = useState(teacher.role);
    const [currentClassIds, setCurrentClassIds] = useState<string[]>(teacher.classIds || []);

    // Recalculate available classes for homeroom teacher assignment
    const unassignedClasses = useMemo(() => {
        const assignedClassIds = allTeachers
            .filter(t => t.role === 'teacher' && t.id !== teacher.id) // Exclude current teacher
            .flatMap(t => t.classIds || []);
        return classes.filter(c => !assignedClassIds.includes(c.id));
    }, [classes, allTeachers, teacher.id]);
    
    // Reset local state when the dialog is opened with a new teacher
    useEffect(() => {
        if (isOpen) {
            setName(teacher.name);
            setCurrentRole(teacher.role);
            setCurrentClassIds(teacher.classIds || []);
        }
    }, [isOpen, teacher]);

    const handleRoleChange = (newRole: 'teacher' | 'subject_teacher' | 'admin') => {
        setCurrentRole(newRole);
        // Reset class assignments when role changes to ensure validity
        setCurrentClassIds([]);
    };
    
    const handleHomeroomClassChange = (newClassId: string) => {
        setCurrentClassIds(newClassId === 'unassigned' ? [] : [newClassId]);
    };

    const handleSubjectClassChange = (classId: string, isChecked: boolean) => {
        setCurrentClassIds(prev => isChecked ? [...prev, classId] : prev.filter(id => id !== classId));
    };

    const handleSaveChanges = () => {
        onSave({ name, role: currentRole, classIds: currentClassIds });
        onOpenChange(false);
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>編輯老師資訊</DialogTitle>
                    <DialogDescription>更新「{teacher.name}」的詳細資訊。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-teacher-name">姓名</Label>
                        <Input id="edit-teacher-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>角色</Label>
                        <RadioGroup value={currentRole} onValueChange={(newRole) => handleRoleChange(newRole as any)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="teacher" id="edit-role-teacher" />
                                <Label htmlFor="edit-role-teacher">班級導師</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="subject_teacher" id="edit-role-subject-teacher" />
                                <Label htmlFor="edit-role-subject-teacher">科任教師</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-2">
                         <Label>指派班級</Label>
                        {currentRole === 'teacher' && (
                            <Select value={(currentClassIds && currentClassIds[0]) || 'unassigned'} onValueChange={handleHomeroomClassChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇班級" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">不指派</SelectItem>
                                    {/* The teacher's own current class must be in the list */}
                                    {teacher.classIds && teacher.classIds[0] && !unassignedClasses.find(c => c.id === teacher.classIds[0]) &&
                                      <SelectItem key={teacher.classIds[0]} value={teacher.classIds[0]}>
                                        {classes.find(c => c.id === teacher.classIds[0])?.name}
                                      </SelectItem>
                                    }
                                    {unassignedClasses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {currentRole === 'subject_teacher' && (
                            <ScrollArea className="h-40 rounded-md border p-4">
                               <div className="space-y-2">
                                 {classes.map(c => (
                                    <div key={c.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`class-${c.id}`} 
                                            checked={currentClassIds.includes(c.id)}
                                            onCheckedChange={(checked) => handleSubjectClassChange(c.id, !!checked)}
                                        />
                                        <label htmlFor={`class-${c.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {c.name}
                                        </label>
                                    </div>
                                ))}
                               </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">取消</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSaveChanges}>儲存變更</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
