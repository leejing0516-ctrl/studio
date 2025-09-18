
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar as CalendarIcon, History } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CalculatedStudent {
    id: string;
    name: string;
    historicalPoints: number;
    currentPoints: number;
}

export default function PointHistoryPage() {
    const { students, classes, isLoading } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [role, setRole] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [targetDate, setTargetDate] = useState<Date | undefined>(new Date());
    const [targetTime, setTargetTime] = useState<string>("15:00");
    const [calculatedStudents, setCalculatedStudents] = useState<CalculatedStudent[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        if (storedRole !== 'admin') {
            toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }
        setRole(storedRole);
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id);
        }
    }, [router, toast, classes, selectedClassId]);

    const handleCalculate = () => {
        if (!targetDate || !selectedClassId) {
            toast({ title: "請選擇班級和日期", variant: "destructive" });
            return;
        }
        setIsCalculating(true);

        const [hours, minutes] = targetTime.split(':').map(Number);
        let combinedDateTime = setSeconds(setMinutes(setHours(startOfDay(targetDate), hours), minutes), 0);
        
        const studentsToCalculate = students.filter(s => s.classId === selectedClassId);

        const results = studentsToCalculate.map(student => {
            const historicalPoints = (student.pointHistory || [])
                .filter(record => new Date(record.date) <= combinedDateTime)
                .reduce((acc, record) => acc + record.points, 0);

            return {
                id: student.id,
                name: student.name,
                historicalPoints: Math.round(historicalPoints),
                currentPoints: student.points
            };
        });

        setCalculatedStudents(results);
        setIsCalculating(false);
    };

    if (isLoading && !role) {
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
                    <CardTitle className="flex items-center gap-2"><History/> 點數時光機</CardTitle>
                    <CardDescription>
                        選擇一個過去的時間點，系統將回溯交易紀錄，推算出當時學生的點數。此工具僅供查詢，不會修改任何資料。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="class-select">班級</Label>
                        <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                            <SelectTrigger id="class-select">
                                <SelectValue placeholder="請選擇班級" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date-picker">日期</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                id="date-picker"
                                className={cn(
                                    "w-full md:w-[200px] justify-start text-left font-normal",
                                    !targetDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {targetDate ? format(targetDate, "PPP") : <span>選擇日期</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={targetDate}
                                onSelect={setTargetDate}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="time-picker">時間</Label>
                        <Input 
                            id="time-picker"
                            type="time" 
                            value={targetTime}
                            onChange={(e) => setTargetTime(e.target.value)}
                            className="w-full md:w-auto"
                        />
                     </div>
                    <Button onClick={handleCalculate} disabled={isCalculating}>
                        {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        計算
                    </Button>
                </CardContent>
            </Card>

            {calculatedStudents.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>計算結果</CardTitle>
                        <CardDescription>
                            班級「{classes.find(c => c.id === selectedClassId)?.name}」在 {targetDate ? format(targetDate, 'yyyy/MM/dd') : ''} {targetTime} 的點數狀態。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>學生姓名</TableHead>
                                    <TableHead className="text-right">推算點數</TableHead>
                                    <TableHead className="text-right">目前點數</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calculatedStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">{student.historicalPoints.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{student.currentPoints.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
