
"use client";

import { useState, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { Reward } from "@/lib/types";
import { Coins, ShoppingCart, School, Users, Building, GraduationCap } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { redeemRewardTransaction } from "@/lib/actions";

export default function RewardsPage() {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents, rewards, setRewards, platformConfig, setPlatformConfig, teachers, setTeachers } = useContext(AppDataContext);

  const student = studentData.student;
  
  const { classRewards, schoolRewards } = useMemo(() => {
    if (!student) return { classRewards: [], schoolRewards: [] };
    
    // Find the current student's homeroom teacher based on their classId.
    // A teacher is a homeroom teacher if their role is 'teacher' and their classIds array includes the student's classId.
    const homeroomTeacher = teachers.find(t => 
        t.role === 'teacher' && Array.isArray(t.classIds) && t.classIds.includes(student.classId)
    );

    const availableRewards = rewards.filter(reward => {
        // A reward is invalid if its provider no longer exists.
        const providerExists = reward.scope === 'school' || teachers.some(t => t.id === reward.providerId);
        if (!providerExists) {
            return false;
        }

        // School rewards are always available.
        if (reward.scope === 'school') {
            return true;
        }

        // Class rewards are available only if provided by the student's homeroom teacher.
        if (reward.scope === 'class' && homeroomTeacher && reward.providerId === homeroomTeacher.id) {
            return true;
        }

        return false;
    });
        
    const classRewards = availableRewards.filter(r => r.scope === 'class');
    const schoolRewards = availableRewards.filter(r => r.scope === 'school');

    return { classRewards, schoolRewards };

  }, [rewards, student, teachers]);

  const handleRedeemClick = (reward: Reward) => {
    if (studentData.points < reward.cost) {
        toast({
            title: "點數不足",
            description: `您需要 ${reward.cost.toLocaleString()} 點來兌換此獎勵。`,
            variant: "destructive",
        });
        return;
    }
    if (reward.stock <= 0) {
        toast({
            title: "庫存不足",
            description: `「${reward.name}」已經被兌換完畢了。`,
            variant: "destructive",
        });
        return;
    }
    setSelectedReward(reward);
    setIsConfirmOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !student) {
        setIsConfirmOpen(false);
        return;
    };
    
    setIsRedeeming(true);

    try {
        const result = await redeemRewardTransaction({
            studentId: student.id,
            classId: student.classId,
            rewardId: selectedReward.id,
        });

        // After successful transaction, update the frontend state
        // This is now just a UI update, the source of truth is the backend
        if (result.success) {
            setStudents(currentStudents => 
                currentStudents.map(s => {
                    if (s.id === student.id && s.classId === student.classId) {
                        return {
                            ...s,
                            points: s.points - selectedReward.cost,
                            redeemedRewards: [...(s.redeemedRewards || []), result.newRedeemedItem!],
                        };
                    }
                    return s;
                })
            );
            
            setRewards(currentRewards => currentRewards.map(r =>
                r.id === selectedReward.id ? { ...r, stock: r.stock - 1 } : r
            ));
            
            if (selectedReward.scope === 'school') {
                if (platformConfig?.schoolFunds !== undefined) {
                    setPlatformConfig({ schoolFunds: platformConfig.schoolFunds + selectedReward.cost });
                }
            } else {
                setTeachers(currentTeachers => currentTeachers.map(t =>
                    t.id === selectedReward.providerId ? { ...t, pointBalance: (t.pointBalance || 0) + selectedReward.cost } : t
                ));
            }

            toast({
                title: "兌換成功！",
                description: `您已成功兌換「${selectedReward.name}」。前往「我的收藏」查看！`,
            });
        } else {
            // If the transaction failed, show the error message from the server
            toast({
                title: "兌換失敗",
                description: result.error,
                variant: "destructive",
            });
        }

    } catch (error) {
        console.error("Redemption transaction failed:", error);
        toast({
            title: "兌換失敗",
            description: "發生未知錯誤，請稍後再試。",
            variant: "destructive",
        });
    } finally {
        setIsRedeeming(false);
        setIsConfirmOpen(false);
        setSelectedReward(null);
    }
  };

  const RewardCard = ({ reward }: { reward: Reward }) => (
     <Card key={reward.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
        <div className="relative h-48 w-full">
        <Image
            src={reward.image}
            alt={reward.name}
            fill
            className="object-cover"
            data-ai-hint="reward item"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <Badge 
            className="absolute top-2 right-2" 
            variant={reward.scope === 'school' ? 'default' : 'secondary'}
        >
            {reward.scope === 'school' ? <Building className="mr-1.5" /> : <GraduationCap className="mr-1.5" />}
            {reward.scope === 'school' ? '學校提供' : '班級限定'}
        </Badge>
        </div>
        <CardHeader>
        <CardTitle>{reward.name}</CardTitle>
        <CardDescription>{reward.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">庫存只剩下 {reward.stock} 件！</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <Coins className="h-5 w-5" />
            <span>{reward.cost.toLocaleString()}</span>
        </div>
        <Button onClick={() => handleRedeemClick(reward)} disabled={reward.stock === 0 || studentData.points < reward.cost}>
            <ShoppingCart className="mr-2"/>
            兌換
        </Button>
        </CardFooter>
    </Card>
  )

  return (
    <>
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        {classRewards.length > 0 && (
            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap/> 班級專屬獎勵</h2>
                    <p className="text-muted-foreground">由您的班級老師提供的特別獎勵！</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classRewards.map((reward) => <RewardCard key={reward.id} reward={reward} />)}
                </div>
            </section>
        )}

        {classRewards.length > 0 && schoolRewards.length > 0 && (
            <Separator />
        )}

        {schoolRewards.length > 0 && (
             <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Building/> 全校精選獎勵</h2>
                    <p className="text-muted-foreground">由學校提供的獎勵，所有學生都可以兌換。</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {schoolRewards.map((reward) => <RewardCard key={reward.id} reward={reward} />)}
                </div>
            </section>
        )}
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認兌換？</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要花費 {selectedReward?.cost.toLocaleString()} 點來兌換「{selectedReward?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedReward(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRedeem} disabled={isRedeeming}>
                {isRedeeming ? "兌換中..." : "確定"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    