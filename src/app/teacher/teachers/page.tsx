
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Coins, Eye, UserPlus, Trash2, Briefcase, Edit } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Teacher, ClassInfo } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

export default function TeacherManagementPage() {
    const { toast } = useToast();
    const { teacher: admin, setTeachers, setPlatformConfig: setConfig, setAuthInfo } = useAuth();
    const { teachers, classes, config } = useSchoolStore();
    const router = useRouter();

    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    
    // State for adding teacher
    const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
    const [newTeacherName, setNewTeacherName] = useState('');
    const [newTeacherRole, setNewTeacherRole] = useState('teacher');
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
    
    // State for editing teacher
    const [isEditTeacherOpen, setIsEditTeacherOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editTeacherName, setEditTeacherName] = useState('');
    const [editTeacherRole, setEditTeacherRole] = useState('teacher');
    const [editAssignedClassIds, setEditAssignedClassIds] = useState<string[]>([]);

    const [isSavingTeacher, setIsSavingTeacher] = useState(false);

    const [isDistributePointsOpen, setIsDistributePointsOpen] = useState(false);
    const [distributeTeacher, setDistributeTeacher] = useState<Teacher | null>(null);
    const [distributeAmount, setDistributeAmount] = useState<number | ''>('');

     useEffect(() => {
        if (admin && admin.role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
        }
    }, [admin, router, toast]);
    
    const unassignedClassesForAdd = useMemo(() => {
        return classes.filter(c => !teachers.some(t => t.role === 'teacher' && (t.classIds || []).includes(c.id)));
    }, [classes, teachers]);
    
    const unassignedClassesForEdit = useMemo(() => {
        if (!editingTeacher) return [];
        return classes.filter(c => {
            const currentTeacherIsTutor = editingTeacher.role === 'teacher' && (editingTeacher.classIds || []).includes(c.id);
            const anotherTeacherIsTutor = teachers.some(t => t.id !== editingTeacher.id && t.role === 'teacher' && Array.isArray(t.classIds) && t.classIds.includes(c.id));
            return currentTeacherIsTutor || !anotherTeacherIsTutor;
        });
    }, [classes, teachers, editingTeacher]);


    const handleAddTeacher = async () => {
        if (!newTeacherName) {
            toast({ title: "請輸入教師姓名", variant: "destructive" });
            return;
        }
        if (newTeacherRole === 'teacher' && assignedClassIds.length !== 1) {
            toast({ title: "班級導師只能指派一個班級", variant: "destructive" });
            return;
        }
        setIsSavingTeacher(true);
        try {
            const newTeacherId = `teacher-${Date.now()}`;
            const newTeacher: Teacher = {
                id: newTeacherId,
                name: newTeacherName,
                role: newTeacherRole,
                classIds: assignedClassIds,
                password: config?.teacherPassword || TEACHER_PASSWORD,
                pointBalance: 0,
            };
            
            await setTeachers(current => [...current, newTeacher]);

            toast({ title: "教師已新增", description: `已成功新增 ${newTeacherName} 老師。` });
            setIsAddTeacherOpen(false);
            setNewTeacherName('');
            setNewTeacherRole('teacher');
            setAssignedClassIds([]);
        } catch (e) {
            toast({ title: "新增失敗", description: "建立教師時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingTeacher(false);
        }
    };
    
    const handleEditClick = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setEditTeacherName(teacher.name);
        setEditTeacherRole(teacher.role);
        setEditAssignedClassIds(teacher.classIds || []);
        setIsEditTeacherOpen(true);
    };

    const handleUpdateTeacher = async () => {
        if (!editingTeacher || !editTeacherName) {
            toast({ title: "請輸入教師姓名", variant: "destructive" });
            return;
        }
        
        const finalClassIds = editTeacherRole === 'teacher' 
            ? (editAssignedClassIds[0] === 'unassigned' ? [] : editAssignedClassIds.filter(id => id !== 'unassigned'))
            : editAssignedClassIds;

        if (editTeacherRole === 'teacher' && finalClassIds.length > 1) {
            toast({ title: "班級導師只能指派一個班級", variant: "destructive" });
            return;
        }

        setIsSavingTeacher(true);
        try {
            const updatedTeacher: Teacher = {
                ...editingTeacher,
                name: editTeacherName,
                role: editTeacherRole,
                classIds: finalClassIds,
            };

            await setTeachers(current => current.map(t => t.id === editingTeacher.id ? updatedTeacher : t));

            toast({ title: "教師資料已更新" });
            setIsEditTeacherOpen(false);
            setEditingTeacher(null);

        } catch(e) {
            toast({ title: "更新失敗", variant: "destructive" });
        } finally {
            setIsSavingTeacher(false);
        }
    };
    
    const handleImpersonate = (targetTeacher: Teacher) => {
        if (!admin || !targetTeacher._docId) return;
        
        localStorage.setItem('impersonator', admin.id);
        setAuthInfo({ role: 'teacher', docId: targetTeacher._docId });
        
        toast({ title: "身分模擬中...", description: `您現在以 ${targetTeacher.name} 的身分登入。` });
        window.location.href = '/teacher/dashboard';
    };
    
    const handleDistributePoints = async () => {
        if (!distributeTeacher || distributeAmount === '' || Number(distributeAmount) <= 0) {
            toast({ title: "請輸入有效的點數", variant: "destructive" });
            return;
        }
        const schoolFunds = config?.schoolFunds || 0;
        if (schoolFunds < Number(distributeAmount)) {
            toast({ title: "學校資金不足", description: `學校總資金僅剩 ${schoolFunds.toLocaleString()} 點。`, variant: "destructive" });
            return;
        }

        try {
            await setConfig({ schoolFunds: schoolFunds - Number(distributeAmount) });
            await setTeachers(current => current.map(t => 
                t.id === distributeTeacher.id ? { ...t, pointBalance: (t.pointBalance || 0) + Number(distributeAmount) } : t
            ));
            toast({ title: "點數已分配", description: `已成功分配 ${Number(distributeAmount).toLocaleString()} 點給 ${distributeTeacher.name} 老師。` });
            setIsDistributePointsOpen(false);
            setDistributeAmount('');
            setDistributeTeacher(null);
        } catch (e) {
            toast({ title: "分配失敗", variant: "destructive" });
        }
    };

    const handleDeleteTeacher = async () => {
        if (!teacherToDelete) return;
        await setTeachers(current => current.filter(t => t.id !== teacherToDelete.id));
        toast({ title: "教師已刪除", variant: "destructive" });
        setTeacherToDelete(null);
    };

    if (!admin) return null;

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2"><Briefcase />教師管理</CardTitle>
                        <CardDescription>管理系統中的教師帳號、分配點數或模擬登入。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsAddTeacherOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> 新增老師</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID / 姓名</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>任教班級</TableHead>
                                <TableHead>點數餘額</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.map(t => {
                                const assignedClasses = (t.classIds || []).map(cid => classes.find(c => c.id === cid)?.name).filter(Boolean);
                                return (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="font-medium">{t.name}</div>
                                        <div className="text-xs text-muted-foreground">{t.id}</div>
                                    </TableCell>
                                    <TableCell>{t.role}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{assignedClasses.join(', ')}</TableCell>
                                    <TableCell>{t.pointBalance?.toLocaleString() || 0}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(t)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleImpersonate(t)}><Eye className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => {setDistributeTeacher(t); setIsDistributePointsOpen(true);}}><Coins className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => setTeacherToDelete(t)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Teacher Dialog */}
            <Dialog open={isAddTeacherOpen} onOpenChange={setIsAddTeacherOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>新增教師</DialogTitle>
                        <DialogDescription>建立一個新的教師帳號。預設密碼將會是您在平台設定中定義的密碼。</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-teacher-name">姓名</Label>
                            <Input id="new-teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-teacher-role">角色</Label>
                            <Select value={newTeacherRole} onValueChange={setNewTeacherRole}>
                                <SelectTrigger id="new-teacher-role"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">班級導師</SelectItem>
                                    <SelectItem value="subject_teacher">科任教師</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {newTeacherRole === 'teacher' && (
                             <div className="space-y-2">
                                <Label htmlFor="assign-class-add">指派班級 (導師只能選一個)</Label>
                                <Select value={assignedClassIds[0] || ''} onValueChange={value => setAssignedClassIds(value ? [value] : [])}>
                                    <SelectTrigger id="assign-class-add"><SelectValue placeholder="選擇一個未被指派的班級"/></SelectTrigger>
                                    <SelectContent>
                                        {unassignedClassesForAdd.length === 0 ? (
                                            <SelectItem value="no-class" disabled>沒有可指派的班級</SelectItem>
                                        ) : (
                                            unassignedClassesForAdd.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        {newTeacherRole === 'subject_teacher' && (
                            <div className="space-y-2">
                                <Label>指派班級 (科任可複選)</Label>
                                <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {classes.map(c => (
                                        <div key={c.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`add-class-${c.id}`}
                                                checked={assignedClassIds.includes(c.id)}
                                                onCheckedChange={(checked) => {
                                                    setAssignedClassIds(prev => 
                                                        checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                                    );
                                                }}
                                            />
                                            <label htmlFor={`add-class-${c.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {c.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddTeacher} disabled={isSavingTeacher}>儲存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Edit Teacher Dialog */}
            {editingTeacher && (
                <Dialog open={isEditTeacherOpen} onOpenChange={setIsEditTeacherOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>編輯教師資料</DialogTitle>
                            <DialogDescription>修改 {editingTeacher.name} 的相關資訊。</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-teacher-name">姓名</Label>
                                <Input id="edit-teacher-name" value={editTeacherName} onChange={e => setEditTeacherName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-teacher-role">角色</Label>
                                <Select value={editTeacherRole} onValueChange={setEditTeacherRole}>
                                    <SelectTrigger id="edit-teacher-role"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="teacher">班級導師</SelectItem>
                                        <SelectItem value="subject_teacher">科任教師</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {editTeacherRole === 'teacher' && (
                                <div className="space-y-2">
                                    <Label htmlFor="assign-class-edit">指派班級 (導師只能選一個)</Label>
                                    <Select value={editAssignedClassIds[0] || 'unassigned'} onValueChange={value => setEditAssignedClassIds(value ? [value] : [])}>
                                        <SelectTrigger id="assign-class-edit"><SelectValue placeholder="選擇一個班級"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">解除指派</SelectItem>
                                            {unassignedClassesForEdit.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            
                            {editTeacherRole === 'subject_teacher' && (
                                <div className="space-y-2">
                                    <Label>指派班級 (科任可複選)</Label>
                                    <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {classes.map(c => (
                                            <div key={c.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`edit-class-${c.id}`}
                                                    checked={editAssignedClassIds.includes(c.id)}
                                                    onCheckedChange={(checked) => {
                                                        setEditAssignedClassIds(prev => 
                                                            checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                                        );
                                                    }}
                                                />
                                                <label htmlFor={`edit-class-${c.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {c.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                            <Button onClick={handleUpdateTeacher} disabled={isSavingTeacher}>儲存變更</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            
            {/* Distribute Points Dialog */}
            <Dialog open={isDistributePointsOpen} onOpenChange={setIsDistributePointsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>分配點數給 {distributeTeacher?.name}</DialogTitle>
                        <CardDescription>
                            從學校總資金 (目前: {(config?.schoolFunds || 0).toLocaleString()}點) 中撥款給老師。
                        </CardDescription>
                    </DialogHeader>
                     <div className="space-y-2 py-4">
                        <Label htmlFor="distribute-amount">分配點數</Label>
                        <Input id="distribute-amount" type="number" value={distributeAmount} onChange={e => setDistributeAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleDistributePoints}>確認分配</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Delete Teacher Dialog */}
            <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                        <AlertDialogDescription>您確定要刪除老師 {teacherToDelete?.name} 嗎? 此動作無法復原。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTeacher} className={buttonVariants({variant: 'destructive'})}>確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

    