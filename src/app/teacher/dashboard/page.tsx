
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, PointRecord } from "@/lib/types";

export default function TeacherDashboardPage() {
    const { toast } = useToast();
    const { teacher, setStudents: updateAllStudents } = useAuth();
    const { students, classes } = useSchoolStore();
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [points, setPoints] = useState<{ [key: string]: number | '' }>({});
    const [reason, setReason] = useState<{ [key: string]: string }>({});
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    
    const [batchPoints, setBatchPoints] = useState<number | ''>('');
    const [batchReason, setBatchReason] = useState('');
    const [batchTarget, setBatchTarget] = useState('selected');

    const teacherClassIds = useMemo(() => teacher?.classIds || [], [teacher]);

    useEffect(() => {
        if (teacherClassIds.length > 0 && !selectedClassId) {
            setSelectedClassId(teacherClassIds[0]);
        }
    }, [teacherClassIds, selectedClassId]);

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
            // Clear input fields after submission
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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>班級與點數管理</CardTitle>
                    <CardDescription>選擇一個班級以管理學生點數。您可以個別調整或進行批次操作。</CardDescription>
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
                                    {teacherClassIds.map(id => {
                                        const classInfo = classes.find(c => c.id === id);
                                        return classInfo ? <SelectItem key={id} value={id}>{classInfo.name}</SelectItem> : null
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <Card className="bg-muted/50">
                        <CardHeader>
                             <CardTitle className="text-lg">發送/扣除點數</CardTitle>
                             <CardDescription>獎勵或扣除學生的點數。輸入正數為發送，負數為扣除。</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="batch-target">批次操作: 選擇目標</Label>
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
                                <Button className="w-full" onClick={handleBatchSubmit}>執行</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                         <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
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
                                    <TableHead className="w-[200px]">個別操作：點數 (例如: 50, -50)</TableHead>
                                    <TableHead className="w-[200px]">理由 (選填)</TableHead>
                                    <TableHead className="text-right w-[80px]">執行</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
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
                                            <Input type="number" value={points[student.id] || ''} onChange={e => handlePointChange(student.id, e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={reason[student.id] || ''} onChange={e => handleReasonChange(student.id, e.target.value)} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleIndividualSubmit(student)} disabled={points[student.id] === '' || points[student.id] === undefined}>執行</Button>
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
        </div>
    );
}
