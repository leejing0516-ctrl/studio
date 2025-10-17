
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { Reward, Student } from "@/lib/types";
import { Coins, ShoppingCart, School, Users, Building, GraduationCap, Loader2 } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function RewardsPage() {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();
  const { student, setStudents, setPlatformConfig } = useAuth();
  const { config: platformConfig, teachers, loading: storeLoading } = useSchoolStore();

  const allRewards = useMemo(() => platformConfig?.rewards || [], [platformConfig]);

  const { classRewards, schoolRewards } = (() => {
    // Direct computation on each render.
    // Return empty if data is not ready, the top-level loader will handle the UI.
    if (!student || !allRewards.length || !teachers.length || storeLoading) {
      return { classRewards: [], schoolRewards: [] };
    }

    const availableRewards = allRewards.filter(reward => {
      // Rule 1: School-wide rewards are always available.
      if (reward.scope === 'school') {
        return true;
      }

      // Rule 2: Class-specific rewards are available if the provider (teacher) teaches the student's class.
      if (reward.scope === 'class') {
        const provider = teachers.find(t => t.id === reward.providerId);
        // Check if the provider exists and their classIds array includes the student's classId.
        return provider && provider.classIds?.includes(student.classId);
      }

      return false;
    });

    return {
      classRewards: availableRewards.filter(r => r.scope === 'class'),
      schoolRewards: availableRewards.filter(r => r.scope === 'school'),
    };
  })();


  const handleRedeemClick = (reward: Reward) => {
    if (!student || student.points < reward.cost) {
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
        await setStudents(prev => prev.map(s => {
            if (s.id === student.id && s.classId === student.classId) {
                if (s.points < selectedReward.cost) {
                    throw new Error("點數不足。");
                }
                const updatedStudent: Student = {
                    ...s,
                    points: s.points - selectedReward.cost,
                    redeemedRewards: [
                        ...(s.redeemedRewards || []),
                        {
                            redemptionId: `redeem-${Date.now()}`,
                            reward: selectedReward,
                            status: 'collected',
                            redemptionDate: new Date().toISOString(),
                        },
                    ],
                };
                return updatedStudent;
            }
            return s;
        }));

        const updatedRewards = allRewards.map(r => {
             if (r.id === selectedReward.id) {
                if (r.stock <= 0) {
                    throw new Error("此獎勵已無庫存。");
                }
                return { ...r, stock: r.stock - 1 };
             }
             return r;
        });

        await setPlatformConfig({ rewards: updatedRewards });

        toast({
            title: "兌換成功！",
            description: `您已成功兌換「${selectedReward.name}」。前往「我的收藏」查看！`,
        });

    } catch (error: any) {
        console.error("Redemption transaction failed:", error);
        toast({
            title: "兌換失敗",
            description: error.message || "發生未知錯誤，請稍後再試。",
            variant: "destructive",
        });
    } finally {
        setIsRedeeming(false);
        setIsConfirmOpen(false);
        setSelectedReward(null);
    }
  };

  const RewardCard = ({ reward }: { reward: Reward }) => (
     <Card key={reward.id} className={cn(
         "flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300",
         reward.scope === 'school' ? "bg-reward-card-school text-reward-card-school-foreground" : "bg-reward-card-class text-reward-card-class-foreground"
     )}>
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
            className="absolute top-2 right-2 bg-background/30 text-foreground border-none"
        >
            {reward.scope === 'school' ? <Building className="mr-1.5" /> : <GraduationCap className="mr-1.5" />}
            {reward.scope === 'school' ? '學校提供' : '班級限定'}
        </Badge>
        </div>
        <CardHeader>
        <CardTitle>{reward.name}</CardTitle>
        <CardDescription className="text-current/80">{reward.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
        <p className="text-sm text-current/80">庫存只剩下 {reward.stock} 件！</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-black/10 p-4 mt-auto">
        <div className="flex items-center gap-2 font-bold text-lg text-current">
            <Coins className="h-5 w-5" />
            <span>{reward.cost.toLocaleString()}</span>
        </div>
        <Button onClick={() => handleRedeemClick(reward)} disabled={reward.stock === 0 || (student?.points || 0) < reward.cost} variant="secondary" className="bg-background text-foreground hover:bg-background/80">
            <ShoppingCart className="mr-2"/>
            兌換
        </Button>
        </CardFooter>
    </Card>
  )

  if (storeLoading || !student) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

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
        
        {classRewards.length === 0 && schoolRewards.length === 0 && (
            <Card className="text-center p-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle className="mt-4">獎勵商店正在補貨中</CardTitle>
                <CardDescription className="mt-2">
                    目前沒有可兌換的獎勵品，請稍後再來看看！
                </CardDescription>
            </Card>
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

    