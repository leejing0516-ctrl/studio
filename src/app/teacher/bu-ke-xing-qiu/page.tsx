
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
import { Input } from "@/components/ui/input";
import { Loader2, BookUp, AlertTriangle, Upload, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Student, PointRecord } from "@/lib/types";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Papa from "papaparse";
import { Separator } from "@/components/ui/separator";

interface BuKeRecord {
    studentId: string;
    classId: string;
    readingEnergy: number;
    buKeBooksThisMonth: number;
    buKeLevel: number;
    buKeTotalEnergy: number;
    buKeTotalBooks: number;
}

const gradeMap: { [key: string]: string } = { "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六" };
const classMap: { [key: string]: string } = { "1": "甲班", "2": "乙班" };

export default function BuKeXingQiuPage() {
    const { students, setStudents, classes, isLoading, platformConfig, runTransaction } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [role, setRole] = useState<string | null>(null);
    const [conversionRate, setConversionRate] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);

    const [parsedCsvData, setParsedCsvData] = useState<BuKeRecord[]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);

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
    
    const classNameToIdMap = useMemo(() => {
        return new Map(classes.map(c => [c.name, c.id]));
    }, [classes]);

    const handleFileParse = (file: File) => {
        setCsvFile(file);
        Papa.parse<string[]>(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rawData = results.data;
                setCsvPreview(rawData.slice(0, 5)); // Show header + 4 rows
                
                const bukeData: BuKeRecord[] = [];
                // Start from row 1 to skip header
                for (const row of rawData.slice(1)) {
                    const [year, month, gradeNum, classNum, seatNum, studentName, readingEnergyStr, booksThisMonthStr, levelStr, totalEnergyStr, totalBooksStr] = row;
                    
                    const gradeName = gradeMap[gradeNum] || '';
                    const classNameSuffix = classMap[classNum] || '';
                    
                    if (gradeName && classNameSuffix) {
                        const fullClassName = `${gradeName}年${classNameSuffix}`;
                        const classId = classNameToIdMap.get(fullClassName);
                        const studentId = `S${String(seatNum).padStart(3, '0')}`;
                        
                        if (classId) {
                             const student = students.find(s => s.classId === classId && s.id === studentId);
                             if (student) {
                                 bukeData.push({
                                    studentId: student.id,
                                    classId: student.classId,
                                    readingEnergy: Number(readingEnergyStr) || 0,
                                    buKeBooksThisMonth: Number(booksThisMonthStr) || 0,
                                    buKeLevel: Number(levelStr) || 1,
                                    buKeTotalEnergy: Number(totalEnergyStr) || 0,
                                    buKeTotalBooks: Number(totalBooksStr) || 0,
                                });
                             }
                        }
                    }
                }
                setParsedCsvData(bukeData);
            }
        });
    };
    
    const handleImportReadingEnergy = async () => {
        if (parsedCsvData.length === 0) return;
        
        setIsProcessing(true);

        const studentDataMap = new Map(parsedCsvData.map(item => [`${item.classId}-${item.studentId}`, item]));
        
        const updatedStudents = students.map(student => {
            const key = `${student.classId}-${student.id}`;
            if (studentDataMap.has(key)) {
                const csvData = studentDataMap.get(key)!;
                return {
                    ...student,
                    readingEnergy: csvData.readingEnergy,
                    buKeBooksThisMonth: csvData.buKeBooksThisMonth,
                    buKeLevel: csvData.buKeLevel,
                    buKeTotalEnergy: csvData.buKeTotalEnergy,
                    buKeTotalBooks: csvData.buKeTotalBooks,
                };
            }
            return student;
        });
        
        try {
            await setStudents(updatedStudents);
            toast({
                title: `匯入完成`,
                description: `已成功為 ${parsedCsvData.length} 位學生更新布可星球資料。`
            });
            setParsedCsvData([]);
            setCsvFile(null);
            setCsvPreview([]);
        } catch (error: any) {
             toast({ title: "匯入失敗", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };


    const handleBatchConvert = async () => {
        setIsProcessing(true);
        const studentsWithReadingEnergy = students.filter(s => (s.readingEnergy || 0) > 0);
        if (studentsWithReadingEnergy.length === 0) {
            toast({ title: "無可轉換項目", description: "目前沒有學生的布可星球能量大於 0。" });
            setIsProcessing(false);
            return;
        }

        const totalPointsToAward = studentsWithReadingEnergy.reduce((sum, s) => sum + Math.floor((s.readingEnergy || 0) * conversionRate), 0);
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
                        points: (student.points || 0) + pointsToAdd,
                        pointHistory: [...(student.pointHistory || []), newPointHistory],
                        readingEnergy: 0, // Reset energy after conversion
                    };
                }
                return student;
            });
            
            await setStudents(updatedStudents);

            if (platformConfig) {
                 await runTransaction(async (transaction) => {
                    const configRef = doc(db, 'config', 'main');
                    transaction.update(configRef, { schoolFunds: schoolFunds - totalPointsToAward });
                });
            }

            toast({
                title: "轉換成功",
                description: `已成功為 ${studentsWithReadingEnergy.length} 位學生轉換布可星球能量，共發放 ${totalPointsToAward.toLocaleString()} 點。`
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
                        此處提供兩種主要功能：首先透過匯入 CSV 報表來更新學生的布可星球能量，然後再執行批次轉換將能量換算成點數。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-xl">步驟一：匯入布可星球報表</CardTitle>
                            <CardDescription>上傳 CSV 檔案以快速更新多位學生的布可星球資料。系統將會直接覆蓋原有的能量值與相關數據。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <a href="/buke-template.csv" download className={buttonVariants({variant: "outline"})}>
                                <Download className="mr-2"/>下載 CSV 範本
                            </a>
                            <div className="space-y-2">
                                <Label htmlFor="csv-upload">上傳 CSV 檔案 (欄位: 年度,月份,年級(數字),班級(數字),座號(數字),姓名,本月挖掘能量,本月挖掘本數,等級,累計挖掘總能量,挖掘總本數)</Label>
                                <Input id="csv-upload" type="file" accept=".csv" onChange={(e) => e.target.files && handleFileParse(e.target.files[0])}/>
                            </div>
                            {csvPreview.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">檔案預覽 (前 5 筆)</h4>
                                    <div className="border rounded-md p-2 text-xs bg-background overflow-x-auto">
                                        <pre><code>{csvPreview.map(row => row.join(',')).join('\n')}</code></pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                             <Button onClick={handleImportReadingEnergy} disabled={isProcessing || parsedCsvData.length === 0}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確認匯入並更新能量 ({parsedCsvData.length} 筆)
                            </Button>
                        </CardFooter>
                    </Card>

                    <Separator />

                     <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-xl">步驟二：批次轉換點數</CardTitle>
                            <CardDescription>此操作將會把列表中所有學生的「本月挖掘能量」乘以轉換率，加到他們的總點數中，並將能量歸零。此操作無法復原。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-6 border rounded-lg bg-background">
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
                                                此操作將會把列表中所有學生的「本月挖掘能量」乘以轉換率，加到他們的總點數中，並將該月能量歸零。此操作無法復原。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleBatchConvert}>確定轉換</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>

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

    

    