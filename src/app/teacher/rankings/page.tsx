
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

export default function TeacherRankingsPage() {
    const { students, stocks, classes } = useContext(AppDataContext);

    const rankedStudents = useMemo(() => {
        if (students.length === 0) return [];

        const studentsWithAssets = students.map(student => {
            const portfolioValue = (student.portfolio || []).reduce((acc, item) => {
                const marketInfo = stocks.find(s => s.ticker === item.ticker);
                return acc + (marketInfo ? marketInfo.price * item.shares : 0);
            }, 0);
            const totalAssets = student.points + portfolioValue;
            return { ...student, totalAssets, portfolioValue };
        });

        return studentsWithAssets.sort((a, b) => b.totalAssets - a.totalAssets);
    }, [students, stocks]);

    return (
        <div className="animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy />
                        全校學生資產總排名
                    </CardTitle>
                    <CardDescription>
                        根據學生的「總點數」與「投資組合價值」加總進行的全校性排名。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">排名</TableHead>
                                <TableHead>學生</TableHead>
                                <TableHead>班級</TableHead>
                                <TableHead className="text-right">總資產</TableHead>
                                <TableHead className="text-right">持有總點數</TableHead>
                                <TableHead className="text-right">投資組合價值</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankedStudents.map((student, index) => (
                                <TableRow key={student._docId}>
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
