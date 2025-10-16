
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useSchoolStore } from "@/store/useSchoolStore";
import { Coins, Trophy, PiggyBank, Landmark, LineChart, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Student } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export default function TeacherClassRankingsPage() {
    const { students, stocks, classes, loading: isLoading } = useSchoolStore();
    const { teacher } = useAuth();
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    const classOptions = useMemo(() => {
        if (!teacher || !classes) return [];
        if (teacher.role === 'admin') {
            return classes;
        }
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        // Automatically select the first available class if none is selected
        if (classOptions.length > 0 && !selectedClassId) {
            setSelectedClassId(classOptions[0].id);
        }
    }, [classOptions, selectedClassId]);

    const listedStudents = useMemo(() => {
        if (!selectedClassId || !students || !stocks) return [];

        const studentsInClass = students.filter(student => student.classId === selectedClassId);

        const studentsWithAssets = studentsInClass.map(student => {
            const portfolioValue = (student.portfolio || []).reduce((acc, item) => {
                const marketInfo = stocks.find(s => s.ticker === item.ticker);
                return acc + (marketInfo ? marketInfo.price * item.shares : 0);
            }, 0);

            const totalFixedDeposits = (student.fixedDeposits || [])
                .filter(d => d.status === 'active')
                .reduce((acc, deposit) => acc + deposit.amount, 0);

            const totalLoans = (student.loans || [])
                .filter(l => l.status === 'active' || l.status === 'overdue')
                .reduce((acc, loan) => acc + loan.amount, 0);

            const totalAssets = (student.points || 0) + portfolioValue + totalFixedDeposits - totalLoans;
            
            return { ...student, totalAssets, portfolioValue, totalFixedDeposits, totalLoans };
        });

        // Sort by total assets descending
        return studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);
    }, [students, stocks, selectedClassId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy />
                        班級學生資產排名
                    </CardTitle>
                    <CardDescription>
                        選擇一個班級以查看該班學生的資產（點數 + 投資組合價值 + 定存總額 - 貸款總額）排名。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 max-w-sm">
                        <Label htmlFor="class-select-rankings">選擇班級</Label>
                        <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                            <SelectTrigger id="class-select-rankings">
                                <SelectValue placeholder="請選擇班級" />
                            </SelectTrigger>
                            <SelectContent>
                                {classOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">排名</TableHead>
                                    <TableHead>學生</TableHead>
                                    <TableHead className="text-right">總資產</TableHead>
                                    <TableHead className="text-right">持有總點數</TableHead>
                                    <TableHead className="text-right">投資組合價值</TableHead>
                                    <TableHead className="text-right">定存總額</TableHead>
                                    <TableHead className="text-right">貸款總額</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {listedStudents.length > 0 ? listedStudents.map((student, index) => (
                                    <TableRow key={student._docId || student.id}>
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
                                        <TableCell className="text-right font-bold text-primary">
                                            ${Math.round(student.totalAssets).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Coins className="h-4 w-4 text-muted-foreground" />
                                                {Math.round(student.points || 0).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <div className="flex items-center justify-end gap-1">
                                                <LineChart className="h-4 w-4 text-muted-foreground" />
                                                ${Math.round(student.portfolioValue).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                                                {Math.round(student.totalFixedDeposits).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 text-destructive">
                                                <Landmark className="h-4 w-4" />
                                                {Math.round(student.totalLoans).toLocaleString()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">請先選擇班級，或此班級中沒有學生。</TableCell>
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
