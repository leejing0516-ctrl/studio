
"use client";

import { useState, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/AppDataContext';
import { StudentDataContext } from '@/context/StudentDataContext';
import { Gift, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { Student, PointRecord } from '@/lib/types';
import { startOfDay, formatISO } from 'date-fns';

const DailyReward = () => {
    const { studentData } = useContext(StudentDataContext);
    const { setStudents } = useContext(AppDataContext);
    const { toast } = useToast();

    const [isClaiming, setIsClaiming] = useState(false);
    const [rewardResult, setRewardResult] = useState<number | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

    const todayStr = formatISO(startOfDay(new Date()), { representation: 'date' });
    const canClaim = studentData.student?.lastDailyReward !== todayStr;

    const handleClaimReward = async () => {
        if (!studentData.student) return;

        setIsClaiming(true);
        const currentStudent = studentData.student;

        // --- Determine the reward ---
        const roll = Math.random();
        let pointsAwarded = 0;
        if (roll < 0.05) { // 5% chance for jackpot
            pointsAwarded = Math.floor(Math.random() * 101) + 100; // 100-200 points
        } else if (roll < 0.8) { // 75% chance for standard reward (80% - 5%)
            pointsAwarded = Math.floor(Math.random() * 41) + 10; // 10-50 points
        } else { // 20% chance for nothing
            pointsAwarded = 0;
        }

        setRewardResult(pointsAwarded);

        if (pointsAwarded > 0) {
            const newRecord: PointRecord = {
                points: pointsAwarded,
                date: new Date().toISOString(),
                reason: '每日簽到獎勵',
                teacherId: 'system'
            };

            try {
                await setStudents(prevStudents =>
                    prevStudents.map(s =>
                        s.id === currentStudent.id && s.classId === currentStudent.classId
                            ? {
                                ...s,
                                points: s.points + pointsAwarded,
                                pointHistory: [...(s.pointHistory || []), newRecord],
                                lastDailyReward: todayStr,
                            }
                            : s
                    )
                );
            } catch (error) {
                console.error("Failed to claim daily reward:", error);
                toast({
                    title: "領取失敗",
                    description: "更新您的點數時發生錯誤，請稍後再試。",
                    variant: "destructive"
                });
                setIsClaiming(false);
                return;
            }
        } else {
             // Still update the lastDailyReward date even if they got nothing
             try {
                await setStudents(prevStudents =>
                    prevStudents.map(s =>
                        s.id === currentStudent.id && s.classId === currentStudent.classId
                            ? {
                                ...s,
                                lastDailyReward: todayStr,
                            }
                            : s
                    )
                );
            } catch (error) {
                console.error("Failed to update daily reward timestamp:", error);
                 toast({
                    title: "領取失敗",
                    description: "更新簽到狀態時發生錯誤，請稍後再試。",
                    variant: "destructive"
                });
                setIsClaiming(false);
                return;
            }
        }

        setIsClaiming(false);
        setIsResultDialogOpen(true);
    };

    if (!canClaim) {
        return null; // Don't show anything if they've already claimed today
    }

    return (
        <>
            <div className="animate-in fade-in-0 duration-500 bg-accent/20 border border-accent/30 text-accent-foreground p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Gift className="h-6 w-6 text-accent" />
                    <div>
                        <h3 className="font-semibold">每日簽到獎勵！</h3>
                        <p className="text-sm opacity-80">今天還沒領取您的每日驚喜獎勵，快來試試手氣！</p>
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
            
            <AlertDialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl text-center">
                            {rewardResult !== null && rewardResult > 0 ? "恭喜！" : "再接再厲！"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-base py-4">
                            {rewardResult !== null && rewardResult > 0 ? (
                                <>
                                    您獲得了 <span className="font-bold text-primary text-xl">{rewardResult.toLocaleString()}</span> 點！
                                </>
                            ) : (
                                "這次是空的，感謝您的參與！明天再來試試手氣吧！"
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsResultDialogOpen(false)}>太棒了！</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default DailyReward;
