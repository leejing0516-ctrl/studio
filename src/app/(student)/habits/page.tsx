
"use client";

import { useState, useContext, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { PlusCircle, Repeat, Target, Clock, Coins, Check, AlertTriangle, BadgeCheck, CircleOff } from "lucide-react";
import { addDays, format, isAfter, startOfDay, differenceInDays, isSameDay } from "date-fns";
import type { StudentHabit } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const HABIT_DURATION = 21;

export default function HabitsPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents } = useContext(AppDataContext);
  const { toast } = useToast();

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [habitTitle, setHabitTitle] = useState("");
  const [habitDescription, setHabitDescription] = useState("");

  const currentStudent = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId);

  const studentHabits = useMemo(() => {
    return (currentStudent?.habits || []).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [currentStudent]);


  const handleHabitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !habitTitle || !habitDescription) {
      toast({ title: "請填寫完整資訊", variant: "destructive" });
      return;
    }

    const newHabit: StudentHabit = {
      id: `habit-${Date.now()}`,
      title: habitTitle,
      description: habitDescription,
      status: 'pending_approval',
      requestDate: new Date().toISOString(),
      points: 0,
      checkIns: [],
    };

    await setStudents(currentStudents => currentStudents.map(s => {
      if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
        return { ...s, habits: [...(s.habits || []), newHabit] };
      }
      return s;
    }));

    toast({ title: "申請已送出", description: "您的習慣養成計畫已送出給老師審核。" });
    setIsRequestDialogOpen(false);
    setHabitTitle("");
    setHabitDescription("");
  };
  
  const handleCheckIn = async (habitId: string) => {
    if (!currentStudent) return;
    
    await setStudents(currentStudents => currentStudents.map(s => {
      if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
        return {
            ...s,
            habits: (s.habits || []).map(h => 
                h.id === habitId ? { ...h, checkIns: [...h.checkIns, new Date().toISOString()] } : h
            )
        }
      }
      return s;
    }));
    toast({ title: "打卡成功！", description: "今天的習慣已完成，繼續保持！" });
  };
  
  const HabitCard = ({ habit }: { habit: StudentHabit }) => {
    const today = startOfDay(new Date());
    const hasCheckedInToday = habit.checkIns.some(ci => isSameDay(startOfDay(new Date(ci)), today));
    
    const progress = habit.status === 'active' && habit.startDate
      ? Math.min(Math.floor((habit.checkIns.length / HABIT_DURATION) * 100), 100)
      : habit.status === 'completed' ? 100 : 0;
      
    const daysRemaining = habit.status === 'active' && habit.endDate
      ? differenceInDays(new Date(habit.endDate), today)
      : 0;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2"><Target /> {habit.title}</CardTitle>
                    <Badge variant={habit.status === 'active' ? 'default' : habit.status === 'pending_approval' ? 'secondary' : habit.status === 'completed' ? 'default' : 'destructive'}>
                        {
                            {
                                'pending_approval': '待審核',
                                'active': '進行中',
                                'completed': '已完成',
                                'rejected': '已拒絕',
                            }[habit.status]
                        }
                    </Badge>
                </div>
                <CardDescription>{habit.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 {habit.status === 'pending_approval' && (
                    <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                        <Clock className="mx-auto h-8 w-8 mb-2" />
                        <p>等待老師評估並設定點數獎勵...</p>
                    </div>
                )}
                 {habit.status === 'rejected' && (
                    <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
                        <CircleOff className="mx-auto h-8 w-8 mb-2" />
                        <p className="font-semibold">此申請已被拒絕</p>
                        {habit.rejectionReason && <p className="text-xs mt-1">理由：{habit.rejectionReason}</p>}
                    </div>
                )}
                 {habit.status === 'active' && (
                    <div className="space-y-3">
                        <Progress value={progress} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>進度: {habit.checkIns.length} / {HABIT_DURATION} 天</span>
                            <span>{daysRemaining > 0 ? `剩下 ${daysRemaining} 天` : '最後一天！'}</span>
                        </div>
                    </div>
                )}
                {habit.status === 'completed' && (
                    <div className="text-center text-green-600 p-4 bg-green-500/10 rounded-md">
                        <BadgeCheck className="mx-auto h-8 w-8 mb-2" />
                        <p>恭喜完成！點數已由老師發放。</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Coins className="h-5 w-5" />
                    <span>{habit.points > 0 ? `+${habit.points.toLocaleString()}`: '???'}</span>
                </div>
                 {habit.status === 'active' && (
                    <Button onClick={() => handleCheckIn(habit.id)} disabled={hasCheckedInToday}>
                        <Check className="mr-2"/> {hasCheckedInToday ? '今日已打卡' : '今日打卡'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
  }

  return (
    <div className="animate-in fade-in-0 duration-500 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>建立新的習慣養成計畫</CardTitle>
            <CardDescription>設定一個你想持續 21 天的好習慣，讓老師為你的努力設定獎勵！</CardDescription>
          </div>
          <Button onClick={() => setIsRequestDialogOpen(true)}>
            <PlusCircle className="mr-2"/> 申請新習慣
          </Button>
        </CardHeader>
      </Card>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">我的習慣計畫</h2>
         {studentHabits.length === 0 ? (
          <Card className="text-center p-12">
            <CardTitle className="mt-4">尚未建立任何習慣計畫</CardTitle>
            <CardDescription className="mt-2">點擊上面的按鈕，開始你的第一個 21 天挑戰吧！</CardDescription>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentHabits.map(h => <HabitCard key={h.id} habit={h} />)}
          </div>
        )}
      </div>

       <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
            <form onSubmit={handleHabitRequest}>
                <DialogHeader>
                  <DialogTitle>申請新的習慣養成計畫</DialogTitle>
                  <DialogDescription>
                    寫下你想挑戰的習慣，送出後老師會為你評估獎勵點數。習慣挑戰為期 21 天。
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="habit-title">習慣標題</Label>
                    <Input
                      id="habit-title"
                      value={habitTitle}
                      onChange={(e) => setHabitTitle(e.target.value)}
                      placeholder="例如：每日運動 30 分鐘"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="habit-description">簡單描述</Label>
                    <Textarea
                      id="habit-description"
                      value={habitDescription}
                      onChange={(e) => setHabitDescription(e.target.value)}
                      placeholder="例如：我希望每天都能在晚餐後到公園散步或慢跑，保持身體健康。"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary" type="button">取消</Button>
                  </DialogClose>
                  <Button type="submit">送出申請</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    