
"use client";

import { useState, useContext, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppDataContext } from "@/context/AppDataContext";
import { StudentDataContext } from "@/context/StudentDataContext";
import { HeartHandshake, Users, Info, Coins, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FundraisingProject, Donation } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, intervalToDuration } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Countdown = ({ to }: { to: string }) => {
  const [duration, setDuration] = useState({ days: 0, hours: 0, minutes: 0 });
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const targetDate = new Date(to);
    
    const calculateDuration = () => {
      const now = new Date();
      if (now > targetDate) {
        setIsOver(true);
        return { days: 0, hours: 0, minutes: 0 };
      }
      return intervalToDuration({ start: now, end: targetDate });
    };

    setDuration(calculateDuration());
    const interval = setInterval(() => {
        const newDuration = calculateDuration();
        if (new Date() > targetDate && !isOver) {
             setIsOver(true);
        }
        setDuration(newDuration);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [to, isOver]);
  
  if (isOver) {
    return <span className="font-semibold text-destructive">已結束</span>
  }

  return (
    <span className="font-semibold text-foreground">
        {duration.days || 0}天 {duration.hours || 0}時 {duration.minutes || 0}分
    </span>
  );
};


export default function FundraisingPage() {
  const { platformConfig, setPlatformConfig, students, setStudents, classes } = useContext(AppDataContext);
  const { studentData } = useContext(StudentDataContext);
  const { toast } = useToast();

  const [isDonateDialogOpen, setIsDonateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FundraisingProject | null>(null);
  const [donationAmount, setDonationAmount] = useState<number | "">(10);
  
  const currentStudent = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId);

  const activeProjects = useMemo(() => {
    return (platformConfig?.fundraisingProjects || []).filter(p => p.status === 'active' && new Date(p.deadline) > new Date());
  }, [platformConfig]);
  
  const completedProjects = useMemo(() => {
    return (platformConfig?.fundraisingProjects || []).filter(p => p.status === 'completed' || new Date(p.deadline) <= new Date());
  }, [platformConfig]);

  const handleDonateClick = (project: FundraisingProject) => {
    setSelectedProject(project);
    setIsDonateDialogOpen(true);
  };
  
  const handleDetailsClick = (project: FundraisingProject) => {
    setSelectedProject(project);
    setIsDetailsDialogOpen(true);
  };

  const handleConfirmDonation = async () => {
    if (!selectedProject || !currentStudent || !donationAmount || donationAmount <= 0) {
        toast({ title: "錯誤", description: "請輸入有效的捐款金額。", variant: "destructive" });
        return;
    }
    
    if (currentStudent.points < donationAmount) {
        toast({ title: "點數不足", description: "您的點數不足以完成此筆捐款。", variant: "destructive" });
        return;
    }
    
    const newDonation: Donation = {
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        classId: currentStudent.classId,
        amount: donationAmount,
        date: new Date().toISOString(),
    };

    // Update student points
    await setStudents(prev => prev.map(s => 
        s.id === currentStudent.id && s.classId === currentStudent.classId
        ? { ...s, points: s.points - donationAmount }
        : s
    ));
    
    // Update project donations
    await setPlatformConfig({
        fundraisingProjects: (platformConfig?.fundraisingProjects || []).map(p => {
            if (p.id === selectedProject.id) {
                const updatedProject = {
                    ...p,
                    currentAmount: p.currentAmount + donationAmount,
                    donations: [...p.donations, newDonation]
                };
                if (updatedProject.currentAmount >= updatedProject.goal) {
                    updatedProject.status = 'completed';
                    toast({ title: "目標達成！", description: `恭喜「${updatedProject.title}」專案成功達標！感謝您的貢獻！` });
                }
                return updatedProject;
            }
            return p;
        })
    });
    
    toast({ title: "捐款成功！", description: `感謝您為「${selectedProject.title}」專案貢獻 ${donationAmount.toLocaleString()} 點！` });
    setIsDonateDialogOpen(false);
    setDonationAmount(10);
  };
  
  const ProjectCard = ({ project }: { project: FundraisingProject }) => {
    const progress = Math.min((project.currentAmount / project.goal) * 100, 100);
    const isExpired = new Date(project.deadline) <= new Date();
    const isCompleted = project.status === 'completed';

    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="relative h-48 w-full mb-4">
            <Image
              src={project.image}
              alt={project.title}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
             {(isExpired || isCompleted) && (
                <Badge className="absolute top-2 right-2" variant={isCompleted ? "default" : "secondary"}>
                    {isCompleted ? '已達標' : '已結束'}
                </Badge>
             )}
          </div>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription className="line-clamp-4">{project.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <Progress value={progress} />
            <div className="grid grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <p className="font-bold text-lg text-primary">{progress.toFixed(0)}%</p>
                  <p><span className="font-bold text-foreground">{project.currentAmount.toLocaleString()}</span> / {project.goal.toLocaleString()} 點</p>
                </div>
                <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 font-medium"><Timer className="h-4 w-4"/> 剩餘時間</p>
                    <Countdown to={project.deadline} />
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => handleDetailsClick(project)}><Info className="mr-2"/>詳細資訊</Button>
            <Button onClick={() => handleDonateClick(project)} disabled={isExpired || isCompleted}>
              <HeartHandshake className="mr-2"/>支持專案
            </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="animate-in fade-in-0 duration-500 space-y-8">
        <section>
            <div className="mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">進行中的募資專案</h2>
                <p className="text-muted-foreground">匯集大家的力量，一起完成有意義的目標！</p>
            </div>
            {activeProjects.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>
            ) : (
                <Card className="text-center p-12">
                    <CardTitle className="mt-4">目前沒有進行中的募資專案</CardTitle>
                    <CardDescription className="mt-2">
                        請期待校長發起新的專案！
                    </CardDescription>
                </Card>
            )}
        </section>
        
        {completedProjects.length > 0 && (
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">已完成/已結束的專案</h2>
                    <p className="text-muted-foreground">感謝大家的努力，這些是我們共同完成的驕傲！</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedProjects.map(p => (
                       <div key={p.id} className="opacity-80">
                         <ProjectCard project={p} />
                       </div>
                    ))}
                </div>
            </section>
        )}

      {/* Donate Dialog */}
      <Dialog open={isDonateDialogOpen} onOpenChange={setIsDonateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>支持專案：{selectedProject?.title}</DialogTitle>
                <DialogDescription>您的每一點貢獻，都是完成目標的重要力量！</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="donation-amount">抖內點數</Label>
                    <Input 
                        id="donation-amount"
                        type="number"
                        min="1"
                        max={currentStudent?.points || 0}
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                </div>
                <p className="text-sm text-muted-foreground">您目前擁有 {currentStudent?.points.toLocaleString() || 0} 點</p>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="secondary">取消</Button>
                </DialogClose>
                <Button onClick={handleConfirmDonation}>確認抖內</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{selectedProject?.title}</DialogTitle>
                <DialogDescription>{selectedProject?.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Users/> 捐款光榮榜</h3>
                <ScrollArea className="h-60 border rounded-md">
                    <div className="p-4 space-y-3">
                        {(selectedProject?.donations || []).sort((a,b) => b.amount - a.amount).map(donation => (
                             <div key={donation.studentId + donation.date} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://picsum.photos/seed/${donation.studentId}/100`} />
                                        <AvatarFallback>{donation.studentName.slice(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">{donation.studentName}</p>
                                        <p className="text-xs text-muted-foreground">{classes.find(c => c.id === donation.classId)?.name || '未知班級'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">{donation.amount.toLocaleString()} <span className="text-sm font-normal">點</span></p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(donation.date), "yyyy-MM-dd")}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                {currentStudent && (
                    <Card className="bg-muted/50 p-4">
                        <CardDescription>我的總貢獻</CardDescription>
                        <p className="text-lg font-bold text-primary">
                            {(selectedProject?.donations.filter(d => d.studentId === currentStudent.id).reduce((acc, d) => acc + d.amount, 0) || 0).toLocaleString()} 點
                        </p>
                    </Card>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button>關閉</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
