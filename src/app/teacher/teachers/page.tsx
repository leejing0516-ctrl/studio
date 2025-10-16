
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
import { Coins, Eye, UserPlus, Trash2, Briefcase } from "lucide-react";
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

export default function TeacherManagementPage() {
    const { toast } = useToast();
    const { teacher: admin, setTeachers, setPlatformConfig: setConfig, setAuthInfo } = useAuth();
    const { teachers, classes, config } = useSchoolStore();

    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
    const [newTeacherName, setNewTeacherName] = useState('');
    const [newTeacherRole, setNewTeacherRole] = useState('teacher');
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
    const [isSavingTeacher, setIsSavingTeacher] = useState(false);

    const [isDistributePointsOpen, setIsDistributePointsOpen] = useState(false);
    const [distributeTeacher, setDistributeTeacher] = useState<Teacher | null>(null);
    const [distributeAmount, setDistributeAmount] = useState<number | ''>('');
    
    const unassignedClasses = useMemo(() => {
        return classes.filter(c => !teachers.some(t => Array.isArray(t.classIds) && t.classIds.includes(c.id) && t.role === 'teacher'));
    }, [classes, teachers]);


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
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleImpersonate(t)}><Eye className="mr-1 h-4 w-4" />模擬</Button>
                                        <Button variant="ghost" size="sm" onClick={() => {setDistributeTeacher(t); setIsDistributePointsOpen(true);}}><Coins className="mr-1 h-4 w-4" />分配</Button>
                                        <Button variant="destructive" size="sm" onClick={() => setTeacherToDelete(t)}><Trash2 className="mr-1 h-4 w-4" />刪除</Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialogs */}
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
                                <Label htmlFor="assign-class">指派班級 (導師只能選一個)</Label>
                                <Select value={assignedClassIds[0] || ''} onValueChange={value => setAssignedClassIds([value])}>
                                    <SelectTrigger id="assign-class"><SelectValue placeholder="選擇一個未被指派的班級"/></SelectTrigger>
                                    <SelectContent>
                                        {unassignedClasses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        {newTeacherRole === 'subject_teacher' && (
                             <div className="space-y-2">
                                <Label>指派班級 (科任可複選)</Label>
                                <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {classes.map(c => (
                                        <div key={c.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`class-${c.id}`}
                                                checked={assignedClassIds.includes(c.id)}
                                                onCheckedChange={(checked) => {
                                                    setAssignedClassIds(prev => 
                                                        checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                                    );
                                                }}
                                            />
                                            <label htmlFor={`class-${c.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
