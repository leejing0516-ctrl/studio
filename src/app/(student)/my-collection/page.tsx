
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Gem, Hourglass, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { RedeemedRewardItem, Student } from "@/lib/types";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MyCollectionPage() {
  const { student: currentStudent } = useAuth();
  const { toast } = useToast();
  const [isUsing, setIsUsing] = useState<string | null>(null);

  const handleUseReward = async (redemption: RedeemedRewardItem) => {
    if (!currentStudent?._docId) return;
    
    setIsUsing(redemption.redemptionId);
    
    try {
        const updatedRewards = (currentStudent.redeemedRewards || []).map(r => 
            r.redemptionId === redemption.redemptionId 
            ? { ...r, status: 'pending_use' as const } 
            : r
        );
        const studentRef = doc(db, 'students', currentStudent._docId);
        await setDoc(studentRef, { redeemedRewards: updatedRewards }, { merge: true });

         toast({
            title: "已提出使用請求",
            description: `您已請求使用「${redemption.reward.name}」。請等待老師同意。`
        });
    } catch(e: any) {
        toast({
            title: "請求失敗",
            description: e.message || "更新您的收藏品狀態時發生錯誤，請稍後再試。",
            variant: "destructive"
        });
    } finally {
        setIsUsing(null);
    }
  };

  const redeemedRewards = useMemo(() => {
    return currentStudent?.redeemedRewards?.filter(r => r.status === 'collected').sort((a, b) => new Date(b.redemptionDate).getTime() - new Date(a.redemptionDate).getTime()) || [];
  }, [currentStudent?.redeemedRewards]);
  
  const pendingRewards = useMemo(() => {
    return currentStudent?.redeemedRewards?.filter(r => r.status === 'pending_use').sort((a, b) => new Date(b.redemptionDate).getTime() - new Date(a.redemptionDate).getTime()) || [];
  }, [currentStudent?.redeemedRewards]);


  return (
    <div className="animate-in fade-in-0 duration-500 space-y-8">
      {redeemedRewards.length === 0 && pendingRewards.length === 0 ? (
        <Card className="text-center p-12">
            <Gem className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">您的收藏還是空的</CardTitle>
            <CardDescription className="mt-2">
                前往獎勵商店，用您的點數兌換第一個收藏品吧！
            </CardDescription>
        </Card>
      ) : (
        <>
            <section>
                <h2 className="text-2xl font-bold mb-4">我的收藏</h2>
                 {redeemedRewards.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {redeemedRewards.map((redemption) => (
                        <Card key={redemption.redemptionId} className="flex flex-col overflow-hidden">
                        <div className="relative h-48 w-full">
                            <Image
                            src={redemption.reward.image}
                            alt={redemption.reward.name}
                            fill
                            className="object-cover"
                            data-ai-hint="reward item"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                        <CardHeader>
                            <CardTitle>{redemption.reward.name}</CardTitle>
                            <CardDescription>{redemption.reward.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
                            <Button onClick={() => handleUseReward(redemption)} disabled={isUsing === redemption.redemptionId}>
                                {isUsing === redemption.redemptionId ? "處理中..." : "使用"}
                            </Button>
                        </CardFooter>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">這裡沒有可使用的物品。</p>
                )}
            </section>
             <section>
                <h2 className="text-2xl font-bold mb-4">等待老師同意</h2>
                 {pendingRewards.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {pendingRewards.map((redemption) => (
                        <Card key={redemption.redemptionId} className="flex flex-col overflow-hidden opacity-70">
                        <div className="relative h-48 w-full">
                            <Image
                            src={redemption.reward.image}
                            alt={redemption.reward.name}
                            fill
                            className="object-cover"
                            data-ai-hint="reward item"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>
                        <CardHeader>
                            <CardTitle>{redemption.reward.name}</CardTitle>
                            <CardDescription>{redemption.reward.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
                           <Button variant="outline" disabled>
                                <Hourglass className="mr-2"/>
                                等待老師同意
                            </Button>
                        </CardFooter>
                        </Card>
                    ))}
                    </div>
                 ): (
                    <p className="text-muted-foreground">沒有正在等待審核的物品。</p>
                 )}
            </section>
        </>
      )}
    </div>
  );
}
