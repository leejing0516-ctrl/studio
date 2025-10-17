
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Users, Trash2, Edit, UserPlus, PlusCircle, KeySquare, Upload, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, PointRecord, Teacher, ClassInfo, ClassGroup } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { subDays, isAfter } from 'date-fns';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { doc, writeBatch, deleteDoc, setDoc, collection, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const StudentManagementTab = () => {
    const { toast } = useToast();
    const { teacher } = useAuth();
    const { students, classes } = useSchoolStore();
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [newStudentData, setNewStudentData] = useState({ id: '', name: '', password: '' });
    const [editStudentName, setEditStudentName] = useState('');
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return classes;
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a,b) => a.id.localeCompare(b.id));
    }, [students, selectedClassId]);

    const handleAddStudent = async () => {
        if (!newStudentData.id || !newStudentData.name || !newStudentData.password) {
            toast({ title: "請填寫所有欄位", variant: "destructive" });
            return;
        }
        if (students.some(s => s.id === newStudentData.id && s.classId === selectedClassId)) {
            toast({ title: "學生已存在", description: "此班級已有相同座號的學生。", variant: "destructive" });
            return;
        }
        
        const newStudentDoc = doc(collection(db, "students"));
        await setDoc(newStudentDoc, {
            ...newStudentData, classId: selectedClassId, points: 0, portfolio: [], pointHistory: [], redeemedRewards: []
        });

        toast({ title: "學生已新增" });
        setIsAddStudentOpen(false);
        setNewStudentData({ id: '', name: '', password: '' });
    };

    const handleEditStudent = async () => {
        if (!studentToEdit?._docId || !editStudentName) return;
        const studentRef = doc(db, 'students', studentToEdit._docId);
        await setDoc(studentRef, { name: editStudentName }, { merge: true });
        toast({ title: "學生資料已更新" });
        setIsEditStudentOpen(false);
        setStudentToEdit(null);
    };

    const handleResetPassword = async () => {
        if (!studentToResetPassword?._docId || !newPassword) return;
        const studentRef = doc(db, 'students', studentToResetPassword._docId);
        await setDoc(studentRef, { password: newPassword }, { merge: true });
        toast({ title: "密碼已重設" });
        setIsResetPasswordOpen(false);
        setStudentToResetPassword(null);
        setNewPassword('');
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete?._docId) return;
        await deleteDoc(doc(db, 'students', studentToDelete._docId));
        toast({ title: "學生已刪除", variant: "destructive" });
        setStudentToDelete(null);
    };
    
    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>學生名單</CardTitle>
                    <CardDescription>管理班級中的學生、重設密碼或進行批次匯入。</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" disabled><Upload className="mr-2 h-4 w-4"/>批次匯入</Button>
                    <Button onClick={() => setIsAddStudentOpen(true)}><UserPlus className="mr-2 h-4 w-4"/>新增學生</Button>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="mb-4 max-w-xs">
                    <Label htmlFor="class-select-student">選擇班級</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                        <SelectTrigger id="class-select-student">
                            <SelectValue placeholder="請選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableClasses.map(classInfo => (
                                <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="border rounded-md">
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
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>{student.id}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{Math.round(student.points).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setStudentToEdit(student); setEditStudentName(student.name); setIsEditStudentOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => { setStudentToResetPassword(student); setIsResetPasswordOpen(true); }}><KeySquare className="h-4 w-4"/></Button>
                                        <AlertDialog open={!!studentToDelete && studentToDelete.id === student.id} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                                                    <AlertDialogDescription>您確定要刪除學生 {student.name} 嗎? 此動作無法復原。</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteStudent}>確定刪除</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">此班級尚無學生資料。</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>

             {/* Add Student Dialog */}
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增學生至 {classes.find(c=>c.id === selectedClassId)?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="student-id">座號</Label>
                            <Input id="student-id" value={newStudentData.id} onChange={e => setNewStudentData({...newStudentData, id: e.target.value})} placeholder="例如: S001"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="student-name">姓名</Label>
                            <Input id="student-name" value={newStudentData.name} onChange={e => setNewStudentData({...newStudentData, name: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="student-password">初始密碼</Label>
                            <Input id="student-password" value={newStudentData.password} onChange={e => setNewStudentData({...newStudentData, password: e.target.value})}/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddStudent}>確認新增</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Student Dialog */}
            <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>編輯學生資料</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label>座號</Label>
                            <Input value={studentToEdit?.id} disabled/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-student-name">姓名</Label>
                            <Input id="edit-student-name" value={editStudentName} onChange={e => setEditStudentName(e.target.value)}/>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleEditStudent}>儲存變更</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>重設 {studentToResetPassword?.name} 的密碼</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="new-password">新密碼</Label>
                        <Input id="new-password" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleResetPassword}>確認重設</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}


