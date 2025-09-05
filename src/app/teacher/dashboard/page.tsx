

"use client";

import { useState, useContext, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reward, Student, Teacher, Class, Loan, Stock, Announcement } from "@/lib/types";
import { PlusCircle, Edit, Trash2, KeyRound, Bell, Landmark, Check, X, Upload, Download, Loader2, Users, Settings, ImageOff, LineChart, Banknote, ShieldPlus, Coins, School, Megaphone } from "lucide-react";
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
import { format } from "date-fns";
import Papa from "papaparse";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface StagedStudent {
    id: string;
    name: string;
    password?: string;
    status: 'valid' | 'duplicate' | 'invalid';
    errors: string[];
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export default function TeacherDashboardPage() {
  const { 
    rewards, setRewards, 
    students, setStudents, 
    classes, setClasses, 
    teachers, setTeachers, 
    stocks, setStocks,
    isLoading, platformConfig, setPlatformConfig 
  } = useContext(AppDataContext);

  const [role, setRole] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherClassId, setTeacherClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // States for CSV import
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [stagedStudents, setStagedStudents] = useState<StagedStudent[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // State for Batch Award Points
  const [isBatchAwardDialogOpen, setIsBatchAwardDialogOpen] = useState(false);
  const [batchAwardAmount, setBatchAwardAmount] = useState<number | ''>('');

  // State for Platform Settings
  const [platformLogoFile, setPlatformLogoFile] = useState<File | null>(null);
  const [platformLogoPreview, setPlatformLogoPreview] = useState<string | null>(platformConfig?.platformLogoUrl || null);
  const [sponsorLogoFiles, setSponsorLogoFiles] = useState<(File | null)[]>(Array(4).fill(null));
  const [sponsorLogoPreviews, setSponsorLogoPreviews] = useState<(string | null)[]>(platformConfig?.sponsorLogoUrls || Array(4).fill(null));
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // State for Central Bank
  const [isAdjustFundsDialogOpen, setIsAdjustFundsDialogOpen] = useState(false);
  const [adjustFundsAmount, setAdjustFundsAmount] = useState<number | ''>('');
  const [adjustFundsType, setAdjustFundsType] = useState<'add' | 'remove'>('add');

  // State for Teacher Point Allocation
  const [isAllocatePointsDialogOpen, setIsAllocatePointsDialogOpen] = useState(false);
  const [teacherToAllocate, setTeacherToAllocate] = useState<Teacher | null>(null);
  const [allocationAmount, setAllocationAmount] = useState<number | ''>('');

  // State for Rewards
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [rewardImagePreview, setRewardImagePreview] = useState<string | null>(null);

  // State for Announcements
  const [isAddAnnouncementDialogOpen, setIsAddAnnouncementDialogOpen] = useState(false);
  const [isEditAnnouncementDialogOpen, setIsEditAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);


  useEffect(() => {
    const storedRole = localStorage.getItem('teacherRole');
    const storedTeacherId = localStorage.getItem('teacherId');
    const storedClassId = localStorage.getItem('teacherClassId');
    setRole(storedRole);
    setTeacherId(storedTeacherId);
    setTeacherClassId(storedClassId);
    if (storedRole === 'admin') {
      if(classes.length > 0 && !selectedClassId) {
          setSelectedClassId(classes[0].id);
      }
    } else {
      setSelectedClassId(storedClassId || '');
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    setPlatformLogoPreview(platformConfig?.platformLogoUrl || null);
    setSponsorLogoPreviews(platformConfig?.sponsorLogoUrls || Array(4).fill(null));
  }, [platformConfig]);

  const currentTeacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);
  
  const announcements = useMemo(() => {
    return (platformConfig?.announcements || [])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [platformConfig]);

  const recentAnnouncements = useMemo(() => announcements.slice(0, 3), [announcements]);

  const studentsInView = useMemo(() => {
    if (role === 'admin') {
      return students.filter(s => s.classId === selectedClassId);
    }
    return students.filter(s => s.classId === teacherClassId);
  }, [role, students, selectedClassId, teacherClassId]);
  
  const loanRequests = useMemo(() => students.flatMap(student => 
      (student.loans || [])
          .filter(l => l.status === 'pending')
          .map(l => ({ student, loan: l }))
  ).filter(({student}) => {
      if (role === 'admin') return student.classId === selectedClassId;
      return student.classId === teacherClassId;
  }), [students, role, selectedClassId, teacherClassId]);


  const [isAddRewardDialogOpen, setIsAddRewardDialogOpen] = useState(false);
  const [isEditRewardDialogOpen, setIsEditRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  
  const rewardsInView = useMemo(() => {
      if (role === 'admin') {
          return rewards.filter(r => r.scope === 'school');
      }
      return rewards.filter(r => r.scope === 'class' && r.providerId === teacherId);
  }, [rewards, role, teacherId]);

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);

  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isResetTeacherPasswordDialogOpen, setIsResetTeacherPasswordDialogOpen] = useState(false);
  const [teacherToResetPassword, setTeacherToResetPassword] = useState<Teacher | null>(null);
  
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);

  // States for Stock Management
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isEditStockDialogOpen, setIsEditStockDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);

  const { toast } = useToast();
  
  const pendingRequests = useMemo(() => {
    return students.flatMap(student => 
        (student.redeemedRewards || [])
            .filter(r => r.status === 'pending_use')
            .map(redemption => ({ student, redemption }))
    ).filter(({ redemption, student }) => {
        const teacherForStudent = teachers.find(t => t.classId === student.classId);
        if (role === 'admin') {
            // Admin sees school rewards and rewards for the selected class
            return redemption.reward.scope === 'school' || (redemption.reward.providerId === teacherForStudent?.id && student.classId === selectedClassId);
        }
        // Teacher only sees requests for their own rewards
        return redemption.reward.providerId === teacherId;
    });
  }, [students, role, selectedClassId, teacherId, teachers]);

  const handleApproveUsage = (studentId: string, classId: string, redemptionId: string) => {
    setStudents(currentStudents => currentStudents.map(student => {
        if (student.id === studentId && student.classId === classId) {
            return {
                ...student,
                redeemedRewards: student.redeemedRewards.filter(r => r.redemptionId !== redemptionId)
            };
        }
        return student;
    }));
    toast({
        title: "已批准使用",
        description: `您已批准了該學生的獎勵使用請求。`
    });
  };

  const handleAwardPoints = (studentId: string, pointsToAdd: number) => {
    if (!pointsToAdd || pointsToAdd <= 0) {
      toast({ title: "無效的點數", description: "請輸入一個正數。", variant: "destructive" });
      return;
    }
    
    if (!currentTeacher || (currentTeacher.pointBalance || 0) < pointsToAdd) {
        toast({ title: "點數餘額不足", description: "您的點數餘額不足以發放此次點數。", variant: "destructive" });
        return;
    }

    const today = new Date().toISOString();
    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentId && s.classId === selectedClassId) {
            const newHistory = [...(s.pointHistory || []), { points: pointsToAdd, date: today }];
            return { ...s, points: s.points + pointsToAdd, pointHistory: newHistory };
        }
        return s;
    }));
    
    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - pointsToAdd } : t
    ));

    const student = students.find(s => s.id === studentId && s.classId === selectedClassId);
    setTimeout(() => {
        toast({
            title: "點數已發送！",
            description: `您已成功發送 ${pointsToAdd.toLocaleString()} 點給 ${student?.name}。`
        })
    }, 1);
  }

  const handleBatchAwardPoints = () => {
    const pointsToAdd = Number(batchAwardAmount);
    if (!pointsToAdd || pointsToAdd <= 0) {
      toast({ title: "無效的點數", description: "請輸入一個正數。", variant: "destructive" });
      return;
    }
    
    const totalPointsToAward = studentsInView.length * pointsToAdd;
    if (!currentTeacher || (currentTeacher.pointBalance || 0) < totalPointsToAward) {
        toast({ title: "點數餘額不足", description: `您的點數餘額不足以進行此次批次發放。需要 ${totalPointsToAward.toLocaleString()} 點，但您只有 ${(currentTeacher.pointBalance || 0).toLocaleString()} 點。`, variant: "destructive" });
        return;
    }

    const studentIdsInView = studentsInView.map(s => s.id);
    const today = new Date().toISOString();
    
    setStudents(currentStudents => 
      currentStudents.map(student => {
        if (student.classId === selectedClassId && studentIdsInView.includes(student.id)) {
          const newHistory = [...(student.pointHistory || []), { points: pointsToAdd, date: today }];
          return { ...student, points: student.points + pointsToAdd, pointHistory: newHistory };
        }
        return student;
      })
    );
    
    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - totalPointsToAward } : t
    ));

    const className = classes.find(c => c.id === selectedClassId)?.name || '此班級';
    toast({
        title: "批次發放成功！",
        description: `您已成功發送 ${pointsToAdd.toLocaleString()} 點給 ${className} 的所有學生。`
    });

    setIsBatchAwardDialogOpen(false);
    setBatchAwardAmount('');
  };

  const handleRewardImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setRewardImageFile(file);
        setRewardImagePreview(URL.createObjectURL(file));
    }
  };


  const handleAddReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherId) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const cost = Number(formData.get("cost"));
    const stock = Number(formData.get("stock"));

    let imageUrl = `https://picsum.photos/seed/${name.replace(/\s/g, '-')}/600/400`;

    if (rewardImageFile) {
        try {
            imageUrl = await fileToDataUrl(rewardImageFile);
        } catch (error) {
            console.error("Error converting image to data URL", error);
            toast({ title: "圖片上傳失敗", description: "無法處理您上傳的圖片，將使用預設圖片。", variant: "destructive" });
        }
    }

    const newReward: Reward = {
      id: rewards.length > 0 ? Math.max(...rewards.map(r => parseInt(r.id.toString()))) + 1 : 1,
      name,
      description,
      cost,
      stock,
      image: imageUrl,
      scope: role === 'admin' ? 'school' : 'class',
      providerId: role === 'admin' ? 'school_admin' : teacherId,
    };

    setRewards(currentRewards => [...currentRewards, newReward]);
    setIsAddRewardDialogOpen(false);
    toast({
        title: "已新增獎勵",
        description: `${newReward.name} 已被新增至商店。`
    });
  };
  
  const handleEditRewardClick = (reward: Reward) => {
    setEditingReward(reward);
    setRewardImagePreview(reward.image);
    setIsEditRewardDialogOpen(true);
  };
  
  const handleUpdateReward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingReward) return;

    const formData = new FormData(event.currentTarget);
    let imageUrl = editingReward.image;

    if (rewardImageFile) {
        try {
            imageUrl = await fileToDataUrl(rewardImageFile);
        } catch (error) {
            console.error("Error converting image to data URL", error);
            toast({ title: "圖片上傳失敗", description: "無法處理您上傳的圖片，將保留原圖片。", variant: "destructive" });
        }
    }

    const updatedReward: Reward = {
      ...editingReward,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
      image: imageUrl,
    };
    
    setRewards(currentRewards => currentRewards.map(r => (r.id === updatedReward.id ? updatedReward : r)));
    setIsEditRewardDialogOpen(false);
    setEditingReward(null);
    toast({
        title: "已更新獎勵",
        description: `${updatedReward.name} 的資訊已更新。`
    })
  }

  const handleDeleteReward = (id: number) => {
    const rewardToDelete = rewards.find(r => r.id === id);
    setRewards(currentRewards => currentRewards.filter(reward => reward.id !== id));
    if(rewardToDelete){
        toast({
            title: "已移除獎勵",
            description: `${rewardToDelete.name} 已被移除。`,
            variant: "destructive"
        })
    }
  }

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
        avatar: `https://picsum.photos/seed/${id}/100`,
        portfolio: [],
        redeemedRewards: [],
        loans: [],
        pointHistory: [],
    };
    setStudents(currentStudents => [...currentStudents, newStudent]);
    setIsAddStudentDialogOpen(false);
    toast({
        title: "已新增學生",
        description: `已成功新增學生 ${name}。`
    });
  }
  
  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setIsEditStudentDialogOpen(true);
  }

  const handleUpdateStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudent) return;

    const formData = new FormData(event.currentTarget);
    const newId = formData.get("id") as string;
    const newName = formData.get("name") as string;
    
    // Check if the new ID already exists for another student in the same class
    if (newId !== editingStudent.id && students.some(s => s.id === newId && s.classId === editingStudent.classId)) {
        toast({
            title: "更新失敗",
            description: `編號 ${newId} 已被此班級的其他學生使用。`,
            variant: "destructive",
        });
        return;
    }

    setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === editingStudent.id && s.classId === editingStudent.classId) {
            return { ...s, id: newId, name: newName };
        }
        return s;
    }));
    
    setIsEditStudentDialogOpen(false);
    setEditingStudent(null);
    toast({
        title: "學生資訊已更新",
        description: `已成功更新學生 ${newName} 的資訊。`
    });
  }
  
  const handleDeleteStudentClick = (student: Student) => {
    setStudentToDelete(student);
  };
  
  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    setStudents(currentStudents => currentStudents.filter(s => s.id !== studentToDelete.id || s.classId !== studentToDelete.classId));
    toast({
        title: "已刪除學生",
        description: `已成功刪除學生 ${studentToDelete.name}。`,
        variant: "destructive",
    });
    setStudentToDelete(null);
  };


  const handleResetPasswordClick = (student: Student) => {
    setEditingStudent(student);
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudent) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("new-password") as string;

    setStudents(currentStudents => currentStudents.map(s => (s.id === editingStudent.id && s.classId === editingStudent.classId) ? { ...s, password: newPassword } : s));
    setIsResetPasswordDialogOpen(false);
    setEditingStudent(null);
    toast({
        title: "密碼已重設",
        description: `${editingStudent.name} 的密碼已更新。`
    });
  }
  
  const handleAddTeacher = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const classId = formData.get("classId") as string;

    if (teachers.some(t => t.id === id)) {
        toast({
            title: "新增老師失敗",
            description: `ID 為 ${id} 的老師已存在。`,
            variant: "destructive",
        });
        return;
    }
    
    const newTeacher: Teacher = {
        id,
        name,
        classId: classId === 'unassigned' ? null : classId,
        role: 'teacher',
        password: platformConfig?.teacherPassword || TEACHER_PASSWORD,
        pointBalance: 0,
    };
    setTeachers(current => [...current, newTeacher]);
    setIsAddTeacherDialogOpen(false);
    toast({
        title: "已新增老師",
        description: `已成功新增老師 ${name}。`
    });
  }

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsEditTeacherDialogOpen(true);
  }

  const handleUpdateTeacher = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTeacher) return;
    const formData = new FormData(event.currentTarget);
    const newId = formData.get("id") as string;
    const name = formData.get("name") as string;
    const classIdValue = formData.get("classId") as string;
    const newClassId = classIdValue === 'unassigned' ? null : classIdValue;

    if (newId !== editingTeacher.id && teachers.some(t => t.id === newId)) {
        toast({
            title: "更新失敗",
            description: `ID 為 ${newId} 的老師已存在。`,
            variant: "destructive",
        });
        return;
    }

    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === editingTeacher.id ? { ...t, id: newId, name, classId: newClassId } : t
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
    setIsResetTeacherPasswordDialogOpen(true);
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

    setIsResetTeacherPasswordDialogOpen(false);
    setTeacherToResetPassword(null);
  };
  
  const handleConfirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    setTeachers(currentTeachers => currentTeachers.filter(t => t.id !== teacherToDelete.id));
    toast({
        title: "已刪除老師",
        description: `已成功刪除老師 ${teacherToDelete.name}。`,
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

    const newClass: Class = { id, name };
    setClasses(current => [...current, newClass]);
    setIsAddClassDialogOpen(false);
    toast({
        title: "已新增班級",
        description: `已成功新增班級 ${name}。`
    });
  };

  const handleLoanDecision = (studentId: string, classId: string, loanId: string, decision: 'approve' | 'reject') => {
    const today = new Date().toISOString();
  
    // Find the teacher for the student's class
    const teacherForClass = teachers.find(t => t.classId === classId);
  
    if (decision === 'approve' && (!teacherForClass || !teacherId)) {
        setTimeout(() => {
            toast({ title: "錯誤", description: "找不到對應的老師來處理此貸款。", variant: "destructive" });
        }, 1);
        return;
    }
  
    const targetLoanAmount = students.find(s => s.id === studentId && s.classId === classId)?.loans.find(l => l.id === loanId)?.amount || 0;
  
    if (decision === 'approve') {
        const approvingTeacher = teachers.find(t => t.id === teacherId);
        if (!approvingTeacher || (approvingTeacher.pointBalance || 0) < targetLoanAmount) {
            setTimeout(() => {
                toast({ title: "貸款批准失敗", description: "您的點數餘額不足以批准此筆貸款。", variant: "destructive" });
            }, 1);
            return;
        }
    
        // Deduct points from teacher's balance
        setTeachers(currentTeachers => currentTeachers.map(t => 
            t.id === teacherId ? { ...t, pointBalance: (t.pointBalance || 0) - targetLoanAmount } : t
        ));
    }
  
    // Update student's loan status and points
    setStudents(currentStudents => currentStudents.map(student => {
        if (student.id === studentId && student.classId === classId) {
            let updatedStudent = { ...student };
            if (decision === 'approve') {
                updatedStudent.points += targetLoanAmount;
                updatedStudent.loans = student.loans.map(l => l.id === loanId ? { ...l, status: 'active' as const, approvalDate: today, lastInterestAccruedDate: today } : l);
                setTimeout(() => {
                    toast({ title: "貸款已批准", description: `已將 ${targetLoanAmount.toLocaleString()} 點數撥款給 ${student.name}。` });
                }, 1);
            } else {
                updatedStudent.loans = student.loans.map(l => l.id === loanId ? { ...l, status: 'rejected' as const } : l);
                 setTimeout(() => {
                    toast({ title: "貸款已拒絕", description: `已拒絕 ${student.name} 的貸款申請。`, variant: "destructive" });
                }, 1);
            }
            return updatedStudent;
        }
        return student;
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
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "utf-8",
        complete: (results) => {
            const parsedData: StagedStudent[] = results.data.map((row: any) => {
                const student: StagedStudent = { id: '', name: '', password: '', status: 'valid', errors: [] };
                
                if (row.id && typeof row.id === 'string' && row.id.trim()) {
                    student.id = row.id.trim();
                } else {
                    student.status = 'invalid';
                    student.errors.push('缺少或無效的 ID');
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

                if (student.status === 'valid' && students.some(s => s.id === student.id && s.classId === selectedClassId)) {
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
  
  const handleConfirmImport = () => {
    setIsImporting(true);
    const validStudentsToImport = stagedStudents.filter(s => s.status === 'valid');
    
    const newStudents: Student[] = validStudentsToImport.map(s => ({
        id: s.id,
        name: s.name,
        password: s.password!,
        classId: selectedClassId,
        points: 0,
        avatar: `https://picsum.photos/seed/${s.id}/100`,
        portfolio: [],
        redeemedRewards: [],
        loans: [],
        pointHistory: [],
    }));

    setStudents(current => [...current, ...newStudents]);

    toast({
        title: "匯入成功",
        description: `已成功匯入 ${newStudents.length} 位學生。`
    });

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setStagedStudents([]);
    setFile(null);
  };
  
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'platform') => {
    const file = e.target.files?.[0];
    if (file) {
        setPlatformLogoFile(file);
        setPlatformLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSponsorLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
        setSponsorLogoFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = file;
            return newFiles;
        });
        setSponsorLogoPreviews(prev => {
            const newPreviews = [...prev];
            newPreviews[index] = URL.createObjectURL(file);
            return newPreviews;
        });
    }
  };
  
  const handleRemoveSponsorLogo = (index: number) => {
      setSponsorLogoFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = null;
        return newFiles;
      });
      setSponsorLogoPreviews(prev => {
        const newPreviews = [...prev];
        newPreviews[index] = null;
        return newPreviews;
      });
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
        let platformLogoUrl = platformConfig?.platformLogoUrl;
        if (platformLogoFile) {
            platformLogoUrl = await fileToDataUrl(platformLogoFile);
        }

        const newSponsorUrls = [...(platformConfig?.sponsorLogoUrls || Array(4).fill(null))];
        for(let i = 0; i < sponsorLogoFiles.length; i++) {
            const file = sponsorLogoFiles[i];
            if (file) {
                newSponsorUrls[i] = await fileToDataUrl(file);
            } else {
                 // Check if the preview was removed
                 if (sponsorLogoPreviews[i] === null) {
                    newSponsorUrls[i] = null;
                }
            }
        }
        
        await setPlatformConfig({ 
            platformLogoUrl, 
            sponsorLogoUrls: newSponsorUrls 
        });

        toast({ title: "設定已儲存", description: "平台設定已成功更新。" });
    } catch (error) {
        console.error("Error saving settings:", error);
        toast({ title: "儲存失敗", description: "儲存平台設定時發生錯誤。", variant: "destructive" });
    } finally {
        setIsSavingSettings(false);
        setPlatformLogoFile(null);
        setSponsorLogoFiles(Array(4).fill(null));
    }
  };

  const handleAdjustFunds = () => {
    const amount = Number(adjustFundsAmount);
    if (!amount || amount <= 0) {
        toast({ title: "無效的金額", description: "請輸入一個正數。", variant: "destructive" });
        return;
    }
    const currentFunds = platformConfig?.schoolFunds || 0;
    let newFunds: number;

    if (adjustFundsType === 'add') {
        newFunds = currentFunds + amount;
    } else {
        if (currentFunds < amount) {
            toast({ title: "資金不足", description: "無法移除比目前總資金還多的金額。", variant: "destructive" });
            return;
        }
        newFunds = currentFunds - amount;
    }

    setPlatformConfig({ schoolFunds: newFunds });
    toast({ title: "資金已調整", description: `學校總資金已更新為 ${newFunds.toLocaleString()} 點。` });
    setIsAdjustFundsDialogOpen(false);
    setAdjustFundsAmount('');
  };

  const handleAllocatePointsToTeacher = () => {
    const amount = Number(allocationAmount);
    if (!amount || amount <= 0 || !teacherToAllocate) {
        toast({ title: "無效的金額", description: "請輸入一個正數。", variant: "destructive" });
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
    const assignedClassIds = teachers.map(t => t.classId).filter(Boolean);
    return classes.filter(c => !assignedClassIds.includes(c.id));
  }, [classes, teachers]);

  const handleAddStock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ticker = (formData.get("ticker") as string).toUpperCase();
    
    if (stocks.some(s => s.ticker === ticker)) {
        toast({ title: "新增失敗", description: `股票代碼 ${ticker} 已存在。`, variant: "destructive" });
        return;
    }

    const newStock: Stock = {
        ticker,
        name: formData.get("name") as string,
        price: Number(formData.get("price")),
        marketCap: formData.get("marketCap") as string,
        change: 0,
        changePercent: 0,
    };

    setStocks(current => [...current, newStock]);
    setIsAddStockDialogOpen(false);
    toast({ title: "已新增股票", description: `${newStock.name} (${newStock.ticker}) 已新增至市場。`});
  };

  const handleEditStockClick = (stock: Stock) => {
    setEditingStock(stock);
    setIsEditStockDialogOpen(true);
  };

  const handleUpdateStock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStock) return;
    const formData = new FormData(event.currentTarget);
    
    const updatedStock: Stock = {
        ...editingStock,
        name: formData.get("name") as string,
        price: Number(formData.get("price")),
        marketCap: formData.get("marketCap") as string,
    };
    
    setStocks(current => current.map(s => s.ticker === updatedStock.ticker ? updatedStock : s));
    setIsEditStockDialogOpen(false);
    setEditingStock(null);
    toast({ title: "已更新股票", description: `${updatedStock.name} 的資訊已更新。` });
  };
  
  const handleDeleteStockClick = (stock: Stock) => {
    setStockToDelete(stock);
  };

  const handleConfirmDeleteStock = () => {
    if (!stockToDelete) return;
    // Also need to remove this stock from all student portfolios
    setStudents(currentStudents => currentStudents.map(student => ({
        ...student,
        portfolio: student.portfolio.filter(p => p.ticker !== stockToDelete.ticker)
    })));

    setStocks(current => current.filter(s => s.ticker !== stockToDelete.ticker));

    toast({ title: "已刪除股票", description: `已從市場及所有投資組合中移除 ${stockToDelete.name}。`, variant: "destructive" });
    setStockToDelete(null);
  }

  const handleAddAnnouncement = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    const newAnnouncement: Announcement = {
        id: `announcement-${Date.now()}`,
        title,
        content,
        date: new Date().toISOString(),
    };
    
    const currentAnnouncements = platformConfig?.announcements || [];
    setPlatformConfig({ announcements: [...currentAnnouncements, newAnnouncement] });
    
    toast({ title: "公告已發布", description: "所有老師和學生現在都能看到這則新公告。" });
    setIsAddAnnouncementDialogOpen(false);
  };

  const handleEditAnnouncementClick = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsEditAnnouncementDialogOpen(true);
  };

  const handleUpdateAnnouncement = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAnnouncement) return;

    const formData = new FormData(event.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    const updatedAnnouncement: Announcement = {
      ...editingAnnouncement,
      title,
      content,
    };

    const updatedAnnouncements = (platformConfig?.announcements || []).map(ann => 
        ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann
    );
    setPlatformConfig({ announcements: updatedAnnouncements });

    toast({ title: "公告已更新" });
    setIsEditAnnouncementDialogOpen(false);
    setEditingAnnouncement(null);
  };

  const handleDeleteAnnouncementClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
  };
  
  const handleConfirmDeleteAnnouncement = () => {
      if (!announcementToDelete) return;
      const updatedAnnouncements = (platformConfig?.announcements || []).filter(ann => ann.id !== announcementToDelete.id);
      setPlatformConfig({ announcements: updatedAnnouncements });
      toast({ title: "公告已刪除", variant: "destructive" });
      setAnnouncementToDelete(null);
  }
  
  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  const RewardsManagementTab = () => {
    const rewardsInView = useMemo(() => {
        if (role === 'admin') {
            return rewards.filter(r => r.scope === 'school');
        }
        return rewards.filter(r => r.scope === 'class' && r.providerId === teacherId);
    }, [rewards, role, teacherId]);

    const AllClassRewards = () => (
      <Card>
        <CardHeader>
          <CardTitle>所有班級獎勵</CardTitle>
          <CardDescription>查看所有班級老師建立的獎勵。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>獎勵</TableHead>
                <TableHead>費用</TableHead>
                <TableHead>庫存</TableHead>
                <TableHead>提供者</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.filter(r => r.scope === 'class').map((reward) => (
                <TableRow key={reward.id}>
                  <TableCell className="font-medium">{reward.name}</TableCell>
                  <TableCell>{reward.cost.toLocaleString()}</TableCell>
                  <TableCell>{reward.stock}</TableCell>
                  <TableCell>{teachers.find(t => t.id === reward.providerId)?.name || '未知'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );

    return (
        <div className="space-y-6">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                <CardTitle>{role === 'admin' ? '學校獎勵庫存' : '我的班級獎勵'}</CardTitle>
                <CardDescription>
                    {role === 'admin' ? '新增、編輯或移除全校性的獎勵。' : '新增、編輯或移除您班級專屬的獎勵。'}
                </CardDescription>
                </div>
                <Button onClick={() => setIsAddRewardDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新增獎勵
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>獎勵</TableHead>
                    <TableHead>費用</TableHead>
                    <TableHead>庫存</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rewardsInView.map((reward) => (
                    <TableRow key={reward.id}>
                        <TableCell className="font-medium flex items-center gap-4">
                            <Image src={reward.image} alt={reward.name} width={40} height={40} className="rounded-md object-cover" />
                            <span>{reward.name}</span>
                        </TableCell>
                        <TableCell>{reward.cost.toLocaleString()}</TableCell>
                        <TableCell>{reward.stock}</TableCell>
                        <TableCell>
                            <Badge variant={reward.scope === 'school' ? 'default' : 'secondary'}>
                                {reward.scope === 'school' ? '學校' : '班級'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditRewardClick(reward)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        您確定要刪除獎勵「{reward.name}」嗎？此操作無法復原。
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteReward(reward.id)} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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
            {role === 'admin' && <AllClassRewards />}
        </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
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
                    <CardDescription>您可以發放給學生的點數總額。點數不足時請向校長申請撥款。</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{(currentTeacher?.pointBalance || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">目前可用的點數。</p>
                </CardContent>
            </Card>
        )}
    </div>
    <Tabs defaultValue="students" className="animate-in fade-in-0 duration-500">
      <TabsList className={`grid w-full ${role === 'admin' ? 'grid-cols-9' : 'grid-cols-5'}`}>
        <TabsTrigger value="students">學生管理</TabsTrigger>
        {role === 'admin' && <TabsTrigger value="teachers">教師管理</TabsTrigger>}
        {role === 'admin' && <TabsTrigger value="stocks">股票管理</TabsTrigger>}
        <TabsTrigger value="points">發送點數</TabsTrigger>
        <TabsTrigger value="rewards">獎勵管理</TabsTrigger>
        <TabsTrigger value="requests">
            使用請求
            {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
        </TabsTrigger>
         <TabsTrigger value="loans">
            貸款申請
            {loanRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{loanRequests.length}</Badge>
            )}
        </TabsTrigger>
        {role === 'admin' && <TabsTrigger value="announcements">銀行公告管理</TabsTrigger>}
        {role === 'admin' && <TabsTrigger value="settings">平台設定</TabsTrigger>}
      </TabsList>
      
      <TabsContent value="students" className="mt-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>學生名單</CardTitle>
                    <CardDescription>
                        新增、編輯、刪除或批次匯入目前所選班級的學生。
                    </CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        批次匯入
                    </Button>
                    <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增學生
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={student.id}>
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
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            您確定要刪除學生「{student.name}」嗎？此操作將永久移除該學生的所有資料且無法復原。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmDeleteStudent()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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
                                <TableHead>班級</TableHead>
                                <TableHead>點數餘額</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.filter(t => t.role === 'teacher').map(teacher => (
                                <TableRow key={teacher.id}>
                                    <TableCell>{teacher.id}</TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>{classes.find(c => c.id === teacher.classId)?.name || '未指派'}</TableCell>
                                    <TableCell>{(teacher.pointBalance || 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
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
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTeacherClick(teacher)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    您確定要刪除老師「{teacher.name}」嗎？此操作將永久移除該老師的帳號且無法復原。
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleConfirmDeleteTeacher()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TooltipTrigger>
                                                <TooltipContent><p>刪除</p></TooltipContent>
                                            </Tooltip>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.id}</TableCell>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{teachers.find(t => t.classId === c.id)?.name || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="stocks" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>股票管理</CardTitle>
                        <CardDescription>新增、編輯或刪除市場上的股票。</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddStockDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增股票
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>代碼</TableHead>
                                <TableHead>公司名稱</TableHead>
                                <TableHead>目前價格</TableHead>
                                <TableHead>市值</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stocks.map(stock => (
                                <TableRow key={stock.ticker}>
                                    <TableCell className="font-mono">{stock.ticker}</TableCell>
                                    <TableCell>{stock.name}</TableCell>
                                    <TableCell>${stock.price.toFixed(2)}</TableCell>
                                    <TableCell>{stock.marketCap}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditStockClick(stock)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        您確定要刪除股票「{stock.name}」嗎？此操作將永久移除該股票，並從所有學生的投資組合中移除此持股。此操作無法復原。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setStockToDelete(null)}>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleConfirmDeleteStock()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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
        
        <TabsContent value="announcements" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>銀行公告管理</CardTitle>
                        <CardDescription>新增、編輯或刪除全站公告。所有師生皆可看見。</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddAnnouncementDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增公告
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">發布日期</TableHead>
                                <TableHead>標題</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {announcements.map((ann) => (
                             <TableRow key={ann.id}>
                               <TableCell>{format(new Date(ann.date), "yyyy-MM-dd HH:mm")}</TableCell>
                               <TableCell>{ann.title}</TableCell>
                               <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditAnnouncementClick(ann)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAnnouncementClick(ann)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    您確定要刪除公告「{ann.title}」嗎？此操作無法復原。
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleConfirmDeleteAnnouncement()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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

        <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>平台 Logo 設定</CardTitle>
                    <CardDescription>上傳平台 Logo。此 Logo 將顯示在登入頁面和側邊欄中。建議使用透明背景的 PNG 檔案。</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                     <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                        {platformLogoPreview ? (
                            <Image src={platformLogoPreview} alt="Logo Preview" width={128} height={128} className="object-contain rounded-md" />
                        ) : (
                            <span className="text-xs text-muted-foreground">預覽</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="logo-upload">上傳 Logo (PNG)</Label>
                        <Input id="logo-upload" type="file" accept="image/png" onChange={(e) => handleLogoFileChange(e, 'platform')} className="max-w-xs" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>贊助商 Logo 設定</CardTitle>
                    <CardDescription>上傳最多四個贊助商 Logo。這些 Logo 將顯示在頁面底部的頁尾区域。建議使用透明背景的 PNG 檔案，並確保所有 Logo 寬度一致。</CardDescription>
                </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="w-48 h-24 bg-muted rounded-md flex items-center justify-center relative group">
                                {sponsorLogoPreviews[index] ? (
                                    <>
                                      <Image src={sponsorLogoPreviews[index]!} alt={`Sponsor Logo ${index + 1} Preview`} fill className="object-contain p-2" />
                                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveSponsorLogo(index)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <ImageOff className="h-6 w-6"/>
                                        <span className="text-xs">位置 {index + 1}</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`sponsor-logo-upload-${index}`}>上傳 Logo {index + 1}</Label>
                                <Input id={`sponsor-logo-upload-${index}`} type="file" accept="image/png" onChange={(e) => handleSponsorLogoFileChange(e, index)} className="max-w-xs"/>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
             <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                    {isSavingSettings && <Loader2 className="mr-2 animate-spin" />}
                    儲存設定
                </Button>
            </div>
        </TabsContent>
        </>
      )}
      
      <TabsContent value="points" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>發送點數</CardTitle>
                <CardDescription>
                從您的點數餘額中發送點數給學生。
                </CardDescription>
            </div>
            <Button onClick={() => setIsBatchAwardDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                全班批次發放
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                  <TableHead>目前點數</TableHead>
                  <TableHead className="w-[150px]">要發送的點數</TableHead>
                  <TableHead className="text-right w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsInView.map((student) => (
                  <TableRow key={student.id}>
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
                        <Input name="points" type="number" placeholder="例如 50" aria-label={`給 ${student.name} 的點數`} />
                      </form>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" type="submit" form={`points-form-${student.id}`}>發送</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rewards" className="mt-6">
          <RewardsManagementTab />
      </TabsContent>
       <TabsContent value="requests" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>獎勵使用請求</CardTitle>
            <CardDescription>
              批准學生提出的獎勵使用請求。批准後，獎勵將從學生的收藏中移除。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                   <TableHead>班級</TableHead>
                  <TableHead>獎勵名稱</TableHead>
                   <TableHead>類型</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length > 0 ? (
                    pendingRequests.map(({ student, redemption }) => (
                        <TableRow key={redemption.redemptionId}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{classes.find(c => c.id === student.classId)?.name}</TableCell>
                            <TableCell>{redemption.reward.name}</TableCell>
                            <TableCell>
                                <Badge variant={redemption.reward.scope === 'school' ? 'default' : 'secondary'}>
                                    {redemption.reward.scope === 'school' ? '學校' : '班級'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleApproveUsage(student.id, student.classId, redemption.redemptionId)}>同意使用</Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            目前沒有待處理的請求。
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="loans" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>貸款申請</CardTitle>
            <CardDescription>
              審核學生的貸款申請。批准後點數將直接撥款。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                  <TableHead>申請金額</TableHead>
                  <TableHead>還款期限</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanRequests.length > 0 ? (
                    loanRequests.map(({ student, loan }) => (
                        <TableRow key={loan.id}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{loan.amount.toLocaleString()} 點</TableCell>
                            <TableCell>{format(new Date(loan.repaymentDate), 'yyyy-MM-dd')}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{loan.reason}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="outline" className="text-success hover:text-success hover:bg-success/10 border-success/50 hover:border-success" onClick={() => handleLoanDecision(student.id, student.classId, loan.id, 'approve')}>
                                  <Check className="mr-2"/>批准
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50 hover:border-destructive" onClick={() => handleLoanDecision(student.id, student.classId, loan.id, 'reject')}>
                                  <X className="mr-2"/>拒絕
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            目前沒有待處理的貸款申請。
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

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
    <Dialog open={isAllocatePointsDialogOpen} onOpenChange={setIsAllocatePointsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>分配點數給老師</DialogTitle>
                <DialogDescription>
                    從學校總資金撥款給「{teacherToAllocate?.name}」老師。老師將能使用這些點數來獎勵學生。
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="allocation-amount">分配金額</Label>
                    <Input 
                        id="allocation-amount" 
                        type="number"
                        placeholder="要分配的點數量"
                        value={allocationAmount}
                        onChange={(e) => setAllocationAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        required 
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    目前學校總資金：{(platformConfig?.schoolFunds || 0).toLocaleString()} 點
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={() => setTeacherToAllocate(null)}>取消</Button>
                </DialogClose>
                <Button type="button" onClick={handleAllocatePointsToTeacher}>確認撥款</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Dialog for Batch Awarding Points */}
    <Dialog open={isBatchAwardDialogOpen} onOpenChange={setIsBatchAwardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>全班批次發放點數</DialogTitle>
                <DialogDescription>
                    為「{classes.find(c => c.id === selectedClassId)?.name}」的所有學生發送相同數量的點數。此操作無法復原。
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
                        placeholder="要發送的點數量"
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
                <Button type="button" onClick={handleBatchAwardPoints}>確認發放</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Dialogs for Rewards */}
    <Dialog open={isAddRewardDialogOpen} onOpenChange={(open) => {
        if (!open) {
            setRewardImageFile(null);
            setRewardImagePreview(null);
        }
        setIsAddRewardDialogOpen(open);
    }}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddReward}>
                <DialogHeader>
                    <DialogTitle>新增獎勵</DialogTitle>
                    <DialogDescription>填寫新獎勵項目的詳細資訊。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>獎勵圖片</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                {rewardImagePreview ? (
                                    <Image src={rewardImagePreview} alt="Reward preview" fill className="object-cover rounded-md" />
                                ) : (
                                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <Input id="reward-image-upload" type="file" accept="image/*" onChange={handleRewardImageFileChange} className="max-w-xs" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-name">名稱</Label>
                        <Input id="add-name" name="name" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-description">描述</Label>
                        <Input id="add-description" name="description" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="add-cost">費用</Label>
                            <Input id="add-cost" name="cost" type="number" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-stock">庫存</Label>
                            <Input id="add-stock" name="stock" type="number" required />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                    <Button type="submit">新增獎勵</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog open={isEditRewardDialogOpen} onOpenChange={(open) => {
        if (!open) {
            setEditingReward(null);
            setRewardImageFile(null);
            setRewardImagePreview(null);
        }
        setIsEditRewardDialogOpen(open);
    }}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateReward}>
                <DialogHeader>
                    <DialogTitle>編輯獎勵</DialogTitle>
                    <DialogDescription>更新「{editingReward?.name}」的詳細資訊。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                        <Label>獎勵圖片</Label>
                        <div className="flex items-center gap-4">
                             <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                {rewardImagePreview ? (
                                    <Image src={rewardImagePreview} alt="Reward preview" fill className="object-cover rounded-md" />
                                ) : (
                                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <Input id="edit-reward-image-upload" type="file" accept="image/*" onChange={handleRewardImageFileChange} className="max-w-xs" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">名稱</Label>
                        <Input id="edit-name" name="name" defaultValue={editingReward?.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">描述</Label>
                        <Input id="edit-description" name="description" defaultValue={editingReward?.description} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-cost">費用</Label>
                            <Input id="edit-cost" name="cost" type="number" defaultValue={editingReward?.cost} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-stock">庫存</Label>
                            <Input id="edit-stock" name="stock" type="number" defaultValue={editingReward?.stock} required />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                    <Button type="submit">儲存變更</Button>
                </DialogFooter>
            </form>
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
                    上傳一個 CSV 檔案來批次新增學生到「{classes.find(c => c.id === selectedClassId)?.name}」。
                    檔案必須包含 `id`, `name`, 和 `password` 這三個欄位。
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
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="csv-file">上傳 CSV 檔案</Label>
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                </div>

                {stagedStudents.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold">匯入預覽</h3>
                        <Card className="max-h-64 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>姓名</TableHead>
                                        <TableHead>狀態</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stagedStudents.map((student, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{student.id}</TableCell>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>
                                                {student.status === 'valid' && <Badge variant="default">可匯入</Badge>}
                                                {student.status === 'duplicate' && <Badge variant="secondary">ID 重複</Badge>}
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
                    disabled={isImporting || stagedStudents.filter(s => s.status === 'valid').length === 0}
                >
                    {isImporting ? '匯入中...' : `確認匯入 ${stagedStudents.filter(s => s.status === 'valid').length} 位學生`}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateStudent}>
          <DialogHeader>
            <DialogTitle>編輯學生資訊</DialogTitle>
            <DialogDescription>
              更新「{editingStudent?.name}」的詳細資訊。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-edit-id" className="text-right">
                編號
              </Label>
              <Input id="student-edit-id" name="id" defaultValue={editingStudent?.id} className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-edit-name" className="text-right">
                姓名
              </Label>
              <Input id="student-edit-name" name="name" defaultValue={editingStudent?.name} className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存變更</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
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

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleConfirmResetPassword}>
          <DialogHeader>
            <DialogTitle>重設密碼</DialogTitle>
            <DialogDescription>
              為學生「{editingStudent?.name}」設定一組新密碼。
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
                <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存密碼</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Teachers and Classes (Admin only) */}
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
                    <Label htmlFor="teacher-class" className="text-right">班級</Label>
                    <Select name="classId" defaultValue="unassigned">
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="選擇一個未指派的班級" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">未指派</SelectItem>
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
      <Dialog open={isEditTeacherDialogOpen} onOpenChange={setIsEditTeacherDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateTeacher}>
          <DialogHeader>
            <DialogTitle>編輯老師資訊</DialogTitle>
            <DialogDescription>
              更新「{editingTeacher?.name}」的詳細資訊。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teacher-id" className="text-right">老師 ID</Label>
                <Input id="edit-teacher-id" name="id" defaultValue={editingTeacher?.id} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-name" className="text-right">
                姓名
              </Label>
              <Input id="edit-teacher-name" name="name" defaultValue={editingTeacher?.name} className="col-span-3" required/>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teacher-class" className="text-right">班級</Label>
                <Select name="classId" defaultValue={editingTeacher?.classId || 'unassigned'}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="選擇班級" />
                    </SelectTrigger>
                    <SelectContent>
                         <SelectItem value="unassigned">未指派</SelectItem>
                        {classes.map(c => (
                            <SelectItem key={c.id} value={c.id} disabled={unassignedClasses.every(uc => uc.id !== c.id) && c.id !== editingTeacher?.classId}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setEditingTeacher(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存變更</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isResetTeacherPasswordDialogOpen} onOpenChange={setIsResetTeacherPasswordDialogOpen}>
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
                <Button type="button" variant="secondary" onClick={() => setTeacherToResetPassword(null)}>取消</Button>
              </DialogClose>
              <Button type="submit">儲存密碼</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
       <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除老師「{teacherToDelete?.name}」嗎？此操作將永久移除该老師的帳號且無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmDeleteTeacher()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

    {/* Dialogs for Stock Management (Admin only) */}
    <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddStock}>
                <DialogHeader>
                    <DialogTitle>新增股票</DialogTitle>
                    <DialogDescription>為市場新增一個可交易的股票。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-add-ticker" className="text-right">代碼</Label>
                        <Input id="stock-add-ticker" name="ticker" className="col-span-3 font-mono" placeholder="EDU" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-add-name" className="text-right">公司名稱</Label>
                        <Input id="stock-add-name" name="name" className="col-span-3" placeholder="學習公司" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-add-price" className="text-right">初始價格</Label>
                        <Input id="stock-add-price" name="price" type="number" step="0.01" className="col-span-3" placeholder="150.00" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-add-marketCap" className="text-right">市值</Label>
                        <Input id="stock-add-marketCap" name="marketCap" className="col-span-3" placeholder="1.2兆" required />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                    <Button type="submit">新增股票</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    <Dialog open={isEditStockDialogOpen} onOpenChange={(open) => { if(!open) setEditingStock(null) }}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateStock}>
                <DialogHeader>
                    <DialogTitle>編輯股票</DialogTitle>
                    <DialogDescription>更新「{editingStock?.name}」的資訊。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-edit-ticker" className="text-right">代碼</Label>
                        <Input id="stock-edit-ticker" name="ticker" defaultValue={editingStock?.ticker} className="col-span-3 font-mono" disabled />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-edit-name" className="text-right">公司名稱</Label>
                        <Input id="stock-edit-name" name="name" defaultValue={editingStock?.name} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-edit-price" className="text-right">目前價格</Label>
                        <Input id="stock-edit-price" name="price" type="number" step="0.01" defaultValue={editingStock?.price} className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock-edit-marketCap" className="text-right">市值</Label>
                        <Input id="stock-edit-marketCap" name="marketCap" defaultValue={editingStock?.marketCap} className="col-span-3" required />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary" onClick={() => setEditingStock(null)}>取消</Button></DialogClose>
                    <Button type="submit">儲存變更</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    <AlertDialog open={!!stockToDelete} onOpenChange={(open) => !open && setStockToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                <AlertDialogDescription>
                    您確定要刪除股票「{stockToDelete?.name}」嗎？此操作將永久移除該股票，並從所有學生的投資組合中移除此持股。此操作無法復原。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setStockToDelete(null)}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirmDeleteStock()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {/* Dialogs for Announcements (Admin only) */}
    <Dialog open={isAddAnnouncementDialogOpen} onOpenChange={setIsAddAnnouncementDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleAddAnnouncement}>
                <DialogHeader>
                    <DialogTitle>新增銀行公告</DialogTitle>
                    <DialogDescription>建立一則新的公告，發布後所有師生都將能看到。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="ann-title">標題</Label>
                        <Input id="ann-title" name="title" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ann-content">內容</Label>
                        <Textarea id="ann-content" name="content" required rows={5} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                    <Button type="submit">發布公告</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
     <Dialog open={isEditAnnouncementDialogOpen} onOpenChange={(open) => {if (!open) setEditingAnnouncement(null)}}>
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleUpdateAnnouncement}>
                <DialogHeader>
                    <DialogTitle>編輯銀行公告</DialogTitle>
                    <DialogDescription>修改「{editingAnnouncement?.title}」的詳細內容。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-ann-title">標題</Label>
                        <Input id="edit-ann-title" name="title" defaultValue={editingAnnouncement?.title} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-ann-content">內容</Label>
                        <Textarea id="edit-ann-content" name="content" defaultValue={editingAnnouncement?.content} required rows={5} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                    <Button type="submit">儲存變更</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                <AlertDialogDescription>
                    您確定要刪除公告「{announcementToDelete?.title}」嗎？此操作無法復原。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirmDeleteAnnouncement()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {announcements.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone />
            銀行公告
          </CardTitle>
          <CardDescription>來自銀行的最新消息與活動。</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {recentAnnouncements.map((ann, index) => (
              <AccordionItem value={`item-${index}`} key={ann.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-4">
                      <span className="font-semibold">{ann.title}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(ann.date), "yyyy-MM-dd")}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {ann.content}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    )}
    </div>
  );
}
