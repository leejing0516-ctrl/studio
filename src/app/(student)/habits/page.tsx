"use client";

import { useState, useContext, useMemo } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { PlusCircle, Repeat, Target, Clock, Coins, Check, AlertTriangle, BadgeCheck, CircleOff, Trash2, Goal, ImageOff, Notebook, Eye } from "lucide-react";
import { addDays, format, isAfter, startOfDay, differenceInDays, isSameDay, isValid } from "date-fns";
import type { StudentHabit, HabitCheckIn } from "@/lib/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const HABIT_DURATION = 21;
const MAX_FILE_SIZE = 800 * 1024; // 800KB

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function HabitsPage() {
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents } = useContext(AppDataContext);
  const { toast } = useToast();

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [habitTitle, setHabitTitle] = useState("");
  const [habitDescription, setHabitDescription] = useState("");
  const [habitToDelete, setHabitToDelete] = useState<StudentHabit | null>(null);
  
  const [checkInHabit, setCheckInHabit] = useState<StudentHabit | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInImageFile, setCheckInImageFile] = useState<File | null>(null);
  const [checkInImagePreview, setCheckInImagePreview] = useState<string | null>(null);

  const [viewingHabitHistory, setViewingHabitHistory] = useState<StudentHabit | null>(null);

  const currentStudent = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId);

  const studentHabits = useMemo(() => {
    return (currentStudent?.habits || []).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [currentStudent]);
  
  const hasActiveOrPendingHabit = useMemo(() => {
    return studentHabits.some(h => h.status === 'active' || h.status === 'pending_approval');
  }, [studentHabits]);


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
  
  const handleCheckInImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "圖片檔案太大",
                description: `請選擇小於 ${MAX_FILE_SIZE / 1024}KB 的圖片。`,
                variant: "destructive",
            });
            return;
        }
        setCheckInImageFile(file);
        setCheckInImagePreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!currentStudent || !checkInHabit) return;

    let imageUrl: string | undefined = undefined;
    if (checkInImageFile) {
        try {
            imageUrl = await fileToDataUrl(checkInImageFile);
        } catch (error) {
            toast({ title: "圖片上傳失敗", variant: "destructive" });
            return;
        }
    }

    const newCheckIn: HabitCheckIn = {
      date: new Date().toISOString(),
      note: checkInNote,
      imageUrl: imageUrl,
    };
    
    await setStudents(currentStudents => currentStudents.map(s => {
      if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
        return {
            ...s,
            habits: (s.habits || []).map(h => 
                h.id === checkInHabit.id ? { ...h, checkIns: [...h.checkIns, newCheckIn] } : h
            )
        }
      }
      return s;
    }));

    toast({ title: "打卡成功！", description: "今天的習慣已完成，繼續保持！" });
    setCheckInHabit(null);
    setCheckInNote("");
    setCheckInImageFile(null);
    setCheckInImagePreview(null);
  };
  
  const handleDeleteHabit = async () => {
    if (!currentStudent || !habitToDelete) return;
    
    await setStudents(currentStudents => currentStudents.map(s => {
      if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
        return {
            ...s,
            habits: (s.habits || []).filter(h => h.id !== habitToDelete.id)
        }
      }
      return s;
    }));

    toast({ title: "已刪除計畫", description: "您的習慣養成計畫已被移除。", variant: "destructive"});
    setHabitToDelete(null);
  };
  
  const HabitCard = ({ habit }: { habit: StudentHabit }) => {
    const today = startOfDay(new Date());
    const hasCheckedInToday = habit.checkIns.some(ci => isSameDay(startOfDay(new Date(ci.date)), today));
    
    const progress = habit.status === 'active' && habit.startDate
      ? Math.min(Math.floor((habit.checkIns.length / HABIT_DURATION) * 100), 100)
      : habit.status === 'completed' ? 100 : 0;
      
    const daysRemaining = habit.status === 'active' && habit.endDate && isAfter(new Date(habit.endDate), today)
      ? differenceInDays(new Date(habit.endDate), today)
      : 0;

    return (
        <Card className="flex flex-col relative">
            {habit.status !== 'completed' && (
                <Badge className="absolute top-2 right-2 z-10" variant={habit.status === 'active' ? 'default' : habit.status === 'pending_approval' ? 'secondary' : 'destructive'}>
                    {
                        {
                            'pending_approval': '待審核',
                            'active': '進行中',
                            'rejected': '已拒絕',
                        }[habit.status]
                    }
                </Badge>
            )}
            <CardHeader>
                <CardTitle className="flex items-start justify-between">
                    <span className="flex items-center gap-2 pr-8"><Goal /> {habit.title}</span>
                </CardTitle>
                <CardDescription>{habit.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 {habit.status === 'pending_approval' && (
                    <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                        <Clock className="mx-auto h-8 w-8 mb-2" />
                        <p>等待老師評估並設定點數獎勵...</p>
                        <AlertDialogTrigger asChild>
                            <Button variant="link" size="sm" className="text-destructive h-auto p-0 mt-2" onClick={() => setHabitToDelete(habit)}>
                                刪除申請
                            </Button>
                        </AlertDialogTrigger>
                    </div>
                )}
                 {habit.status === 'rejected' && (
                    <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
                        <CircleOff className="mx-auto h-8 w-8 mb-2" />
                        <p className="font-semibold">此申請已被拒絕</p>
                        {habit.rejectionReason && <p className="text-xs mt-1">理由：{habit.rejectionReason}</p>}
                        <AlertDialogTrigger asChild>
                            <Button variant="link" size="sm" className="text-destructive h-auto p-0 mt-2" onClick={() => setHabitToDelete(habit)}>
                                刪除紀錄
                            </Button>
                        </AlertDialogTrigger>
                    </div>
                )}
                 {habit.status === 'active' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                             <p className="text-sm text-muted-foreground">進度: {habit.checkIns.length} / {HABIT_DURATION} 天</p>
                              <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setHabitToDelete(habit)}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                             </AlertDialogTrigger>
                        </div>
                        <Progress value={progress} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                             <span>{daysRemaining > 0 ? `剩下 ${daysRemaining} 天` : '最後一天！'}</span>
                        </div>
                    </div>
                )}
                {habit.status === 'completed' && (
                    <div className="text-center text-green-600 p-4 bg-green-500/10 rounded-md">
                        <BadgeCheck className="mx-auto h-8 w-8 mb-2" />
                        <p>恭喜完成！獲得了 {habit.points.toLocaleString()} 點！</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Coins className="h-5 w-5" />
                    <span>{habit.points > 0 ? `+${habit.points.toLocaleString()}`: '???'}</span>
                </div>
                 <div className="flex items-center gap-2">
                    {(habit.status === 'active' || habit.status === 'completed') && habit.checkIns.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setViewingHabitHistory(habit)}>
                            <Eye className="mr-1 h-4 w-4" /> 查看紀錄
                        </Button>
                    )}
                    {habit.status === 'active' && (
                        <Button onClick={() => setCheckInHabit(habit)} disabled={hasCheckedInToday}>
                            <Check className="mr-2"/> {hasCheckedInToday ? '今日已打卡' : '今日打卡'}
                        </Button>
                    )}
                </div>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0}>
                    <Button onClick={() => setIsRequestDialogOpen(true)} disabled={hasActiveOrPendingHabit}>
                        <PlusCircle className="mr-2"/> 申請新習慣
                    </Button>
                </div>
              </TooltipTrigger>
              {hasActiveOrPendingHabit && (
                <TooltipContent>
                  <p>您已有一個進行中的習慣計畫，請先完成它。</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
      </Card>
      
      <AlertDialog onOpenChange={(open) => {if (!open) setHabitToDelete(null)}}>
        <div>
            <h2 className="text-2xl font-bold mb-4">我的習慣計畫</h2>
            {studentHabits.length === 0 ? (
            <Card className="text-center p-12">
                <CardTitle className="mt-4">尚未建立任何習慣計畫</CardTitle>
                <CardDescription className="mt-2">點擊上面的按鈕，開始你的第一個 21 天挑戰吧！</CardDescription>
            </Card>
            ) : (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                {studentHabits.map(h => <HabitCard key={h.id} habit={h} />)}
            </div>
            )}
        </div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除「{habitToDelete?.title}」這個習慣養成計畫嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className={buttonVariants({ variant: "destructive" })}>
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      
      {/* Check-in Dialog */}
      <Dialog open={!!checkInHabit} onOpenChange={(open) => {if(!open) setCheckInHabit(null)}}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>今日打卡：{checkInHabit?.title}</DialogTitle>
                <DialogDescription>記錄你今天的努力！上傳一張證明照片並寫下你的心得。</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <div className="space-y-2">
                    <Label>上傳證明照片（選填，上限 800KB）</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                            {checkInImagePreview ? (
                                <Image src={checkInImagePreview} alt="Check-in preview" fill className="object-cover rounded-md" />
                            ) : (
                                <ImageOff className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <Input id="checkin-image-upload" type="file" accept="image/*" onChange={handleCheckInImageChange} className="sr-only" />
                             <Label htmlFor="checkin-image-upload" className={buttonVariants({ variant: "outline" })}>
                                選擇檔案
                            </Label>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="checkin-note">心得筆記（選填）</Label>
                    <Textarea 
                        id="checkin-note"
                        value={checkInNote}
                        onChange={(e) => setCheckInNote(e.target.value)}
                        placeholder="記錄今天的心情、遇到的困難或成就感..."
                        rows={4}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                <Button onClick={handleConfirmCheckIn}>確認打卡</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* History Dialog */}
      <Dialog open={!!viewingHabitHistory} onOpenChange={(open) => {if(!open) setViewingHabitHistory(null)}}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>歷程回顧：{viewingHabitHistory?.title}</DialogTitle>
                <DialogDescription>這是你過去努力的證明！</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-6">
                    {(viewingHabitHistory?.checkIns || []).slice().reverse().map((checkIn, index) => (
                        <div key={index}>
                            <p className="font-semibold mb-2">
                                {isValid(new Date(checkIn.date)) ? format(new Date(checkIn.date), 'yyyy年MM月dd日') : '無效日期'}
                            </p>
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
                            {index < viewingHabitHistory.checkIns.length - 1 && <Separator className="mt-6"/>}
                        </div>
                    ))}
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