const PointsTab = () => {
    const { toast } = useToast();
    const { teacher } = useAuth();
    const { students, classes } = useSchoolStore();
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [points, setPoints] = useState<{ [key: string]: number | '' }>({});
    const [reason, setReason] = useState<{ [key: string]: string }>({});
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    
    const [batchPoints, setBatchPoints] = useState<number | ''>('');
    const [batchReason, setBatchReason] = useState('');
    const [batchTarget, setBatchTarget] = useState('selected');

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') {
            return classes;
        }
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a,b) => (a.id).localeCompare(b.id));
    }, [students, selectedClassId]);

    const handlePointChange = (studentId: string, value: string) => {
        setPoints(prev => ({ ...prev, [studentId]: value === '' ? '' : Number(value) }));
    };

    const handleReasonChange = (studentId: string, value: string) => {
        setReason(prev => ({ ...prev, [studentId]: value }));
    };

    const handleIndividualSubmit = async (student: Student) => {
        if (!student._docId) return;
        const pointsToUpdate = points[student.id];
        const reasonForUpdate = reason[student.id] || "老師手動調整";

        if (pointsToUpdate === undefined || pointsToUpdate === '') return;

        const studentRef = doc(db, 'students', student._docId);
        const newPoints = (Number(student.points) || 0) + Number(pointsToUpdate);
        const newRecord: PointRecord = {
            points: Number(pointsToUpdate),
            date: new Date().toISOString(),
            reason: reasonForUpdate,
            teacherId: teacher?.id
        };

        try {
            await setDoc(studentRef, {
                points: newPoints,
                pointHistory: [...(student.pointHistory || []), newRecord]
            }, { merge: true });

            toast({ title: "點數已更新", description: `已為 ${student.name} 更新 ${pointsToUpdate} 點。` });
            setPoints(prev => ({ ...prev, [student.id]: '' }));
            setReason(prev => ({ ...prev, [student.id]: '' }));
        } catch (error: any) {
            toast({ title: "更新失敗", description: error.message, variant: "destructive" });
        }
    };
    
    const handleBatchSubmit = async () => {
        if (batchPoints === '' || Number(batchPoints) === 0) {
            toast({ title: "請輸入有效的點數", variant: "destructive" });
            return;
        }

        let targets: Student[] = [];
        if (batchTarget === 'selected') {
            targets = filteredStudents.filter(s => selectedStudents.includes(s.id));
        } else if (batchTarget === 'all') {
            targets = filteredStudents;
        } else {
             const classInfo = classes.find(c => c.id === selectedClassId);
             if (classInfo && classInfo.groups && classInfo.groups[teacher?.id || '']) {
                 const group = classInfo.groups[teacher?.id || ''].find(g => g.id === batchTarget);
                 if (group) {
                     targets = filteredStudents.filter(s => s.groupId === group.id);
                 }
             }
        }
        
        if (targets.length === 0) {
            toast({ title: "沒有目標學生", description: "請選擇至少一位學生或一個群組。", variant: "destructive" });
            return;
        }

        const batch = writeBatch(db);
        const reasonForUpdate = batchReason || "批次操作";
        const newRecord: PointRecord = {
            points: Number(batchPoints),
            date: new Date().toISOString(),
            reason: reasonForUpdate,
            teacherId: teacher?.id
        };

        targets.forEach(student => {
            if (student._docId) {
                const studentRef = doc(db, 'students', student._docId);
                const newPoints = (Number(student.points) || 0) + Number(batchPoints);
                batch.update(studentRef, {
                    points: newPoints,
                    pointHistory: [...(student.pointHistory || []), newRecord]
                });
            }
        });

        try {
            await batch.commit();
            toast({ title: "批次操作成功", description: `已為 ${targets.length} 位學生更新 ${batchPoints} 點。` });
            setBatchPoints('');
            setBatchReason('');
            setSelectedStudents([]);

        } catch (error: any) {
            toast({ title: "批次更新失敗", description: error.message, variant: "destructive" });
        }
    };
    
    const teacherGroups = useMemo(() => {
        const classInfo = classes.find(c => c.id === selectedClassId);
        if (!classInfo || !teacher?.id) return [];
        return classInfo.groups?.[teacher.id] || [];
    }, [classes, selectedClassId, teacher]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>發送點數</CardTitle>
                <CardDescription>獎勵或扣除學生的點數。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <Label htmlFor="class-select">選擇班級</Label>
                        <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                            <SelectTrigger id="class-select">
                                <SelectValue placeholder="請選擇班級" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClasses.map(classInfo => (
                                    <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
        
                <Card className="bg-muted/50">
                    <CardHeader>
                            <CardTitle className="text-lg">批次發送/扣除點數</CardTitle>
                            <CardDescription>對全班、特定分組或選取的學生進行操作。輸入正數為發送，負數為扣除。</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1 space-y-2">
                            <Label htmlFor="batch-target">操作目標</Label>
                            <Select value={batchTarget} onValueChange={setBatchTarget}>
                                <SelectTrigger id="batch-target">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="selected">已選取的學生 ({selectedStudents.length})</SelectItem>
                                    <SelectItem value="all">全班</SelectItem>
                                    {teacherGroups.filter(g => g.id).map(g => <SelectItem key={g.id} value={g.id}>分組: {g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-1 space-y-2">
                            <Label htmlFor="batch-points">點數</Label>
                            <Input id="batch-points" type="number" placeholder="例如: 50, -5" value={batchPoints} onChange={e => setBatchPoints(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                        <div className="md:col-span-1 space-y-2">
                            <Label htmlFor="batch-reason">理由 (選填)</Label>
                            <Input id="batch-reason" placeholder="例如: 小組競賽獲勝" value={batchReason} onChange={e => setBatchReason(e.target.value)} />
                        </div>
                        <div className="md:col-span-1">
                            <Button className="w-full" onClick={handleBatchSubmit}>執行批次操作</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                        <Checkbox
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedStudents(filteredStudents.map(s => s.id));
                                            } else {
                                                setSelectedStudents([]);
                                            }
                                        }}
                                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                    />
                                </TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>分組</TableHead>
                                <TableHead className="text-right">目前點數</TableHead>
                                <TableHead className="w-[200px]">個別操作：點數</TableHead>
                                <TableHead className="w-[200px]">理由 (選填)</TableHead>
                                <TableHead className="text-right w-[80px]">執行</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedStudents.includes(student.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedStudents([...selectedStudents, student.id]);
                                                } else {
                                                    setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{teacherGroups.find(g => g.id === student.groupId)?.name || '未分組'}</TableCell>
                                    <TableCell className="text-right font-medium">{Math.round(Number(student.points || 0)).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Input type="number" placeholder="例如: 50, -50" value={points[student.id] || ''} onChange={e => handlePointChange(student.id, e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={reason[student.id] || ''} onChange={e => handleReasonChange(student.id, e.target.value)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => handleIndividualSubmit(student)} disabled={points[student.id] === '' || points[student.id] === undefined}>送出</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">這個班級目前沒有學生。</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

const GroupManagementTab = () => {
    const { teacher } = useAuth();
    const { students, classes } = useSchoolStore();
    const { toast } = useToast();

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
    
    const [dialogGroups, setDialogGroups] = useState<ClassGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [dialogStudentAssignments, setDialogStudentAssignments] = useState<{ [studentId: string]: string | undefined }>({});

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return classes;
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const studentsInClass = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a, b) => a.id.localeCompare(b.id));
    }, [students, selectedClassId]);
    
    const teacherGroups = useMemo(() => {
        const classInfo = classes.find(c => c.id === selectedClassId);
        if (!classInfo || !teacher?.id) return [];
        return classInfo.groups?.[teacher.id] || [];
    }, [classes, selectedClassId, teacher?.id]);


    const unassignedStudents = useMemo(() => {
        return studentsInClass.filter(student => !student.groupId || !teacherGroups.some(g => g.id === student.groupId));
    }, [studentsInClass, teacherGroups]);
    
    const openManagementDialog = () => {
        if (!selectedClassId) {
            toast({ title: "請先選擇一個班級", variant: "destructive" });
            return;
        }
        setDialogGroups(teacherGroups);
        const initialAssignments: { [studentId: string]: string | undefined } = {};
        studentsInClass.forEach(s => {
            initialAssignments[s.id] = s.groupId;
        });
        setDialogStudentAssignments(initialAssignments);
        setIsManageGroupsOpen(true);
    };

    const addGroupInDialog = () => {
        if (!newGroupName.trim()) {
            toast({title: "請輸入新組名", variant: "destructive"});
            return;
        }
        const newGroup: ClassGroup = { id: `group-${Date.now()}`, name: newGroupName.trim() };
        setDialogGroups([...dialogGroups, newGroup]);
        setNewGroupName("");
    };

    const updateGroupNameInDialog = (groupId: string, newName: string) => {
        setDialogGroups(dialogGroups.map(g => g.id === groupId ? {...g, name: newName} : g));
    };

    const deleteGroupInDialog = (groupId: string) => {
        setDialogGroups(dialogGroups.filter(g => g.id !== groupId));
        const newAssignments = { ...dialogStudentAssignments };
        Object.keys(newAssignments).forEach(studentId => {
            if (newAssignments[studentId] === groupId) {
                newAssignments[studentId] = undefined;
            }
        });
        setDialogStudentAssignments(newAssignments);
    };

    const saveGroupsAndAssignments = async () => {
        if (!teacher?.id || !selectedClassId) return;

        const classDoc = classes.find(c => c.id === selectedClassId);
        if (!classDoc?._docId) return;
        const classRef = doc(db, 'classes', classDoc._docId);

        const batch = writeBatch(db);

        const updatedGroupsData = {
            ...classDoc?.groups,
            [teacher.id]: dialogGroups
        };
        batch.update(classRef, { groups: updatedGroupsData });

        studentsInClass.forEach(student => {
            if (student._docId && dialogStudentAssignments.hasOwnProperty(student.id)) {
                const studentRef = doc(db, 'students', student._docId);
                const newGroupId = dialogStudentAssignments[student.id];
                if (student.groupId !== newGroupId) {
                    batch.update(studentRef, { groupId: newGroupId || null });
                }
            }
        });
        
        try {
            await batch.commit();
            toast({ title: "分組已儲存" });
            setIsManageGroupsOpen(false);
        } catch (error) {
            console.error("Failed to save groups and assignments:", error);
            toast({ title: "儲存失敗", description: "更新資料時發生錯誤。", variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>分組管理</CardTitle>
                    <CardDescription>為目前選擇的班級建立您自己的小組，並將學生指派到各組。</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Button onClick={openManagementDialog}>
                        <Users className="mr-2 h-4 w-4" /> 管理我的分組
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 max-w-xs">
                    <Label htmlFor="class-select-group">選擇班級</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                        <SelectTrigger id="class-select-group">
                            <SelectValue placeholder="請選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableClasses.map(classInfo => (
                                <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {teacherGroups.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>您尚未為此班級建立任何分組。</p>
                        <Button variant="link" onClick={openManagementDialog}>點此開始管理分組</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {unassignedStudents.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>未分組</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {unassignedStudents.map(student => <li key={student.id}>{student.name}</li>)}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                        {teacherGroups.map(group => (
                            <Card key={group.id}>
                                <CardHeader>
                                    <CardTitle>{group.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-1 text-sm">
                                        {studentsInClass.filter(s => s.groupId === group.id).map(student => (
                                            <li key={student.id}>{student.name}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>管理我的分組 - {classes.find(c => c.id === selectedClassId)?.name}</DialogTitle>
                        <DialogDescription>在此建立您個人的小組，並將學生指派到對應的小組中。</DialogDescription>
                    </DialogHeader>
                    <div className="grid md:grid-cols-2 gap-8 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">小組列表</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="輸入新組名" 
                                        value={newGroupName} 
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGroupInDialog(); }}}
                                    />
                                    <Button onClick={addGroupInDialog}>新增</Button>
                                </div>
                                <div className="space-y-2">
                                    {dialogGroups.map((group) => (
                                        <div key={group.id} className="flex items-center gap-2">
                                            <Input 
                                                value={group.name}
                                                onChange={(e) => updateGroupNameInDialog(group.id, e.target.value)}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => deleteGroupInDialog(group.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">學生指派</CardTitle>
                            </CardHeader>
                             <CardContent className="space-y-2">
                                 <div className="flex justify-between font-semibold text-sm text-muted-foreground px-2">
                                     <span>學生姓名</span>
                                     <span>指派分組</span>
                                 </div>
                                {studentsInClass.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background/50">
                                        <Label className="font-medium">{student.name}</Label>
                                        <Select
                                            value={dialogStudentAssignments[student.id] || ''}
                                            onValueChange={(value) => {
                                                setDialogStudentAssignments(prev => ({ ...prev, [student.id]: value === '' ? undefined : value }));
                                            }}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="未分組" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">未分組</SelectItem>
                                                {dialogGroups.map(group => (
                                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                             </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsManageGroupsOpen(false)}>取消</Button>
                        <Button onClick={saveGroupsAndAssignments}>儲存變更</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

const PointsHistoryTab = () => {
    const { teacher } = useAuth();
    const { students, classes, teachers } = useSchoolStore();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [timeframe, setTimeframe] = useState(20);

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return classes;
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (teacher) {
            setSelectedTeacherId(teacher.id);
        }
    }, [teacher]);
    
    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const historyData = useMemo(() => {
        if (!selectedClassId || !selectedTeacherId) return [];

        const cutoffDate = subDays(new Date(), timeframe);
        const classStudents = students.filter(s => s.classId === selectedClassId);

        return classStudents.map(student => {
            const relevantHistory = (student.pointHistory || []).filter(record => 
                isAfter(new Date(record.date), cutoffDate) && record.teacherId === selectedTeacherId
            );

            const totalIssued = relevantHistory
                .filter(r => r.points > 0)
                .reduce((sum, r) => sum + r.points, 0);

            const totalDeducted = relevantHistory
                .filter(r => r.points < 0)
                .reduce((sum, r) => sum + r.points, 0);

            const netChange = totalIssued + totalDeducted;

            return {
                studentId: student.id,
                studentName: student.name,
                totalIssued,
                totalDeducted,
                netChange
            };
        }).sort((a,b) => a.studentId.localeCompare(b.studentId));

    }, [students, selectedClassId, selectedTeacherId, timeframe]);
    
    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
    const selectedClass = classes.find(c => c.id === selectedClassId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>點數歷史查詢</CardTitle>
                <CardDescription>查詢指定老師在特定班級的點數發放與扣除總計 (最近 {timeframe} 天)。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {teacher?.role === 'admin' && (
                        <div>
                            <Label htmlFor="teacher-select">選擇老師</Label>
                            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                <SelectTrigger id="teacher-select">
                                    <SelectValue placeholder="請選擇老師" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div>
                        <Label htmlFor="class-select-history">選擇班級</Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger id="class-select-history">
                                <SelectValue placeholder="請選擇班級" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="border rounded-md">
                    <div className="p-4 bg-muted/50">
                        <h3 className="font-semibold">班級發放總表</h3>
                        <p className="text-sm text-muted-foreground">
                            {selectedTeacher?.name} 老師在 {selectedClass?.name} 班級, 最近 {timeframe} 天的點數紀錄。
                        </p>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>學生</TableHead>
                                <TableHead>發放總計</TableHead>
                                <TableHead>扣除總計</TableHead>
                                <TableHead>淨變動</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyData.length > 0 ? historyData.map(data => (
                                <TableRow key={data.studentId}>
                                    <TableCell>{data.studentName}</TableCell>
                                    <TableCell className="text-green-600 font-medium">+{data.totalIssued.toLocaleString()}</TableCell>
                                    <TableCell className={cn(data.totalDeducted < 0 ? "text-red-600" : "text-muted-foreground", "font-medium")}>{data.totalDeducted.toLocaleString()}</TableCell>
                                    <TableCell className={cn(data.netChange > 0 ? "text-green-600" : data.netChange < 0 ? "text-red-600" : "text-muted-foreground", "font-bold")}>
                                        {data.netChange > 0 ? '+' : ''}{data.netChange.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">此條件下沒有點數歷史紀錄。</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

const ApprovalsTab = () => {
    const { students, classes, config } = useSchoolStore();
    const { teacher } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const relevantStudents = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return students;
        return students.filter(s => (teacher.classIds || []).includes(s.classId));
    }, [students, teacher]);

    const pendingChallengeApprovals = useMemo(() => {
        return relevantStudents.flatMap(student =>
            (student.challenges || [])
                .filter(c => c.status === 'pending_approval')
                .map(sc => ({ student, studentChallenge: sc, challenge: config?.challenges.find(ch => ch.id === sc.challengeId) }))
                .filter(item => !!item.challenge)
        );
    }, [relevantStudents, config?.challenges]);

    const handleApproveChallenge = async (student: Student, challengeId: string) => {
        if (!student._docId || !teacher?.id) return;

        const challenge = config?.challenges.find(ch => ch.id === challengeId);
        if (!challenge) return;

        try {
            await runTransaction(db, async (transaction) => {
                const studentRef = doc(db, "students", student._docId!);
                const studentDoc = await transaction.get(studentRef);
                if (!studentDoc.exists()) throw new Error("Student not found");

                const currentStudentData = studentDoc.data() as Student;
                const newPoints = (currentStudentData.points || 0) + challenge.points;
                const newHistory: PointRecord = {
                    points: challenge.points,
                    date: new Date().toISOString(),
                    reason: `完成挑戰: ${challenge.name}`,
                    teacherId: teacher.id,
                };
                const updatedChallenges = (currentStudentData.challenges || []).map(c =>
                    c.challengeId === challengeId ? { ...c, status: 'completed' as const, completedDate: new Date().toISOString() } : c
                );

                transaction.update(studentRef, {
                    points: newPoints,
                    pointHistory: [...(currentStudentData.pointHistory || []), newHistory],
                    challenges: updatedChallenges
                });
            });

            toast({ title: "挑戰已批准", description: `已為 ${student.name} 發放 ${challenge.points} 點。` });
        } catch (error: any) {
            toast({ title: "批准失敗", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>審核中心</CardTitle>
                <CardDescription>在此統一審核所有來自學生的申請，例如挑戰完成、習慣養成、貸款等。</CardDescription>
            </CardHeader>
            <CardContent>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">挑戰任務完成審核</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>學生</TableHead>
                                    <TableHead>挑戰名稱</TableHead>
                                    <TableHead className="text-right">獎勵點數</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingChallengeApprovals.length > 0 ? pendingChallengeApprovals.map(({ student, studentChallenge, challenge }) => (
                                    <TableRow key={`${student.id}-${studentChallenge.challengeId}`}>
                                        <TableCell>{student.name} ({classes.find(c => c.id === student.classId)?.name})</TableCell>
                                        <TableCell>{challenge?.name}</TableCell>
                                        <TableCell className="text-right">{challenge?.points.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleApproveChallenge(student, studentChallenge.challengeId)}>批准</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">沒有待審核的挑戰。</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};


export default function TeacherDashboardPage() {
    const { teacher } = useAuth();
    if (!teacher) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>你好，{teacher.name}</CardTitle>
                            <CardDescription>在此管理班級、學生分組、發放點數與查看歷史紀錄。</CardDescription>
                        </div>
                        {teacher.role !== 'admin' && (
                             <div className="text-right">
                                <p className="text-sm text-muted-foreground">我的點數餘額</p>
                                <p className="text-2xl font-bold">{teacher.pointBalance?.toLocaleString() || 0}</p>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                   <Tabs defaultValue="students" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="students">學生管理</TabsTrigger>
                        <TabsTrigger value="groups">分組管理</TabsTrigger>
                        <TabsTrigger value="points">發送點數</TabsTrigger>
                        <TabsTrigger value="history">點數歷史</TabsTrigger>
                        <TabsTrigger value="approvals">審核中心</TabsTrigger>
                      </TabsList>
                      <TabsContent value="students" className="mt-4">
                        <StudentManagementTab />
                      </TabsContent>
                      <TabsContent value="groups" className="mt-4">
                         <GroupManagementTab />
                      </TabsContent>
                       <TabsContent value="points" className="mt-4">
                        <PointsTab />
                      </TabsContent>
                       <TabsContent value="history" className="mt-4">
                        <PointsHistoryTab />
                      </TabsContent>
                       <TabsContent value="approvals" className="mt-4">
                         <ApprovalsTab />
                      </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
