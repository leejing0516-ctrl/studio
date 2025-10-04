
"use server";

import { suggestRewards, type RewardSuggestionInput } from "@/ai/flows/reward-suggestion";
import { db, storage } from './firebase';
import { doc, runTransaction, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
    rewardId: string;
}

interface RedeemRewardOutput {
    success: boolean;
    error?: string;
}

export async function redeemRewardTransaction(input: RedeemRewardInput): Promise<RedeemRewardOutput> {
    try {
        await runTransaction(db, async (transaction) => {
            const studentDocId = `${input.classId}-${input.studentId}`;
            const studentRef = doc(db, 'students', studentDocId);
            const rewardRef = doc(db, 'rewards', input.rewardId);

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
            
            const newRedeemedItem: RedeemedRewardItem = {
                redemptionId: `redeem-${Date.now()}-${Math.random()}`,
                reward: reward,
                status: 'collected',
                redemptionDate: new Date().toISOString(),
            };
            transaction.update(studentRef, {
                points: student.points - reward.cost,
                redeemedRewards: [...(student.redeemedRewards || []), newRedeemedItem]
            });

            transaction.update(rewardRef, {
                stock: reward.stock - 1
            });

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
        });

        return { success: true };

    } catch (error: any) {
        console.error("Redeem Reward Transaction failed: ", error);
        return { success: false, error: error.message || "交易失敗，請稍後再試。" };
    }
}


interface UseRewardInput {
    studentId: string;
    classId: string;
    redemptionId: string;
}

interface UseRewardOutput {
    success: boolean;
    error?: string;
}

export async function useRewardTransaction(input: UseRewardInput): Promise<UseRewardOutput> {
     try {
        await runTransaction(db, async (transaction) => {
            const studentDocId = `${input.classId}-${input.studentId}`;
            const studentRef = doc(db, 'students', studentDocId);

            const studentDoc = await transaction.get(studentRef);

            if (!studentDoc.exists()) {
                throw new Error("找不到該學生。");
            }
            
            const student = studentDoc.data() as Student;
            
            const targetReward = (student.redeemedRewards || []).find(r => r.redemptionId === input.redemptionId);
            if (!targetReward) {
                throw new Error("在您的收藏中找不到此獎勵。");
            }
            if (targetReward.status !== 'collected') {
                throw new Error("此獎勵目前無法使用。");
            }

            const updatedRewards = (student.redeemedRewards || []).map(r => 
                r.redemptionId === input.redemptionId ? { ...r, status: 'pending_use' as const } : r
            );

            transaction.update(studentRef, {
                redeemedRewards: updatedRewards
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Use Reward Transaction failed: ", error);
        return { success: false, error: error.message || "請求失敗，請稍後再試。" };
    }
}

const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export async function savePlatformSettings(formData: FormData): Promise<{success: boolean, error?: string}> {
    try {
        const fixedDepositInterestRate = Number(formData.get('fixedDepositInterestRate'));
        const loanInterestRate = Number(formData.get('loanInterestRate'));
        const currentConfigString = formData.get('currentConfig') as string;
        const currentConfig: PlatformConfig | null = currentConfigString ? JSON.parse(currentConfigString) : null;

        const logoFile = formData.get('logoFile') as File | null;
        const sponsorFiles = [
            formData.get('sponsorFile0') as File | null,
            formData.get('sponsorFile1') as File | null,
            formData.get('sponsorFile2') as File | null,
            formData.get('sponsorFile3') as File | null,
        ];

        let platformLogoUrl = currentConfig?.platformLogoUrl || null;
        if (logoFile && logoFile.size > 0) {
            platformLogoUrl = await uploadFile(logoFile, `logos/platform_logo_${Date.now()}`);
        }

        const sponsorUploadPromises = sponsorFiles.map((file, index) => {
            if (file && file.size > 0) {
                return uploadFile(file, `logos/sponsor_${index}_${Date.now()}`);
            }
            // Keep the existing URL if no new file is uploaded
            return Promise.resolve(currentConfig?.sponsorLogoUrls?.[index] || null);
        });
        
        const newSponsorUrls = await Promise.all(sponsorUploadPromises);

        const newConfig: Partial<PlatformConfig> = {
            fixedDepositInterestRate,
            loanInterestRate,
            platformLogoUrl: platformLogoUrl || "",
            sponsorLogoUrls: newSponsorUrls,
        };

        const configDocRef = doc(db, 'config', 'main');
        await setDoc(configDocRef, newConfig, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to save platform settings:", error);
        return { success: false, error: error.message || "儲存設定時發生未知錯誤。" };
    }
}

// All other `set` functions that were in AppDataContext can be refactored into server actions here.
// For example:
export async function setStudents(students: Student[]) {
    const batch = writeBatch(db);
    students.forEach(student => {
        const studentDocId = `${student.classId}-${student.id}`;
        const studentRef = doc(db, 'students', studentDocId);
        batch.set(studentRef, student, { merge: true });
    });
    await batch.commit();
}

export async function setRewards(rewards: Reward[]) {
    const batch = writeBatch(db);
    rewards.forEach(reward => {
        const rewardRef = doc(db, 'rewards', reward.id);
        batch.set(rewardRef, reward, { merge: true });
    });
    await batch.commit();
}

export async function setStocks(stocks: Stock[]) {
    const batch = writeBatch(db);
    stocks.forEach(stock => {
        const stockRef = doc(db, 'stocks', stock.ticker);
        batch.set(stockRef, stock, { merge: true });
    });
    await batch.commit();
}
