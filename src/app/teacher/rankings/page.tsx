
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
import { useSchoolStore } from "@/store/useSchoolStore";
import { Coins, Trophy, PiggyBank, Landmark, LineChart, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Student } from "@/lib/types";

type StudentWithAssets = Student & {
    totalAssets: number;
    portfolioValue: number;
    totalFixedDeposits: number;
    totalLoans: number;
};

export default function TeacherRankingsPage() {
    const { students, config, classes, loading: isStoreLoading } = useSchoolStore();
    const stocks = config?.stocks;
    
    const isLoading = isStoreLoading || !students || !stocks || !classes;

    const listedStudents = useMemo((): StudentWithAssets[] => {
        if (isLoading) {
            return [];
        }

        const uniqueStudentsMap = new Map<string, Student>();
        students.forEach(student => {
            if (student._docId) {
                uniqueStudentsMap.set(student._docId, student);
            }
        });
        const uniqueStudents = Array.from(uniqueStudentsMap.values());

        const studentsWithAssets = uniqueStudents.map(student => {
            const portfolioValue = (student.portfolio || []).reduce((acc, item) => {
                const marketInfo = stocks!.find(s => s.ticker === item.ticker);
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

        return studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);
    }, [isLoading, students, stocks, classes]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
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
                        全校學生資產排名
                    </CardTitle>
                    <CardDescription>
                        列出所有學生的總資產（點數 + 投資組合價值 + 定存總額 - 貸款總額），並依此排名。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">排名</TableHead>
                                    <TableHead>學生</TableHead>
                                    <TableHead>班級</TableHead>
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
                                        <TableCell>
                                            {(classes || []).find(c => c.id === student.classId)?.name || student.classId}
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
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            目前沒有學生資料，或資料正在載入中...
                                        </TableCell>
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
