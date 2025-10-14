
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Teacher, Class, Student, RedeemedRewardItem, Loan, StudentChallenge, PointRecord, PlatformConfig, StudentHabit, ClassGroup } from "@/lib/types";
import { PlusCircle, Edit, Trash2, KeyRound, Upload, Download, Coins, Check, X, BadgeCent, Loader2, ShieldAlert, DatabaseZap, Users } from "lucide-react";
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
import { doc, writeBatch, Transaction, setDoc, deleteDoc, collection, getDocs, query, where, addDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, subDays, isAfter } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const CONFIRM_DELETE_TEXT = "我確定要刪除";

const GroupManagementDialog = ({
    isOpen,
    onClose,
    classGroups,
    studentsInClass,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    classGroups: ClassGroup[];
    studentsInClass: Student[];
    onSave: (groups: ClassGroup[], updatedStudentAssignments: { studentId: string, groupId?: string }[]) => void;
}) => {
    const [groups, setGroups] = useState<ClassGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [studentGroupAssignments, setStudentGroupAssignments] = useState<{ [studentDocId: string]: string }>({});

    useEffect(() => {
        if (isOpen) {
            setGroups(classGroups);
            const initialAssignments: { [studentDocId: string]: string } = {};
            studentsInClass.forEach(student => {
                if (student.groupId && student._docId) {
                    initialAssignments[student._docId] = student.groupId;
                }
            });
            setStudentGroupAssignments(initialAssignments);
        }
    }, [isOpen, classGroups, studentsInClass]);

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            const newGroup = { id: `group-${Date.now()}`, name: newGroupName.trim() };
            setGroups([...groups, newGroup]);
            setNewGroupName('');
        }
    };

    const handleRemoveGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
        // Unassign students from the deleted group
        const updatedAssignments = { ...studentGroupAssignments };
        Object.keys(updatedAssignments).forEach(studentDocId => {
            if (updatedAssignments[studentDocId] === groupId) {
                delete updatedAssignments[studentDocId];
            }
        });
        setStudentGroupAssignments(updatedAssignments);
    };

    const handleStudentAssignmentChange = (studentDocId: string, groupId: string) => {
        setStudentGroupAssignments(prev => ({
            ...prev,
            [studentDocId]: groupId === 'unassigned' ? '' : groupId
        }));
    };

    const handleSaveChanges = () => {
        const updatedStudentAssignments = studentsInClass.map(student => {
            const newGroupId = studentGroupAssignments[student._docId!];
            return {
                studentId: student._docId!,
                groupId: newGroupId || undefined,
            };
        });
        onSave(groups, updatedStudentAssignments);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>管理我的分組</DialogTitle>
                    <DialogDescription>在此建立您個人的小組，並將學生指派到對應的小組中。</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>小組列表</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="輸入新組名"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                    />
                                    <Button onClick={handleAddGroup}>新增</Button>
                                </div>
                                <div className="space-y-2 pt-2">
                                    {groups.map(group => (
                                        <div key={group.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                            <span>{group.name}</span>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveGroup(group.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>學生指派</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>學生姓名</TableHead>
                                                <TableHead>指派分組</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {studentsInClass.map(student => (
                                                <TableRow key={student._docId}>
                                                    <TableCell>{student.name}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={studentGroupAssignments[student._docId!] || 'unassigned'}
                                                            onValueChange={(value) => handleStudentAssignmentChange(student._docId!, value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="未分組" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unassigned">未分組</SelectItem>
                                                                {groups.map(group => (
                                                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>取消</Button>
                    <Button onClick={handleSaveChanges}>儲存變更</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


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
    const [isGroupManagementDialogOpen, setIsGroupManagementDialogOpen] = useState(false);

    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
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
    
    const [batchTarget, setBatchTarget] = useState<string>('');
    const [batchPoints, setBatchPoints] = useState<number | ''>('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    
    const [loanToProcess, setLoanToProcess] = useState<{ student: Student, loan: Loan } | null>(null);
    const [challengeToApprove, setChallengeToApprove] = useState<{ student: Student, challenge: StudentChallenge } | null>(null);

    const [historySelectedTeacherId, setHistorySelectedTeacherId] = useState<string>('');
    const [historySelectedClassId, setHistorySelectedClassId] = useState<string>('');
    
    const classOptions = useMemo(() => {
        if (role === 'admin') return classes;
        if ((role === 'teacher' || role === 'subject_teacher') && teacherClassIds.length > 0) {
            return classes.filter(c => teacherClassIds.includes(c.id));
        }
        return [];
    }, [role, classes, teacherClassIds]);

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const currentTeacherGroups = useMemo(() => {
        if (!currentClass || !teacherId) return [];
        return currentClass.groups?.[teacherId] || [];
    }, [currentClass, teacherId]);

    const sortedTeachers = useMemo(() => {
        return [...teachers].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    }, [teachers]);

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

    // Clear selection when class changes
    useEffect(() => {
        setBatchTarget('');
    }, [selectedClassId]);

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

        const validStudentIds = new Set(studentsToList.map(s => s._docId));
    
        students.forEach(student => {
             if (!validStudentIds.has(student._docId)) return;
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
            a.findIndex(t => (`${v.student._docId}-${v.rewardItem.redemptionId}` === `${t.student._docId}-${t.rewardItem.redemptionId}`)) === i
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
            _docId: `${selectedClassId}-${studentId}`,
            name: formData.get('name') as string,
            classId: selectedClassId,
            points: 0,
            avatar: `https://picsum.photos/seed/${studentId}/100`,
            password: formData.get('password') as string,
            portfolio: [],
            pointHistory: [],
        };

        await setStudents(prev => [...prev, newStudent]);
        
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

    const handleDeleteStudent = async (studentToDelete: Student) => {
        if (!studentToDelete || !studentToDelete._docId) return;
        await setStudents(students.filter(s => s._docId !== studentToDelete._docId));
        toast({
            title: "學生已刪除",
            description: `${studentToDelete.name} 已被從班級中移除。`,
            variant: "destructive"
        });
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
                        _docId: `${classId}-${id}`,
                        points: 0,
                        avatar: `https://picsum.photos/seed/${id}/100`,
                        portfolio: [],
                        pointHistory: []
                    };
                }).filter(s => s.id && s.name && s.classId && s.password);
                setParsedCsvData(studentData as Student[]);
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
        const id = formData.get('id') as string;

        const newTeacher: Omit<Teacher, '_docId'> = {
            id: id,
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
        const id = formData.get('id') as string;
        const name = formData.get('name') as string;
        const newRole = editedTeacherRole as 'teacher' | 'admin' | 'subject_teacher';
        const classId = formData.get('classId') as string;

        await setTeachers(prev => prev.map(t => {
            if (t.id === teacherToEdit.id) {
                return {
                    ...t,
                    id,
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

        const newClass: Class = { id, name, announcements: [], groups: {} };
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

        const impersonatorId = localStorage.getItem('impersonator');
        const currentOperatorId = impersonatorId || teacherId;
        const currentOperator = teachers.find(t => t.id === currentOperatorId);

        if (!currentOperator || !currentOperator._docId) {
            toast({ title: "操作無效", description: "找不到您的教師資料。", variant: "destructive" });
            return;
        }
        
        if (currentOperator.role !== 'admin' && !(currentOperator.classIds || []).includes(selectedClassId)) {
            toast({ title: "權限不足", description: "您沒有在此班級發放點數的權限。", variant: "destructive" });
            return;
        }

        if (points > 0) {
            const isOperatingAsAdmin = currentOperator.role === 'admin';
            const sourceBalance = isOperatingAsAdmin ? (platformConfig?.schoolFunds || 0) : (currentOperator?.pointBalance || 0);
            if (sourceBalance < points) {
                 throw new Error(`您的點數餘額不足。`);
            }
        }

        if (!isBatch) {
            setIsProcessing(student._docId);
        }

        try {
            await runTransaction(async (transaction) => {
                const isOperatingAsAdmin = currentOperator.role === 'admin';

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
        if (batchPoints === '' || batchPoints === 0 || !batchTarget) return;
        
        setIsBatchProcessing(true);
        const points = Number(batchPoints);

        let studentsToUpdate: Student[] = [];
        
        if (batchTarget === 'all_class') {
            studentsToUpdate = studentsInClass;
        } else {
            // It's a group ID
            studentsToUpdate = studentsInClass.filter(student => student.groupId === batchTarget);
        }
        
        if (studentsToUpdate.length === 0) {
            toast({ title: "無操作對象", description: "請先確認此群組/班級有學生。", variant: "destructive" });
            setIsBatchProcessing(false);
            return;
        }

        const studentsWithInsufficientPoints = studentsToUpdate.filter(student => points < 0 && student.points < Math.abs(points));
        
        if (studentsWithInsufficientPoints.length > 0) {
             toast({
                title: "部分操作未執行",
                description: `${studentsWithInsufficientPoints.map(s => s.name).join(', ')} 的點數不足以進行批次扣除。`,
                variant: "default",
            });
        }
        
        const validStudentsToUpdate = studentsToUpdate.filter(student => !(points < 0 && student.points < Math.abs(points)));

        if (validStudentsToUpdate.length === 0) {
            toast({ title: "批次操作失敗", description: (points < 0 ? "所有學生的點數都不足以進行扣除。" : "沒有可操作的學生。"), variant: "destructive" });
            setIsBatchProcessing(false);
            return;
        }
        
        const impersonatorId = localStorage.getItem('impersonator');
        const currentOperatorId = impersonatorId || teacherId;
        const currentOperator = teachers.find(t => t.id === currentOperatorId);

        const totalPointChange = points * validStudentsToUpdate.length;
        
        if (points > 0) {
            const isOperatingAsAdmin = currentOperator?.role === 'admin';
            const sourceBalance = isOperatingAsAdmin ? (platformConfig?.schoolFunds || 0) : (currentOperator?.pointBalance || 0);

            if (sourceBalance < totalPointChange) {
                toast({ title: "批次操作失敗", description: `您的點數餘額不足以完成對 ${validStudentsToUpdate.length} 位學生的操作。`, variant: "destructive" });
                setIsBatchProcessing(false);
                return;
            }
        }

        let successfulOperations = 0;
        
        for (const student of validStudentsToUpdate) {
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
        setBatchTarget('');
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
            await runTransaction(async (transaction) => {
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
    
    const getDashboardTabs = () => {
        const tabs = [];
        if (role === 'admin' || role === 'teacher' || role === 'subject_teacher') {
            tabs.push(<TabsTrigger key="students" value="students">學生管理</TabsTrigger>);
        }
        if (role === 'admin') {
            tabs.push(<TabsTrigger key="teachers" value="teachers">教師管理</TabsTrigger>);
        }
        
        if (role === 'admin' || role === 'teacher' || role === 'subject_teacher') {
             tabs.push(<TabsTrigger key="groups" value="groups">分組管理</TabsTrigger>);
        }
        
        tabs.push(<TabsTrigger key="points" value="points">發送點數</TabsTrigger>);
        
        if (role === 'admin' || role === 'teacher' || role === 'subject_teacher') {
             tabs.push(<TabsTrigger key="history" value="history">點數歷史</TabsTrigger>);
        }
        
        if (role === 'admin' || role === 'teacher' || role === 'subject_teacher') {
            tabs.push(<TabsTrigger key="approvals" value="approvals">審核中心</TabsTrigger>);
        }
        
        return tabs;
    };
    
    const handleSaveGroups = async (groups: ClassGroup[], updatedStudentAssignments: { studentId: string; groupId?: string }[]) => {
        if (!currentClass || !teacherId) return;

        try {
            await runTransaction(async (transaction) => {
                if (!currentClass._docId) throw new Error("Class document ID is missing.");
                const classRef = doc(db, 'classes', currentClass._docId);
                
                const groupsUpdatePath = `groups.${teacherId}`;
                transaction.update(classRef, { [groupsUpdatePath]: groups });

                for (const assignment of updatedStudentAssignments) {
                    const studentRef = doc(db, 'students', assignment.studentId);
                    if (assignment.groupId) {
                        transaction.update(studentRef, { groupId: assignment.groupId });
                    } else {
                        transaction.update(studentRef, { groupId: deleteField() });
                    }
                }
            });

            toast({ title: "分組已儲存", description: "班級分組與學生指派已更新。" });
            setIsGroupManagementDialogOpen(false);
        } catch (error: any) {
            console.error("Error saving groups:", error);
            toast({ title: "儲存失敗", description: error.message || "發生未知錯誤", variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    const defaultTabValue = (role === 'teacher' || role === 'admin' || role === 'subject_teacher') ? 'students' : 'points';
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
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
                             {(role === 'admin' ? Math.round(platformConfig?.schoolFunds || 0) : Math.round(teacher?.pointBalance || 0))?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                           {role === 'admin' ? '可用於撥款給老師或作為活動獎勵' : '可用於發放給學生'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={defaultTabValue} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                    {getDashboardTabs()}
                </TabsList>

                {(role === 'admin' || role === 'teacher' || role === 'subject_teacher') && (
                <TabsContent value="students" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>學生名單</CardTitle>
                                <CardDescription>管理班級中的學生、重設密碼或進行批次匯入。</CardDescription>
                            </div>
                             <div className="flex items-center gap-2">
                                {role !== 'subject_teacher' && <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2"/>批次匯入</Button>}
                                {role !== 'subject_teacher' && <Button onClick={() => setIsAddStudentDialogOpen(true)}><PlusCircle className="mr-2"/>新增學生</Button>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1">
                                    <Label htmlFor="class-select-students" className="sr-only">選擇班級以管理</Label>
                                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                        <SelectTrigger id="class-select-students" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="請選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>座號</TableHead>
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
                                                <TableCell>{Math.round(student.points).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    {role !== 'subject_teacher' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" onClick={() => { setStudentToEdit(student); setIsEditStudentDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => { setStudentToResetPassword(student); setIsResetPasswordDialogOpen(true); }}><KeyRound className="h-4 w-4"/></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            您確定要從班級中移除 {student?.name} 嗎？此操作無法復原。
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteStudent(student)} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">請先選擇班級，或此班級無學生。</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
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
                            <CardContent className="overflow-x-auto">
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>姓名</TableHead>
                                            <TableHead>角色</TableHead>
                                            <TableHead>任教班級</TableHead>
                                            <TableHead>點數餘額</TableHead>
                                            <TableHead className="text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedTeachers.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{t.id}</TableCell>
                                                <TableCell>{t.name}</TableCell>
                                                <TableCell>{t.role === 'admin' ? '校長' : t.role === 'teacher' ? '班級導師' : '科任教師'}</TableCell>
                                                <TableCell>{(t.classIds || []).map(id => classes.find(c => c.id === id)?.name).join(', ') || '-'}</TableCell>
                                                <TableCell>{Math.round(t.pointBalance || 0).toLocaleString()}</TableCell>
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

                {(role === 'admin' || role === 'teacher' || role === 'subject_teacher') && (
                <TabsContent value="groups" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>分組管理</CardTitle>
                                <CardDescription>為目前選擇的班級建立您自己的小組，並將學生指派到各組。</CardDescription>
                            </div>
                             <Button onClick={() => setIsGroupManagementDialogOpen(true)} disabled={!selectedClassId}>
                                <Users className="mr-2"/>管理我的分組
                            </Button>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex-1">
                                    <Label htmlFor="class-select-groups" className="sr-only">選擇班級以管理分組</Label>
                                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                        <SelectTrigger id="class-select-groups" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="請選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="space-y-6">
                                {role === 'admin' ? (
                                    Object.entries(currentClass?.groups || {}).map(([tId, groupList]) => {
                                        const groups = Array.isArray(groupList) ? groupList : [];
                                        if (groups.length === 0) return null;
                                        return (
                                            <div key={tId}>
                                                <h3 className="font-semibold mb-2">由 {teachers.find(t => t.id === tId)?.name || '未知老師'} 建立的分組</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {groups.map(group => (
                                                        <Card key={group.id}>
                                                            <CardHeader><CardTitle>{group.name}</CardTitle></CardHeader>
                                                            <CardContent>
                                                                <ul className="space-y-2 text-sm">
                                                                    {studentsInClass.filter(s => s.groupId === group.id).map(s => <li key={s.id}>{s.name}</li>)}
                                                                </ul>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {currentTeacherGroups.map(group => (
                                            <Card key={group.id}>
                                                <CardHeader><CardTitle>{group.name}</CardTitle></CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2 text-sm">
                                                        {studentsInClass.filter(s => s.groupId === group.id).map(s => <li key={s.id}>{s.name}</li>)}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                {role !== 'admin' && currentTeacherGroups.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">您尚未為此班級建立任何分組。</p>}
                            </div>
                        </CardContent>
                    </Card>
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
                                <div className="space-y-2">
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
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                                    <Label htmlFor="batch-select" className="text-sm font-medium whitespace-nowrap">批次操作:</Label>
                                    <Select onValueChange={setBatchTarget} value={batchTarget}>
                                        <SelectTrigger id="batch-select" className="w-auto h-9">
                                            <SelectValue placeholder="選擇目標"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all_class">全班</SelectItem>
                                            {currentTeacherGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" placeholder="點數" className="w-24 h-9" value={batchPoints} onChange={e => setBatchPoints(e.target.value === '' ? '' : Number(e.target.value))} disabled={isBatchProcessing} />
                                    <Button size="sm" onClick={handleBatchOperation} disabled={!batchTarget || batchPoints === '' || isBatchProcessing}>
                                        {isBatchProcessing ? <Loader2 className="animate-spin" /> : '執行'}
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>姓名</TableHead>
                                            <TableHead>分組</TableHead>
                                            <TableHead>目前點數</TableHead>
                                            <TableHead className="w-[250px]">個別操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {studentsInClass.length > 0 ? studentsInClass.map(student => (
                                            <TableRow key={student._docId}>
                                                <TableCell>{student.name}</TableCell>
                                                <TableCell>{currentTeacherGroups?.find(g => g.id === student.groupId)?.name || '未分組'}</TableCell>
                                                <TableCell>{Math.round(student.points).toLocaleString()}</TableCell>
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
                                                            {isProcessing === student._docId ? <Loader2 className="animate-spin" /> : '發送'}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">請先選擇班級，或此班級無學生。</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {(role === 'admin' || role === 'teacher' || role === 'subject_teacher') && (
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>點數歷史紀錄</CardTitle>
                            <CardDescription>查看老師發放點數的紀錄。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-end gap-4 mb-4">
                                <div className="space-y-2">
                                    <Label htmlFor="teacher-select-history">選擇老師</Label>
                                    <Select onValueChange={setHistorySelectedTeacherId} value={historySelectedTeacherId}>
                                        <SelectTrigger id="teacher-select-history" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="選擇老師" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map(teacherInfo => (
                                                <SelectItem key={teacherInfo.id} value={teacherInfo.id}>{teacherInfo.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class-select-history">選擇班級</Label>
                                    <Select onValueChange={setHistorySelectedClassId} value={historySelectedClassId}>
                                        <SelectTrigger id="class-select-history" className="w-full md:w-[280px]">
                                            <SelectValue placeholder="選擇班級" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classOptions.map(classInfo => (
                                                <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold">近期紀錄</h3>
                                        <ScrollArea className="h-48">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>學生</TableHead>
                                                        <TableHead>點數</TableHead>
                                                        <TableHead>原因</TableHead>
                                                        <TableHead>日期</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pointHistoryForTeacherAndClass.records.map(record => (
                                                        <TableRow key={record.date}>
                                                            <TableCell>{record.studentName}</TableCell>
                                                            <TableCell>{record.points}</TableCell>
                                                            <TableCell>{record.reason}</TableCell>
                                                            <TableCell>{format(parseISO(record.date), 'yyyy-MM-dd')}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-semibold">學生總計</h3>
                                        <ScrollArea className="h-48">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>學生</TableHead>
                                                        <TableHead>總點數變化</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pointHistoryForTeacherAndClass.classSummary.sort((a, b) => b.net - a.net).map(summary => (
                                                        <TableRow key={summary.studentId}>
                                                            <TableCell>{summary.studentName}</TableCell>
                                                            <TableCell>{summary.net}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                )}
                
                {(role === 'admin' || role === 'teacher' || role === 'subject_teacher') && (
                    <TabsContent value="approvals" className="mt-6">
                        <div className="grid gap-6">
                            {rewardApprovalRequests.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>獎勵兌換請求</CardTitle>
                                        <CardDescription>學生已兌換獎勵，等待您的批准。</CardDescription>
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
                                                {rewardApprovalRequests.map(({ student, rewardItem }) => (
                                                    <TableRow key={rewardItem.redemptionId}>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell>{rewardItem.reward.name}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button onClick={() => handleApproveRewardUse(student, rewardItem)}>同意</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            {loanApprovalRequests.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>貸款請求</CardTitle>
                                        <CardDescription>學生需要貸款，等待您的批准。</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>學生</TableHead>
                                                    <TableHead>金額</TableHead>
                                                    <TableHead className="text-right">操作</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loanApprovalRequests.map(({ student, loan }) => (
                                                    <TableRow key={loan.id}>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell>{loan.amount}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button onClick={() => setLoanToProcess({ student, loan })}>審核</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            {challengeApprovalRequests.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>挑戰完成請求</CardTitle>
                                        <CardDescription>學生已完成挑戰，等待您的批准。</CardDescription>
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
                                                {challengeApprovalRequests.map(({ student, challenge }) => {
                                                     const challengeDetails = platformConfig?.challenges?.find(c => c.id === challenge.challengeId);
                                                     if (!challengeDetails) return null;
                                                     return (
                                                          <TableRow key={challenge.challengeId}>
                                                                <TableCell>{student.name}</TableCell>
                                                                <TableCell>{challengeDetails.name}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button onClick={() => setChallengeToApprove({ student, challenge })}>批准</Button>
                                                                </TableCell>
                                                          </TableRow>
                                                     )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            {(habitApprovalRequests.length > 0) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>習慣養成請求</CardTitle>
                                        <CardDescription>學生已完成習慣養成，等待您的批准。</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>學生</TableHead>
                                                    <TableHead>習慣名稱</TableHead>
                                                    <TableHead className="text-right">操作</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {habitApprovalRequests.map(({ student, habit }) => (
                                                    <TableRow key={habit.id}>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell>{habit.title}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button disabled>未實作</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                            {(rewardApprovalRequests.length === 0 && loanApprovalRequests.length === 0 && challengeApprovalRequests.length === 0 && habitApprovalRequests.length === 0) && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-muted-foreground text-center">目前沒有任何審核請求。</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                )}
            </Tabs>

            {/* Dialogs */}
            <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>新增學生</DialogTitle>
                        <DialogDescription>在此新增班級中的學生。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddStudent} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="id" className="text-right">座號</Label>
                            <Input id="id" name="id" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">姓名</Label>
                            <Input id="name" name="name" className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">密碼</Label>
                            <Input id="password" name="password" className="col-span-3" type="password" required />
                        </div>
                        <DialogFooter>
                            <Button type="submit">新增</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>編輯學生</DialogTitle>
                        <DialogDescription>編輯學生的基本資訊。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditStudent} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-id" className="text-right">座號</Label>
                            <Input id="edit-id" name="id" className="col-span-3" defaultValue={studentToEdit?.id} required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">姓名</Label>
                            <Input id="edit-name" name="name" className="col-span-3" defaultValue={studentToEdit?.name} required />
                        </div>
                        <DialogFooter>
                            <Button type="submit">儲存</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>重設密碼</DialogTitle>
                        <DialogDescription>為學生重設密碼。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-password" className="text-right">新密碼</Label>
                            <Input id="new-password" name="new-password" type="password" className="col-span-3" required />
                        </div>
                        <DialogFooter>
                            <Button type="submit">重設密碼</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>批次匯入學生</DialogTitle>
                        <DialogDescription>從 CSV 檔案匯入學生名單。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input type="file" accept=".csv" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleFileParse(e.target.files[0]);
                            }
                        }} />
                        {csvPreview.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold">CSV 預覽</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>班級ID</TableHead>
                                            <TableHead>座號</TableHead>
                                            <TableHead>姓名</TableHead>
                                            <TableHead>密碼</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {csvPreview.map((row, index) => (
                                            <TableRow key={index}>
                                                {row.map((cell, cellIndex) => (
                                                    <TableCell key={cellIndex}>{cell}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleImportStudents} disabled={parsedCsvData.length === 0}>匯入學生</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>新增教師</DialogTitle>
                        <DialogDescription>新增系統中的教師帳號。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTeacher} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teacher-id" className="text-right">ID</Label>
                            <Input id="teacher-id" name="id" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teacher-name" className="text-right">姓名</Label>
                            <Input id="teacher-name" name="name" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teacher-role" className="text-right">角色</Label>
                            <Select name="role" defaultValue="teacher">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選擇角色" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">班級導師</SelectItem>
                                    <SelectItem value="subject_teacher">科任教師</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="teacher-classId" className="text-right">任教班級</Label>
                            <Select name="classId" disabled={availableClassesForNewTeacher.length === 0}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選擇班級" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableClassesForNewTeacher.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit">新增教師</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
             <Dialog open={isEditTeacherDialogOpen} onOpenChange={setIsEditTeacherDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>編輯教師</DialogTitle>
                        <DialogDescription>編輯教師的帳號資訊。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateTeacher} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-teacher-id" className="text-right">ID</Label>
                            <Input id="edit-teacher-id" name="id" className="col-span-3" defaultValue={teacherToEdit?.id} required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-teacher-name" className="text-right">姓名</Label>
                            <Input id="edit-teacher-name" name="name" className="col-span-3" defaultValue={teacherToEdit?.name} required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-teacher-role" className="text-right">角色</Label>
                            <Select name="role" value={editedTeacherRole} onValueChange={setEditedTeacherRole}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選擇角色" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">班級導師</SelectItem>
                                    <SelectItem value="subject_teacher">科任教師</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-teacher-classId" className="text-right">任教班級</Label>
                            <Select name="classId" disabled={availableClassesForEditTeacher.length === 0}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="選擇班級" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableClassesForEditTeacher.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit">儲存變更</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isAllocatePointsDialogOpen} onOpenChange={setIsAllocatePointsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>分配點數給教師</DialogTitle>
                        <DialogDescription>將點數分配給教師，以便他們可以獎勵學生。</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAllocatePoints} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="allocate-amount" className="text-right">點數金額</Label>
                            <Input id="allocate-amount" name="amount" type="number" className="col-span-3" required />
                        </div>
                        <DialogFooter>
                            <Button type="submit">分配點數</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>模擬登入</DialogTitle>
                        <DialogDescription>您確定要模擬登入此教師帳號嗎？</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsImpersonateDialogOpen(false)}>取消</Button>
                        <Button onClick={handleImpersonate}>確定</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             
            <GroupManagementDialog
                isOpen={isGroupManagementDialogOpen}
                onClose={() => setIsGroupManagementDialogOpen(false)}
                classGroups={currentTeacherGroups}
                studentsInClass={studentsInClass}
                onSave={handleSaveGroups}
            />
            
              <Dialog open={!!loanToProcess} onOpenChange={(open) => !open && setLoanToProcess(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>貸款審核</DialogTitle>
                        <DialogDescription>學生 {loanToProcess?.student.name} 請求貸款 {loanToProcess?.loan.amount} 點數。</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setLoanToProcess(null)}>取消</Button>
                        <Button onClick={() => handleProcessLoan('rejected')} variant="destructive">拒絕</Button>
                        <Button onClick={() => handleProcessLoan('active')}>批准</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
              <Dialog open={!!challengeToApprove} onOpenChange={(open) => !open && setChallengeToApprove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>挑戰完成審核</DialogTitle>
                        <DialogDescription>
                            學生 {challengeToApprove?.student.name} 完成挑戰 {platformConfig?.challenges?.find(c => c.id === challengeToApprove?.challenge.challengeId)?.name}。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setChallengeToApprove(null)}>取消</Button>
                        <Button onClick={handleApproveChallenge}>批准</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

    