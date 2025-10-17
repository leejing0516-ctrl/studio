
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
import { Coins, Users, Trash2, Edit, UserPlus, PlusCircle, KeySquare, Upload } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { subDays, isAfter } from 'date-fns';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const StudentManagementTab = () => {
    const { toast } = useToast();
    const { teacher, setStudents } = useAuth();
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
        if (availableClasses.length > 0 && !selectedClassId) {
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
        
        await setStudents(prev => [
            ...prev,
            { ...newStudentData, classId: selectedClassId, points: 0, portfolio: [], pointHistory: [], redeemedRewards: [] }
        ]);

        toast({ title: "學生已新增" });
        setIsAddStudentOpen(false);
        setNewStudentData({ id: '', name: '', password: '' });
    };

    const handleEditStudent = async () => {
        if (!studentToEdit || !editStudentName) return;
        await setStudents(prev => prev.map(s => s._docId === studentToEdit._docId ? { ...s, name: editStudentName } : s));
        toast({ title: "學生資料已更新" });
        setIsEditStudentOpen(false);
        setStudentToEdit(null);
    };

    const handleResetPassword = async () => {
        if (!studentToResetPassword || !newPassword) return;
        await setStudents(prev => prev.map(s => s._docId === studentToResetPassword._docId ? { ...s, password: newPassword } : s));
        toast({ title: "密碼已重設" });
        setIsResetPasswordOpen(false);
        setStudentToResetPassword(null);
        setNewPassword('');
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        await setStudents(prev => prev.filter(s => s._docId !== studentToDelete._docId));
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
                                        <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
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
            
            {/* Delete Student Alert */}
            <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                        <AlertDialogDescription>您確定要刪除學生 {studentToDelete?.name} 嗎? 此動作無法復原。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStudentToDelete(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudent}>確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}


const PointsTab = () => {
    const { toast } = useToast();
    const { teacher } = useAuth();
    const { students, classes, setStudents: updateAllStudents } = useSchoolStore();
    
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
        if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
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
        const pointsToUpdate = points[student.id];
        const reasonForUpdate = reason[student.id] || "老師手動調整";

        if (pointsToUpdate === undefined || pointsToUpdate === '') return;

        try {
            await updateAllStudents(currentStudents => 
                currentStudents.map(s => {
                    if (s._docId === student._docId) {
                        const newPoints = (Number(s.points) || 0) + Number(pointsToUpdate);
                        const newRecord: PointRecord = {
                            points: Number(pointsToUpdate),
                            date: new Date().toISOString(),
                            reason: reasonForUpdate,
                            teacherId: teacher?.id
                        };
                        return { 
                            ...s, 
                            points: newPoints,
                            pointHistory: [...(s.pointHistory || []), newRecord]
                        };
                    }
                    return s;
                })
            );

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

        let targetStudentIds: string[] = [];
        if (batchTarget === 'selected') {
            targetStudentIds = selectedStudents;
        } else if (batchTarget === 'all') {
            targetStudentIds = filteredStudents.map(s => s.id);
        } else {
             const classInfo = classes.find(c => c.id === selectedClassId);
             if (classInfo && classInfo.groups && classInfo.groups[teacher?.id || '']) {
                 const group = classInfo.groups[teacher?.id || ''].find(g => g.id === batchTarget);
                 if (group) {
                     targetStudentIds = filteredStudents.filter(s => s.groupId === group.id).map(s => s.id);
                 }
             }
        }
        
        if (targetStudentIds.length === 0) {
            toast({ title: "沒有目標學生", description: "請選擇至少一位學生或一個群組。", variant: "destructive" });
            return;
        }

        try {
            await updateAllStudents(currentStudents => 
                currentStudents.map(s => {
                    if (targetStudentIds.includes(s.id) && s.classId === selectedClassId) {
                        const newPoints = (Number(s.points) || 0) + Number(batchPoints);
                        const newRecord: PointRecord = {
                            points: Number(batchPoints),
                            date: new Date().toISOString(),
                            reason: batchReason || "批次操作",
                            teacherId: teacher?.id
                        };
                        return { 
                            ...s, 
                            points: newPoints,
                            pointHistory: [...(s.pointHistory || []), newRecord]
                        };
                    }
                    return s;
                })
            );
            
            toast({ title: "批次操作成功", description: `已為 ${targetStudentIds.length} 位學生更新 ${batchPoints} 點。` });
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
                                    {teacherGroups.map(g => <SelectItem key={g.id} value={g.id}>分組: {g.name}</SelectItem>)}
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
    const { teacher, setStudents, setClasses } = useAuth();
    const { students, classes } = useSchoolStore();
    const { toast } = useToast();

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
    const [groups, setGroups] = useState<ClassGroup[]>([]);
    const [editingGroupName, setEditingGroupName] = useState<{ id: string, name: string } | null>(null);

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return classes;
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a, b) => a.id.localeCompare(b.id));
    }, [students, selectedClassId]);

    useEffect(() => {
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    useEffect(() => {
        if (selectedClassId && teacher?.id) {
            const currentClass = classes.find(c => c.id === selectedClassId);
            setGroups(currentClass?.groups?.[teacher.id] || []);
        }
    }, [selectedClassId, classes, teacher?.id]);

    const handleManageGroups = () => {
        if (!selectedClassId) {
            toast({ title: "請先選擇一個班級", variant: "destructive" });
            return;
        }
        setIsManageGroupsOpen(true);
    };

    const addGroup = () => {
        const newGroup: ClassGroup = { id: `group-${Date.now()}`, name: `新的分組 ${groups.length + 1}` };
        setGroups([...groups, newGroup]);
    };

    const deleteGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
    };

    const saveGroups = async () => {
        if (!teacher?.id || !selectedClassId) return;

        await setClasses(prevClasses => prevClasses.map(c => {
            if (c.id === selectedClassId) {
                return {
                    ...c,
                    groups: {
                        ...(c.groups || {}),
                        [teacher.id!]: groups
                    }
                };
            }
            return c;
        }));

        await setStudents(prevStudents => prevStudents.map(s => {
            if (s.classId === selectedClassId && s.groupId && !groups.some(g => g.id === s.groupId)) {
                return { ...s, groupId: undefined };
            }
            return s;
        }));

        toast({ title: "分組已儲存" });
        setIsManageGroupsOpen(false);
    };
    
    const assignStudentToGroup = async (studentId: string, groupId: string) => {
        await setStudents(prevStudents => prevStudents.map(s => 
            s.id === studentId && s.classId === selectedClassId ? { ...s, groupId: groupId === "" ? undefined : groupId } : s
        ));
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>分組管理</CardTitle>
                    <CardDescription>為目前選擇的班級建立您自己的小組，並將學生指派到各組。</CardDescription>
                </div>
                <Button onClick={handleManageGroups}>
                    <Users className="mr-2 h-4 w-4" /> 管理我的分組
                </Button>
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
                
                {groups.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>您尚未為此班級建立任何分組。</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>座號</TableHead>
                                    <TableHead>姓名</TableHead>
                                    <TableHead className="w-1/3">指派分組</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.id}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>
                                            <Select 
                                                value={student.groupId || ""} 
                                                onValueChange={(value) => assignStudentToGroup(student.id, value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="未分組" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">未分組</SelectItem>
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
                    </div>
                )}
            </CardContent>

            <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>管理分組 for {classes.find(c => c.id === selectedClassId)?.name}</DialogTitle>
                        <DialogDescription>新增、編輯或刪除您在此班級的小組。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {groups.map(group => (
                            <div key={group.id} className="flex items-center gap-2">
                                <Input 
                                    value={editingGroupName?.id === group.id ? editingGroupName.name : group.name}
                                    onFocus={() => setEditingGroupName({ id: group.id, name: group.name })}
                                    onChange={(e) => setEditingGroupName({ id: group.id, name: e.target.value })}
                                    onBlur={() => {
                                        if (editingGroupName?.id === group.id) {
                                            setGroups(groups.map(g => g.id === group.id ? { ...g, name: editingGroupName.name } : g));
                                            setEditingGroupName(null);
                                        }
                                    }}
                                />
                                <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addGroup}>
                            <PlusCircle className="mr-2 h-4 w-4" /> 新增組別
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={saveGroups}>儲存分組</Button>
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
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses]);

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

export default function TeacherDashboardPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>班級與點數管理</CardTitle>
                    <CardDescription>在此管理班級、學生分組、發放點數與查看歷史紀錄。</CardDescription>
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
                        <Card>
                            <CardHeader>
                                <CardTitle>審核中心</CardTitle>
                                <CardDescription>即將推出：在此統一審核所有來自學生的申請。</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <p className="text-muted-foreground text-center py-12">此功能正在開發中。</p>
                             </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

    