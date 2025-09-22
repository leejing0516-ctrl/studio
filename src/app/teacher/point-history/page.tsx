
"use client";

import { useState, useContext, useEffect, useMemo } from "react";
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
import { Loader2, Coins } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import type { Student, Class, Teacher } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


export default function TeacherPointHistoryPage() {
    const { students, classes, teachers, isLoading } = useContext(AppDataContext);
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        const storedClassIdsStr = localStorage.getItem('teacherClassIds');
        if (storedRole !== 'admin' && storedRole !== 'subject_teacher') {
            toast({ title: "權限不足", description: "只有校長或科任老師才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }
        setRole(storedRole);
        setTeacherId(storedTeacherId);
        if (storedClassIdsStr && storedClassIdsStr !== 'undefined') {
            const ids = JSON.parse(storedClassIdsStr);
            setTeacherClassIds(ids);
            if (ids.length > 0) {
                setSelectedClassId(ids[0]);
            }
        }
    }, [router, toast]);
    
    // For admin, they can select any teacher to view history
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    useEffect(() => {
        if (role === 'subject_teacher' && teacherId) {
            setSelectedTeacherId(teacherId);
        }
    }, [role, teacherId]);

    const studentsInView = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId);
    }, [students, selectedClassId]);

    const calculatePoints = (student: Student, teacherId: string): number => {
        if (!student.pointHistory || !teacherId) return 0;
        return student.pointHistory
            .filter(record => record.teacherId === teacherId)
            .reduce((acc, record) => acc + record.points, 0);
    };
    
    const availableClasses = useMemo(() => {
        if (role === 'admin') return classes;
        return (teacherClassIds || []).map(id => classes.find(c => c.id === id)).filter(Boolean) as Class[];
    }, [role, classes, teacherClassIds]);

    useEffect(() => {
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    if (isLoading || !role) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
    }

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>點數發放歷史查詢</CardTitle>
                    <CardDescription>查詢您在各個班級發放給學生的點數總額。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {role === 'admin' && (
                        <div className="space-y-2">
                             <Label htmlFor="teacher-select">選擇老師</Label>
                             <Select onValueChange={setSelectedTeacherId} value={selectedTeacherId}>
                                <SelectTrigger id="teacher-select" className="w-full md:w-[280px]">
                                    <SelectValue placeholder="請選擇一位老師" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.filter(t => t.role !== 'teacher').map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.id === 'principal' ? '校長' : '科任老師'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="class-select-points">選擇班級</Label>
                        <Select onValueChange={setSelectedClassId} value={selectedClassId} disabled={!selectedTeacherId}>
                            <SelectTrigger id="class-select-points" className="w-full md:w-[280px]">
                                <SelectValue placeholder="請選擇班級" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClasses.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedClassId && selectedTeacherId ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>學生</TableHead>
                            <TableHead>您發放的淨點數</TableHead>
                            <TableHead>學生總點數</TableHead>
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
                                <TableCell>
                                    <div className="flex items-center gap-1 font-bold text-primary">
                                        <Coins className="h-4 w-4"/>
                                        {calculatePoints(student, selectedTeacherId).toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell>{student.points.toLocaleString()}</TableCell>
                            </TableRow>
                            )) : (
                                <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">此班級沒有學生。</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-12">
                            {role === 'admin' ? '請先選擇一位老師，再選擇班級。' : '請從上方選擇一個班級來查看紀錄。'}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
