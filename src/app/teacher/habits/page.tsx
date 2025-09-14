
"use client";

import { useState, useContext, useEffect, useMemo } from "react";
import Image from "next/image";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Student, StudentHabit, HabitCheckIn } from "@/lib/types";
import { Check, X, Coins, Loader2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { format, formatDistanceToNow, addDays, startOfDay, differenceInDays, isAfter } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const HABIT_DURATION = 21;

export default function TeacherHabitsPage() {
    const { students, setStudents, classes, isLoading } = useContext(AppDataContext);
    const { toast } = useToast();
    const router = useRouter();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
    
    const [pointsToAward, setPointsToAward] = useState<{ [key: string]: number | '' }>({});
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [habitToReject, setHabitToReject] = useState<{ student: Student, habit: StudentHabit } | null>(null);
    
    const [viewingHabitHistory, setViewingHabitHistory] = useState<StudentHabit | null>(null);
    

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        const storedClassIdsStr = localStorage.getItem('teacherClassIds');
        if (storedRole !== 'admin' && storedRole !== 'teacher') {
            toast({ title: "權限不足", description: "只有校長或班級導師才能存取此頁面。", variant: "destructive" });
            router.push('/teacher/dashboard');
            return;
        }
        setRole(storedRole);
        setTeacherId(storedTeacherId);
         if (storedClassIdsStr && storedClassIdsStr !== 'undefined') {
            const ids = JSON.parse(storedClassIdsStr);
            setTeacherClassIds(ids);
        }
    }, [router, toast]);
    
    const relevantStudents = useMemo(() => {
        if (role === 'admin') return students;
        return students.filter(s => teacherClassIds.includes(s.classId));
    }, [students, role, teacherClassIds]);

    const habitRequests = useMemo(() => {
        return relevantStudents.flatMap(student => 
            (student.habits || [])
                .filter(h => h.status === 'pending_approval')
                .map(habit => ({ student, habit }))
        );
    }, [relevantStudents]);
    
    const activeHabits = useMemo(() => {
        return relevantStudents.flatMap(student => 
            (student.habits || [])
                .filter(h => h.status === 'active' || h.status === 'completed')
                .map(habit => ({ student, habit }))
        ).sort((a, b) => new Date(b.habit.requestDate).getTime() - new Date(a.habit.requestDate).getTime());
    }, [relevantStudents]);
    
    const handleApproveHabit = (studentId: string, classId: string, habitId: string) => {
        const points = pointsToAward[habitId];
        if (!points || points <= 0) {
            toast({ title: "請設定有效的點數", variant: "destructive" });
            return;
        }
        
        const today = new Date();
        setStudents(currentStudents => currentStudents.map(s => {
            if (s.id === studentId && s.classId === classId) {
                return {
                    ...s,
                    habits: (s.habits || []).map(h => 
                        h.id === habitId 
                        ? { 
                            ...h, 
                            status: 'active' as const, 
                            points: points,
                            approvalDate: today.toISOString(),
                            startDate: today.toISOString(),
                            endDate: addDays(today, HABIT_DURATION).toISOString(),
                          } 
                        : h
                    )
                }
            }
            return s;
        }));
        
        toast({ title: "習慣已批准", description: "學生現在可以開始他們的 21 天挑戰了！" });
    };
    
    const handleRejectHabit = () => {
        if (!habitToReject) return;
        const { student, habit } = habitToReject;

        setStudents(currentStudents => currentStudents.map(s => {
            if (s.id === student.id && s.classId === student.classId) {
                return {
                    ...s,
                    habits: (s.habits || []).map(h => 
                        h.id === habit.id 
                        ? { ...h, status: 'rejected' as const, rejectionReason: rejectionReason } 
                        : h
                    )
                }
            }
            return s;
        }));
        
        toast({ title: "習慣已拒絕", variant: "destructive" });
        setHabitToReject(null);
        setRejectionReason("");
    };
    
    const handleAwardHabitPoints = (studentId: string, classId: string, habit: StudentHabit) => {
        if (habit.points <= 0) return;
        
        setStudents(currentStudents => currentStudents.map(s => {
            if (s.id === studentId && s.classId === classId) {
                const today = new Date().toISOString();
                const newHistory = [...(s.pointHistory || []), { points: habit.points, date: today, reason: `完成習慣: ${habit.title}` }];
                
                return {
                    ...s,
                    points: s.points + habit.points,
                    pointHistory: newHistory,
                    habits: (s.habits || []).map(h => 
                        h.id === habit.id ? { ...h, status: 'completed' as const } : h
                    )
                }
            }
            return s;
        }));
        
        toast({ title: "點數已發放", description: `已發送 ${habit.points} 點給該學生。`});
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
    }

    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Tabs defaultValue="requests">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="requests">待審核申請</TabsTrigger>
                    <TabsTrigger value="active">進度追蹤</TabsTrigger>
                </TabsList>
                <TabsContent value="requests" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>習慣養成申請審核</CardTitle>
                            <CardDescription>評估學生提出的習慣養成計畫，並為他們的努力設定一個合理的點數獎勵。</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>學生</TableHead>
                                        <TableHead>習慣</TableHead>
                                        <TableHead>申請時間</TableHead>
                                        <TableHead className="w-[120px]">獎勵點數</TableHead>
                                        <TableHead className="text-right w-[150px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {habitRequests.length > 0 ? habitRequests.map(({student, habit}) => (
                                        <TableRow key={habit.id}>
                                            <TableCell>{student.name} ({classes.find(c => c.id === student.classId)?.name})</TableCell>
                                            <TableCell>
                                                <p className="font-medium">{habit.title}</p>
                                                <p className="text-sm text-muted-foreground">{habit.description}</p>
                                            </TableCell>
                                            <TableCell>{formatDistanceToNow(new Date(habit.requestDate), { addSuffix: true, locale: zhTW })}</TableCell>
                                            <TableCell>
                                                 <Input 
                                                    type="number" 
                                                    placeholder="點數"
                                                    value={pointsToAward[habit.id] || ''}
                                                    onChange={e => setPointsToAward({...pointsToAward, [habit.id]: Number(e.target.value)})}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" className="mr-2 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600" onClick={() => handleApproveHabit(student.id, student.classId, habit.id)}>
                                                    <Check className="h-4 w-4 mr-1"/>批准
                                                </Button>
                                                <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setHabitToReject({student, habit})}>
                                                    <X className="h-4 w-4 mr-1"/>拒絕
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">目前沒有待審核的習慣申請。</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="active" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>進行中/已完成的習慣挑戰</CardTitle>
                            <CardDescription>追蹤學生的挑戰進度，並在他們完成後發放獎勵。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>學生</TableHead>
                                        <TableHead>習慣</TableHead>
                                        <TableHead>進度 (21天)</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeHabits.length > 0 ? activeHabits.map(({student, habit}) => {
                                        const progress = Math.min(Math.floor((habit.checkIns.length / HABIT_DURATION) * 100), 100);
                                        const isDueForCompletion = habit.status === 'active' && (habit.checkIns.length >= HABIT_DURATION || (habit.endDate && isAfter(new Date(), new Date(habit.endDate))));
                                        return (
                                            <TableRow key={habit.id}>
                                                <TableCell>{student.name}</TableCell>
                                                <TableCell>{habit.title}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={progress} className="w-40" />
                                                        <span>{habit.checkIns.length} / {HABIT_DURATION}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" className="mr-2" onClick={() => setViewingHabitHistory(habit)}>
                                                        <Eye className="mr-1 h-4 w-4"/> 查看紀錄
                                                    </Button>
                                                    {isDueForCompletion ? (
                                                        <Button size="sm" onClick={() => handleAwardHabitPoints(student.id, student.classId, habit)}>
                                                            <Coins className="mr-2" />發放 {habit.points} 點
                                                        </Button>
                                                    ) : habit.status === 'completed' ? (
                                                        <span className="text-sm text-green-600 font-semibold">已發放</span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">進行中...</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                         <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">目前沒有進行中的習慣挑戰。</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
             <AlertDialog open={!!habitToReject} onOpenChange={(open) => !open && setHabitToReject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定要拒絕此習慣申請嗎？</AlertDialogTitle>
                        <AlertDialogDescription>
                           您將拒絕學生 {habitToReject?.student.name} 的「{habitToReject?.habit.title}」申請。您可以選擇性地填寫拒絕理由。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="rejection-reason">拒絕理由（選填）</Label>
                        <Textarea 
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            placeholder="例如：這個目標不夠具體，請修改後重新申請。"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectHabit} className={buttonVariants({ variant: "destructive" })}>確定拒絕</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             {/* History Dialog */}
            <Dialog open={!!viewingHabitHistory} onOpenChange={(open) => {if(!open) setViewingHabitHistory(null)}}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>歷程回顧：{viewingHabitHistory?.title}</DialogTitle>
                        <DialogDescription>查看學生的每日打卡紀錄。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <ScrollArea className="h-96 pr-4">
                            <div className="space-y-6">
                            {(viewingHabitHistory?.checkIns || []).slice().reverse().map((checkIn, index) => (
                                <div key={index}>
                                    <p className="font-semibold mb-2">{format(new Date(checkIn.date), 'yyyy年MM月dd日')}</p>
                                    <div className="flex gap-4 items-start">
                                        {checkIn.imageUrl && (
                                            <Image src={checkIn.imageUrl} alt={`Check-in for ${checkIn.date}`} width={128} height={128} className="rounded-md object-cover w-32 h-32 shrink-0"/>
                                        )}
                                        {checkIn.note ? (
                                            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md flex-1">
                                                <p>{checkIn.note}</p>
                                            </div>
                                        ) : (
                                            !checkIn.imageUrl && <p className="text-sm text-muted-foreground">這天只留下了打卡紀錄。</p>
                                        )}
                                    </div>
                                    {index < viewingHabitHistory!.checkIns.length - 1 && <Separator className="mt-6"/>}
                                </div>
                            ))}
                             {viewingHabitHistory?.checkIns.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">該學生尚未有任何打卡紀錄。</p>
                             )}
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button>關閉</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
