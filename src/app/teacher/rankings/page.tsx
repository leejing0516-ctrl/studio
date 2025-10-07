"use client";

import { useContext, useMemo, useState } from "react";
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
import { AppDataContext } from "@/context/AppDataContext";
import { Coins, Trophy, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Student } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

export default function TeacherRankingsPage() {
    const { students, stocks, classes, setStudents } = useContext(AppDataContext);
    const { toast } = useToast();
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const listedStudents = useMemo(() => {
        // Use a Map to ensure each student is unique based on _docId, taking the last entry.
        const uniqueStudentsMap = new Map<string, Student>();
        students.forEach(student => {
            if (student._docId) {
                uniqueStudentsMap.set(student._docId, student);
            }
        });
        const uniqueStudents = Array.from(uniqueStudentsMap.values());

        const studentsWithAssets = uniqueStudents.map(student => {
            const portfolioValue = (student.portfolio || []).reduce((acc, item) => {
                const marketInfo = stocks.find(s => s.ticker === item.ticker);
                return acc + (marketInfo ? marketInfo.price * item.shares : 0);
            }, 0);
            const totalAssets = student.points + portfolioValue;
            return { ...student, totalAssets, portfolioValue };
        });

        // Sort by total assets descending
        return studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);
    }, [students, stocks]);

    const handleDeleteStudent = async () => {
        if (!studentToDelete || !studentToDelete._docId) return;
        await setStudents(currentStudents => currentStudents.filter(s => s._docId !== studentToDelete._docId));
        toast({
            title: "學生已刪除",
            description: `${studentToDelete.name} 的所有資料已被從系統中移除。`,
            variant: "destructive"
        });
        setStudentToDelete(null);
    };
    
    const handleSelectStudent = (studentDocId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedStudents(prev => [...prev, studentDocId]);
        } else {
            setSelectedStudents(prev => prev.filter(id => id !== studentDocId));
        }
    };

    const handleSelectAll = (isAllSelected: boolean) => {
        if (isAllSelected) {
            setSelectedStudents(listedStudents.map(s => s._docId!));
        } else {
            setSelectedStudents([]);
        }
    };
    
    const handleBatchDelete = async () => {
        if (selectedStudents.length === 0) return;
        await setStudents(currentStudents => currentStudents.filter(s => !selectedStudents.includes(s._docId!)));
        toast({
            title: `已批次刪除 ${selectedStudents.length} 位學生`,
            variant: "destructive"
        });
        setSelectedStudents([]);
    };

    return (
        <div className="animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy />
                        全校學生資產排名
                    </CardTitle>
                    <CardDescription>
                        列出所有學生的總資產（點數 + 投資組合價值），並依此排名。您可以直接在此刪除異常或重複的資料。
                    </CardDescription>
                     <div className="flex justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={selectedStudents.length === 0}>
                                    <Trash2 className="mr-2" />
                                    批次刪除 ({selectedStudents.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>確定要批次刪除嗎？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        您即將永久刪除 {selectedStudents.length} 位學生。此操作無法復原。
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBatchDelete} className={buttonVariants({ variant: "destructive" })}>
                                        確定刪除
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedStudents.length > 0 && selectedStudents.length === listedStudents.length}
                                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                        aria-label="全選"
                                    />
                                </TableHead>
                                <TableHead className="w-[80px]">排名</TableHead>
                                <TableHead>學生</TableHead>
                                <TableHead>班級</TableHead>
                                <TableHead className="text-right">總資產</TableHead>
                                <TableHead className="text-right">持有總點數</TableHead>
                                <TableHead className="text-right">投資組合價值</TableHead>
                                <TableHead className="text-right w-[100px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listedStudents.map((student, index) => (
                                <TableRow key={student._docId || student.id} data-state={selectedStudents.includes(student._docId!) ? 'selected' : ''}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedStudents.includes(student._docId!)}
                                            onCheckedChange={(checked) => handleSelectStudent(student._docId!, Boolean(checked))}
                                            aria-label={`選擇 ${student.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={student.avatar} alt={student.name} />
                                                <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{student.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {classes.find(c => c.id === student.classId)?.name || student.classId}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-primary">
                                        ${Math.round(student.totalAssets).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Coins className="h-4 w-4 text-muted-foreground" />
                                            {Math.round(student.points).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${Math.round(student.portfolioValue).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <AlertDialog open={!!studentToDelete && studentToDelete._docId === student._docId} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setStudentToDelete(student)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        您確定要永久刪除學生「{studentToDelete?.name}」的所有資料嗎？此操作無法復原。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteStudent} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
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
        </div>
    );
}
