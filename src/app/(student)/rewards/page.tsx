
"use client";

import { useState, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { Reward } from "@/lib/types";
import { Coins, ShoppingCart, School, Users } from "lucide-react";
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

export default function RewardsPage() {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { studentData } = useContext(StudentDataContext);
  const { students, setStudents, rewards, setRewards, platformConfig, setPlatformConfig, teachers, setTeachers } = useContext(AppDataContext);

  const student = studentData.student;
  
  const availableRewards = useMemo(() => {
    if (!student) return [];
    return rewards.filter(reward => reward.scope === 'school' || (reward.scope === 'class' && reward.providerId === student.classId));
  }, [rewards, student]);

  const handleRedeemClick = (reward: Reward) => {
    if (studentData.points < reward.cost) {
        toast({
            title: "點數不足",
            description: `您需要 ${reward.cost.toLocaleString()} 點來兌換此獎勵。`,
            variant: "destructive",
        });
        return;
    }
    setSelectedReward(reward);
    setIsConfirmOpen(true);
  };

  const handleConfirmRedeem = () => {
    if (!selectedReward || !student) {
        setIsConfirmOpen(false);
        return;
    };

    if (studentData.points < selectedReward.cost) {
      toast({
          title: "點數不足",
          description: `您需要 ${selectedReward.cost.toLocaleString()} 點來兌換此獎勵。`,
          variant: "destructive",
      });
    } else {
      const newPoints = studentData.points - selectedReward.cost;
      
      const newRedeemedReward = {
        redemptionId: `${selectedReward.id}-${Date.now()}`,
        reward: selectedReward,
        status: 'collected' as const,
      };

      // Find the student in the global list and update them
      setStudents(currentStudents => 
        currentStudents.map(s => {
            if (s.id === student.id && s.classId === student.classId) {
                return {
                    ...s,
                    points: newPoints,
                    redeemedRewards: [...(s.redeemedRewards || []), newRedeemedReward],
                };
            }
            return s;
        })
      );
      
      // Update reward stock
      setRewards(currentRewards => currentRewards.map(r =>
        r.id === selectedReward.id ? { ...r, stock: r.stock - 1 } : r
      ));
      
      // Return points to the provider
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
    }
    
    setIsConfirmOpen(false);
    setSelectedReward(null);
  };

  return (
    <>
      <div className="grid gap-6 animate-in fade-in-0 duration-500">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableRewards.map((reward) => (
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
                    {reward.scope === 'school' ? <School className="mr-1.5" /> : <Users className="mr-1.5" />}
                    {reward.scope === 'school' ? '學校' : '班級'}
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
          ))}
        </div>
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
            <AlertDialogAction onClick={handleConfirmRedeem}>確定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
