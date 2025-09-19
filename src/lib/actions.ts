
"use server";

import { suggestRewards, type RewardSuggestionInput } from "@/ai/flows/reward-suggestion";
import { db } from './firebase';
import { doc, runTransaction } from 'firebase/firestore';
import type { Student, Reward, Teacher, PlatformConfig, RedeemedRewardItem } from './types';

export async function getRewardSuggestions(input: RewardSuggestionInput) {
    try {
        const result = await suggestRewards(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("AI 錯誤:", error);
        return { success: false, error: "無法取得獎勵建議。" };
    }
}

interface RedeemRewardInput {
    studentId: string;
    classId: string;
    rewardId: number;
}

interface RedeemRewardOutput {
    success: boolean;
    error?: string;
    newRedeemedItem?: RedeemedRewardItem;
}

export async function redeemRewardTransaction(input: RedeemRewardInput): Promise<RedeemRewardOutput> {
    try {
        const newRedeemedItem = await runTransaction(db, async (transaction) => {
            const studentDocId = `${input.classId}-${input.studentId}`;
            const studentRef = doc(db, 'students', studentDocId);
            const rewardRef = doc(db, 'rewards', String(input.rewardId));

            const [studentDoc, rewardDoc] = await Promise.all([
                transaction.get(studentRef),
                transaction.get(rewardRef)
            ]);

            if (!studentDoc.exists()) {
                throw new Error("找不到該學生。");
            }
            if (!rewardDoc.exists()) {
                throw new Error("找不到該獎勵。");
            }

            const student = studentDoc.data() as Student;
            const reward = rewardDoc.data() as Reward;

            if (student.points < reward.cost) {
                throw new Error("您的點數不足以兌換此獎勵。");
            }
            if (reward.stock <= 0) {
                throw new Error("此獎勵的庫存不足。");
            }
            
            // 1. Update Student
            const newRedeemedItem: RedeemedRewardItem = {
                redemptionId: `${reward.id}-${Date.now()}`,
                reward: reward,
                status: 'collected',
                redemptionDate: new Date().toISOString(),
            };
            transaction.update(studentRef, {
                points: student.points - reward.cost,
                redeemedRewards: [...(student.redeemedRewards || []), newRedeemedItem]
            });

            // 2. Update Reward Stock
            transaction.update(rewardRef, {
                stock: reward.stock - 1
            });

            // 3. Return points to provider
            if (reward.scope === 'school') {
                const configRef = doc(db, 'config', 'main');
                const configDoc = await transaction.get(configRef);
                const currentConfig = configDoc.data() as PlatformConfig;
                transaction.update(configRef, {
                    schoolFunds: (currentConfig.schoolFunds || 0) + reward.cost
                });
            } else {
                const teacherRef = doc(db, 'teachers', reward.providerId);
                const teacherDoc = await transaction.get(teacherRef);
                if (teacherDoc.exists()) {
                    const teacher = teacherDoc.data() as Teacher;
                    transaction.update(teacherRef, {
                        pointBalance: (teacher.pointBalance || 0) + reward.cost
                    });
                }
            }
            
            return newRedeemedItem;
        });

        return { success: true, newRedeemedItem };

    } catch (error: any) {
        console.error("Redeem Reward Transaction failed: ", error);
        return { success: false, error: error.message || "交易失敗，請稍後再試。" };
    }
}
