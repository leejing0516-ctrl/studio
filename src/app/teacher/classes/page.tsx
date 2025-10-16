
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
import { Trash2, PlusCircle, School } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import type { Teacher, ClassInfo } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export default function ClassManagementPage() {
    const { toast } = useToast();
    const { setClasses, setStudents, setTeachers, teacher } = useAuth();
    const { teachers, classes } = useSchoolStore();
    const router = useRouter();

    const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');

    useEffect(() => {
        if (teacher && teacher.role !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
        }
    }, [teacher, router, toast]);
    
    const handleAddClass = async () => {
        if (!newClassName) {
            toast({ title: "請輸入班級名稱", variant: "destructive" });
            return;
        }
        const newClassId = `class-${Date.now()}`;
        const newClass: ClassInfo = {
            id: newClassId,
            name: newClassName,
            announcements: []
        };
        await setClasses(current => [...current, newClass]);
        toast({ title: "班級已新增" });
        setIsAddClassOpen(false);
        setNewClassName('');
    };

    const handleDeleteClass = async () => {
        if (!classToDelete) return;

        try {
             await setStudents(current => current.filter(s => s.classId !== classToDelete.id));
             await setClasses(current => current.filter(c => c.id !== classToDelete.id));
             
             await setTeachers(current => current.map(t => ({
                ...t,
                classIds: (t.classIds || []).filter(cid => cid !== classToDelete.id)
             })));

             toast({ title: "班級已刪除", description: "班級及其所有學生資料、教師關聯皆已被刪除。", variant: "destructive" });
        } catch(e) {
             toast({ title: "刪除失敗", description: "刪除班級時發生錯誤。", variant: "destructive" });
        }
        
        setClassToDelete(null);
    };

    if (!teacher) return null; // or a loading spinner

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
             <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2"><School />班級管理</CardTitle>
                        <CardDescription>管理學校中的所有班級。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsAddClassOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> 新增班級</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級名稱</TableHead>
                                <TableHead>班級導師</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => {
                                const assignedTeacher = teachers.find(t => Array.isArray(t.classIds) && t.classIds.includes(c.id) && t.role === 'teacher');
                                return (
                                <TableRow key={c.id}>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{assignedTeacher?.name || '未指派'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" onClick={() => setClassToDelete(c)}>
                                            <Trash2 className="mr-1 h-4 w-4"/> 刪除
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增班級</DialogTitle>
                    </DialogHeader>
                     <div className="space-y-2 py-4">
                        <Label htmlFor="new-class-name">班級名稱</Label>
                        <Input id="new-class-name" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddClass}>新增</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                        <AlertDialogDescription>
                            刪除班級「{classToDelete?.name}」將會永久刪除此班級內**所有學生**的資料，包含點數、股票等。此動作無法復原。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClass} className={buttonVariants({variant: 'destructive'})}>我了解，確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
