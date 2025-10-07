
"use client";

import { useContext, useMemo } from "react";
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
import { AppDataContext } from "@/context/AppDataContext";
import { Coins, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Student } from "@/lib/types";

export default function TeacherRankingsPage() {
    const { students, stocks, classes } = useContext(AppDataContext);

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

        // Sort by classId, then by student id
        return studentsWithAssets.sort((a, b) => {
            if (a.classId < b.classId) return -1;
            if (a.classId > b.classId) return 1;
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });
    }, [students, stocks]);

    return (
        <div className="animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy />
                        全校學生資產列表
                    </CardTitle>
                    <CardDescription>
                        列出所有學生的總資產（點數 + 投資組合價值），按班級及座號排序。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級</TableHead>
                                <TableHead>座號</TableHead>
                                <TableHead>學生</TableHead>
                                <TableHead className="text-right">總資產</TableHead>
                                <TableHead className="text-right">持有總點數</TableHead>
                                <TableHead className="text-right">投資組合價值</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listedStudents.map((student) => (
                                <TableRow key={student._docId || student.id}>
                                    <TableCell>
                                        {classes.find(c => c.id === student.classId)?.name || student.classId}
                                    </TableCell>
                                    <TableCell>{student.id}</TableCell>
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
                                            {Math.round(student.points).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${Math.round(student.portfolioValue).toLocaleString()}
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
