
"use client";

import { useState, useContext, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { Gift, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { Student, PointRecord } from "@/lib/types";
import { startOfDay, formatISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const DailyReward = () => {
    const { student, setStudents } = useAuth();
    const { setPlatformConfig, platformConfig } = useContext(AppDataContext);
    const { toast } = useToast();

    const [isClaiming, setIsClaiming] = useState(false);
    const [rewardResult, setRewardResult] = useState<number | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

    const todayStr = formatISO(startOfDay(new Date()), { representation: 'date' });
    const canClaim = student?.lastDailyReward !== todayStr;

    const handleClaimReward = () => {
        if (!student) return;

        setIsClaiming(true);

        const jackpotChance = platformConfig?.dailyRewardJackpotChance ?? 0.05;
        const jackpotMin = platformConfig?.dailyRewardJackpotMin ?? 100;
        const jackpotMax = platformConfig?.dailyRewardJackpotMax ?? 200;
        
        const standardChance = platformConfig?.dailyRewardStandardChance ?? 0.75;
        const standardMin = platformConfig?.dailyRewardStandardMin ?? 10;
        const standardMax = platformConfig?.dailyRewardStandardMax ?? 50;

        const roll = Math.random();
        let pointsAwarded = 0;
        
        if (roll < jackpotChance) { 
            pointsAwarded = Math.floor(Math.random() * (jackpotMax - jackpotMin + 1)) + jackpotMin;
        } else if (roll < jackpotChance + standardChance) { 
            pointsAwarded = Math.floor(Math.random() * (standardMax - standardMin + 1)) + standardMin;
        } else {
            pointsAwarded = 0;
        }
        
        setRewardResult(pointsAwarded);
        setIsResultDialogOpen(true);
        setIsClaiming(false);
    };

    const handleDialogClose = useCallback(async (open: boolean) => {
        if (!open && rewardResult !== null && student) {
            const currentStudent = student;
            const pointsAwarded = rewardResult;

            if (pointsAwarded > 0) {
                const currentSchoolFunds = platformConfig?.schoolFunds || 0;
                if (currentSchoolFunds < pointsAwarded) {
                    toast({
                        title: "簽到失敗",
                        description: "學校資金不足，無法發放今日獎勵！請通知校長。",
                        variant: "destructive"
                    });
                    setRewardResult(null);
                    return;
                }

                await setPlatformConfig({
                    schoolFunds: currentSchoolFunds - pointsAwarded
                });

                const newRecord: PointRecord = {
                    points: pointsAwarded,
                    date: new Date().toISOString(),
                    reason: '每日簽到獎勵',
                    teacherId: 'system'
                };

                await setStudents(prevStudents =>
                    prevStudents.map(s => {
                        if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
                            return {
                                ...s,
                                lastDailyReward: todayStr,
                                points: (s.points || 0) + pointsAwarded,
                                pointHistory: [...(s.pointHistory || []), newRecord],
                            };
                        }
                        return s;
                    })
                );
            } else {
                 await setStudents(prevStudents =>
                    prevStudents.map(s => {
                        if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
                           return { ...s, lastDailyReward: todayStr };
                        }
                        return s;
                    })
                );
            }
            
            setRewardResult(null);
        }
        setIsResultDialogOpen(open);
    }, [rewardResult, student, setStudents, setPlatformConfig, platformConfig, todayStr, toast]);


    if (!canClaim) {
        return null;
    }

    return (
        <>
            <div className="animate-in fade-in-0 duration-500 bg-accent/20 border border-accent/30 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Gift className="h-6 w-6 text-accent" />
                    <div>
                        <h3 className="font-semibold">每日簽到獎勵！</h3>
                        <p className="text-sm text-muted-foreground">今天還沒領取您的每日驚喜獎勵，快來試試手氣！</p>
                    </div>
                </div>
                <Button onClick={handleClaimReward} disabled={isClaiming}>
                    {isClaiming ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Gift className="mr-2 h-4 w-4" />
                    )}
                    {isClaiming ? '開獎中...' : '領取今日獎勵'}
                </Button>
            </div>
            
            <Dialog open={isResultDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center">
                            {rewardResult !== null && rewardResult > 0 ? "恭喜！" : "再接再厲！"}
                        </DialogTitle>
                        <DialogDescription className="text-center text-base py-4">
                            {rewardResult !== null && rewardResult > 0 ? (
                                <>
                                    您獲得了 <span className="font-bold text-primary text-xl">{rewardResult.toLocaleString()}</span> 點！
                                </>
                            ) : (
                                "今天沒有抽中點數，感謝你的參與！明天再來試試手氣吧！"
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                           <Button className="w-full">
                                {rewardResult !== null && rewardResult > 0 ? "太棒了！" : "再加油"}
                           </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DailyReward;
