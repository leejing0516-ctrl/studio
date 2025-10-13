
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BookUp, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Student, PointRecord } from "@/lib/types";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BuKeXingQiuPage() {
    const { students, setStudents, classes, isLoading, platformConfig, runTransaction } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [role, setRole] = useState<string | null>(null);
    const [conversionRate, setConversionRate] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        if (storedRole !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
        }
        setRole(storedRole);
    }, [router, toast]);
    
    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => (a.classId.localeCompare(b.classId) || a.id.localeCompare(b.id)));
    }, [students]);

    const handleBatchConvert = async () => {
        setIsProcessing(true);
        const studentsWithEnergy = students.filter(s => (s.readingEnergy || 0) > 0);
        if (studentsWithEnergy.length === 0) {
            toast({ title: "無可轉換項目", description: "目前沒有學生的布可星球能量大於 0。" });
            setIsProcessing(false);
            return;
        }

        const totalPointsToAward = studentsWithEnergy.reduce((sum, s) => sum + Math.floor((s.readingEnergy || 0) * conversionRate), 0);
        const schoolFunds = platformConfig?.schoolFunds || 0;

        if (schoolFunds < totalPointsToAward) {
            toast({
                title: "學校資金不足",
                description: `需要 ${totalPointsToAward.toLocaleString()} 點，但學校資金僅剩 ${schoolFunds.toLocaleString()} 點。`,
                variant: "destructive"
            });
            setIsProcessing(false);
            return;
        }

        try {
            const updatedStudents: Student[] = students.map(student => {
                const energy = student.readingEnergy || 0;
                if (energy > 0) {
                    const pointsToAdd = Math.floor(energy * conversionRate);
                    const newPointHistory: PointRecord = {
                        points: pointsToAdd,
                        date: new Date().toISOString(),
                        reason: "上月布可星球能量轉換",
                        teacherId: 'principal'
                    };
                    return {
                        ...student,
                        points: student.points + pointsToAdd,
                        pointHistory: [...(student.pointHistory || []), newPointHistory],
                        readingEnergy: 0, // Reset energy after conversion
                    };
                }
                return student;
            });
            
            // This will commit all student changes in a batch
            await setStudents(updatedStudents);

            // Update school funds
            if (platformConfig) {
                 await runTransaction(async (transaction) => {
                    const configRef = doc(db, 'config', 'main');
                    transaction.update(configRef, { schoolFunds: schoolFunds - totalPointsToAward });
                });
            }

            toast({
                title: "轉換成功",
                description: `已成功為 ${studentsWithEnergy.length} 位學生轉換布可星球能量，共發放 ${totalPointsToAward.toLocaleString()} 點。`
            });
        } catch (error: any) {
            console.error("Batch conversion failed:", error);
            toast({ title: "轉換失敗", description: error.message || "發生未知錯誤", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading || role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookUp /> 布可星球轉換中心</CardTitle>
                    <CardDescription>
                        此功能用於在每個月初，將上個月累積的全校學生「布可星球」能量批次轉換為點數。請注意：此操作將會消耗學校總資金。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-6 border rounded-lg bg-muted/50">
                        <div className="space-y-1">
                            <Label htmlFor="conversion-rate">轉換率設定</Label>
                            <div className="flex items-center gap-2">
                               <span>1 點布可星球能量 =</span>
                                <Input 
                                    id="conversion-rate"
                                    type="number"
                                    value={conversionRate}
                                    onChange={e => setConversionRate(Number(e.target.value))}
                                    className="w-24"
                                    step="0.1"
                                />
                                <span>點數</span>
                            </div>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="lg" disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    開始批次轉換點數
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>確定要開始轉換嗎？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        此操作將會把列表中所有學生的「布可星球」能量乘以轉換率，加到他們的總點數中，並將能量歸零。此操作無法復原。
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBatchConvert}>確定轉換</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>班級</TableHead>
                                    <TableHead>座號</TableHead>
                                    <TableHead>姓名</TableHead>
                                    <TableHead className="text-right">待轉換布可星球能量</TableHead>
                                    <TableHead className="text-right">預計發放點數</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedStudents.length > 0 ? sortedStudents.map(student => (
                                    <TableRow key={student._docId}>
                                        <TableCell>{classes.find(c => c.id === student.classId)?.name}</TableCell>
                                        <TableCell>{student.id}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell className="text-right font-medium">{student.readingEnergy || 0}</TableCell>
                                        <TableCell className="text-right font-semibold text-primary">
                                            +{Math.floor((student.readingEnergy || 0) * conversionRate).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">目前沒有學生資料。</TableCell>
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

    